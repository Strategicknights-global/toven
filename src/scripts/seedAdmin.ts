import admin from 'firebase-admin';
import { GoogleAuth } from 'google-auth-library';
import { readFileSync } from 'fs';
import { PERMISSIONS } from '../permissions';

// Initialize Firebase Admin - Download serviceAccountKey.json from Firebase Console > Project Settings > Service Accounts
type ExtendedServiceAccount = admin.ServiceAccount & { project_id?: string };

const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8')) as ExtendedServiceAccount;
if (!serviceAccount) {
  console.error('serviceAccountKey.json not found! Download from Firebase Console and place in project root.');
  process.exit(1);
}

const projectId = serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID;
if (!projectId) {
  console.error('Project ID missing from service account credentials. Ensure project_id is present in serviceAccountKey.json.');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

const adminDb = admin.firestore();

// Config - CHANGE THESE
const ADMIN_EMAIL = 'admin@toven.in';
const ADMIN_PASSWORD = 'admin123'; // CHANGE IN PRODUCTION!
const ADMIN_FULLNAME = 'Admin User';
const ADMIN_USER_TYPE = 'Corporate';
const ADMIN_ROLE_ID = 'admin';

async function ensureAdminRole() {
  const roleRef = adminDb.collection('roles').doc(ADMIN_ROLE_ID);
  const roleSnapshot = await roleRef.get();

  if (roleSnapshot.exists) {
    console.log('Admin role already present.');
    return roleSnapshot.id;
  }

  console.log('Admin role not found. Creating initial Admin role...');
  await roleRef.set({
    name: 'Admin',
    permissions: [PERMISSIONS.ALL],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log('Admin role created.');

  return roleRef.id;
}

type EmailSignInConfig = {
  enabled?: boolean;
  passwordRequired?: boolean;
};

type ProjectSignInConfigResponse = {
  signIn?: {
    email?: EmailSignInConfig;
  };
};

async function ensureEmailPasswordSignInEnabled(): Promise<boolean> {
  try {
    const googleAuth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/identitytoolkit'],
    });

    const client = await googleAuth.getClient();
    const baseUrl = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;

    const currentConfigResponse = await client.request<ProjectSignInConfigResponse>({
      url: baseUrl,
      method: 'GET',
    });

    const currentEmailConfig = currentConfigResponse.data.signIn?.email;
    if (currentEmailConfig?.enabled && currentEmailConfig.passwordRequired) {
      return true;
    }

    await client.request<ProjectSignInConfigResponse>({
      url: `${baseUrl}?updateMask=signIn.email`,
      method: 'PATCH',
      data: {
        signIn: {
          email: {
            enabled: true,
            passwordRequired: true,
          },
        },
      },
    });

    console.log('Enabled Email/Password sign-in provider for the Firebase project.');
    return true;
  } catch (err) {
    console.warn('Failed to verify or enable Email/Password sign-in automatically. Please enable it manually in Firebase Console > Authentication > Sign-in method.', err);
    return false;
  }
}

// Seed admin account
async function seedAdmin() {
  try {
    console.log('Seeding admin account...');

    const adminRoleId = await ensureAdminRole();
    console.log(`Using Admin role ID: ${adminRoleId}`);

    // Check if admin user already exists by email
    let existingUser;
    try {
      existingUser = await admin.auth().getUserByEmail(ADMIN_EMAIL);
    } catch (error) {
      existingUser = null;
    }

    const usersCollection = adminDb.collection('users');

    if (existingUser) {
      console.log(`Admin user '${ADMIN_EMAIL}' already exists (UID: ${existingUser.uid}). Updating Firestore doc.`);
      const updatePayload: Record<string, unknown> = {
        fullName: ADMIN_FULLNAME,
        email: ADMIN_EMAIL,
        userType: ADMIN_USER_TYPE,
        roles: [adminRoleId],
        phone: '',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await usersCollection.doc(existingUser.uid).set(updatePayload, { merge: true });
      console.log('Admin Firestore doc updated.');
      return;
    }

    // Create Auth user
    let userRecord;
    try {
      userRecord = await admin.auth().createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        displayName: ADMIN_FULLNAME,
      });
    } catch (createError: unknown) {
      const firebaseError = createError as {
        errorInfo?: { code?: string };
        code?: string;
      };

      const errorCode = firebaseError?.errorInfo?.code || firebaseError?.code;
      if (errorCode === 'auth/configuration-not-found') {
        console.warn('Email/Password sign-in provider seems disabled. Attempting to enable it automatically...');
        const enabled = await ensureEmailPasswordSignInEnabled();
        if (!enabled) {
          throw createError;
        }

        userRecord = await admin.auth().createUser({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          displayName: ADMIN_FULLNAME,
        });
      } else {
        throw createError;
      }
    }
    console.log(`Admin user created with UID: ${userRecord.uid}`);

    // Create Firestore doc with Admin role
    const now = admin.firestore.FieldValue.serverTimestamp();
    await usersCollection.doc(userRecord.uid).set({
      fullName: ADMIN_FULLNAME,
      phone: '',
      email: ADMIN_EMAIL,
      userType: ADMIN_USER_TYPE,
      roles: [adminRoleId],
      createdAt: now,
      updatedAt: now,
    });

    console.log('Admin account seeded successfully!');
    console.log(`Email: ${ADMIN_EMAIL}`);
    console.log(`Password: ${ADMIN_PASSWORD}`);
    console.log('Login with these credentials. CHANGE PASSWORD AFTER FIRST LOGIN!');
  } catch (error) {
    console.error('Error seeding admin:', error);
    process.exit(1);
  }
}

// Run
seedAdmin().then(() => {
  console.log('Seeding complete.');
  process.exit(0);
});
