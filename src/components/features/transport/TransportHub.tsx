import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bus, Train, MapPin, Clock, ArrowRight, 
  QrCode, Navigation, Info, AlertCircle,
  ChevronRight, Search, Star, CreditCard, ArrowLeft,
  X, CheckCircle2, Loader2
} from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { api } from '../../../services/api';

import AnbessaBusCitizenHub from './AnbessaBusCitizenHub';

const TransportHub: React.FC = () => {
  const { setView, profile, setProfile, activeJourney, setActiveJourney } = useGlobalState();
  const [activeTab, setActiveTab] = useState<'LRT' | 'BUS'>('BUS');
  const [isScanning, setIsScanning] = useState(false);
  const [scanType, setScanType] = useState<'START' | 'END' | null>(null);
  const [loading, setLoading] = useState(false);

  const lrtLines = [
    { id: 'blue', name: 'Blue Line (East-West)', status: 'Operational', stations: ['Ayat', 'Megenagna', 'Mexico', 'Tor Hailoch'], color: 'bg-blue-500' },
    { id: 'green', name: 'Green Line (North-South)', status: 'Operational', stations: ['Kality', 'Stadium', 'Menelik II Square'], color: 'bg-emerald-500' },
  ];

  const busRoutes = [
    { id: 'anbessa_1', name: 'Anbessa - Route 04', from: 'Piazza', to: 'Bole', next: '12 mins', fare: 5.0 },
    { id: 'sheger_2', name: 'Sheger - Express 1', from: 'Megenagna', to: 'Mexico', next: '5 mins', fare: 10.0 },
    { id: 'anbessa_3', name: 'Anbessa - Route 22', from: 'Stadium', to: 'Kality', next: '25 mins', fare: 5.0 },
  ];

  const handleScan = (type: 'START' | 'END') => {
    setScanType(type);
    setIsScanning(true);
  };

  const simulateScan = async (station: string) => {
    if (!profile) return;
    setLoading(true);
    try {
      if (scanType === 'START') {
        const journey = await api.startJourney(profile.id, activeTab, station);
        setActiveJourney(journey);
      } else if (scanType === 'END' && activeJourney) {
        const result = await api.endJourney(activeJourney.id, station);
        
        // Process payment for the fare
        const payRes = await api.pay(profile.id, 'm_transport', result.fare, `Transport Fare: ${activeJourney.startStation} to ${station}`);
        
        if (payRes.success) {
          const updatedProfile = await api.getProfile(profile.id);
          setProfile({ ...updatedProfile, isLoggedIn: true });
          setActiveJourney(null);
          alert(`Journey Completed! Fare: ETB ${result.fare.toFixed(2)}`);
        }
      }
      setIsScanning(false);
    } catch (e) {
      console.error('Journey error', e);
    } finally {
      setLoading(false);
    }
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
          {scanType === 'START' ? 'Scan Station QR' : 'Scan to Exit'}
        </h2>
        <p className="text-slate-500 text-sm max-w-[250px] mx-auto">
          Position the QR code within the frame to {scanType === 'START' ? 'start your journey' : 'complete your trip'}.
        </p>
      </div>

      {/* Demo Station Selector */}
      <div className="mt-12 grid grid-cols-2 gap-3 w-full max-w-xs">
        {['Stadium', 'Mexico', 'Megenagna', 'Ayat'].map(station => (
          <button 
            key={station}
            onClick={() => simulateScan(station)}
            className="bg-slate-900 border border-white/5 py-3 rounded-xl text-xs font-bold hover:bg-emerald-500 hover:text-slate-950 transition-all"
          >
            {station}
          </button>
        ))}
      </div>
    </motion.div>
  );

  const renderActiveJourney = () => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900 border border-emerald-500/30 rounded-[2.5rem] p-6 space-y-6 shadow-2xl shadow-emerald-500/10"
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
            {activeJourney?.type === 'LRT' ? <Train size={20} /> : <Bus size={20} />}
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Journey</p>
            <p className="text-sm font-bold">In Progress</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-emerald-500">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-xs font-bold">Live</span>
        </div>
      </div>

      <div className="flex items-center justify-between py-4 border-y border-white/5">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">From</p>
          <p className="text-lg font-bold">{activeJourney?.startStation}</p>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="h-px bg-slate-800 flex-1 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 p-1 border border-white/5 rounded-full">
              <ArrowRight size={12} className="text-emerald-500" />
            </div>
          </div>
        </div>
        <div className="space-y-1 text-right">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">To</p>
          <p className="text-lg font-bold text-slate-600">Scanning...</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-slate-800/50 p-4 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Start Time</p>
          <p className="text-sm font-bold">{new Date(activeJourney?.startTime || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <div className="bg-slate-800/50 p-4 rounded-2xl">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Est. Fare</p>
          <p className="text-sm font-bold text-emerald-500">ETB 5.00 - 10.00</p>
        </div>
      </div>

      <button 
        onClick={() => handleScan('END')}
        className="w-full bg-emerald-500 text-slate-950 font-bold py-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
      >
        <QrCode size={20} /> Scan to Exit Station
      </button>
    </motion.div>
  );

  const renderLRT = () => (
    <div className="space-y-6">
      <div className="grid gap-4">
        {lrtLines.map(line => (
          <div key={line.id} className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${line.color} animate-pulse`} />
                <h3 className="font-bold text-lg">{line.name}</h3>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full font-bold uppercase">
                {line.status}
              </span>
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
              {line.stations.map((station, i) => (
                <React.Fragment key={station}>
                  <div className="flex-shrink-0 px-3 py-1 bg-slate-800 rounded-lg text-xs text-slate-300">
                    {station}
                  </div>
                  {i < line.stations.length - 1 && <ChevronRight size={12} className="text-slate-600" />}
                </React.Fragment>
              ))}
            </div>

            <button className="w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all">
              <Navigation size={16} /> View Full Schedule
            </button>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Nearby Stations</h3>
        <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
              <MapPin size={20} />
            </div>
            <div>
              <p className="font-bold">Stadium Station</p>
              <p className="text-xs text-slate-500">450m away • 6 min walk</p>
            </div>
          </div>
          <button className="p-2 text-slate-400">
            <ChevronRight size={20} />
          </button>
        </div>
      </section>
    </div>
  );

  const renderBus = () => (
    <AnbessaBusCitizenHub />
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-slate-950 text-white pb-24"
    >
      <AnimatePresence>
        {isScanning && renderScanner()}
      </AnimatePresence>

      {/* Header */}
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setView('home')}
              className="p-2 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-3xl font-bold tracking-tight">Transport Hub</h1>
          </div>
          <div className="flex gap-2">
            <button className="p-2 bg-slate-900 rounded-xl text-slate-400"><Star size={20} /></button>
            <button className="p-2 bg-slate-900 rounded-xl text-slate-400"><Info size={20} /></button>
          </div>
        </div>

        {/* Active Journey or Quick Ticket */}
        {activeJourney ? renderActiveJourney() : (
          <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-[2.5rem] p-8 relative overflow-hidden shadow-2xl shadow-emerald-500/20">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Train size={140} />
            </div>
            <div className="relative z-10 space-y-6">
              <div className="space-y-1">
                <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest">Digital Boarding Pass</p>
                <h2 className="text-2xl font-bold">Ready to travel?</h2>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => handleScan('START')}
                  className="bg-white text-emerald-600 px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 shadow-lg active:scale-95 transition-transform"
                >
                  <QrCode size={18} /> Scan to Start
                </button>
                <button className="bg-emerald-500/20 backdrop-blur-md text-white border border-white/20 px-6 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 active:scale-95 transition-transform">
                  <CreditCard size={18} /> Top Up
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex p-1 bg-slate-900 rounded-2xl">
          <button 
            onClick={() => setActiveTab('LRT')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'LRT' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500'}`}
          >
            <Train size={18} /> LRT Metro
          </button>
          <button 
            onClick={() => setActiveTab('BUS')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'BUS' ? 'bg-slate-800 text-white shadow-lg' : 'text-slate-500'}`}
          >
            <Bus size={18} /> City Bus
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'LRT' ? renderLRT() : renderBus()}
          </motion.div>
        </AnimatePresence>

        {/* Service Alerts */}
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-4">
          <AlertCircle className="text-amber-500 flex-shrink-0" size={20} />
          <div>
            <p className="text-xs font-bold text-amber-500 uppercase tracking-widest">Service Alert</p>
            <p className="text-xs text-amber-200/80 leading-relaxed mt-1">
              LRT Green Line experiencing minor delays at Stadium station due to maintenance. Plan accordingly.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TransportHub;
