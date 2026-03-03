import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, AlertCircle, CheckCircle2, CreditCard, Calendar, MapPin, Car, ArrowLeft, Loader2, ArrowRight, ShieldAlert, FileText } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { api } from '../../../services/api';
import { TrafficFine } from '../../../types';

const TrafficFinePayment: React.FC = () => {
  const { profile, setProfile, setView, setSelectedTransaction } = useGlobalState();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'plate' | 'notice'>('plate');
  const [fines, setFines] = useState<TrafficFine[]>([]);
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState<string | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<'citylink' | 'telebirr' | 'cbe'>('citylink');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await api.getTrafficFines(searchQuery.trim());
      setFines(data);
      if (data.length === 0) {
        setError(`No outstanding fines found for this ${searchType === 'plate' ? 'plate number' : 'notice number'}.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch fines.');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (fine: TrafficFine) => {
    if (!profile?.id) return;
    
    setPaying(fine.id);
    setError(null);
    try {
      const res = await api.payTrafficFine(fine.id, profile.id, paymentProvider);
      
      setFines(prev => prev.map(f => f.id === fine.id ? { ...f, status: 'PAID' } : f));
      setSuccess(`Fine for ${fine.violationType} paid successfully via ${paymentProvider.toUpperCase()}.`);
      
      if (res.transaction) {
        setSelectedTransaction(res.transaction);
      }

      if (paymentProvider === 'citylink' && profile.balance !== undefined) {
        setProfile({ ...profile, balance: profile.balance - fine.amount });
      }
    } catch (err: any) {
      setError(err.message || 'Payment failed.');
    } finally {
      setPaying(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] pb-24 font-sans selection:bg-red-500/30">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-b from-red-900/80 to-[#020617] pt-8 pb-12 px-6 rounded-b-[40px] shadow-2xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-red-500/10 blur-3xl" />
          <div className="absolute bottom-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-orange-500/10 blur-3xl" />
        </div>

        <div className="relative z-10">
          <button 
            onClick={() => setView('home')}
            className="flex items-center text-red-200 hover:text-white transition-colors mb-6 font-medium text-sm bg-white/5 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 w-fit"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center border border-red-500/30 shadow-inner">
              <ShieldAlert className="w-7 h-7 text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">Traffic Authority</h1>
              <p className="text-red-200 text-sm font-medium">Addis Ababa Traffic Management Agency</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-6 space-y-6 relative z-20">
        {/* Search Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl backdrop-blur-xl">
          <div className="flex gap-2 mb-6 p-1.5 bg-slate-950 rounded-2xl border border-slate-800">
            <button
              onClick={() => setSearchType('plate')}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${searchType === 'plate' ? 'bg-slate-800 text-white shadow-md border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <Car className="w-4 h-4" /> Plate No.
            </button>
            <button
              onClick={() => setSearchType('notice')}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${searchType === 'notice' ? 'bg-slate-800 text-white shadow-md border border-slate-700' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <FileText className="w-4 h-4" /> Notice No.
            </button>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                {searchType === 'plate' ? <Car className="h-5 w-5 text-slate-500" /> : <AlertCircle className="h-5 w-5 text-slate-500" />}
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                placeholder={searchType === 'plate' ? "e.g. AA-2-12345" : "e.g. N-2026-001"}
                className="block w-full pl-12 pr-4 py-4 bg-slate-950 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all uppercase font-mono tracking-wider text-white placeholder-slate-600 outline-none shadow-inner"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !searchQuery.trim()}
              className="w-full bg-gradient-to-r from-red-600 to-rose-600 text-white py-4 rounded-2xl font-bold hover:from-red-500 hover:to-rose-500 transition-all flex items-center justify-center disabled:opacity-50 shadow-lg shadow-red-900/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Search className="w-5 h-5 mr-2" />}
              Search Records
            </button>
          </form>
        </div>

        {/* Status Messages */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-4 rounded-2xl flex items-start shadow-lg backdrop-blur-md"
            >
              <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium leading-relaxed">{error}</p>
            </motion.div>
          )}

          {success && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-5 py-4 rounded-2xl shadow-lg backdrop-blur-md"
            >
              <div className="flex items-start">
                <CheckCircle2 className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-bold leading-relaxed">{success}</p>
                  <button 
                    onClick={() => setView('payment_receipt')}
                    className="mt-3 text-xs font-black uppercase tracking-widest text-emerald-300 hover:text-white transition-colors flex items-center gap-1 bg-emerald-500/20 px-3 py-1.5 rounded-lg w-fit"
                  >
                    View Receipt <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Payment Provider Selection */}
        {fines.some(f => f.status === 'UNPAID') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-2">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 px-2">Select Payment Method</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'citylink', name: 'Citylink', color: 'emerald', icon: <CreditCard className="w-6 h-6" /> },
                { id: 'telebirr', name: 'Telebirr', color: 'blue', icon: <CreditCard className="w-6 h-6" /> },
                { id: 'cbe', name: 'CBE Birr', color: 'purple', icon: <CreditCard className="w-6 h-6" /> }
              ].map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => setPaymentProvider(provider.id as any)}
                  className={`p-4 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${
                    paymentProvider === provider.id 
                      ? `border-red-500 bg-red-500/10 text-white shadow-[0_0_15px_rgba(239,68,68,0.2)]` 
                      : `border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800`
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${paymentProvider === provider.id ? 'bg-red-500 text-white shadow-inner' : 'bg-slate-800 text-slate-500'}`}>
                    {provider.icon}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider">{provider.name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Fines List */}
        <div className="space-y-4 pt-2">
          <AnimatePresence>
            {fines.map((fine) => (
              <motion.div
                key={fine.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl relative"
              >
                {/* Status Glow */}
                <div className={`absolute top-0 left-0 w-1 h-full ${fine.status === 'PAID' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]'}`} />

                <div className="p-6 pl-8">
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <div className="flex gap-2 mb-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                          fine.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {fine.status}
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-800 text-slate-400 border border-slate-700">
                          {fine.noticeNumber}
                        </span>
                      </div>
                      <h3 className="text-xl font-black text-white leading-tight">{fine.violationType}</h3>
                    </div>
                    <div className="text-right bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800">
                      <p className="text-2xl font-black text-white">{fine.amount}</p>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">ETB</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
                    <div className="flex items-center text-sm font-medium text-slate-400">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center mr-3">
                        <Calendar className="w-4 h-4 text-slate-300" />
                      </div>
                      {new Date(fine.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="flex items-center text-sm font-medium text-slate-400">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center mr-3">
                        <MapPin className="w-4 h-4 text-slate-300" />
                      </div>
                      <span className="truncate">{fine.location}</span>
                    </div>
                  </div>

                  {fine.status === 'UNPAID' && (
                    <button
                      onClick={() => handlePay(fine)}
                      disabled={paying === fine.id}
                      className={`w-full py-4 rounded-2xl font-black uppercase tracking-wider text-sm transition-all flex items-center justify-center disabled:opacity-50 shadow-lg ${
                        paymentProvider === 'citylink' ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20' :
                        paymentProvider === 'telebirr' ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20' :
                        'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/20'
                      }`}
                    >
                      {paying === fine.id ? (
                        <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      ) : (
                        <CreditCard className="w-5 h-5 mr-2" />
                      )}
                      Pay with {paymentProvider === 'citylink' ? 'Citylink Wallet' : paymentProvider === 'telebirr' ? 'Telebirr' : 'CBE Birr'}
                    </button>
                  )}
                </div>
                
                {fine.status === 'PAID' && (
                  <div className="bg-emerald-500/10 px-6 py-4 border-t border-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-black uppercase tracking-widest backdrop-blur-sm">
                    <CheckCircle2 className="w-5 h-5 mr-2" />
                    Payment Verified & Cleared
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default TrafficFinePayment;
