import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  PlusCircle, Users, DollarSign, Calendar, Clock, Award,
  ChevronRight, ChevronLeft, Menu, Settings, LogOut, LayoutDashboard
} from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { api } from '../../../services/api';
import { Ekub, EkubMember, EkubRound } from '../../../types';

const EkubMerchantDashboard: React.FC = () => {
  const { profile, setProfile, setUserRole } = useGlobalState();
  const [activeView, setActiveView] = useState<'list' | 'create' | 'detail'>('list');
  const [ekubs, setEkubs] = useState<Ekub[]>([]);
  const [selectedEkub, setSelectedEkub] = useState<Ekub | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (profile?.id) {
      fetchMerchantEkubs();
    }
  }, [profile?.id]);

  const fetchMerchantEkubs = async () => {
    if (!profile?.id) {
      console.warn("fetchMerchantEkubs called without a profile.id, aborting.");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get(`/ekub/merchant/${profile.id}`);
      console.log(`[DASHBOARD] Fetched ${data?.length || 0} Ekubs for merchant ${profile.id}`, data);
      // The API helper already returns the JSON body, so 'data' is the array itself
      setEkubs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch merchant Ekubs:", error);
      setEkubs([]);
    } finally {
      setLoading(false);
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

  const handleNavItemClick = (view: any) => {
    setActiveView(view);
    setIsSidebarOpen(false);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      );
    }

    switch (activeView) {
      case 'list':
        return (
          <EkubListView 
            ekubs={ekubs} 
            onCreateNew={() => setActiveView('create')} 
            onViewDetails={(ekub) => { setSelectedEkub(ekub); setActiveView('detail'); }}
            onRefresh={fetchMerchantEkubs}
          />
        );
      case 'create':
        return <CreateEkubView onBack={() => setActiveView('list')} onEkubCreated={fetchMerchantEkubs} creatorId={profile?.id || ''} />;
      case 'detail':
        return selectedEkub ? 
          <EkubDetailView ekub={selectedEkub} onBack={() => setActiveView('list')} onEkubUpdated={fetchMerchantEkubs} /> : 
          <p>Ekub not found.</p>;
      default:
        return <EkubListView ekubs={ekubs} onCreateNew={() => setActiveView('create')} onViewDetails={(ekub) => { setSelectedEkub(ekub); setActiveView('detail'); }} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col md:flex-row">
      {/* Mobile Sidebar Toggle & Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-white/5">
        <button 
          className="p-2 text-white bg-slate-800 rounded-lg"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500/10 text-emerald-500 rounded flex items-center justify-center font-bold text-xs">
            {profile?.merchant_name?.charAt(0)}
          </div>
          <span className="font-bold text-sm">Ekub Portal</span>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
          title="Logout"
        >
          <LogOut size={24} />
        </button>
      </div>

      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 md:hidden"
          />
        )}
      </AnimatePresence>

      <EkubSidebar 
        profile={profile} 
        activeView={activeView} 
        setActiveView={handleNavItemClick} 
        handleLogout={handleLogout} 
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
};

const EkubSidebar: React.FC<any> = ({ profile, activeView, setActiveView, handleLogout, isSidebarOpen, setIsSidebarOpen }) => {
  return (
    <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-900 border-r border-white/10 flex flex-col transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-300 ease-out shadow-2xl md:shadow-none`}>
      <div className="p-6 flex items-center gap-3 border-b border-white/5 bg-slate-950/30">
        <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center justify-center font-bold">
          {profile?.merchant_name?.charAt(0)}
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="font-bold text-sm text-white truncate">{profile?.merchant_name}</p>
          <p className="text-[10px] text-slate-500 font-mono truncate">{profile?.id}</p>
        </div>
        <button 
          className="md:hidden ml-auto p-2 text-white hover:bg-slate-800 rounded-lg"
          onClick={() => setIsSidebarOpen(false)}
        >
          <Menu size={20} />
        </button>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        <EkubNavItem icon={<LayoutDashboard size={20} />} label="My Ekubs" view="list" activeView={activeView} setActiveView={setActiveView} />
        <EkubNavItem icon={<PlusCircle size={20} />} label="Create Ekub" view="create" activeView={activeView} setActiveView={setActiveView} />
      </nav>
      <div className="p-4 border-t border-white/10 mt-auto">
        <button 
          onClick={handleLogout} 
          className="w-full flex items-center gap-3 p-4 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all text-sm font-bold border border-transparent hover:border-red-500/20"
        >
          <LogOut size={20} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

const EkubNavItem: React.FC<any> = ({ icon, label, view, activeView, setActiveView }) => (
  <button 
    onClick={() => setActiveView(view)}
    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-sm ${activeView === view ? 'bg-emerald-500/10 text-emerald-500 font-bold' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
    {icon}
    <span>{label}</span>
  </button>
);

const EkubListView: React.FC<any> = ({ ekubs, onCreateNew, onViewDetails, onRefresh }) => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <h1 className="text-3xl font-bold">My Ekubs</h1>
      <div className="flex gap-2 w-full sm:w-auto">
        <button 
          onClick={onRefresh}
          className="flex-1 sm:flex-none bg-slate-800 text-white font-bold py-3 px-5 rounded-xl flex items-center justify-center gap-2 border border-white/5"
        >
          Refresh
        </button>
        <button onClick={onCreateNew} className="flex-1 sm:flex-none bg-emerald-500 text-slate-950 font-bold py-3 px-5 rounded-xl flex items-center justify-center gap-2">
          <PlusCircle size={20} />
          Create New
        </button>
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {!ekubs || ekubs.length === 0 ? (
        <div className="col-span-full py-20 text-center bg-slate-900/30 rounded-3xl border border-dashed border-white/10">
          <p className="text-slate-400 mb-4">No Ekubs found. Create one to get started!</p>
          <button onClick={onCreateNew} className="text-emerald-500 font-bold hover:underline">Create your first Ekub</button>
        </div>
      ) : (
        ekubs?.map((ekub: Ekub) => (
          <EkubCard key={ekub.id} ekub={ekub} onViewDetails={onViewDetails} />
        ))
      )}
    </div>
  </div>
);

const EkubCard: React.FC<{ ekub: Ekub; onViewDetails: (ekub: Ekub) => void }> = ({ ekub, onViewDetails }) => (
  <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 space-y-4">
    <h2 className="text-xl font-bold text-white">{ekub.name}</h2>
    <div className="flex items-center gap-2 text-slate-400 text-sm">
      <DollarSign size={16} />
      <span>{ekub.contributionAmount} ETB {ekub.frequency}</span>
    </div>
    <div className="flex items-center gap-2 text-slate-400 text-sm">
      <Users size={16} />
      <span>{ekub.memberCount}/{ekub.maxMembers} Members</span>
    </div>
    <div className="flex items-center gap-2 text-slate-400 text-sm">
      <Calendar size={16} />
      <span>Next Payout: {ekub.nextPayoutDate ? new Date(ekub.nextPayoutDate).toLocaleDateString() : 'N/A'}</span>
    </div>
    <div className="flex justify-between items-center pt-4 border-t border-white/5">
      <span className={`px-3 py-1 text-xs font-bold rounded-full ${ekub.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : ekub.status === 'FORMING' ? 'bg-blue-500/10 text-blue-500' : 'bg-slate-500/10 text-slate-500'}`}>
        {ekub.status}
      </span>
      <button onClick={() => onViewDetails(ekub)} className="text-emerald-500 hover:text-emerald-400 flex items-center gap-1">
        View Details <ChevronRight size={16} />
      </button>
    </div>
  </div>
);

const CreateEkubView: React.FC<any> = ({ onBack, onEkubCreated, creatorId }) => {
  const [name, setName] = useState('');
  const [contributionAmount, setContributionAmount] = useState(0);
  const [frequency, setFrequency] = useState<'WEEKLY' | 'MONTHLY'>('MONTHLY');
  const [maxMembers, setMaxMembers] = useState(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name || !contributionAmount || !maxMembers || !creatorId) {
      setError('All fields are required.');
      return;
    }
    if (contributionAmount <= 0 || maxMembers <= 1) {
      setError('Contribution amount and max members must be positive.');
      return;
    }

    setCreating(true);
    setError('');
    try {
      await api.post('/ekub/create', {
        name, creatorId, contributionAmount, frequency, maxMembers
      });
      onEkubCreated();
      onBack();
    } catch (err: any) {
      setError(err.message || 'Failed to create Ekub.');
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-slate-400 hover:text-white"><ChevronLeft size={24} /></button>
        <h1 className="text-3xl font-bold">Create New Ekub</h1>
      </div>

      <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-8 space-y-6 max-w-2xl mx-auto">
        {error && <div className="bg-red-500/10 text-red-400 p-4 rounded-lg">{error}</div>}
        <input 
          type="text" 
          placeholder="Ekub Name" 
          className="w-full bg-slate-800 p-3 rounded-lg text-white"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input 
          type="number" 
          placeholder="Contribution Amount (ETB)" 
          className="w-full bg-slate-800 p-3 rounded-lg text-white"
          value={contributionAmount || ''}
          onChange={(e) => setContributionAmount(parseFloat(e.target.value))}
        />
        <div className="flex items-center gap-4">
          <label className="text-slate-400">Frequency:</label>
          <select 
            className="bg-slate-800 p-3 rounded-lg text-white"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as 'WEEKLY' | 'MONTHLY')}
          >
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </div>
        <input 
          type="number" 
          placeholder="Maximum Members" 
          className="w-full bg-slate-800 p-3 rounded-lg text-white"
          value={maxMembers || ''}
          onChange={(e) => setMaxMembers(parseInt(e.target.value))}
        />
        <button 
          onClick={handleSubmit} 
          className="w-full bg-emerald-500 text-slate-950 font-bold py-3 px-5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          disabled={creating}
        >
          {creating ? 'Creating...' : 'Create Ekub'}
        </button>
      </div>
    </div>
  );
};

const EkubDetailView: React.FC<any> = ({ ekub, onBack, onEkubUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async (userId: string) => {
    setLoading(true);
    setError('');
    try {
      await api.post(`/ekub/${ekub.id}/join`, { userId });
      onEkubUpdated(); // Refresh Ekub list
    } catch (err: any) {
      setError(err.message || 'Failed to join Ekub.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleContribute = async (userId: string, amount: number) => {
    setLoading(true);
    setError('');
    try {
      await api.post(`/ekub/${ekub.id}/contribute`, { userId, amount });
      onEkubUpdated(); // Refresh Ekub list
    } catch (err: any) {
      setError(err.message || 'Failed to contribute.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string) => {
    setLoading(true);
    setError('');
    try {
      await api.approveEkubMember(ekub.id, userId);
      onEkubUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to approve member.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDrawWinner = async (roundNumber: number) => {
    setLoading(true);
    setError('');
    try {
      await api.drawEkubWinner(ekub.id, roundNumber);
      onEkubUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to draw winner.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayout = async (roundNumber: number) => {
    setLoading(true);
    setError('');
    try {
      await api.disburseEkub(ekub.id, roundNumber);
      onEkubUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to process payout.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleNextRound = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post(`/ekub/${ekub.id}/next-round`, {});
      onEkubUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to advance to next round.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-slate-400 hover:text-white"><ChevronLeft size={24} /></button>
        <h1 className="text-3xl font-bold">Ekub: {ekub.name}</h1>
      </div>

      {error && <div className="bg-red-500/10 text-red-400 p-4 rounded-lg">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <EkubDetailCard title="Details">
          <p><strong>Status:</strong> {ekub.status}</p>
          <p><strong>Contribution:</strong> {ekub.contributionAmount} ETB {ekub.frequency}</p>
          <p><strong>Members:</strong> {ekub.memberCount} / {ekub.maxMembers}</p>
          <p><strong>Current Round:</strong> {ekub.currentRoundNumber}</p>
          <p><strong>Next Payout:</strong> {ekub.nextPayoutDate ? new Date(ekub.nextPayoutDate).toLocaleDateString() : 'N/A'}</p>
          <p><strong>Escrow Balance:</strong> {ekub.escrowBalance} ETB</p>
        </EkubDetailCard>

        <EkubDetailCard title="Actions">
          {ekub.status === 'FORMING' && ekub.memberCount < ekub.maxMembers && (
            <button 
              onClick={() => handleJoin('some-user-id')} // TODO: Replace with actual user ID
              className="bg-blue-500 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
              disabled={loading}
            >
              Join Ekub
            </button>
          )}
          {ekub.status === 'ACTIVE' && (
            <div className="space-y-2">
              <button 
                onClick={handleNextRound}
                className="bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
                disabled={loading}
              >
                Start Next Round
              </button>
            </div>
          )}
        </EkubDetailCard>
      </div>

      <EkubDetailCard title="Members">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ekub.members?.map((member: EkubMember) => (
            <div key={member.id} className="flex items-center justify-between bg-slate-800/50 p-3 rounded-lg">
              <div className="flex items-center gap-3">
                <img src={member.avatarUrl} alt={member.name} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                <div>
                  <p className="font-medium text-white">{member.name}</p>
                  <p className="text-sm text-slate-400">{member.contributionStatus}</p>
                </div>
              </div>
              {member.status === 'PENDING' && (
                <button
                  onClick={() => handleApprove(member.userId)}
                  disabled={loading}
                  className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-lg text-xs font-bold hover:bg-emerald-500/20 transition-colors"
                >
                  Approve
                </button>
              )}
            </div>
          ))}
        </div>
      </EkubDetailCard>

      <EkubDetailCard title="Round History">
        <div className="space-y-4">
          {ekub.rounds?.length === 0 ? (
            <p className="text-slate-400">No rounds completed yet.</p>
          ) : (
            ekub.rounds?.map((round: EkubRound) => {
              const signatureCount = (round.guarantor1Id ? 1 : 0) + (round.guarantor2Id ? 1 : 0);
              return (
                <div key={round.id} className="bg-slate-800/50 p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <p className="font-bold text-white">Round {round.roundNumber}</p>
                    <p className="text-sm text-slate-400">Winner: {round.winnerId || 'Pending Draw'}</p>
                    <p className="text-sm text-slate-400">Payout: {new Date(round.payoutDate).toLocaleDateString()}</p>
                    <p className="text-sm text-slate-400">Collected: {round.totalCollected} ETB</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full ${round.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'}`}>
                      {round.status}
                    </span>
                    {!round.winnerId && (
                      <button
                        onClick={() => handleDrawWinner(round.roundNumber)}
                        disabled={loading}
                        className="bg-purple-500/10 text-purple-500 px-3 py-1 rounded-lg text-xs font-bold hover:bg-purple-500/20 transition-colors"
                      >
                        Draw Winner
                      </button>
                    )}
                    {round.winnerId && !round.escrowReleased && (
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs text-slate-400">{signatureCount}/2 Signatures</span>
                        <button
                          onClick={() => handlePayout(round.roundNumber)}
                          disabled={loading || signatureCount < 2}
                          className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-lg text-xs font-bold hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                        >
                          Disburse Funds
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </EkubDetailCard>
    </div>
  );
};

const EkubDetailCard: React.FC<any> = ({ title, children }) => (
  <div className="bg-slate-900/50 border border-white/5 rounded-2xl p-6 space-y-4">
    <h2 className="text-xl font-bold text-white mb-4">{title}</h2>
    {children}
  </div>
);

export default EkubMerchantDashboard;
