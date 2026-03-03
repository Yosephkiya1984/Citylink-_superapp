import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bus, Map, QrCode, Navigation, AlertTriangle, 
  CheckCircle2, Loader2, X, ShieldAlert, MapPin, 
  CreditCard, Clock, User
} from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { api } from '../../../services/api';

type TripState = 'IDLE' | 'PENDING' | 'ACTIVE' | 'COMPLETED';

const AnbessaBusCitizenHub: React.FC = () => {
  const { profile, setProfile } = useGlobalState();
  const [tripState, setTripState] = useState<TripState>('IDLE');
  const [isScanning, setIsScanning] = useState(false);
  const [scanType, setScanType] = useState<'STATION' | 'MERCHANT' | 'EXIT' | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncCountdown, setSyncCountdown] = useState(0);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [activeBus, setActiveBus] = useState<any>(null);

  const activeBuses = [
    { id: 'BUS-001', route: 'Anbessa 5', from: 'Piazza', to: 'Bole', occupancy: 'Low', lat: 9.03, lng: 38.74 },
    { id: 'BUS-002', route: 'Anbessa 10', from: 'Megenagna', to: 'Mexico', occupancy: 'High', lat: 9.01, lng: 38.76 },
    { id: 'BUS-003', route: 'Anbessa 25', from: 'Stadium', to: 'Kality', occupancy: 'Medium', lat: 9.00, lng: 38.75 },
  ];

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (syncCountdown > 0) {
      timer = setTimeout(() => setSyncCountdown(syncCountdown - 1), 1000);
    } else if (syncCountdown === 0 && tripState === 'PENDING' && activeBus) {
      // Synchronicity check complete
      setTripState('ACTIVE');
    }
    return () => clearTimeout(timer);
  }, [syncCountdown, tripState, activeBus]);

  const handleScan = (type: 'STATION' | 'MERCHANT' | 'EXIT') => {
    setScanType(type);
    setIsScanning(true);
  };

  const processScan = async (data: string) => {
    setLoading(true);
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (scanType === 'STATION') {
        // Stage 1: Station Scan
        // Simulate GPS verification
        setTripState('PENDING');
        alert("Station verified via GPS. Please scan the Conductor's QR code when boarding.");
      } else if (scanType === 'MERCHANT') {
        // Stage 2: Boarding Scan
        setActiveBus(activeBuses[0]); // Assign a dummy bus
        setSyncCountdown(5); // Simulate 60s check with 5s for demo
      } else if (scanType === 'EXIT') {
        // Intelligent Fare Deduction
        await processPayment(5.0); // Base fare
        setTripState('COMPLETED');
        setTimeout(() => {
          setTripState('IDLE');
          setActiveBus(null);
        }, 3000);
      }
      setIsScanning(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const processPayment = async (baseAmount: number) => {
    if (!profile) return;
    
    // Apply Fayda ID discount (e.g., student)
    let finalAmount = baseAmount;
    let discountApplied = false;
    if (profile.role === 'citizen') {
      // Assume 20% discount for demo
      finalAmount = baseAmount * 0.8;
      discountApplied = true;
    }

    const res = await api.pay(profile.id, 'm_anbessa_bus', finalAmount, 'Anbessa Bus Fare');
    if (res.success) {
      const updatedProfile = await api.getProfile(profile.id);
      setProfile({ ...updatedProfile, isLoggedIn: true });
      alert(`Fare Deducted: ETB ${finalAmount.toFixed(2)} ${discountApplied ? '(Fayda Discount Applied)' : ''}`);
    }
  };

  const handleGpsDivergence = async () => {
    // Simulate user forgetting to scan out and moving away from the bus
    alert("GPS Divergence Detected: You moved away from the bus without scanning out. Charging MAX FARE.");
    await processPayment(15.0); // Max fare
    setTripState('IDLE');
    setActiveBus(null);
  };

  const submitReport = () => {
    if (!reportReason) return;
    alert(`Report submitted for ${activeBus?.id}: ${reportReason}`);
    setShowReportModal(false);
    setReportReason('');
  };

  const renderScanner = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6"
    >
      <button 
        onClick={() => setIsScanning(false)}
        className="absolute top-6 right-6 p-2 bg-slate-900 rounded-full text-slate-400"
      >
        <X size={24} />
      </button>

      <div className="w-full max-w-xs aspect-square border-2 border-emerald-500/50 rounded-3xl relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-emerald-500/5 animate-pulse" />
        <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-scan" />
        <QrCode size={120} className="text-emerald-500/20" />
        
        {loading && (
          <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center">
            <Loader2 className="animate-spin text-emerald-500" size={40} />
          </div>
        )}
      </div>

      <div className="mt-12 text-center space-y-4">
        <h2 className="text-2xl font-bold">
          {scanType === 'STATION' ? 'Scan Station QR' : scanType === 'MERCHANT' ? "Scan Conductor's QR" : 'Scan to Exit'}
        </h2>
        <p className="text-slate-500 text-sm max-w-[250px] mx-auto">
          {scanType === 'STATION' ? 'Verify your location at the station.' : 
           scanType === 'MERCHANT' ? 'Start synchronicity check with the bus.' : 
           'Calculate your fare based on distance traveled.'}
        </p>
      </div>

      {/* Demo Scanner Buttons */}
      <div className="mt-12 grid grid-cols-1 gap-3 w-full max-w-xs">
        <button 
          onClick={() => processScan('demo_qr_data')}
          className="bg-emerald-500 text-slate-950 py-4 rounded-xl font-bold hover:bg-emerald-400 transition-all"
        >
          Simulate Successful Scan
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {isScanning && renderScanner()}
      </AnimatePresence>

      {/* Active Trip Status */}
      {tripState !== 'IDLE' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 space-y-6 shadow-2xl shadow-emerald-500/10"
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                <Bus size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Trip Status</p>
                <p className="text-sm font-bold text-white">
                  {tripState === 'PENDING' ? 'Awaiting Boarding' : tripState === 'ACTIVE' ? 'In Transit' : 'Trip Completed'}
                </p>
              </div>
            </div>
            {tripState === 'ACTIVE' && (
              <div className="flex items-center gap-2 text-emerald-500">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-xs font-bold">Live</span>
              </div>
            )}
          </div>

          {tripState === 'PENDING' && syncCountdown > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 text-center">
              <p className="text-sm text-blue-400 font-bold mb-2">Synchronicity Check in Progress</p>
              <div className="text-3xl font-mono text-white">{syncCountdown}s</div>
              <p className="text-xs text-slate-400 mt-2">Verifying GPS proximity to Conductor...</p>
            </div>
          )}

          {tripState === 'PENDING' && syncCountdown === 0 && (
            <button 
              onClick={() => handleScan('MERCHANT')}
              className="w-full bg-emerald-500 text-slate-950 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <QrCode size={20} /> Scan Conductor QR to Board
            </button>
          )}

          {tripState === 'ACTIVE' && activeBus && (
            <div className="space-y-4">
              <div className="flex items-center justify-between py-4 border-y border-white/5">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Route</p>
                  <p className="text-lg font-bold">{activeBus.route}</p>
                </div>
                <div className="space-y-1 text-right">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bus ID</p>
                  <p className="text-lg font-bold text-slate-300">{activeBus.id}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => handleScan('EXIT')}
                  className="bg-emerald-500 text-slate-950 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                >
                  <QrCode size={20} /> Scan Out
                </button>
                <button 
                  onClick={handleGpsDivergence}
                  className="bg-red-500/10 text-red-500 border border-red-500/30 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all text-xs"
                >
                  <Navigation size={16} /> Sim GPS Diverge
                </button>
              </div>

              <button 
                onClick={() => setShowReportModal(true)}
                className="w-full bg-slate-800 text-slate-300 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-700 transition-all text-sm"
              >
                <ShieldAlert size={16} /> Report Issue
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Real-Time Fleet Discovery Map */}
      <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 h-64 relative overflow-hidden flex flex-col">
        <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-4 relative z-10">
          <Map className="text-emerald-500" /> Live Fleet Discovery
        </h3>
        <div className="absolute inset-0 opacity-40 bg-[url('https://picsum.photos/seed/addis/800/400')] bg-cover bg-center mix-blend-luminosity"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent"></div>
        
        <div className="relative z-10 flex-1 flex flex-col justify-end">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
            {activeBuses.map(bus => (
              <div key={bus.id} className="bg-slate-900/80 backdrop-blur-md border border-white/10 p-3 rounded-xl min-w-[160px] flex-shrink-0">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-emerald-400">{bus.route}</span>
                  <span className={`w-2 h-2 rounded-full ${bus.occupancy === 'High' ? 'bg-red-500' : bus.occupancy === 'Medium' ? 'bg-yellow-500' : 'bg-emerald-500'}`}></span>
                </div>
                <p className="text-[10px] text-slate-400">{bus.from} → {bus.to}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Start Journey */}
      {tripState === 'IDLE' && (
        <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl space-y-4">
          <h3 className="text-lg font-bold text-white">Start a Journey</h3>
          <p className="text-sm text-slate-400">Scan the QR code at the bus station to begin your trip and verify your location.</p>
          <button 
            onClick={() => handleScan('STATION')}
            className="w-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/30 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-emerald-500/20 transition-all"
          >
            <QrCode size={20} /> Scan Station QR
          </button>
        </div>
      )}

      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-sm space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <AlertTriangle className="text-yellow-500" /> Report Issue
                </h3>
                <button onClick={() => setShowReportModal(false)} className="text-slate-500 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-slate-400">Reporting Bus: <span className="font-bold text-white">{activeBus?.id}</span></p>
                <select 
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 rounded-xl p-4 text-sm text-white focus:outline-none focus:border-yellow-500"
                >
                  <option value="" disabled>Select a reason...</option>
                  <option value="Dangerous Driving">Dangerous Driving</option>
                  <option value="Overcrowded / Wrong Load Count">Overcrowded / Wrong Load Count</option>
                  <option value="Rude Conductor">Rude Conductor</option>
                  <option value="Other">Other</option>
                </select>
                
                <button 
                  onClick={submitReport}
                  disabled={!reportReason}
                  className="w-full bg-yellow-500 text-slate-950 font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Submit Report
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnbessaBusCitizenHub;
