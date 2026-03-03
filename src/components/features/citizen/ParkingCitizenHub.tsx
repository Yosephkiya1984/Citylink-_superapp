import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin, Search, Car, Clock, DollarSign, CheckCircle2, XCircle, ChevronLeft, CreditCard, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { api } from '../../../services/api';
import { ParkingSession, ParkingSpot } from '../../../types';



const ParkingCitizenHub: React.FC = () => {
  const { setView, profile } = useGlobalState();
  const [parkingSpots, setParkingSpots] = useState<any[]>([]);
  const [groupedSpots, setGroupedSpots] = useState<Record<string, { name: string, location: string, distance: string, price: number, spots: any[] }>>({});
  const [expandedLotId, setExpandedLotId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpot, setSelectedSpot] = useState<any | null>(null);
  const [currentParkingSession, setCurrentParkingSession] = useState<ParkingSession | null>(null);
  const [parkingHistory, setParkingHistory] = useState<ParkingSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableSpots = async () => {
    setLoading(true);
    setError(null);
    try {
      const spots = await api.getAvailableParkingSpots(searchQuery);
      setParkingSpots(spots);
      
      // Group spots by lot
      const grouped = spots.reduce((acc: any, spot: any) => {
        const lotId = spot.lotId || 'unknown';
        if (!acc[lotId]) {
          acc[lotId] = {
            id: lotId,
            name: spot.lotName || 'Unknown Lot',
            location: spot.location,
            distance: spot.distance,
            price: spot.pricePerHour,
            spots: []
          };
        }
        acc[lotId].spots.push(spot);
        return acc;
      }, {});
      setGroupedSpots(grouped);
    } catch (err: any) {
      console.error("Failed to fetch parking spots:", err);
      setError(err.message || "Failed to load parking spots.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableSpots();
  }, [searchQuery]);

  useEffect(() => {
    const fetchUserSessions = async () => {
      if (!profile) return;
      try {
        const sessions = await api.getUserParkingSessions(profile.id);
        const active = sessions.find((s: any) => s.status === 'ACTIVE');
        const history = sessions.filter((s: any) => s.status !== 'ACTIVE');
        
        if (active) {
          setCurrentParkingSession(active);
        }
        setParkingHistory(history);
      } catch (err) {
        console.error("Failed to fetch user sessions:", err);
      }
    };

    fetchUserSessions();
  }, [profile]);

  const handleSelectSpot = (spot: any) => {
    setSelectedSpot(spot);
  };

  const handleStartParking = async () => {
    if (!selectedSpot || !profile) return;
    setLoading(true);
    setError('');
    try {
      const session = await api.startParkingSession(profile.id, selectedSpot.id, selectedSpot.pricePerHour);
      setCurrentParkingSession(session);
      setSelectedSpot(null);
      alert(`Parking started at ${selectedSpot.name}!`);
    } catch (err: any) {
      setError(err.message || 'Failed to start parking session.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEndParking = async () => {
    if (!currentParkingSession || !profile) return;
    setLoading(true);
    setError('');
    try {
      const endedSession = await api.endParkingSession(currentParkingSession.id);
      setParkingHistory(prev => [endedSession, ...prev]);
      setCurrentParkingSession(null);

      if (endedSession.totalCost && endedSession.totalCost > 0) {
        try {
          const appUrl = (import.meta as any).env?.VITE_APP_URL || window.location.origin;
          const txRef = `prk-${endedSession.id}-${Date.now().toString().slice(-8)}`;
          // Use the user's provided email as fallback
          const userEmail = (profile.email && profile.email.includes('@')) ? profile.email : 'joe.joeeee.joe@gmail.com';
          
          const checkoutSession = await api.createCheckoutSession({
            amount: endedSession.totalCost,
            currency: 'ETB',
            productName: `Parking Session at ${endedSession.spotName}`,
            successUrl: `${appUrl}?payment=success&tx_ref=${txRef}`,
            cancelUrl: `${appUrl}?payment=cancelled`,
            email: userEmail,
            firstName: profile.name?.split(' ')[0] || 'Valued',
            lastName: profile.name?.split(' ')[1] || 'Customer',
            txRef: txRef
          });
          if (checkoutSession.url) {
            // Open in new tab to avoid iframe issues in preview environment
            window.open(checkoutSession.url, '_blank');
            alert('Payment page opened in a new tab. Please complete your payment there.');
          } else {
            throw new Error('Failed to get checkout URL.');
          }
        } catch (paymentError: any) {
          console.error("Failed to initiate payment:", paymentError);
          setError(paymentError.message || "Failed to initiate payment. Please try again.");
          alert(`Parking ended, but payment failed: ${paymentError.message || 'Unknown error'}`);
        }
      } else {
        alert(`Parking ended. No cost incurred.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to end parking session.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderSpotList = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Search parking lots or areas..." 
            className="w-full bg-slate-800 p-3 pl-10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button 
          onClick={fetchAvailableSpots}
          className="p-3 bg-slate-800 rounded-xl text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          title="Refresh Spots"
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && <div className="text-center text-slate-400">Loading available spots...</div>}
      {error && <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm">Error: {error}</div>}
      {(!loading && !error && Object.keys(groupedSpots).length === 0) && <div className="text-center text-slate-400">No parking spots found.</div>}

      {currentParkingSession && (
        <div className="bg-blue-500/10 border border-blue-500/30 p-4 rounded-2xl flex items-center justify-between animate-in fade-in mb-6">
          <div>
            <p className="text-sm font-bold text-blue-300">Active Parking Session</p>
            <p className="text-lg font-bold text-white">{currentParkingSession.spotName}</p>
            <p className="text-xs text-blue-200">Started: {new Date(currentParkingSession.startTime).toLocaleTimeString()}</p>
          </div>
          <button 
            onClick={handleEndParking}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            End Parking
          </button>
        </div>
      )}

      <div className="space-y-4">
        {Object.values(groupedSpots).map((lot: any) => (
          <div key={lot.id} className="bg-slate-900/50 border border-white/10 rounded-2xl overflow-hidden transition-all hover:border-emerald-500/30">
            <button 
              onClick={() => setExpandedLotId(expandedLotId === lot.id ? null : lot.id)}
              className="w-full p-5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">{lot.name}</h3>
                  <p className="text-sm text-slate-400">{lot.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-emerald-400">{lot.spots.length} spots</p>
                  <p className="text-xs text-slate-500">{lot.distance} away</p>
                </div>
                {expandedLotId === lot.id ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
              </div>
            </button>

            <AnimatePresence>
              {expandedLotId === lot.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="p-5 pt-0 border-t border-white/5 bg-black/20">
                    <div className="flex items-center justify-between mb-4 mt-4">
                      <p className="text-sm text-slate-400">Select a spot in <span className="text-white font-bold">{lot.name}</span></p>
                      <div className="flex items-center gap-2 text-xs text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">
                        <DollarSign size={12} />
                        <span className="font-bold">{lot.price} ETB/hr</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {lot.spots.map((spot: any) => (
                        <button
                          key={spot.id}
                          onClick={() => handleSelectSpot(spot)}
                          disabled={spot.status === 'OCCUPIED' || loading || !!currentParkingSession}
                          className={`
                            p-3 rounded-xl border text-center transition-all relative group
                            ${spot.status === 'AVAILABLE' 
                              ? 'bg-slate-800/50 border-white/10 hover:border-emerald-500 hover:bg-emerald-500/10' 
                              : 'bg-red-500/5 border-red-500/20 opacity-50 cursor-not-allowed'}
                          `}
                        >
                          <p className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{spot.name}</p>
                          <p className="text-[10px] text-slate-500 mt-1">{spot.status}</p>
                          {spot.status === 'AVAILABLE' && (
                            <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSpotDetail = () => (
    <div className="space-y-6 animate-in fade-in">
      <button onClick={() => setSelectedSpot(null)} className="text-slate-400 hover:text-white flex items-center gap-2">
        <ChevronLeft size={20} /> Back to spots
      </button>
      
      <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 space-y-6">
        <h2 className="text-3xl font-bold text-white">{selectedSpot?.name}</h2>
        <p className="text-slate-400">Location: {selectedSpot?.location}</p>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-slate-800/50 p-4 rounded-2xl">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Price</p>
            <p className="text-xl font-bold text-emerald-500">{selectedSpot?.pricePerHour} ETB/hr</p>
          </div>
          <div className="bg-slate-800/50 p-4 rounded-2xl">
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Distance</p>
            <p className="text-xl font-bold">{selectedSpot?.distance}</p>
          </div>
        </div>

        <button 
          onClick={handleStartParking}
          disabled={loading || selectedSpot?.status === 'OCCUPIED' || !!currentParkingSession}
          className="w-full bg-emerald-500 text-slate-950 font-bold py-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
        >
          <Car size={20} /> Start Parking
        </button>
      </div>
    </div>
  );

  const renderParkingHistory = () => (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Parking History</h2>
        <p className="text-slate-400 mt-1">Your past parking sessions and payments.</p>
      </div>

      {parkingHistory.length === 0 ? (
        <div className="py-10 text-center text-slate-500">
          <p>No parking history yet.</p>
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-xs uppercase tracking-wider text-slate-500">
                  <th className="p-4 font-medium">Spot</th>
                  <th className="p-4 font-medium">Duration</th>
                  <th className="p-4 font-medium">Cost</th>
                  <th className="p-4 font-medium">Date</th>
                  <th className="p-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {parkingHistory.map((session: any) => (
                  <tr key={session.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 text-sm font-bold text-white">{session.spotName}</td>
                    <td className="p-4 text-sm text-slate-300">{session.duration}</td>
                    <td className="p-4 text-sm font-bold text-emerald-400">{session.totalCost} ETB</td>
                    <td className="p-4 text-sm text-slate-500">{new Date(session.startTime).toLocaleDateString()}</td>
                    <td className="p-4">
                      <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${session.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {session.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8 font-sans">
      <h1 className="text-4xl font-extrabold tracking-tight mb-8">Parking in Addis</h1>

      <div className="flex flex-wrap gap-4 mb-8">
        <button 
          onClick={() => setSelectedSpot(null)}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${!selectedSpot ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
        >
          Find Parking
        </button>
        <button 
          onClick={() => setSelectedSpot('history')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${selectedSpot === 'history' ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
        >
          My Parking History
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={selectedSpot ? (selectedSpot === 'history' ? 'history' : selectedSpot.id) : 'list'}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {selectedSpot === 'history' ? renderParkingHistory() : (selectedSpot ? renderSpotDetail() : renderSpotList())}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ParkingCitizenHub;
