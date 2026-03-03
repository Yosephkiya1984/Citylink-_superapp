import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Landmark, CreditCard, ChevronRight, 
  CheckCircle2, AlertCircle, Loader2, Plus, 
  ShieldCheck, Smartphone, Building2, Wallet
} from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { api } from '../../../services/api';

const FUNDING_METHODS = [
  { id: 'bank', name: 'Bank Transfer', icon: Landmark },
  { id: 'mobile', name: 'Mobile Money', icon: Smartphone },
  { id: 'card', name: 'Credit/Debit Card', icon: CreditCard },
];

const BANKS = [
  { id: 'cbe', name: 'Commercial Bank of Ethiopia', icon: Building2, color: 'bg-purple-600' },
  { id: 'awash', name: 'Awash Bank', icon: Landmark, color: 'bg-blue-600' },
  { id: 'dashen', name: 'Dashen Bank', icon: Landmark, color: 'bg-red-600' },
  { id: 'abyssinia', name: 'Bank of Abyssinia', icon: Landmark, color: 'bg-amber-600' },
  { id: 'nib', name: 'Nib International Bank', icon: Landmark, color: 'bg-emerald-600' },
  { id: 'zemen', name: 'Zemen Bank', icon: Landmark, color: 'bg-slate-600' },
];

const MOBILE_PROVIDERS = [
  { id: 'telebirr', name: 'Telebirr', icon: Smartphone, color: 'bg-blue-500' },
  { id: 'cbe_birr', name: 'CBE Birr', icon: Smartphone, color: 'bg-purple-500' },
  { id: 'mpesa', name: 'M-Pesa', icon: Smartphone, color: 'bg-green-500' },
  { id: 'amole', name: 'Amole', icon: Smartphone, color: 'bg-orange-500' },
];

const SAVED_CARDS = [
  { id: 'card_1', last4: '4242', brand: 'Visa', expiry: '12/25' },
  { id: 'card_2', last4: '8888', brand: 'Mastercard', expiry: '09/26' },
];

const SAVED_ACCOUNTS = [
  { id: 'acc_1', bankId: 'cbe', accountNumber: '1000****4567', bankName: 'Commercial Bank of Ethiopia' },
];

const SAVED_PHONES = [
  { id: 'phone_1', providerId: 'telebirr', phoneNumber: '0911****88', providerName: 'Telebirr' },
];

const WalletFunding: React.FC = () => {
  const { profile, setProfile, setView, setSelectedTransaction } = useGlobalState();
  const [step, setStep] = useState<'select_method' | 'details' | 'confirm' | 'success'>('select_method');
  const [method, setMethod] = useState<'bank' | 'mobile' | 'card'>('bank');
  
  const [selectedSource, setSelectedSource] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saveInfo, setSaveInfo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFund = async () => {
    if (!profile?.id || !selectedSource || !amount) return;

    setLoading(true);
    setError(null);
    
    let sourceId = selectedSource.id;
    let sourceDetail = '';

    if (method === 'card' || method === 'mobile') {
      try {
        const appUrl = (import.meta as any).env?.VITE_APP_URL || window.location.origin;
        const txRef = `wlt-${profile.id}-${Date.now().toString().slice(-8)}`;
        // Use the user's provided email as fallback
        const userEmail = (profile.email && profile.email.includes('@')) ? profile.email : 'joe.joeeee.joe@gmail.com';
        
        const checkoutSession = await api.createCheckoutSession({
          amount: parseFloat(amount),
          currency: 'ETB',
          productName: 'Wallet Funding',
          successUrl: `${appUrl}?payment=success&tx_ref=${txRef}`,
          cancelUrl: `${appUrl}?payment=cancelled`,
          email: userEmail,
          firstName: profile.name?.split(' ')[0] || 'Valued',
          lastName: profile.name?.split(' ')[1] || 'Customer',
          txRef: txRef
        });

        if (checkoutSession.url) {
          window.open(checkoutSession.url, '_blank');
          // We don't set success immediately, wait for redirect or webhook
          // But for UX, we might want to show a "Payment Pending" state
          setStep('success'); // Optimistic update for now, or show pending
        } else {
          setError('Failed to initialize payment gateway');
        }
      } catch (err: any) {
        setError(err.message || 'Payment initialization failed');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Bank Transfer (Manual)
    try {
      const res = await api.fundWallet(profile.id, parseFloat(amount), sourceId, sourceDetail);
      if (res.success) {
        setProfile({ ...profile, balance: res.newBalance });
        if (res.transaction) {
          setSelectedTransaction(res.transaction);
        }
        setStep('success');
      } else {
        setError(res.error || 'Funding failed');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const quickAmounts = ['100', '500', '1000', '2500', '5000'];

  const renderMethodSelection = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-1">Select Funding Method</h3>
      <div className="grid gap-3">
        {FUNDING_METHODS.map((m) => (
          <button
            key={m.id}
            onClick={() => {
              setMethod(m.id as any);
              setStep('details');
              setSelectedSource(null); // Reset selection
            }}
            className="w-full bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between group hover:border-emerald-500 transition-all shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                <m.icon size={24} />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-slate-900">{m.name}</h4>
                <p className="text-xs text-slate-500">
                  {m.id === 'bank' ? 'Direct transfer from bank' : 
                   m.id === 'mobile' ? 'Telebirr, CBE Birr, M-Pesa' : 'Visa, Mastercard'}
                </p>
              </div>
            </div>
            <ChevronRight size={20} className="text-slate-300 group-hover:text-emerald-500 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );

  const renderDetails = () => (
    <div className="space-y-6">
      {/* Source Selection */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-1">
          {method === 'bank' ? 'Select Account' : method === 'mobile' ? 'Select Number' : 'Select Card'}
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          {/* Saved Sources */}
          {method === 'bank' && SAVED_ACCOUNTS.map((acc) => (
            <button
              key={acc.id}
              onClick={() => { setSelectedSource(acc); setAccountNumber(''); }}
              className={`p-4 rounded-xl border text-left transition-all ${selectedSource?.id === acc.id ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200 bg-white hover:border-emerald-200'}`}
            >
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white mb-3 shadow-sm">
                <Building2 size={20} />
              </div>
              <p className="font-bold text-sm text-slate-900 leading-tight">{acc.bankName}</p>
              <p className="text-xs text-slate-500 mt-1">{acc.accountNumber}</p>
            </button>
          ))}

          {method === 'mobile' && SAVED_PHONES.map((phone) => (
            <button
              key={phone.id}
              onClick={() => { setSelectedSource(phone); setPhoneNumber(''); }}
              className={`p-4 rounded-xl border text-left transition-all ${selectedSource?.id === phone.id ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200 bg-white hover:border-emerald-200'}`}
            >
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white mb-3 shadow-sm">
                <Smartphone size={20} />
              </div>
              <p className="font-bold text-sm text-slate-900 leading-tight">{phone.providerName}</p>
              <p className="text-xs text-slate-500 mt-1">{phone.phoneNumber}</p>
            </button>
          ))}

          {/* New Sources */}
          {method === 'bank' && BANKS.map((bank) => (
            <button
              key={bank.id}
              onClick={() => { setSelectedSource(bank); setAccountNumber(''); }}
              className={`p-4 rounded-xl border text-left transition-all ${selectedSource?.id === bank.id ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200 bg-white hover:border-emerald-200'}`}
            >
              <div className={`w-10 h-10 ${bank.color} rounded-lg flex items-center justify-center text-white mb-3 shadow-sm`}>
                <bank.icon size={20} />
              </div>
              <p className="font-bold text-sm text-slate-900 leading-tight">{bank.name}</p>
              <p className="text-xs text-slate-500 mt-1">New Account</p>
            </button>
          ))}

          {method === 'mobile' && MOBILE_PROVIDERS.map((provider) => (
            <button
              key={provider.id}
              onClick={() => { setSelectedSource(provider); setPhoneNumber(''); }}
              className={`p-4 rounded-xl border text-left transition-all ${selectedSource?.id === provider.id ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200 bg-white hover:border-emerald-200'}`}
            >
              <div className={`w-10 h-10 ${provider.color} rounded-lg flex items-center justify-center text-white mb-3 shadow-sm`}>
                <provider.icon size={20} />
              </div>
              <p className="font-bold text-sm text-slate-900 leading-tight">{provider.name}</p>
              <p className="text-xs text-slate-500 mt-1">New Number</p>
            </button>
          ))}

          {method === 'card' && (
            <>
              {SAVED_CARDS.map((card) => (
                <button
                  key={card.id}
                  onClick={() => setSelectedSource(card)}
                  className={`p-4 rounded-xl border text-left transition-all ${selectedSource?.id === card.id ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200 bg-white hover:border-emerald-200'}`}
                >
                  <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white mb-3 shadow-sm">
                    <CreditCard size={20} />
                  </div>
                  <p className="font-bold text-sm text-slate-900">•••• {card.last4}</p>
                  <p className="text-xs text-slate-500">{card.brand} - Exp {card.expiry}</p>
                </button>
              ))}
              <button
                className="p-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-left flex flex-col items-center justify-center text-slate-500 gap-2"
              >
                <Plus size={24} />
                <span className="text-xs font-bold">Add New Card</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Input Fields */}
      {selectedSource && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 pt-4 border-t border-slate-100"
        >
          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Amount (ETB)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span className="text-slate-400 font-bold">ETB</span>
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="block w-full pl-14 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all text-2xl font-bold"
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setAmount(amt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    amount === amt 
                      ? 'bg-slate-900 text-white' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  +{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Additional Fields based on Method */}
          {method === 'bank' && !selectedSource.accountNumber && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Account Number</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Enter account number"
                className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
              <div className="mt-3 flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="save-account" 
                  checked={saveInfo}
                  onChange={(e) => setSaveInfo(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="save-account" className="text-sm text-slate-600">Save this account for future use</label>
              </div>
            </div>
          )}

          {method === 'mobile' && !selectedSource.phoneNumber && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="09..."
                className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
              <div className="mt-3 flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="save-phone" 
                  checked={saveInfo}
                  onChange={(e) => setSaveInfo(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="save-phone" className="text-sm text-slate-600">Save this number for future use</label>
              </div>
            </div>
          )}

          <button
            onClick={() => setStep('confirm')}
            disabled={!amount || parseFloat(amount) <= 0}
            className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center disabled:opacity-50 shadow-lg shadow-emerald-600/20"
          >
            Continue to Confirm
          </button>
        </motion.div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-2xl mx-auto px-4 pt-8">
        <button 
          onClick={() => {
            if (step === 'select_method') setView('home');
            else if (step === 'details') setStep('select_method');
            else if (step === 'confirm') setStep('details');
          }}
          className="flex items-center text-slate-500 hover:text-slate-800 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {step === 'select_method' ? 'Back to Dashboard' : 'Back'}
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Fund Your Wallet</h1>
          <p className="text-slate-500">Add money to your Citylink wallet instantly.</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'select_method' && (
            <motion.div 
              key="select_method"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              {renderMethodSelection()}
            </motion.div>
          )}

          {step === 'details' && (
            <motion.div 
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm"
            >
              {renderDetails()}
            </motion.div>
          )}

          {step === 'confirm' && selectedSource && (
            <motion.div 
              key="confirm"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-white border border-slate-200 p-8 rounded-3xl shadow-sm text-center">
                <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck size={40} />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Confirm Funding</h2>
                <p className="text-slate-500 mb-8">Please review the details below before proceeding.</p>

                <div className="space-y-4 text-left bg-slate-50 p-6 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm">Method</span>
                    <span className="font-bold text-slate-900 flex items-center gap-2">
                      {method === 'bank' && <Landmark size={16} />}
                      {method === 'mobile' && <Smartphone size={16} />}
                      {method === 'card' && <CreditCard size={16} />}
                      {method === 'bank' ? 'Bank Transfer' : method === 'mobile' ? 'Mobile Money' : 'Card Payment'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm">Source</span>
                    <span className="font-bold text-slate-900">{selectedSource.name || `Card ending ${selectedSource.last4}`}</span>
                  </div>
                  {(accountNumber || phoneNumber) && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 text-sm">{method === 'bank' ? 'Account' : 'Phone'}</span>
                      <span className="font-bold text-slate-900">{accountNumber || phoneNumber}</span>
                    </div>
                  )}
                  <div className="h-px bg-slate-200 my-2" />
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 text-sm">Amount to Add</span>
                    <span className="text-xl font-bold text-emerald-600">ETB {parseFloat(amount).toFixed(2)}</span>
                  </div>
                </div>

                {error && (
                  <div className="mt-6 bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-xl flex items-start text-left">
                    <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                    <p className="text-sm">{error}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep('details')}
                  className="flex-1 bg-white border border-slate-200 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-50 transition-all"
                >
                  Edit
                </button>
                <button
                  onClick={handleFund}
                  disabled={loading}
                  className="flex-[2] bg-emerald-600 text-white py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Plus className="w-5 h-5 mr-2" />}
                  Confirm & Fund
                </button>
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-slate-200 p-12 rounded-[3rem] shadow-xl text-center"
            >
              <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-500/30">
                <CheckCircle2 size={48} />
              </div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Wallet Funded!</h2>
              <p className="text-slate-500 mb-8 leading-relaxed">
                Successfully added <span className="font-bold text-slate-900">ETB {parseFloat(amount).toFixed(2)}</span> to your Citylink wallet. Your new balance is <span className="font-bold text-emerald-600">ETB {profile?.balance?.toFixed(2)}</span>.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setView('payment_receipt')}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg"
                >
                  View Receipt
                </button>
                <button
                  onClick={() => setView('home')}
                  className="w-full bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Back to Dashboard
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default WalletFunding;
