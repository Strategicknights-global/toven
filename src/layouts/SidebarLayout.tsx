import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import { useLoginModalStore } from '../stores/loginModalStore';
import { useSignupModalStore } from '../stores/signupModalStore';
import { useToastStore } from '../stores/toastStore';
import { useUserRoleStore } from '../stores/userRoleStore';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

import { Outlet } from 'react-router-dom';

const SidebarLayout: React.FC = () => {
  const { open: openLogin } = useLoginModalStore();
  const { open: openSignup } = useSignupModalStore();
  const { addToast } = useToastStore();
  const { user } = useUserRoleStore();
  const [authLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    addToast('Logged out successfully', 'info');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div
        className={`flex-1 w-full flex flex-col h-full min-h-0 transition-transform duration-300 ease-in-out ${sidebarOpen ? 'xl:translate-x-0 translate-x-64' : 'translate-x-0'}`}
        onClick={() => sidebarOpen && setSidebarOpen(false)}
      >
        <Navbar
          user={user}
          authLoading={authLoading}
          openLogin={openLogin}
          openSignup={openSignup}
          handleLogout={handleLogout}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
        <main className="flex-1 min-h-0 overflow-y-auto px-0 py-2">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SidebarLayout;