import React from 'react';
import { Bell, Search, User, Menu } from 'lucide-react';
import { ViewState } from '../types';

interface Props {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

const GlobalHeader: React.FC<Props> = ({ currentView, onNavigate }) => {
  return (
    <header className="sticky top-0 z-50 w-full bg-slate-950/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-white">
          C
        </div>
        <h1 className="text-lg font-semibold text-white tracking-tight">Citylink</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-400 hover:text-white transition-colors">
          <Search size={20} />
        </button>
        <button className="p-2 text-slate-400 hover:text-white transition-colors relative">
          <Bell size={20} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full border-2 border-slate-950"></span>
        </button>
        <button 
          onClick={() => onNavigate('profile')}
          className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300 overflow-hidden"
        >
          <User size={18} />
        </button>
      </div>
    </header>
  );
};

export default GlobalHeader;
