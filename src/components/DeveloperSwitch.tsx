import React from 'react';
import { useGlobalState } from './context/GlobalStateContext';
import { UserRole } from '../types';
import { X, User, ShoppingBag, Shield } from 'lucide-react';

const DeveloperSwitch: React.FC = () => {
  const { setUserRole, userRole, setShowDevSwitch } = useGlobalState();

  const roles: { id: UserRole; label: string; icon: any; color: string }[] = [
    { id: 'citizen', label: 'Citizen', icon: User, color: 'text-blue-500' },
    { id: 'merchant', label: 'Merchant', icon: ShoppingBag, color: 'text-emerald-500' },
    { id: 'minister', label: 'Minister', icon: Shield, color: 'text-rose-500' },
  ];

  return (
    <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-sm p-6 space-y-6 shadow-2xl">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">Developer Switch</h3>
          <button onClick={() => setShowDevSwitch(false)} className="text-slate-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => {
                setUserRole(role.id);
                setShowDevSwitch(false);
              }}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                userRole === role.id 
                  ? 'bg-white/5 border-white/20' 
                  : 'bg-transparent border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex items-center gap-3">
                <role.icon size={20} className={role.color} />
                <span className="text-white font-medium">{role.label}</span>
              </div>
              {userRole === role.id && <div className="w-2 h-2 bg-emerald-500 rounded-full" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DeveloperSwitch;
