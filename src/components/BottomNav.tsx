import React from 'react';
import { Home, Grid, Wallet, User } from 'lucide-react';
import { ViewState } from '../types';
import { clsx } from 'clsx';

interface Props {
  activeView: ViewState;
  setView: (view: ViewState) => void;
}

const BottomNav: React.FC<Props> = ({ activeView, setView }) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'services', label: 'Services', icon: Grid },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-lg border-t border-white/10 px-6 py-3 pb-6 flex justify-between items-center z-50 max-w-xl mx-auto">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setView(item.id as ViewState)}
            className={clsx(
              "flex flex-col items-center gap-1 transition-all duration-200",
              isActive ? "text-emerald-400 scale-110" : "text-slate-500 hover:text-slate-300"
            )}
          >
            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-medium uppercase tracking-wider">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
