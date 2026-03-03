import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Activity, Shield, Map, BarChart3, 
  AlertTriangle, CheckCircle2, X, RefreshCw, Building,
  FileBadge, Fingerprint, Check
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';
import { api } from '../services/api';

interface AdminStats {
  totalUsers: number;
  totalVolume: number;
  pendingMerchants: number;
  logs: { id: number; message: string; type: string; timestamp: string }[];
}

const MinisterialDashboard: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingMerchants, setPendingMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [statsData, merchantsData] = await Promise.all([
        api.getAdminStats(),
        api.getPendingMerchants()
      ]);
      setStats(statsData);
      setPendingMerchants(merchantsData);
    } catch (e) {
      console.error('Failed to load admin stats', e);
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (userId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.verifyMerchant(userId, status);
      loadData(); // Refresh data after action
    } catch (error) {
      console.error(`Failed to ${status.toLowerCase()} merchant`, error);
      alert(`Could not ${status.toLowerCase()} merchant. Please try again.`);
    }
  };

  const chartData = [
    { time: '00:00', load: 30 },
    { time: '04:00', load: 25 },
    { time: '08:00', load: 65 },
    { time: '12:00', load: 85 },
    { time: '16:00', load: 75 },
    { time: '20:00', load: 55 },
    { time: 'NOW', load: stats?.totalUsers ? (stats.totalUsers * 10) % 100 : 40 },
  ];

  if (loading && !stats) {
    return (
      <div className="fixed inset-0 z-[100] bg-slate-950 flex items-center justify-center">
        <div className="text-emerald-500 font-mono animate-pulse">INITIALIZING_OVERWATCH_v8.1...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 overflow-y-auto p-6 space-y-8 font-mono">
      <div className="flex justify-between items-start border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-emerald-500 mb-1">
            <Shield size={16} />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Sovereign Oversight</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tighter italic">ADDIS_COMMAND_CENTER_v8.1</h1>
        </div>
        <div className="flex gap-4">
          <button onClick={loadData} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 transition-colors">
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg text-slate-400 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Real-time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Citizens', value: stats?.totalUsers?.toLocaleString() || '0', status: 'optimal', icon: Activity },
          { label: 'Transaction Vol', value: `ETB ${stats?.totalVolume?.toLocaleString() || '0'}`, status: 'stable', icon: BarChart3 },
          { label: 'Pending Merch', value: stats?.pendingMerchants.toString() || '0', status: stats?.pendingMerchants ? 'action_req' : 'secure', icon: Shield },
          { label: 'System Uptime', value: '99.99%', status: 'optimal', icon: CheckCircle2 },
        ].map((stat, i) => (
          <div key={i} className="border border-white/10 p-4 space-y-3 bg-slate-900/30">
            <div className="flex justify-between items-center">
              <stat.icon size={16} className="text-slate-500" />
              <span className={`text-[9px] uppercase font-bold ${stat.status === 'action_req' ? 'text-amber-500' : 'text-emerald-500'}`}>{stat.status}</span>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Network Traffic */}
        <div className="lg:col-span-2 border border-white/10 p-6 bg-slate-900/30 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">City-wide Load Index</h3>
            <div className="flex gap-4 text-[10px] font-bold">
              <span className="flex items-center gap-1 text-emerald-500"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> LIVE</span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '0px', fontFamily: 'monospace' }}
                />
                <Area type="monotone" dataKey="load" stroke="#10b981" fillOpacity={1} fill="url(#colorLoad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Logs */}
        <div className="border border-white/10 p-6 bg-slate-900/30 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">System Logs</h3>
          <div className="space-y-3 overflow-y-auto max-h-64 pr-2 custom-scrollbar">
            {stats?.logs.map((log) => (
              <div key={log.id} className="text-[10px] flex gap-3 border-b border-white/5 pb-2">
                <span className="text-slate-600 shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className={
                  log.type === 'WARN' ? 'text-amber-500' : 
                  log.type === 'SUCCESS' ? 'text-emerald-500' : 
                  log.type === 'ERROR' ? 'text-rose-500' : 'text-slate-300'
                }>
                  [{log.type}] {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pending Applications */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-white">Pending Merchant Applications</h2>
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-900 border-b border-white/5">
                <tr>
                  <th className="p-5 text-sm font-semibold text-slate-400 uppercase tracking-wider"><Building size={16} className="inline-block mr-2"/>Business Name</th>
                  <th className="p-5 text-sm font-semibold text-slate-400 uppercase tracking-wider"><FileBadge size={16} className="inline-block mr-2"/>License No.</th>
                  <th className="p-5 text-sm font-semibold text-slate-400 uppercase tracking-wider"><Fingerprint size={16} className="inline-block mr-2"/>TIN</th>
                  <th className="p-5 text-sm font-semibold text-slate-400 uppercase tracking-wider text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pendingMerchants.length > 0 ? pendingMerchants.map(merchant => (
                  <tr key={merchant.id} className="hover:bg-slate-900 transition-colors">
                    <td className="p-5 font-medium text-white">{merchant.merchant_name}</td>
                    <td className="p-5 text-slate-400 font-mono text-sm">{merchant.business_license}</td>
                    <td className="p-5 text-slate-400 font-mono text-sm">{merchant.id_number}</td>
                    <td className="p-5">
                      <div className="flex justify-center gap-3">
                        <button 
                          onClick={() => handleVerification(merchant.id, 'APPROVED')}
                          className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-colors"
                        >
                          <Check size={20} />
                        </button>
                        <button 
                          onClick={() => handleVerification(merchant.id, 'REJECTED')}
                          className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="text-center p-8 text-slate-500 italic">No pending applications</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Map Placeholder */}
      <div className="border border-white/10 h-96 bg-slate-900/30 relative flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="grid grid-cols-20 grid-rows-20 h-full w-full">
            {Array.from({ length: 400 }).map((_, i) => (
              <div key={i} className="border-[0.5px] border-white/10" />
            ))}
          </div>
        </div>
        <div className="text-center space-y-4 z-10">
          <Map size={48} className="mx-auto text-emerald-500/50" />
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em]">Geospatial Data Stream Active</p>
          <div className="flex gap-2 justify-center">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MinisterialDashboard;
