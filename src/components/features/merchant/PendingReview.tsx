import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Clock, CheckCircle2, AlertCircle, RefreshCw, LogOut, ArrowRight } from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { api } from '../../../services/api';

const PendingReview: React.FC = () => {
  const { profile, setProfile, setView } = useGlobalState();
  const [isChecking, setIsChecking] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  const [approvedProfile, setApprovedProfile] = useState<any>(null);

  const checkStatus = async () => {
    if (!profile?.id) return;
    setIsChecking(true);
    try {
      const updatedProfile = await api.getProfile(profile.id);
      if (updatedProfile) {
        // If approved, set local state but DO NOT update global profile yet
        // This keeps the user on this screen so we can show the success message
        if (updatedProfile.merchant_status === 'APPROVED') {
          setIsApproved(true);
          setApprovedProfile(updatedProfile);
        } else if (updatedProfile.merchant_status !== 'PENDING') {
          // For rejection or other states, update global profile
          setProfile(updatedProfile);
        }
      }
    } catch (error) {
      console.error('Failed to check status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // If we are already approved but somehow here (e.g. race condition), show approved state
    if (profile?.merchant_status === 'APPROVED') {
      setIsApproved(true);
      setApprovedProfile(profile);
    }

    const interval = setInterval(checkStatus, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [profile?.id, profile?.merchant_status]);

  const handleEnterDashboard = () => {
    if (approvedProfile) {
      setProfile(approvedProfile);
      // App.tsx will automatically route to the correct dashboard based on role/status
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
      setProfile(null);
      setView('home');
    } catch (e) {
      console.error("Logout error:", e);
    }
  };

  if (isApproved) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6"
      >
        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-emerald-500 rounded-full mx-auto flex items-center justify-center shadow-2xl shadow-emerald-500/40 animate-bounce">
            <CheckCircle2 size={48} className="text-slate-950" />
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-bold text-white tracking-tight">Application Approved!</h2>
            <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
              Your merchant account has been verified and approved. You can now access your dashboard.
            </p>
          </div>

          <button 
            onClick={handleEnterDashboard}
            className="flex items-center gap-2 px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl mx-auto transition-all shadow-lg shadow-emerald-500/20"
          >
            <span>Enter Dashboard</span>
            <ArrowRight size={20} />
          </button>
        </div>
      </motion.div>
    );
  }

  const renderStatus = () => {
    switch (profile?.merchant_status) {
      case 'PENDING':
        return (
          <div className="text-center space-y-6">
            <div className="relative mx-auto w-16 h-16">
              <Clock size={64} className="text-amber-500 animate-pulse" />
              {isChecking && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-full border-4 border-emerald-500 rounded-full animate-ping opacity-20"></div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-white tracking-tight">Application Under Review</h2>
              <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
                Your application has been submitted and is currently being reviewed by the oversight committee. This process typically takes up to 24 hours.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button 
                onClick={checkStatus}
                disabled={isChecking}
                className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-all disabled:opacity-50"
              >
                <RefreshCw size={18} className={isChecking ? 'animate-spin' : ''} />
                <span>{isChecking ? 'Checking...' : 'Refresh Status'}</span>
              </button>
              
              <button 
                onClick={handleLogout}
                className="flex items-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all"
              >
                <LogOut size={18} />
                <span>Sign Out</span>
              </button>
            </div>
            
            <p className="text-slate-600 text-xs uppercase tracking-widest">
              Auto-refreshing every 5s
            </p>
          </div>
        );
      case 'REJECTED':
        return (
          <div className="text-center space-y-6">
            <AlertCircle size={64} className="mx-auto text-red-500" />
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-white tracking-tight">Application Rejected</h2>
              <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
                We regret to inform you that your merchant application has been rejected. Please check your registered email for more details regarding the decision.
              </p>
            </div>
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl mx-auto transition-all"
            >
              <LogOut size={20} />
              <span>Return to Home</span>
            </button>
          </div>
        );
      default:
        return null; 
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6"
    >
      {renderStatus()}
    </motion.div>
  );
};

export default PendingReview;
