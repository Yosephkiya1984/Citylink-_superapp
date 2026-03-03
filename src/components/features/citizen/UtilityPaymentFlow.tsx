import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Zap, Droplets, ArrowRight, CheckCircle2, 
  CreditCard, Landmark, Receipt, AlertCircle, Loader2,
  User, MapPin, Calendar
} from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { api } from '../../../services/api';
import { CityService } from '../../../types';

interface Props {
  service: CityService;
  onBack: () => void;
}

type Step = 'INPUT' | 'PREVIEW' | 'SUCCESS';

const UtilityPaymentFlow: React.FC<Props> = ({ service, onBack }) => {
  const { profile, setProfile, setView } = useGlobalState();
  const [step, setStep] = useState<Step>('INPUT');
  const [customerId, setCustomerId] = useState('');
  const [billData, setBillData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchBill = async () => {
    if (!customerId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.fetchUtilityBill(service.id, customerId);
      if (data.error) throw new Error(data.error);
      setBillData(data);
      setStep('PREVIEW');
    } catch (err: any) {
      setError(err.message || 'Could not find bill for this ID');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!profile || !billData) return;
    setLoading(true);
    try {
      const res = await api.pay(
        profile.id,
        service.id,
        billData.amount,
        `${service.name} - ${billData.period}`
      );

      if (res.success) {
        const updatedProfile = await api.getProfile(profile.id);
        setProfile({ ...updatedProfile, isLoggedIn: true });
        setStep('SUCCESS');
      } else {
        setError(res.error || 'Payment failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'INPUT':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Enter Customer ID</h2>
              <p className="text-slate-400 text-sm">
                Please enter your {service.name === 'Electric Bill' ? 'Meter Number' : 'Account Number'} to fetch your current bill.
              </p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
                  <Search size={18} />
                </div>
                <input 
                  type="text"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder={service.name === 'Electric Bill' ? 'e.g. EEU-99821' : 'e.g. AAWSA-7721'}
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl py-5 pl-12 pr-5 text-lg font-mono focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 p-4 rounded-xl border border-red-400/20">
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Help</p>
                <p className="text-xs text-slate-400 leading-relaxed">
                  You can find your ID on your previous paper bill or by dialing *889# on your phone.
                </p>
              </div>
            </div>

            <button 
              onClick={handleFetchBill}
              disabled={loading || !customerId}
              className="w-full bg-emerald-500 text-slate-950 font-bold py-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Fetch Bill Details'}
              {!loading && <ArrowRight size={20} />}
            </button>
          </motion.div>
        );

      case 'PREVIEW':
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-8"
          >
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Bill Summary</h2>
              <p className="text-slate-400 text-sm">Verified bill details for {billData.customerId}</p>
            </div>

            <div className="bg-slate-900 border border-white/10 rounded-3xl overflow-hidden">
              <div className="p-6 bg-emerald-500/5 border-b border-white/5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                    {service.icon === 'Zap' ? <Zap size={20} /> : <Droplets size={20} />}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{service.name}</p>
                    <p className="text-sm font-bold">{billData.period}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-emerald-500">ETB {billData.amount.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <User size={18} className="text-slate-500 mt-1" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Customer Name</p>
                    <p className="text-sm font-medium">{billData.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <MapPin size={18} className="text-slate-500 mt-1" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Address</p>
                    <p className="text-sm font-medium">{billData.address}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Calendar size={18} className="text-slate-500 mt-1" />
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Billing Cycle</p>
                    <p className="text-sm font-medium">{billData.period}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <span className="text-slate-400 text-sm">Wallet Balance</span>
                <span className="font-bold">ETB {profile?.balance?.toFixed(2)}</span>
              </div>
              
              <button 
                onClick={handlePayment}
                disabled={loading || (profile?.balance || 0) < billData.amount}
                className="w-full bg-emerald-500 text-slate-950 font-bold py-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : <CreditCard size={20} />}
                {loading ? 'Processing...' : `Pay ETB ${billData.amount.toFixed(2)}`}
              </button>
              
              {(profile?.balance || 0) < billData.amount && (
                <p className="text-center text-red-400 text-xs font-medium">Insufficient balance. Please top up your wallet.</p>
              )}
              
              <button 
                onClick={() => setStep('INPUT')}
                className="w-full text-slate-500 font-bold py-2 text-sm"
              >
                Change Customer ID
              </button>
            </div>
          </motion.div>
        );

      case 'SUCCESS':
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-8"
          >
            <div className="w-24 h-24 bg-emerald-500 rounded-full mx-auto flex items-center justify-center shadow-2xl shadow-emerald-500/40">
              <CheckCircle2 size={48} className="text-slate-950" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Payment Successful</h2>
              <p className="text-slate-400">Your {service.name} for {billData.period} has been paid.</p>
            </div>

            <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 text-left space-y-4">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <Receipt size={18} className="text-emerald-500" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Digital Receipt</span>
                </div>
                <span className="text-[10px] font-mono text-slate-500">#TX-{Math.random().toString(36).substring(7).toUpperCase()}</span>
              </div>
              <div className="grid grid-cols-2 gap-y-4">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Amount Paid</p>
                  <p className="text-lg font-bold">ETB {billData.amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Date</p>
                  <p className="text-sm font-medium">{new Date().toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Customer ID</p>
                  <p className="text-sm font-medium">{billData.customerId}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Status</p>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold uppercase">Completed</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => setView('home')}
                className="w-full bg-white text-slate-950 font-bold py-5 rounded-2xl transition-all"
              >
                Back to Home
              </button>
              <button className="w-full text-emerald-500 font-bold py-2 flex items-center justify-center gap-2">
                <Receipt size={18} /> Download PDF Receipt
              </button>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="px-6 py-4">
      <AnimatePresence mode="wait">
        {renderStep()}
      </AnimatePresence>
    </div>
  );
};

export default UtilityPaymentFlow;
