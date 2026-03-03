import React from 'react';
import { motion } from 'motion/react';
import { 
  Zap, Bus, Heart, GraduationCap, Landmark, 
  Droplets, Car, ArrowLeft, CreditCard, Calendar
} from 'lucide-react';
import { Transaction, ViewState } from '../../../types';
import { useGlobalState } from '../../context/GlobalStateContext';
import { api } from '../../../services/api';
import UtilityPaymentFlow from './UtilityPaymentFlow';

interface Props {
  onSelectTransaction?: (tx: Transaction) => void;
}

const ServiceDetail: React.FC<Props> = ({ onSelectTransaction }) => {
  const { selectedService, setView, profile, setProfile } = useGlobalState();

  if (!selectedService) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-slate-500">
        <p>No service selected</p>
        <button 
          onClick={() => setView('home')}
          className="mt-4 text-emerald-500 font-bold"
        >
          Go Back Home
        </button>
      </div>
    );
  }

  const iconMap: Record<string, any> = {
    Zap, Bus, Heart, GraduationCap, Landmark, Droplets, Car
  };

  const Icon = iconMap[selectedService.icon] || Zap;

  const isUtility = selectedService.category === 'utility';

  const handlePayBill = async () => {
    if (!profile || !selectedService) return;
    
    const amount = selectedService.price || 0;
    
    try {
      const res = await api.pay(
        profile.id, 
        selectedService.id, 
        amount, 
        selectedService.name
      );

      if (res.success) {
        // Refresh profile to update balance
        const updatedProfile = await api.getProfile(profile.id);
        setProfile({ ...updatedProfile, isLoggedIn: true });
        
        if (onSelectTransaction && res.txId) {
          onSelectTransaction({
            id: res.txId,
            userId: profile.id,
            merchantId: selectedService.id,
            amount: amount,
            type: 'PAYMENT',
            status: 'COMPLETED',
            description: selectedService.name,
            timestamp: new Date().toISOString()
          });
        } else {
          alert(`Successfully paid ETB ${amount.toFixed(2)} for ${selectedService.name}`);
          setView('home');
        }
      } else {
        alert(res.error || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      alert('An unexpected error occurred during payment.');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="min-h-screen bg-slate-950 text-white pb-24"
    >
      {/* Header */}
      <div className="p-6 flex items-center gap-4">
        <button 
          onClick={() => setView('services')}
          className="p-2 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-bold">{isUtility ? 'Utility Payment' : 'Service Details'}</h2>
      </div>

      {isUtility ? (
        <UtilityPaymentFlow service={selectedService} onBack={() => setView('services')} />
      ) : (
        <>
          {/* Hero Section */}
          <div className="px-6 space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-8 bg-emerald-500/10 text-emerald-500 rounded-3xl shadow-2xl shadow-emerald-500/10">
                <Icon size={64} />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{selectedService.name}</h1>
                <p className="text-slate-500 uppercase text-xs font-bold tracking-widest mt-1">
                  {selectedService.category}
                </p>
              </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl space-y-1">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Price</p>
                <p className="text-lg font-bold">
                  {selectedService.price > 0 ? `ETB ${selectedService.price.toFixed(2)}` : 'Variable'}
                </p>
              </div>
              <div className="bg-slate-900/50 border border-white/5 p-4 rounded-2xl space-y-1">
                <p className="text-[10px] text-slate-500 uppercase font-bold">Availability</p>
                <p className="text-lg font-bold text-emerald-500">24/7 Active</p>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">About this service</h3>
              <p className="text-slate-300 leading-relaxed">
                {selectedService.description}. This service is part of the Addis Ababa Citylink initiative to digitize public utilities and transport. By using this portal, you ensure faster processing and transparent transactions.
              </p>
            </div>

            {/* Requirements */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Requirements</h3>
              <ul className="space-y-2">
                {['Valid City ID', 'Sufficient Wallet Balance', 'Active Internet Connection'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-slate-400">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Action Bar */}
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-slate-950/80 backdrop-blur-xl border-t border-white/5 max-w-xl mx-auto">
            <div className="flex gap-4">
              <button 
                onClick={handlePayBill}
                className="flex-[2] bg-emerald-500 text-slate-950 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-transform"
              >
                <CreditCard size={20} /> 
                Pay Bill
              </button>
              <button className="flex-1 bg-slate-800 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 border border-white/5 active:scale-95 transition-transform">
                <Calendar size={20} /> Book
              </button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};

export default ServiceDetail;
