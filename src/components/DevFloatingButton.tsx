import React from 'react';
import { Shield, X } from 'lucide-react';
import { useGlobalState } from './context/GlobalStateContext';

const DevFloatingButton: React.FC = () => {
  const { setAdminTerminalVisible, adminTerminalVisible } = useGlobalState();

  return (
    <button 
      onClick={() => setAdminTerminalVisible(!adminTerminalVisible)}
      className="fixed bottom-24 right-6 w-16 h-16 bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 rounded-full flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:border-emerald-500/50 transition-all shadow-2xl z-[60]"
      title={adminTerminalVisible ? "Close Oversight" : "Open Oversight"}
    >
      {adminTerminalVisible ? <X size={28} /> : <Shield size={28} />}
    </button>
  );
};

export default DevFloatingButton;
