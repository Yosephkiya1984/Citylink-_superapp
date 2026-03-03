import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, Users, Calendar, Clock, ShieldCheck, 
  Plus, CheckCircle2, Search, ChevronRight, UserPlus, Coins
} from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { api } from '../../../services/api';
import { Ekub } from '../../../types';

const EkubHub: React.FC = () => {
  const { setView, profile } = useGlobalState();
  const [view, setLocalView] = useState<'LIST' | 'DETAIL'>('LIST');
  const [ekubs, setEkubs] = useState<Ekub[]>([]);
  const [selectedEkub, setSelectedEkub] = useState<Ekub | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (view === 'LIST') {
      loadEkubs();
    }
  }, [view]);

  const loadEkubs = async () => {
    setLoading(true);
    try {
      const data = await api.getDiscoverEkubs();
      setEkubs(data);
    } catch (e) {
      console.error('Failed to load Ekubs', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEkub = async (id: string) => {
    setLoading(true);
    try {
      const data = await api.getEkubDetails(id);
      setSelectedEkub(data);
      setLocalView('DETAIL');
    } catch (e) {
      console.error('Failed to load Ekub details', e);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinEkub = async () => {
    if (!selectedEkub || !profile) return;
    setLoading(true);
    try {
      await api.joinEkub(selectedEkub.id, profile.id);
      await handleSelectEkub(selectedEkub.id); // Refresh
    } catch (e) {
      console.error('Failed to join Ekub', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSignWinner = async (roundNumber: number) => {
    if (!selectedEkub || !profile) return;
    setLoading(true);
    try {
      await api.signEkubWinner(selectedEkub.id, roundNumber, profile.id);
      await handleSelectEkub(selectedEkub.id); // Refresh
    } catch (e) {
      console.error('Failed to sign', e);
    } finally {
      setLoading(false);
    }
  };

  const renderList = () => (
    <div className="space-y-6">
      <div className="grid gap-4">
        {ekubs?.map(ekub => (
          <motion.button 
            key={ekub.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => handleSelectEkub(ekub.id)}
            className="bg-slate-900/50 border border-white/5 p-6 rounded-3xl text-left w-full space-y-4 hover:bg-slate-900 transition-all"
          >
            <div className="flex justify-between items-start">
              <h3 className="font-bold text-lg text-white">{ekub.name}</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${ekub.status === 'FORMING' ? 'bg-amber-500/10 text-amber-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                {ekub.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Coins size={16} className="text-emerald-500" />
                <span>ETB {ekub.contributionAmount?.toLocaleString()} / {ekub.frequency?.toLowerCase()}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <Users size={16} />
                <span>{ekub.memberCount}/{ekub.maxMembers} Members</span>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );

  const renderDetail = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-white">{selectedEkub?.name}</h2>
        <p className="text-slate-400">Created by {selectedEkub?.creatorId}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Contribution</p>
          <p className="text-xl font-bold text-emerald-500">ETB {selectedEkub?.contributionAmount?.toLocaleString()}</p>
        </div>
        <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl">
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Frequency</p>
          <p className="text-xl font-bold">{selectedEkub?.frequency}</p>
        </div>
      </div>

      {/* Members */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Members ({selectedEkub?.memberCount}/{selectedEkub?.maxMembers})</h3>
        <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl space-y-3">
          {selectedEkub?.members?.map(member => (
            <div key={member.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={member.avatarUrl} className="w-8 h-8 rounded-full bg-slate-700" referrerPolicy="no-referrer" />
                <p className="text-sm font-bold">{member.name}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${member.contributionStatus === 'PAID' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                  {member.contributionStatus}
                </span>
                {member.status === 'PENDING' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-slate-800 text-slate-400">
                    Pending Approval
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rounds */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Payout Rounds</h3>
        <div className="space-y-2">
          {selectedEkub?.rounds?.map(round => {
            const isWinner = round.winnerId === profile?.id;
            const hasSigned = round.guarantor1Id === profile?.id || round.guarantor2Id === profile?.id;
            const signatureCount = (round.guarantor1Id ? 1 : 0) + (round.guarantor2Id ? 1 : 0);

            return (
              <div key={round.roundNumber} className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">Round {round.roundNumber}</p>
                    <p className="text-xs text-slate-500">Payout on {new Date(round.payoutDate).toLocaleDateString()}</p>
                  </div>
                  {round.winnerId ? (
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-500">Won by {isWinner ? 'You' : round.winnerId}</p>
                      <p className="text-xs text-slate-500">Collected: {round.totalCollected?.toLocaleString()} ETB</p>
                      <p className="text-xs text-slate-500">{round.escrowReleased ? 'Paid Out' : 'In Escrow'}</p>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-slate-500">Pending Draw</span>
                  )}
                </div>
                
                {round.winnerId && !round.escrowReleased && (
                  <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={16} className={signatureCount >= 2 ? "text-emerald-500" : "text-amber-500"} />
                      <span className="text-xs text-slate-400">{signatureCount}/2 Guarantor Signatures</span>
                    </div>
                    {!isWinner && !hasSigned && signatureCount < 2 && (
                      <button 
                        onClick={() => handleSignWinner(round.roundNumber)}
                        disabled={loading}
                        className="text-xs bg-emerald-500/10 text-emerald-500 px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-500/20 transition-colors"
                      >
                        Sign to Release
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {(() => {
        const myMember = selectedEkub?.members?.find(m => m.userId === profile?.id);
        if (myMember) {
          if (myMember.status === 'PENDING') {
            return (
              <div className="w-full bg-slate-900 text-slate-400 font-bold py-5 rounded-2xl flex items-center justify-center gap-2">
                <Clock size={20} /> Pending Approval from Dagna
              </div>
            );
          }
          return (
            <div className="w-full bg-emerald-500/10 text-emerald-500 font-bold py-5 rounded-2xl flex items-center justify-center gap-2 border border-emerald-500/20">
              <CheckCircle2 size={20} /> You are a Member
            </div>
          );
        }
        return (
          <button 
            onClick={handleJoinEkub}
            disabled={loading}
            className="w-full bg-emerald-500 text-slate-950 font-bold py-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            <UserPlus size={20} /> Join Ekub
          </button>
        );
      })()}
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-slate-950 text-white pb-24"
    >
      {/* Header */}
      <div className="p-6 flex items-center gap-4 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-30">
        <button 
          onClick={() => view === 'DETAIL' ? setLocalView('LIST') : setView('home')}
          className="p-2 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-bold">Digital Ekub</h2>
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {view === 'LIST' ? renderList() : renderDetail()}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default EkubHub;
