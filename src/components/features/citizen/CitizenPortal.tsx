import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Zap, Bus, Heart, GraduationCap, Landmark, 
  ArrowUpRight, ArrowDownLeft, Plus, QrCode, Droplets, Car, Train, Navigation, AlertTriangle, ArrowRight, Users, ShoppingCart, AlertCircle, BookOpen
} from 'lucide-react';
import { ViewState, CityService, Transaction } from '../../../types';
import { api } from '../../../services/api';
import { useGlobalState } from '../../context/GlobalStateContext';

interface Props {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onSelectTransaction?: (tx: Transaction) => void;
}

const CitizenPortal: React.FC<Props> = ({ currentView, setView, onSelectTransaction }) => {
  const { profile, setProfile, setSelectedService, setSelectedTransaction } = useGlobalState();
  const [services, setServices] = useState<CityService[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const iconMap: Record<string, any> = {
    Zap, Bus, Heart, GraduationCap, Landmark, Droplets, Car
  };

  useEffect(() => {
    if (profile?.id) {
      loadData();
    }
  }, [profile?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [srvs, txs, updatedProfile] = await Promise.all([
        api.getServices(),
        api.getTransactions(profile!.id),
        api.getProfile(profile!.id)
      ]);
      setServices(Array.isArray(srvs) ? srvs : []);
      setTransactions(Array.isArray(txs) ? txs : []);
      if (updatedProfile) {
        setProfile({ ...updatedProfile, isLoggedIn: true });
      }
    } catch (e) {
      console.error('Failed to load portal data', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async () => {
    // Simulate a payment for demo purposes
    if (!profile) return;
    const amount = 5.0;
    const res = await api.pay(profile.id, 'm_anbessa_bus', amount, 'Bus Fare');
    if (res.success) {
      loadData();
      if (res.transaction) {
        setSelectedTransaction(res.transaction);
        setView('payment_receipt');
      }
    }
  };

  const handleServiceClick = (service: CityService) => {
    if (service.id === 'trans_bus') {
      setView('transport_hub');
      return;
    }
    if (service.id === 'edu_fees') {
      setView('school_fees');
      return;
    }
    setSelectedService(service);
    setView('service_detail');
  };

  if (loading && !profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-24 pt-4 px-4 space-y-8">
      {/* Wallet Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl p-6 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-4 opacity-20">
          <Landmark size={80} />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-emerald-100 text-sm font-medium uppercase tracking-wider">Total Balance</p>
              <h2 className="text-4xl font-bold mt-1">ETB {profile?.balance?.toFixed(2) || '0.00'}</h2>
            </div>
            <button 
              onClick={() => setView('wallet_funding')}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition-colors flex items-center gap-2 px-4"
            >
              <Plus size={20} />
              <span className="text-sm font-bold">Top Up</span>
            </button>
          </div>
          
          <div className="flex gap-3 pt-2">
            <button 
              onClick={handlePay}
              className="flex-1 bg-white text-emerald-600 font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm active:scale-95 transition-transform"
            >
              <QrCode size={18} /> Pay Now
            </button>
            <button className="flex-1 bg-emerald-400/30 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-sm border border-white/20">
              <ArrowDownLeft size={18} /> Receive
            </button>
          </div>
        </div>
      </motion.div>

      {/* Services Grid */}
      <section className="space-y-4">
        <div className="flex justify-between items-end">
          <h3 className="text-lg font-bold text-white">City Services</h3>
          <button 
            onClick={() => setView('services')}
            className="text-emerald-500 text-sm font-medium"
          >
            View All
          </button>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {services.map((service) => {
            const Icon = iconMap[service.icon] || Zap;
            return (
              <button 
                key={service.id} 
                onClick={() => handleServiceClick(service)}
                className="flex flex-col items-center gap-2 group"
              >
                <div className={`bg-slate-800 p-4 rounded-2xl text-white shadow-lg group-hover:scale-110 group-hover:bg-emerald-500 transition-all`}>
                  <Icon size={24} />
                </div>
                <span className="text-[10px] font-medium text-slate-400 group-hover:text-white transition-colors text-center truncate w-full">{service.name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Transport Hub Card */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-white">City Mobility</h3>
        <button 
          onClick={() => setView('transport_hub')}
          className="w-full bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-[2.5rem] text-left relative overflow-hidden group active:scale-95 transition-all shadow-xl shadow-blue-500/20"
        >
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
            <Bus size={120} />
          </div>
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-lg">
              <Train size={32} className="text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Transport Hub</h3>
              <p className="text-blue-100 text-sm opacity-80">Live LRT & Bus Tracking</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-100">All Lines Operational</span>
              </div>
            </div>
          </div>
        </button>
      </section>

      {/* Jobs & Skills Card */}
      <section className="space-y-4">
        <div className="flex justify-between items-end">
          <h3 className="text-lg font-bold text-white">Career & Skills</h3>
        </div>
        <button 
          onClick={() => setView('job_dashboard')}
          className="w-full bg-gradient-to-br from-[#0047AB] to-blue-900 p-6 rounded-[2.5rem] text-left relative overflow-hidden group active:scale-95 transition-all flex items-center gap-6 shadow-xl shadow-blue-500/20"
        >
          <div className="p-4 bg-white/10 rounded-3xl shadow-lg">
            <GraduationCap size={32} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white">Jobs Dashboard</h3>
            <p className="text-blue-100 text-sm opacity-80">Manage your verified profile and applications.</p>
          </div>
          <div className="p-2 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors">
            <ArrowRight size={20} className="text-white" />
          </div>
        </button>
      </section>

      {/* City Reporting Card */}
      <section className="space-y-4">
        <div className="flex justify-between items-end">
          <h3 className="text-lg font-bold text-white">Civic Duty</h3>
        </div>
        <button 
          onClick={() => setView('city_report')}
          className="w-full bg-slate-900/50 border border-white/5 p-6 rounded-[2.5rem] text-left relative overflow-hidden group active:scale-95 transition-all flex items-center gap-6"
        >
          <div className="p-4 bg-amber-500/10 text-amber-500 rounded-3xl shadow-lg">
            <AlertTriangle size={32} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white">Report an Incident</h3>
            <p className="text-slate-500 text-sm">Help improve our city by reporting issues.</p>
          </div>
          <div className="p-2 bg-slate-800 rounded-full group-hover:bg-emerald-500 transition-colors">
            <ArrowRight size={20} className="text-slate-400 group-hover:text-slate-900" />
          </div>
        </button>
      </section>

      {/* Digital Ekub Card */}
      <section className="space-y-4">
        <div className="flex justify-between items-end">
          <h3 className="text-lg font-bold text-white">Community Savings</h3>
        </div>
        <button 
          onClick={() => setView('ekub')}
          className="w-full bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-[2.5rem] text-left relative overflow-hidden group active:scale-95 transition-all flex items-center gap-6"
        >
          <div className="p-4 bg-white/10 rounded-3xl shadow-lg">
            <Users size={32} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white">Digital Ekub</h3>
            <p className="text-emerald-100 text-sm opacity-80">Manage your community savings groups.</p>
          </div>
          <div className="p-2 bg-white/10 rounded-full group-hover:bg-white/20 transition-colors">
            <ArrowRight size={20} className="text-white" />
          </div>
        </button>
      </section>

      {/* Parking Card */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-white">Parking</h3>
        <button 
          onClick={() => setView('parking_citizen_hub')}
          className="w-full bg-gradient-to-br from-purple-600 to-indigo-800 p-6 rounded-[2.5rem] text-left relative overflow-hidden group active:scale-95 transition-all shadow-xl shadow-purple-500/20"
        >
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
            <Car size={120} />
          </div>
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-lg">
              <Car size={32} className="text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Find Parking</h3>
              <p className="text-purple-100 text-sm opacity-80">Locate and reserve parking spots in real-time.</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-100">Live Availability</span>
              </div>
            </div>
          </div>
        </button>
      </section>

      {/* Traffic Fine Card */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-white">Traffic Authority</h3>
        <button 
          onClick={() => setView('traffic_fines')}
          className="w-full bg-gradient-to-br from-red-600 to-rose-800 p-6 rounded-[2.5rem] text-left relative overflow-hidden group active:scale-95 transition-all shadow-xl shadow-red-500/20"
        >
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
            <AlertTriangle size={120} />
          </div>
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-lg">
              <AlertCircle size={32} className="text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">Traffic Fines</h3>
              <p className="text-red-100 text-sm opacity-80">Pay your traffic violations instantly.</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-100">Live Fine Search</span>
              </div>
            </div>
          </div>
        </button>
      </section>

      {/* School Fees Card */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-white">Education Bureau</h3>
        <button 
          onClick={() => setView('school_fees')}
          className="w-full bg-gradient-to-br from-emerald-600 to-emerald-800 p-6 rounded-[2.5rem] text-left relative overflow-hidden group active:scale-95 transition-all shadow-xl shadow-emerald-500/20"
        >
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
            <GraduationCap size={120} />
          </div>
          <div className="relative z-10 flex items-center gap-6">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center shadow-lg">
              <BookOpen size={32} className="text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white">School Fees</h3>
              <p className="text-emerald-100 text-sm opacity-80">Pay tuition and registration fees instantly.</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-100">Public Schools Integrated</span>
              </div>
            </div>
          </div>
        </button>
      </section>

      {/* Marketplace Card */}
      <section className="space-y-4">
        <div className="flex justify-between items-end">
          <h3 className="text-lg font-bold text-white">Local Marketplace</h3>
        </div>
        <button 
          onClick={() => setView('marketplace')}
          className="w-full bg-gradient-to-br from-slate-800 to-slate-950 border border-white/10 p-8 rounded-[3rem] text-left relative overflow-hidden group active:scale-95 transition-all shadow-2xl"
        >
          <div className="absolute -right-8 -top-8 w-48 h-48 bg-emerald-500/10 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-700"></div>
          <div className="relative z-10 flex items-center gap-8">
            <div className="w-20 h-20 bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2rem] flex items-center justify-center shadow-2xl group-hover:rotate-12 transition-transform">
              <ShoppingCart size={40} className="text-emerald-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-black tracking-tighter text-white uppercase">Addis Market</h3>
              <p className="text-slate-400 text-sm font-medium mt-1">Secure Escrow-Protected Trading</p>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex -space-x-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-6 h-6 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center overflow-hidden">
                      <img src={`https://picsum.photos/seed/user${i}/32/32`} alt="" referrerPolicy="no-referrer" />
                    </div>
                  ))}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">1.2k+ Active Citizens</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-emerald-500 text-slate-950 rounded-full flex items-center justify-center shadow-xl shadow-emerald-500/20 group-hover:translate-x-2 transition-transform">
              <ArrowRight size={24} />
            </div>
          </div>
        </button>
      </section>

      {/* Recent Activity */}
      <section className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold text-white">Recent Activity</h3>
          <button 
            onClick={() => setView('transaction_history')}
            className="text-emerald-500 text-sm font-medium hover:underline"
          >
            See All
          </button>
        </div>
        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm italic">No recent activity</div>
          ) : (
            transactions.slice(0, 5).map((tx) => (
              <div 
                key={tx.id} 
                className="bg-slate-900/50 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-slate-900 transition-colors cursor-pointer"
                onClick={() => {
                  setSelectedTransaction(tx);
                  setView('payment_receipt');
                }}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${tx.type === 'DEPOSIT' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-400'}`}>
                    {tx.type === 'DEPOSIT' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-sm">{tx.description || 'Transaction'}</h4>
                    <p className="text-slate-500 text-[10px]">{tx.timestamp ? new Date(tx.timestamp).toLocaleString() : ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${tx.type === 'DEPOSIT' ? 'text-emerald-500' : 'text-white'}`}>
                    {tx.type === 'DEPOSIT' ? '+' : '-'}{tx.amount.toFixed(2)}
                  </p>
                  <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">ETB</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default CitizenPortal;
