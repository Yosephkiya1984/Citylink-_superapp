import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bus, Map, Users, QrCode, BarChart3, Wallet, FileText, CheckCircle2, 
  Plus, ScanLine, Smartphone, AlertCircle, RefreshCw, CreditCard, LogOut
} from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { api } from '../../../services/api';
import { Transaction } from '../../../types';

type Tab = 'live' | 'fleet' | 'analytics' | 'settlement';

const BusMerchantDashboard: React.FC = () => {
  const { profile, setProfile } = useGlobalState();
  const [activeTab, setActiveTab] = useState<Tab>('live');
  const [currentLoad, setCurrentLoad] = useState(42);
  const maxCapacity = 60;
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [receiptAmount, setReceiptAmount] = useState(5);
  const [settling, setSettling] = useState(false);

  const [fleet, setFleet] = useState([
    { id: 'BUS-001', plate: 'AA 12345', status: 'ACTIVE', route: 'Piassa - Bole', driver: 'Abebe K.' },
    { id: 'BUS-002', plate: 'AA 67890', status: 'MAINTENANCE', route: 'Unassigned', driver: 'Unassigned' },
    { id: 'BUS-003', plate: 'AA 54321', status: 'ACTIVE', route: 'Megenagna - CMC', driver: 'Kebede T.' },
  ]);

  useEffect(() => {
    if (profile?.id) {
      loadData();
    }
  }, [profile?.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const txs = await api.getTransactions(profile!.id);
      setTransactions(Array.isArray(txs) ? txs : []);
    } catch (e) {
      console.error('Failed to load transactions', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setProfile(null);
  };

  const handleIssueReceipt = async () => {
    if (!profile || receiptAmount <= 0) return;
    try {
      // Create a cash transaction
      await api.pay('cash_user', profile.id, receiptAmount, 'Cash Receipt');
      alert(`Receipt for ${receiptAmount} ETB issued successfully!`);
      loadData();
    } catch (e) {
      console.error('Failed to issue receipt', e);
      alert('Failed to issue receipt.');
    }
  };

  const handleSettle = async () => {
    if (!profile) return;
    setSettling(true);
    try {
      // Simulate settlement
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert(`Successfully settled ${totalEarnings.toFixed(2)} ETB to your bank account.`);
      // In a real app, this would call an endpoint to clear balance/mark txs as settled
    } catch (e) {
      console.error('Settlement failed', e);
    } finally {
      setSettling(false);
    }
  };

  const handleAddVehicle = () => {
    const newId = `BUS-00${fleet.length + 1}`;
    setFleet([...fleet, {
      id: newId,
      plate: `AA ${Math.floor(10000 + Math.random() * 90000)}`,
      status: 'ACTIVE',
      route: 'Unassigned',
      driver: 'Pending'
    }]);
    alert(`Vehicle ${newId} added to fleet.`);
  };

  // Derived metrics
  const recentValidations = transactions.slice(0, 5);
  const totalEarnings = transactions.reduce((sum, tx) => sum + tx.amount, 0);
  const digitalPayments = transactions.filter(tx => tx.userId !== 'cash_user').reduce((sum, tx) => sum + tx.amount, 0);
  const cashReceipts = transactions.filter(tx => tx.userId === 'cash_user').reduce((sum, tx) => sum + tx.amount, 0);
  const platformFee = totalEarnings * 0.02;
  const totalPassengers = transactions.length + 1200; // Base number + real txs for demo
  const routeEfficiency = Math.min(100, 85 + (transactions.length * 0.5));

  const renderLiveView = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* QR & USSD Validator */}
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <QrCode className="text-emerald-500" /> Validator
            </h3>
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-xs font-bold uppercase tracking-wider">
              Active
            </span>
          </div>
          
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-48 h-48 bg-white rounded-2xl p-4 flex items-center justify-center">
              <QrCode size={160} className="text-slate-900" />
            </div>
            <p className="text-slate-400 text-sm text-center">Scan to pay fare</p>
            
            <div className="w-full h-px bg-white/10 my-4"></div>
            
            <div className="flex items-center gap-3 text-slate-300">
              <Smartphone className="text-blue-400" />
              <span className="font-mono text-lg font-bold">*847*12345#</span>
            </div>
            <p className="text-slate-500 text-xs">USSD Payment Code</p>
          </div>
        </div>

        {/* Occupancy & Load */}
        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
              <Users className="text-blue-500" /> Current Load
            </h3>
            
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="12" className="text-slate-800" />
                  <circle 
                    cx="80" cy="80" r="70" fill="none" stroke="currentColor" strokeWidth="12" 
                    strokeDasharray="440" 
                    strokeDashoffset={440 - (440 * currentLoad) / maxCapacity}
                    className={`${currentLoad >= maxCapacity ? 'text-red-500' : currentLoad > maxCapacity * 0.8 ? 'text-yellow-500' : 'text-emerald-500'} transition-all duration-500`} 
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-4xl font-bold text-white">{currentLoad}</span>
                  <span className="text-xs text-slate-400 uppercase tracking-widest">/ {maxCapacity}</span>
                </div>
              </div>
              
              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => setCurrentLoad(Math.max(0, currentLoad - 1))}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-bold transition-colors"
                >
                  -1
                </button>
                <button 
                  onClick={() => setCurrentLoad(Math.min(maxCapacity, currentLoad + 1))}
                  className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 py-3 rounded-xl font-bold transition-colors"
                >
                  +1
                </button>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Recent Validations</h3>
            <div className="space-y-3">
              {recentValidations.length > 0 ? recentValidations.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="text-emerald-500" size={18} />
                    <span className="text-sm text-slate-300">
                      {tx.userId === 'cash_user' ? 'Cash Passenger' : `User ${tx.userId.substring(0, 6)}`}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-white">{tx.amount.toFixed(2)} ETB</span>
                </div>
              )) : (
                <p className="text-sm text-slate-500 text-center py-4">No recent validations</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap Placeholder */}
      <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 h-64 relative overflow-hidden flex flex-col">
        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4 relative z-10">
          <Map className="text-purple-500" /> City-wide Bus Heatmap
        </h3>
        <div className="absolute inset-0 opacity-30 bg-[url('https://picsum.photos/seed/map/800/400')] bg-cover bg-center mix-blend-luminosity"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="flex items-center gap-2 text-emerald-400 bg-emerald-400/10 px-4 py-2 rounded-full backdrop-blur-md border border-emerald-400/20">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-bold">Live Tracking Active</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFleet = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Fleet Management</h2>
        <button 
          onClick={handleAddVehicle}
          className="bg-emerald-500 text-slate-950 px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-400 transition-colors"
        >
          <Plus size={18} /> Add Vehicle
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Onboarding Card */}
        <div className="bg-gradient-to-br from-blue-900/40 to-slate-900/50 border border-blue-500/30 rounded-3xl p-6 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <ScanLine size={100} />
          </div>
          <h3 className="text-xl font-bold text-white relative z-10">Conductor Onboarding</h3>
          <p className="text-sm text-blue-200 relative z-10">Register a new conductor or vehicle to your fleet.</p>
          
          <div className="space-y-3 relative z-10">
            <div className="flex items-center gap-3 text-sm text-slate-300 bg-black/20 p-3 rounded-xl">
              <CheckCircle2 className="text-emerald-500" size={16} /> Fayda ID Verification
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300 bg-black/20 p-3 rounded-xl">
              <CheckCircle2 className="text-emerald-500" size={16} /> Driver's License Scan
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300 bg-black/20 p-3 rounded-xl">
              <CheckCircle2 className="text-emerald-500" size={16} /> License Plate Recognition
            </div>
          </div>
          
          <button className="w-full bg-blue-500 text-white py-3 rounded-xl font-bold hover:bg-blue-600 transition-colors relative z-10">
            Start Onboarding
          </button>
        </div>

        {/* Fleet List */}
        <div className="md:col-span-2 bg-slate-900/50 border border-white/5 rounded-3xl p-6">
          <h3 className="text-lg font-bold text-white mb-6">Active Vehicles</h3>
          <div className="space-y-4">
            {fleet.map((bus) => (
              <div key={bus.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-white/5 gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${bus.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    <Bus size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{bus.id} <span className="text-xs font-mono text-slate-400 ml-2">{bus.plate}</span></h4>
                    <p className="text-sm text-slate-400">{bus.driver} • {bus.route}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${bus.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                    {bus.status}
                  </span>
                  <button className="text-slate-400 hover:text-white p-2">
                    <RefreshCw size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Route Efficiency</h3>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-white">{routeEfficiency.toFixed(1)}%</span>
            <span className="text-emerald-400 text-sm font-bold mb-1">+2.4%</span>
          </div>
          <div className="mt-4 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${routeEfficiency}%` }}></div>
          </div>
        </div>
        
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Peak Demand Time</h3>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-white">08:00</span>
            <span className="text-slate-400 text-sm font-bold mb-1">AM</span>
          </div>
          <p className="text-sm text-slate-500 mt-2">Piassa - Bole Route</p>
        </div>

        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Total Passengers</h3>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-white">{totalPassengers.toLocaleString()}</span>
            <span className="text-emerald-400 text-sm font-bold mb-1">Today</span>
          </div>
          <p className="text-sm text-slate-500 mt-2">Across {fleet.length} active vehicles</p>
        </div>
      </div>

      <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 h-80 flex flex-col">
        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
          <BarChart3 className="text-blue-500" /> Demand Analytics
        </h3>
        <div className="flex-1 flex items-end justify-between gap-2 pt-4 border-b border-white/10 pb-2">
          {[40, 70, 100, 60, 40, 30, 50, 80, 90, 50, 30, 20].map((val, i) => (
            <div key={i} className="w-full bg-blue-500/20 hover:bg-blue-500/40 rounded-t-sm transition-all relative group" style={{ height: `${val}%` }}>
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                {val * 10}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-2 font-mono">
          <span>06:00</span>
          <span>12:00</span>
          <span>18:00</span>
          <span>24:00</span>
        </div>
      </div>
    </div>
  );

  const renderSettlement = () => (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900/50 border border-emerald-500/30 rounded-3xl p-8">
          <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider mb-2">Daily Earnings</h3>
          <div className="text-5xl font-bold text-white mb-6">{totalEarnings.toFixed(2)} <span className="text-2xl text-slate-400">ETB</span></div>
          
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Digital Payments (QR/USSD)</span>
              <span className="font-bold text-white">{digitalPayments.toFixed(2)} ETB</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Cash Receipts</span>
              <span className="font-bold text-white">{cashReceipts.toFixed(2)} ETB</span>
            </div>
            <div className="w-full h-px bg-white/10 my-2"></div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Platform Fee (2%)</span>
              <span className="font-bold text-red-400">-{platformFee.toFixed(2)} ETB</span>
            </div>
          </div>

          <button 
            onClick={handleSettle}
            disabled={settling || totalEarnings <= 0}
            className="w-full mt-8 bg-emerald-500 text-slate-950 py-4 rounded-xl font-bold hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {settling ? (
              <RefreshCw className="animate-spin" size={20} />
            ) : (
              <Wallet size={20} />
            )}
            {settling ? 'Settling...' : 'Settle to Bank Account'}
          </button>
        </div>

        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 flex flex-col">
          <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
            <FileText className="text-orange-500" /> Automated Cash Receipt
          </h3>
          
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 bg-orange-500/10 rounded-full flex items-center justify-center text-orange-500 mb-2">
              <CreditCard size={40} />
            </div>
            <h4 className="text-lg font-bold text-white">Generate Receipt</h4>
            <p className="text-sm text-slate-400 max-w-xs">
              Instantly generate digital receipts for cash-paying passengers via SMS or print.
            </p>
            
            <div className="flex gap-4 w-full max-w-xs mt-4">
              <input 
                type="number" 
                placeholder="Amount (ETB)" 
                className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-orange-500"
                value={receiptAmount}
                onChange={(e) => setReceiptAmount(Number(e.target.value))}
              />
              <button 
                onClick={handleIssueReceipt}
                className="bg-orange-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors"
              >
                Issue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 font-sans pb-24">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-white">Conductor Hub</h1>
            <p className="text-slate-400 mt-2">Manage your fleet, track occupancy, and view earnings.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-slate-900/80 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-sm font-bold text-slate-300">System Online</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 bg-slate-900/80 border border-white/10 rounded-full text-slate-400 hover:text-red-400 hover:border-red-500/30 transition-colors"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto hide-scrollbar gap-2 p-1 bg-slate-900/50 rounded-2xl border border-white/5">
          {[
            { id: 'live', label: 'Live View', icon: QrCode },
            { id: 'fleet', label: 'Fleet', icon: Bus },
            { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            { id: 'settlement', label: 'Settlement', icon: Wallet },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-white text-slate-950 shadow-lg' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={18} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'live' && renderLiveView()}
            {activeTab === 'fleet' && renderFleet()}
            {activeTab === 'analytics' && renderAnalytics()}
            {activeTab === 'settlement' && renderSettlement()}
          </motion.div>
        </AnimatePresence>

      </div>
    </div>
  );
};

export default BusMerchantDashboard;
