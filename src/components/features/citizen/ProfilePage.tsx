import React from 'react';
import { motion } from 'motion/react';
import { 
  ArrowLeft, User, Wallet, ShieldCheck, Store, Settings, 
  LogOut, ChevronRight, AlertCircle, Clock, CheckCircle2 
} from 'lucide-react';
import { api } from '../../../services/api';
import { useGlobalState } from '../../context/GlobalStateContext';

const ProfilePage: React.FC = () => {
  const { setView, profile, setProfile } = useGlobalState();

  const handleLogout = async () => {
    await api.logout();
    setProfile(null);
    setView('onboarding');
  };

  const renderKycStatus = () => {
    switch (profile?.kyc_status) {
      case 'VERIFIED':
        return <span className="flex items-center gap-1.5 text-xs text-emerald-500"><CheckCircle2 size={14} /> Verified</span>;
      case 'PENDING':
        return <span className="flex items-center gap-1.5 text-xs text-amber-500"><Clock size={14} /> Pending</span>;
      case 'REJECTED':
        return <span className="flex items-center gap-1.5 text-xs text-red-500"><AlertCircle size={14} /> Rejected</span>;
      default:
        return <span className="flex items-center gap-1.5 text-xs text-slate-500"><AlertCircle size={14} /> Not Verified</span>;
    }
  };

  const renderMerchantStatus = () => {
    switch (profile?.merchant_status) {
      case 'APPROVED':
        return <span className="flex items-center gap-1.5 text-xs text-emerald-500"><CheckCircle2 size={14} /> Approved</span>;
      case 'PENDING':
        return <span className="flex items-center gap-1.5 text-xs text-amber-500"><Clock size={14} /> Pending Review</span>;
      case 'REJECTED':
        return <span className="flex items-center gap-1.5 text-xs text-red-500"><AlertCircle size={14} /> Rejected</span>;
      default:
        return <span className="flex items-center gap-1.5 text-xs text-slate-500"><AlertCircle size={14} /> Not a Merchant</span>;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-slate-950 text-white pb-24"
    >
      {/* Header */}
      <div className="p-6 flex items-center gap-4 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-30">
        <button 
          onClick={() => setView('home')}
          className="p-2 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-bold">My Profile</h2>
      </div>

      <div className="p-6 space-y-8">
        {/* User Info */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center">
            <User size={32} className="text-emerald-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{profile?.name || 'Citizen'}</h1>
            <p className="text-slate-400 font-mono">{profile?.phone}</p>
          </div>
        </div>

        {/* Wallet Card */}
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Total Balance</span>
            <span className="text-sm font-bold text-emerald-500">ETB {profile?.balance?.toFixed(2)}</span>
          </div>
          <button 
            onClick={() => setView('wallet_funding')}
            className="w-full bg-emerald-500 text-slate-950 font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm hover:bg-emerald-400 transition-colors"
          >
            <Wallet size={16} /> Top Up Balance
          </button>
        </div>

        {/* Account Status Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Account Status</h3>
          <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden">
            <button className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-900 transition-colors">
              <div className="flex items-center gap-4">
                <ShieldCheck size={20} className="text-slate-400" />
                <span className="font-semibold">Identity Verification (KYC)</span>
              </div>
              <div className="flex items-center gap-2">
                {renderKycStatus()}
                <ChevronRight size={16} className="text-slate-600" />
              </div>
            </button>
            <div className="h-[1px] bg-white/5 mx-5" />
            <button className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-900 transition-colors">
              <div className="flex items-center gap-4">
                <Store size={20} className="text-slate-400" />
                <span className="font-semibold">Merchant Status (KYB)</span>
              </div>
              <div className="flex items-center gap-2">
                {renderMerchantStatus()}
                {profile?.merchant_status === 'APPROVED' && <ChevronRight size={16} className="text-slate-600" />}
              </div>
            </button>
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Settings</h3>
          <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden">
            <button className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-900 transition-colors">
              <div className="flex items-center gap-4">
                <Settings size={20} className="text-slate-400" />
                <span className="font-semibold">App Settings</span>
              </div>
              <ChevronRight size={16} className="text-slate-600" />
            </button>
          </div>
        </div>

        {/* Logout */}
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 py-4 text-red-500 font-bold bg-red-500/10 rounded-2xl hover:bg-red-500/20 transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </motion.div>
  );
};

export default ProfilePage;
