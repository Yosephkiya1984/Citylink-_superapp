import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Phone, ArrowRight, ShieldCheck } from 'lucide-react';

interface Props {
  onLoginSuccess: (phone: string) => void;
}

const LoginScreen: React.FC<Props> = ({ onLoginSuccess }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length < 9) return;
    
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      onLoginSuccess(phone);
      setLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 z-10"
      >
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500 shadow-lg shadow-emerald-500/20 mb-4">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Citylink</h1>
          <p className="text-slate-400 text-lg">Your gateway to Addis Ababa</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 ml-1">Phone Number</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
              <input 
                type="tel"
                placeholder="0911 22 33 44"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading || phone.length < 9}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all group"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin"></div>
            ) : (
              <>
                Continue <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="pt-8 text-center">
          <p className="text-slate-500 text-sm">
            By continuing, you agree to our <span className="text-emerald-500 cursor-pointer">Terms of Service</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginScreen;
