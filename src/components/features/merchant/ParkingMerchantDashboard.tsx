import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Car, DollarSign, Clock, MapPin, QrCode, 
  CheckCircle2, XCircle, Search, Menu, LogOut,
  TrendingUp, Activity, Settings, Plus, CreditCard,
  LayoutDashboard, List
} from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { api } from '../../../services/api';
import { ParkingLot, ParkingSpot, Transaction, ParkingSession } from '../../../types';

const ParkingMerchantDashboard: React.FC = () => {
  const { profile, setProfile } = useGlobalState();
  const [activeView, setActiveView] = useState<'dashboard' | 'spots' | 'transactions' | 'settings' | 'finance'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [parkingLot, setParkingLot] = useState<ParkingLot | null>(null);
  const [parkingSpots, setParkingSpots] = useState<ParkingSpot[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [parkingSessions, setParkingSessions] = useState<ParkingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchParkingData = async () => {
    if (!profile?.id) return;
    setLoading(true);
    setError(null);
    try {
      const merchantLots = await api.getMerchantParkingLots(profile.id);
      if (merchantLots.length > 0) {
        const firstLot = merchantLots[0]; // Assuming one lot per merchant for simplicity
        setParkingLot(firstLot);
        const spotsData = await api.getParkingLotSpots(firstLot.id);
        setParkingSpots(spotsData);
        
        // Fetch parking sessions
        const sessions = await api.getMerchantParkingSessions(profile.id);
        setParkingSessions(sessions);

        // For revenue stats, we still might want transactions, but sessions also have cost
        const userTransactions = await api.getTransactions(profile.id);
        setTransactions(userTransactions);
      } else {
        // If no parking lot exists, create a default one
        const defaultLotData = {
          merchantId: profile.id,
          name: `${profile.merchant_name || 'My'} Parking Lot`,
          address: 'Addis Ababa, Ethiopia',
          totalSpots: 24,
          baseRate: 20,
          additionalRate: 10,
          dailyMax: 150,
        };
        const newLot = await api.createParkingLot(defaultLotData);
        setParkingLot(newLot);
        setParkingSpots(newLot.spots);
      }
    } catch (err: any) {
      console.error("Failed to fetch parking data:", err);
      setError(err.message || "Failed to load parking data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParkingData();
  }, [profile]);

  const [showQRModal, setShowQRModal] = useState(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);

  const handleUpdateSpotStatus = async (spotId: string, newStatus: 'AVAILABLE' | 'OCCUPIED', plateNumber?: string) => {
    if (!parkingLot) return;
    try {
      const updatedSpot = await api.updateParkingSpot(parkingLot.id, spotId, { status: newStatus, occupiedBy: plateNumber });
      setParkingSpots(prevSpots =>
        prevSpots.map(spot => (spot.id === updatedSpot.id ? updatedSpot : spot))
      );
      // Also update the parking lot's available spots count locally
      setParkingLot(prevLot => {
        if (!prevLot) return null;
        const newAvailableSpots = newStatus === 'AVAILABLE' ? prevLot.availableSpots + 1 : prevLot.availableSpots - 1;
        return { ...prevLot, availableSpots: newAvailableSpots };
      });
      if (plateNumber) alert(`Spot ${updatedSpot.spotNumber} marked as OCCUPIED by ${plateNumber}`);
    } catch (err: any) {
      console.error("Failed to update spot status:", err);
      setError(err.message || "Failed to update spot status.");
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      console.error("Logout error:", e);
    }
    setProfile(null);
  };

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'spots', label: 'Live Map', icon: MapPin },
    { id: 'transactions', label: 'Revenue', icon: DollarSign },
    { id: 'finance', label: 'Finance & Withdraw', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderContent = () => {
    if (error) return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] space-y-4 animate-in fade-in">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-2">
          <XCircle size={32} />
        </div>
        <h3 className="text-xl font-bold text-white">Something went wrong</h3>
        <p className="text-slate-400 max-w-md text-center">{error}</p>
        <button 
          onClick={fetchParkingData}
          className="px-6 py-3 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-colors flex items-center gap-2"
        >
          <Activity size={18} /> Retry
        </button>
      </div>
    );

    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardOverview 
            parkingLot={parkingLot} 
            parkingSpots={parkingSpots} 
            transactions={transactions} 
            parkingSessions={parkingSessions} 
            loading={loading} 
            error={error} 
            onShowQR={() => setShowQRModal(true)}
            onShowManualEntry={() => setShowManualEntryModal(true)}
            onViewSettings={() => setActiveView('settings')}
          />
        );
      case 'spots':
        return <LiveSpotsView parkingLot={parkingLot} parkingSpots={parkingSpots} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onUpdateSpotStatus={handleUpdateSpotStatus} loading={loading} error={error} />;
      case 'transactions':
        return <TransactionsView transactions={transactions} parkingSessions={parkingSessions} loading={loading} error={error} />;
      case 'finance':
        return <FinanceView transactions={transactions} parkingSessions={parkingSessions} loading={loading} error={error} onRefresh={fetchParkingData} />;
      case 'settings':
        return <SettingsView parkingLot={parkingLot} onUpdateParkingLot={setParkingLot} loading={loading} error={error} />;
      default:
        return <DashboardOverview parkingLot={parkingLot} parkingSpots={parkingSpots} transactions={transactions} parkingSessions={parkingSessions} loading={loading} error={error} onShowQR={() => setShowQRModal(true)} onShowManualEntry={() => setShowManualEntryModal(true)} onViewSettings={() => setActiveView('settings')} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col md:flex-row font-sans selection:bg-emerald-500/30">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#111] border-b border-white/5 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Car size={18} className="text-black" />
          </div>
          <span className="font-bold tracking-tight">AddisPark</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 bg-white/5 rounded-lg">
          <Menu size={20} />
        </button>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth >= 768) && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            className={`
              fixed md:static inset-y-0 left-0 z-40 w-64 bg-[#111] border-r border-white/5 flex flex-col
              ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
              transition-transform duration-300 ease-in-out
            `}
          >
            <div className="p-6 hidden md:flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Car size={24} className="text-black" />
              </div>
              <div>
                <h1 className="font-bold text-lg tracking-tight leading-tight">AddisPark</h1>
                <p className="text-[10px] text-emerald-500 font-mono uppercase tracking-widest">Merchant Portal</p>
              </div>
            </div>

            <div className="px-4 py-6 flex-1 space-y-2">
              <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">Menu</p>
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setActiveView(item.id as any); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeView === item.id 
                      ? 'bg-emerald-500/10 text-emerald-500' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
            </div>

            <div className="p-4 border-t border-white/5">
              <div className="bg-white/5 rounded-xl p-4 mb-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold">
                  {profile?.name?.charAt(0) || 'M'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold truncate">{profile?.merchant_name || 'Bole Parking'}</p>
                  <p className="text-xs text-slate-500 truncate">{profile?.phone}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto bg-[#0a0a0a]">
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          {renderContent()}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showQRModal && parkingLot && (
          <QRModal parkingLot={parkingLot} onClose={() => setShowQRModal(false)} />
        )}
        {showManualEntryModal && parkingLot && (
          <ManualEntryModal 
            parkingLot={parkingLot} 
            parkingSpots={parkingSpots} 
            onClose={() => setShowManualEntryModal(false)} 
            onUpdateSpotStatus={handleUpdateSpotStatus}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Subcomponents ---

const DashboardOverview = ({ parkingLot, parkingSpots, transactions, parkingSessions, loading, error, onShowQR, onShowManualEntry, onViewSettings }: { parkingLot: ParkingLot | null, parkingSpots: ParkingSpot[], transactions: Transaction[], parkingSessions: ParkingSession[], loading: boolean, error: string | null, onShowQR: () => void, onShowManualEntry: () => void, onViewSettings: () => void }) => {
  if (loading) return <div className="text-center text-slate-400">Loading parking data...</div>;
  if (error) return <div className="text-center text-red-500">Error: {error}</div>;
  if (!parkingLot) return <div className="text-center text-slate-400">No parking lot found.</div>;

  const occupied = parkingSpots.filter(s => s.status === 'OCCUPIED').length;
  const available = (parkingLot.totalSpots || parkingLot.capacity) - occupied;
  const occupancyRate = (parkingLot.totalSpots || parkingLot.capacity) > 0 ? Math.round((occupied / (parkingLot.totalSpots || parkingLot.capacity)) * 100) : 0;
  
  // Calculate revenue from completed parking sessions
  const parkingRevenue = parkingSessions
    .filter(s => s.status === 'COMPLETED')
    .reduce((sum, s) => sum + (s.totalCost || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
        <p className="text-slate-400 mt-1">Today's parking performance at a glance.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Parking Revenue" 
          value={`${parkingRevenue} ETB`} 
          icon={DollarSign} 
          color="text-emerald-500" 
          bg="bg-emerald-500/10" 
        />
        <StatCard 
          title="Occupancy Rate" 
          value={`${occupancyRate}%`} 
          trend="+5%" 
          icon={Activity} 
          color="text-blue-500" 
          bg="bg-blue-500/10" 
        />
        <StatCard 
          title="Available Spots" 
          value={available.toString()} 
          subtitle={`Out of ${parkingLot.totalSpots || parkingLot.capacity}`}
          icon={CheckCircle2} 
          color="text-amber-500" 
          bg="bg-amber-500/10" 
        />
        <StatCard 
          title="Active Vehicles" 
          value={occupied.toString()} 
          subtitle="Currently parked"
          icon={Car} 
          color="text-purple-500" 
          bg="bg-purple-500/10" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-lg font-bold">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={onShowQR}
              className="bg-[#111] border border-white/5 hover:border-emerald-500/50 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <QrCode size={24} />
              </div>
              <span className="text-sm font-medium">Show QR</span>
            </button>
            <button 
              onClick={onShowManualEntry}
              className="bg-[#111] border border-white/5 hover:border-blue-500/50 p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Plus size={24} />
              </div>
              <span className="text-sm font-medium">Manual Entry</span>
            </button>
          </div>
          
          <div className="bg-gradient-to-br from-emerald-900/40 to-[#111] border border-emerald-500/20 p-6 rounded-3xl mt-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <QrCode size={100} />
            </div>
            <h4 className="font-bold text-lg mb-2 relative z-10">Digital Payments Active</h4>
            <p className="text-sm text-emerald-100/70 mb-4 relative z-10">Accepting Telebirr, CBE Birr, and M-Pesa automatically.</p>
            <button onClick={onViewSettings} className="text-xs font-bold bg-emerald-500 text-black px-4 py-2 rounded-full relative z-10">
              View Settings
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold">Recent Sessions</h3>
            <button className="text-sm text-emerald-500 hover:underline">View All</button>
          </div>
          <div className="bg-[#111] border border-white/5 rounded-3xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-slate-500">
                    <th className="p-4 font-medium">Spot</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Amount</th>
                    <th className="p-4 font-medium">Start Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {parkingSessions.slice(0, 5).map((session: ParkingSession) => (
                    <tr key={session.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <span className="font-mono text-sm font-bold">{session.spotName}</span>
                      </td>
                      <td className="p-4">
                        <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${session.status === 'ACTIVE' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                          {session.status}
                        </span>
                      </td>
                      <td className="p-4 text-sm font-bold text-emerald-400">{session.totalCost || 0} ETB</td>
                      <td className="p-4 text-sm text-slate-500">{new Date(session.startTime).toLocaleTimeString()}</td>
                    </tr>
                  ))}
                  {parkingSessions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">No recent parking sessions.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const LiveSpotsView = ({ parkingLot, parkingSpots, searchQuery, setSearchQuery, onUpdateSpotStatus, loading, error }: { parkingLot: ParkingLot | null, parkingSpots: ParkingSpot[], searchQuery: string, setSearchQuery: (query: string) => void, onUpdateSpotStatus: (spotId: string, newStatus: 'AVAILABLE' | 'OCCUPIED') => void, loading: boolean, error: string | null }) => {
  if (loading) return <div className="text-center text-slate-400">Loading spots...</div>;
  if (error) return <div className="text-center text-red-500">Error: {error}</div>;
  if (!parkingLot) return <div className="text-center text-slate-400">No parking lot found.</div>;

  const filteredSpots = parkingSpots.filter(s => 
    s.spotNumber.toString().includes(searchQuery) || 
    (s.occupiedBy && s.occupiedBy.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Live Map</h2>
          <p className="text-slate-400 mt-1">Real-time status of all parking spots.</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Search plate or spot..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#111] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-emerald-500 w-full md:w-64 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span className="text-slate-400">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-slate-400">Occupied</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredSpots.map((spot: ParkingSpot) => (
          <div 
            key={spot.id} 
            onClick={() => onUpdateSpotStatus(spot.id, spot.status === 'AVAILABLE' ? 'OCCUPIED' : 'AVAILABLE')}
            className={`
              relative p-4 rounded-2xl border flex flex-col items-center justify-center gap-2 aspect-square transition-all cursor-pointer
              ${spot.status === 'AVAILABLE' 
                ? 'bg-[#111] border-emerald-500/30 hover:border-emerald-500/60' 
                : 'bg-red-500/5 border-red-500/30'}
            `}
          >
            <span className="absolute top-3 left-3 text-xs font-bold text-slate-500">#{spot.spotNumber}</span>
            
            {spot.status === 'OCCUPIED' ? (
              <>
                <Car size={32} className="text-red-400" />
                <div className="bg-black/50 px-2 py-1 rounded border border-white/10 mt-2">
                  <p className="text-[10px] font-mono font-bold text-white">{spot.occupiedBy || 'N/A'}</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-emerald-500/30 flex items-center justify-center">
                  <span className="text-emerald-500/50 text-xs font-bold">FREE</span>
                </div>
              </>
            )}
          </div>
        ))} 
      </div>
    </div>
  );
};

const TransactionsView = ({ transactions, parkingSessions, loading, error }: { transactions: Transaction[], parkingSessions: ParkingSession[], loading: boolean, error: string | null }) => {
  if (loading) return <div className="text-center text-slate-400">Loading transactions...</div>;
  if (error) return <div className="text-center text-red-500">Error: {error}</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Revenue & History</h2>
        <p className="text-slate-400 mt-1">Detailed log of all parking sessions.</p>
      </div>

      <div className="bg-[#111] border border-white/5 rounded-3xl overflow-hidden">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <h3 className="font-bold">Parking Sessions</h3>
          <button className="text-sm bg-white/5 hover:bg-white/10 px-4 py-2 rounded-lg transition-colors">
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-slate-500 bg-black/20">
                <th className="p-4 font-medium">Session ID</th>
                <th className="p-4 font-medium">Spot</th>
                <th className="p-4 font-medium">Duration</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {parkingSessions.map((session: ParkingSession) => (
                <tr key={session.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-4 text-sm font-mono text-slate-400">{session.id.substring(0, 8)}...</td>
                  <td className="p-4">
                    <span className="font-mono text-sm font-bold">{session.spotName}</span>
                  </td>
                  <td className="p-4 text-sm text-slate-300">{session.duration || 'N/A'}</td>
                  <td className="p-4 text-sm font-bold text-emerald-400">{session.totalCost || 0} ETB</td>
                  <td className="p-4">
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${session.status === 'ACTIVE' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                      {session.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-500">{new Date(session.startTime).toLocaleString()}</td>
                </tr>
              ))}
              {parkingSessions.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">No parking sessions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const FinanceView = ({ transactions, parkingSessions, loading, error, onRefresh }: { transactions: Transaction[], parkingSessions: ParkingSession[], loading: boolean, error: string | null, onRefresh: () => void }) => {
  const { profile, setProfile } = useGlobalState();
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  
  // Calculate balances dynamically
  // Revenue from completed parking sessions
  const parkingRevenue = parkingSessions
    .filter(s => s.status === 'COMPLETED')
    .reduce((sum, s) => sum + (Number(s.totalCost) || 0), 0);
    
  // Total withdrawn amount
  const withdrawals = transactions.filter(t => t.type === 'WITHDRAWAL');
  const totalWithdrawn = withdrawals.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
  
  // Available Balance = Revenue - Withdrawals
  const currentBalance = Math.max(0, parkingRevenue - totalWithdrawn);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Finance</h2>
          <p className="text-slate-400 mt-1">Manage your earnings and withdrawals.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onRefresh}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors text-slate-400"
            title="Refresh Data"
          >
            <Activity size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          <button 
            onClick={() => setShowWithdrawModal(true)}
            className="bg-emerald-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-emerald-400 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <CreditCard size={20} /> Withdraw Funds
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Available Balance" 
          value={`${currentBalance.toLocaleString()} ETB`} 
          icon={DollarSign} 
          color="text-emerald-500" 
          bg="bg-emerald-500/10" 
          subtitle="Ready for withdrawal"
        />
        <StatCard 
          title="Total Revenue" 
          value={`${parkingRevenue.toLocaleString()} ETB`} 
          icon={TrendingUp} 
          color="text-blue-500" 
          bg="bg-blue-500/10" 
          subtitle="Lifetime earnings"
        />
        <StatCard 
          title="Total Withdrawn" 
          value={`${totalWithdrawn.toLocaleString()} ETB`} 
          icon={LogOut} 
          color="text-red-500" 
          bg="bg-red-500/10" 
          subtitle="Transferred to bank"
        />
        <StatCard 
          title="Pending Payouts" 
          value="0 ETB" 
          icon={Clock} 
          color="text-amber-500" 
          bg="bg-amber-500/10" 
          subtitle="Processing"
        />
      </div>

      <div className="bg-[#111] border border-white/5 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <h3 className="font-bold text-lg">Withdrawal History</h3>
          <span className="text-xs font-mono text-slate-500 uppercase tracking-widest">{withdrawals.length} Transactions</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-slate-500 bg-black/20">
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Transaction ID</th>
                <th className="p-4 font-medium">Method</th>
                <th className="p-4 font-medium">Amount</th>
                <th className="p-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {withdrawals.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="p-4 text-sm text-slate-400">{new Date(tx.timestamp).toLocaleDateString()}</td>
                  <td className="p-4 text-sm font-mono text-slate-500 group-hover:text-slate-300 transition-colors">{tx.id.slice(0, 12)}...</td>
                  <td className="p-4 text-sm text-white">{(tx as any).metadata?.method || 'Bank Transfer'}</td>
                  <td className="p-4 text-sm font-bold text-red-400">-{Math.abs(Number(tx.amount)).toLocaleString()} ETB</td>
                  <td className="p-4">
                    <span className="text-[10px] px-2 py-1 rounded-full font-bold uppercase bg-emerald-500/10 text-emerald-500">
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
              {withdrawals.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <CreditCard size={40} className="opacity-20 mb-2" />
                      <p>No withdrawal history found.</p>
                      <p className="text-xs">Your withdrawal requests will appear here.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showWithdrawModal && (
          <WithdrawalModal 
            balance={currentBalance} 
            onClose={() => setShowWithdrawModal(false)} 
            onSuccess={(amount) => {
              setShowWithdrawModal(false);
              onRefresh();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const WithdrawalModal = ({ balance, onClose, onSuccess }: { balance: number, onClose: () => void, onSuccess: (amount: number) => void }) => {
  const { profile } = useGlobalState();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('CBE'); // Default to CBE
  const [accountNumber, setAccountNumber] = useState('');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleWithdraw = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (parseFloat(amount) > balance) {
      setError("Insufficient balance.");
      return;
    }
    if (!accountNumber && !phone) {
      setError("Please provide account details.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const accountDetails = method === 'TELEBIRR' || method === 'MPESA' 
        ? { phone } 
        : { accountNumber, bankName: method };

      await api.withdrawFunds(profile!.id, parseFloat(amount), method, accountDetails);
      
      alert("Withdrawal initiated successfully!");
      onSuccess(parseFloat(amount));
    } catch (err: any) {
      console.error("Withdrawal failed:", err);
      setError(err.message || "Withdrawal failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const banks = [
    { id: 'CBE', name: 'Commercial Bank of Ethiopia' },
    { id: 'AWASH', name: 'Awash Bank' },
    { id: 'DASHEN', name: 'Dashen Bank' },
    { id: 'ABYSSINIA', name: 'Bank of Abyssinia' },
    { id: 'TELEBIRR', name: 'Telebirr Wallet' },
    { id: 'MPESA', name: 'M-Pesa' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#111] border border-white/10 p-8 rounded-3xl max-w-md w-full space-y-6"
        onClick={e => e.stopPropagation()}
      >
        <div>
          <h3 className="text-2xl font-bold text-white">Withdraw Funds</h3>
          <p className="text-slate-400 mt-2">Transfer earnings to your account.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded-xl text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Amount (ETB)</label>
            <div className="relative">
              <input 
                type="number" 
                value={amount} 
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-black border border-white/10 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:border-emerald-500 text-white font-mono text-lg"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">ETB</span>
            </div>
            <p className="text-xs text-slate-500 text-right">Available: {balance.toLocaleString()} ETB</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Withdrawal Method</label>
            <select 
              value={method} 
              onChange={e => setMethod(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 text-white"
            >
              {banks.map(bank => (
                <option key={bank.id} value={bank.id}>{bank.name}</option>
              ))}
            </select>
          </div>

          {(method === 'TELEBIRR' || method === 'MPESA') ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Phone Number</label>
              <input 
                type="tel" 
                value={phone} 
                onChange={e => setPhone(e.target.value)}
                placeholder="09..."
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 text-white"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Account Number</label>
              <input 
                type="text" 
                value={accountNumber} 
                onChange={e => setAccountNumber(e.target.value)}
                placeholder="1000..."
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 text-white font-mono"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleWithdraw} 
            disabled={loading}
            className="flex-1 py-3 bg-emerald-500 text-black hover:bg-emerald-400 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? <Activity className="animate-spin" size={20} /> : 'Confirm Withdrawal'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const SettingsView = ({ parkingLot, onUpdateParkingLot, loading, error }: { parkingLot: ParkingLot | null, onUpdateParkingLot: (lot: ParkingLot) => void, loading: boolean, error: string | null }) => {
  const [lotName, setLotName] = useState(parkingLot?.name || '');
  const [totalSpots, setTotalSpots] = useState(parkingLot?.totalSpots || parkingLot?.capacity || 0);
  const [baseRate, setBaseRate] = useState(parkingLot?.baseRate || 0);
  const [additionalRate, setAdditionalRate] = useState(parkingLot?.additionalRate || 0);
  const [dailyMax, setDailyMax] = useState(parkingLot?.dailyMax || 0);

  useEffect(() => {
    if (parkingLot) {
      setLotName(parkingLot.name || '');
      setTotalSpots(parkingLot.totalSpots || parkingLot.capacity || 0);
      setBaseRate(parkingLot.baseRate || 0);
      setAdditionalRate(parkingLot.additionalRate || 0);
      setDailyMax(parkingLot.dailyMax || 0);
    }
  }, [parkingLot]);

  const handleSavePricing = async () => {
    if (!parkingLot) return;
    try {
      const updatedLot = await api.updateParkingLot(parkingLot.id, {
        baseRate,
        additionalRate,
        dailyMax,
      });
      onUpdateParkingLot(updatedLot);
      alert('Pricing updated successfully!');
    } catch (err) {
      console.error("Failed to update pricing:", err);
      alert('Failed to update pricing.');
    }
  };

  const handleUpdateInfo = async () => {
    if (!parkingLot) return;
    try {
      const updatedLot = await api.updateParkingLot(parkingLot.id, {
        name: lotName,
        totalSpots,
      });
      onUpdateParkingLot(updatedLot);
      alert('Lot information updated successfully!');
    } catch (err) {
      console.error("Failed to update lot info:", err);
      alert('Failed to update lot information.');
    }
  };

  if (loading) return <div className="text-center text-slate-400">Loading settings...</div>;
  if (error) return <div className="text-center text-red-500">Error: {error}</div>;
  if (!parkingLot) return <div className="text-center text-slate-400">No parking lot found.</div>;
  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-3xl">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-slate-400 mt-1">Configure your parking lot rules and pricing.</p>
      </div>

      <div className="space-y-6">
        <div className="bg-[#111] border border-white/5 rounded-3xl p-6 space-y-6">
          <h3 className="text-lg font-bold border-b border-white/5 pb-4">Pricing Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="baseRate" className="text-sm font-medium text-slate-400">Base Rate (First Hour)</label>
              <div className="relative">
                <input id="baseRate" type="number" value={baseRate} onChange={(e) => setBaseRate(e.target.value === '' ? 0 : parseFloat(e.target.value))} className="w-full bg-black border border-white/10 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:border-emerald-500" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">ETB</span>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="additionalRate" className="text-sm font-medium text-slate-400">Additional Hour Rate</label>
              <div className="relative">
                <input id="additionalRate" type="number" value={additionalRate} onChange={(e) => setAdditionalRate(e.target.value === '' ? 0 : parseFloat(e.target.value))} className="w-full bg-black border border-white/10 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:border-emerald-500" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">ETB</span>
              </div>
            </div>
            <div className="space-y-2">
              <label htmlFor="dailyMax" className="text-sm font-medium text-slate-400">Daily Maximum</label>
              <div className="relative">
                <input id="dailyMax" type="number" value={dailyMax} onChange={(e) => setDailyMax(e.target.value === '' ? 0 : parseFloat(e.target.value))} className="w-full bg-black border border-white/10 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:border-emerald-500" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">ETB</span>
              </div>
            </div>
          </div>
          
          <div className="pt-4">
            <button onClick={handleSavePricing} className="bg-emerald-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-emerald-400 transition-colors">
              Save Pricing
            </button>
          </div>
        </div>

        <div className="bg-[#111] border border-white/5 rounded-3xl p-6 space-y-6">
          <h3 className="text-lg font-bold border-b border-white/5 pb-4">Lot Information</h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="lotName" className="text-sm font-medium text-slate-400">Lot Name</label>
              <input id="lotName" type="text" value={lotName} onChange={(e) => setLotName(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500" />
            </div>
            <div className="space-y-2">
              <label htmlFor="totalSpots" className="text-sm font-medium text-slate-400">Total Capacity</label>
              <input id="totalSpots" type="number" value={totalSpots} onChange={(e) => setTotalSpots(e.target.value === '' ? 0 : parseInt(e.target.value))} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          <div className="pt-4">
            <button onClick={handleUpdateInfo} className="bg-emerald-500 text-black font-bold px-6 py-3 rounded-xl hover:bg-emerald-400 transition-colors">
              Update Info
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const QRModal = ({ parkingLot, onClose }: { parkingLot: ParkingLot, onClose: () => void }) => (
  <motion.div 
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    onClick={onClose}
  >
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
      className="bg-[#111] border border-white/10 p-8 rounded-3xl max-w-sm w-full text-center space-y-6"
      onClick={e => e.stopPropagation()}
    >
      <div>
        <h3 className="text-2xl font-bold text-white">Scan to Pay</h3>
        <p className="text-slate-400 mt-2">Scan this QR code to pay for parking at {parkingLot.name}</p>
      </div>
      
      <div className="bg-white p-4 rounded-2xl inline-block">
        <img 
          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(JSON.stringify({ lotId: parkingLot.id, name: parkingLot.name }))}`} 
          alt="Parking Lot QR Code" 
          className="w-48 h-48"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Lot ID</p>
        <p className="font-mono text-emerald-500 bg-emerald-500/10 py-2 rounded-lg select-all">{parkingLot.id}</p>
      </div>

      <button onClick={onClose} className="w-full py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-colors">
        Close
      </button>
    </motion.div>
  </motion.div>
);

const ManualEntryModal = ({ parkingLot, parkingSpots, onClose, onUpdateSpotStatus }: { parkingLot: ParkingLot, parkingSpots: ParkingSpot[], onClose: () => void, onUpdateSpotStatus: (spotId: string, status: 'AVAILABLE' | 'OCCUPIED', plate?: string) => void }) => {
  const [selectedSpotId, setSelectedSpotId] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const availableSpots = parkingSpots.filter(s => s.status === 'AVAILABLE');

  const handleSubmit = () => {
    if (!selectedSpotId) return alert('Please select a spot');
    onUpdateSpotStatus(selectedSpotId, 'OCCUPIED', plateNumber || 'MANUAL-ENTRY');
    onClose();
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#111] border border-white/10 p-8 rounded-3xl max-w-md w-full space-y-6"
        onClick={e => e.stopPropagation()}
      >
        <div>
          <h3 className="text-2xl font-bold text-white">Manual Entry</h3>
          <p className="text-slate-400 mt-2">Manually mark a spot as occupied.</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Select Spot</label>
            <select 
              value={selectedSpotId} 
              onChange={e => setSelectedSpotId(e.target.value)}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 text-white"
            >
              <option value="">-- Select a Spot --</option>
              {availableSpots.map(spot => (
                <option key={spot.id} value={spot.id}>Spot #{spot.spotNumber}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Plate Number (Optional)</label>
            <input 
              type="text" 
              value={plateNumber} 
              onChange={e => setPlateNumber(e.target.value)}
              placeholder="e.g. A-12345"
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 text-white"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} className="flex-1 py-3 bg-emerald-500 text-black hover:bg-emerald-400 rounded-xl font-bold transition-colors">
            Confirm Entry
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// --- UI Helpers ---

const StatCard = ({ title, value, trend, icon: Icon, color, bg, subtitle }: any) => (
  <div className="bg-[#111] border border-white/5 p-6 rounded-3xl relative overflow-hidden group">
    <div className="flex justify-between items-start mb-4">
      <div className="w-12 h-12 rounded-2xl ${bg} ${color} flex items-center justify-center">
        <Icon size={24} />
      </div>
      {trend && (
        <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
          {trend}
        </span>
      )}
    </div>
    <div>
      <h3 className="text-3xl font-bold tracking-tight text-white mb-1">{value}</h3>
      <p className="text-sm font-medium text-slate-400">{title}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
    </div>
    
    {/* Decorative background icon */}
    <Icon size={100} className={`absolute -bottom-6 -right-6 opacity-5 ${color} group-hover:scale-110 transition-transform duration-500`} />
  </div>
);

export default ParkingMerchantDashboard;
