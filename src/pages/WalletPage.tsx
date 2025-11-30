import React, { useEffect, useMemo, useState } from 'react';
import { Coins, Clock, CheckCircle, XCircle, Plus } from 'lucide-react';
import { useUserRoleStore } from '../stores/userRoleStore';
import { UserModel, WalletModel } from '../firestore';
import type { WalletSchema } from '../schemas/WalletSchema';
import { useToastStore } from '../stores/toastStore';
import { useCoinRequestsStore } from '../stores/coinRequestsStore';
import type { CoinRequestCreateInput } from '../schemas/CoinRequestSchema';
import Dialog from '../components/Dialog';
import { getDisplayCustomerId } from '../utils/customerDisplay';

const WalletPage: React.FC = () => {
  const user = useUserRoleStore((state) => state.user);
  const roleLoading = useUserRoleStore((state) => state.loading);
  const addToast = useToastStore((state) => state.addToast);

  const [wallet, setWallet] = useState<WalletSchema | null>(null);
  const [loading, setLoading] = useState(false);
  const [coinPrice, setCoinPrice] = useState<number>(1);
  const [customerDisplayId, setCustomerDisplayId] = useState<string>('—');

  // Coin request state
  const { requests, loading: requestsLoading, submitting, loadUserRequests, createRequest } = useCoinRequestsStore();
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [coinsRequested, setCoinsRequested] = useState('');
  const [, setInvoiceFile] = useState<File | null>(null);
  const [invoicePreview, setInvoicePreview] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadWallet = async () => {
      if (!user) {
        setWallet(null);
        setCustomerDisplayId('—');
        return;
      }

      setLoading(true);
      try {
        const result = await WalletModel.findByCustomerId(user.uid);
        if (!active) return;
        setWallet(result);
      } catch (error) {
        if (!active) return;
        console.error('Failed to load wallet', error);
        addToast('Failed to load wallet balance', 'error');
        setWallet(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadWallet();

    return () => {
      active = false;
    };
  }, [user, addToast]);

  useEffect(() => {
    let active = true;

    const resolveCustomerId = async () => {
      if (!user) {
        setCustomerDisplayId('—');
        return;
      }

      try {
        const userDoc = await UserModel.findById(user.uid);
        if (!active) {
          return;
        }
        setCustomerDisplayId(
          getDisplayCustomerId(userDoc?.customerId ?? undefined, user.uid, { allowFallback: true }),
        );
      } catch (error) {
        if (!active) {
          return;
        }
        console.error('Failed to load customer short ID', error);
        setCustomerDisplayId(getDisplayCustomerId(undefined, user.uid, { allowFallback: true }));
      }
    };

    void resolveCustomerId();

    return () => {
      active = false;
    };
  }, [user]);

  // Load user's coin requests
  useEffect(() => {
    if (user) {
      void loadUserRequests(user.uid, { pageSize: 50 });
    }
  }, [user, loadUserRequests]);

  // Load coin price from config
  useEffect(() => {
    const loadCoinPrice = async () => {
      try {
        const { ConfigModel } = await import('../firestore/ConfigModel');
        const price = await ConfigModel.getCoinPrice();
        setCoinPrice(price);
      } catch (error) {
        console.error('Failed to load coin price', error);
        setCoinPrice(1); // Fallback to default
      }
    };
    void loadCoinPrice();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      addToast('Invoice image must be less than 5MB', 'error');
      return;
    }

    setInvoiceFile(file);

    // Generate preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setInvoicePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitRequest = async () => {
    if (!user) {
      addToast('You must be logged in to request coins', 'error');
      return;
    }

    const coins = parseInt(coinsRequested, 10);

    if (isNaN(coins) || coins <= 0) {
      addToast('Please enter a valid number of coins', 'error');
      return;
    }

    if (!invoicePreview) {
      addToast('Please upload an invoice image', 'error');
      return;
    }

    const input: CoinRequestCreateInput = {
      userId: user.uid,
      userName: user.displayName || user.email || 'Unknown',
      userEmail: user.email || '',
      userPhone: user.phoneNumber || '',
      coinsRequested: coins,
      invoiceImage: invoicePreview,
    };

    try {
      await createRequest(input);
      // Reset form
      setShowRequestDialog(false);
      setCoinsRequested('');
      setInvoiceFile(null);
      setInvoicePreview(null);
    } catch {
      // Error handling is done in the store
    }
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    try {
      const dateObj = date instanceof Date ? date : new Date(date);
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
            <Clock size={12} />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
            <CheckCircle size={12} />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
            <XCircle size={12} />
            Rejected
          </span>
        );
      default:
        return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  const coinDisplay = useMemo(() => {
    if (loading) return '…';
    if (!wallet) return '0';
    return wallet.coins.toLocaleString();
  }, [loading, wallet]);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900">My Wallet</h1>
        <p className="text-sm text-slate-500">Manage your Toven coins and payment requests.</p>
        {customerDisplayId !== '—' ? (
          <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold uppercase tracking-wide text-slate-600">
            CID: {customerDisplayId}
          </div>
        ) : null}
      </div>

      {/* Wallet Balance Card */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-8 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-purple-600">
              <Coins size={28} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Coin Balance</p>
              <p className="text-4xl font-bold text-slate-900">
                {coinDisplay}
                {!loading && wallet && <span className="ml-2 text-base font-medium text-slate-500">coins</span>}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowRequestDialog(true)}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-purple-700"
          >
            <Plus size={18} />
            Request Coins
          </button>
        </div>

        {roleLoading && !wallet && !loading && (
          <p className="mt-6 text-sm text-slate-500">Loading your account details…</p>
        )}

        {loading && (
          <p className="mt-6 text-sm text-slate-500">Loading your wallet balance…</p>
        )}

        {!loading && !wallet && !roleLoading && (
          <p className="mt-6 rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-600">
            You don't have a wallet yet. Place an order or contact support to activate your wallet.
          </p>
        )}
      </div>

      {/* Coin Requests History */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Request History</h2>
          <p className="text-sm text-slate-500">Track your coin top-up requests and their status.</p>
        </div>

        <div className="p-6">
          {requestsLoading && (
            <p className="text-center text-sm text-slate-500">Loading requests…</p>
          )}

          {!requestsLoading && requests.length === 0 && (
            <div className="rounded-lg bg-slate-50 px-4 py-12 text-center">
              <Coins className="mx-auto mb-3 text-slate-400" size={48} />
              <p className="text-sm font-medium text-slate-700">No coin requests yet</p>
              <p className="text-xs text-slate-500">Submit a request to add coins to your wallet</p>
            </div>
          )}

          {!requestsLoading && requests.length > 0 && (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-start gap-4 rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                    <Coins size={24} />
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-slate-900">
                        {request.coinsRequested.toLocaleString()} coins
                      </p>
                      {getStatusBadge(request.status)}
                    </div>

                    <p className="text-sm text-slate-600">
                      Amount Paid: <span className="font-medium">₹{request.amountPaid.toLocaleString()}</span>
                    </p>

                    <p className="text-xs text-slate-500">
                      Requested on {formatDate(request.createdAt)}
                    </p>

                    {request.status === 'approved' && request.reviewedAt && (
                      <p className="text-xs text-green-700">
                        Approved by {request.reviewedByName || 'Admin'} on {formatDate(request.reviewedAt)}
                      </p>
                    )}

                    {request.status === 'rejected' && (
                      <div className="mt-2 rounded-md bg-red-50 px-3 py-2">
                        <p className="text-xs font-medium text-red-800">Rejection Reason:</p>
                        <p className="text-xs text-red-700">
                          {request.statusNote || 'No reason provided'}
                        </p>
                        {request.reviewedAt && (
                          <p className="mt-1 text-xs text-red-600">
                            Rejected by {request.reviewedByName || 'Admin'} on {formatDate(request.reviewedAt)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {request.invoiceImage && (
                    <button
                      onClick={() => window.open(request.invoiceImage, '_blank')}
                      className="text-sm text-purple-600 hover:text-purple-700"
                    >
                      View Invoice
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Request Coins Dialog */}
      <Dialog
        open={showRequestDialog}
        onClose={() => {
          setShowRequestDialog(false);
          setCoinsRequested('');
          setInvoiceFile(null);
          setInvoicePreview(null);
        }}
        title="Request Coins"
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            Submit a payment invoice to request coins for your wallet. Our team will review and approve your request.
          </p>

          <div>
            <label htmlFor="coinsRequested" className="mb-1.5 block text-sm font-medium text-slate-700">
              Coins Requested *
            </label>
            <input
              id="coinsRequested"
              type="number"
              value={coinsRequested}
              onChange={(e) => setCoinsRequested(e.target.value)}
              placeholder="e.g., 100"
              min="1"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            {coinsRequested && parseInt(coinsRequested, 10) > 0 && (
              <p className="mt-1.5 text-sm text-slate-600">
                Amount to pay: <span className="font-semibold text-purple-600">₹{(parseInt(coinsRequested, 10) * coinPrice).toLocaleString()}</span>
                <span className="ml-1 text-xs text-slate-500">(1 coin = ₹{coinPrice})</span>
              </p>
            )}
          </div>

          <div>
            <label htmlFor="invoiceFile" className="mb-1.5 block text-sm font-medium text-slate-700">
              Payment Invoice *
            </label>
            <input
              id="invoiceFile"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-purple-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-purple-700 hover:file:bg-purple-200"
            />
            <p className="mt-1 text-xs text-slate-500">Upload a clear image of your payment receipt (max 5MB)</p>

            {invoicePreview && (
              <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                <img
                  src={invoicePreview}
                  alt="Invoice preview"
                  className="h-48 w-full object-contain bg-slate-50"
                />
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setShowRequestDialog(false);
                setCoinsRequested('');
                setInvoiceFile(null);
                setInvoicePreview(null);
              }}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitRequest}
              disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default WalletPage;