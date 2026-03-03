import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, MapPin, AlertTriangle, Send, ArrowLeft, 
  CheckCircle2, Loader2, Image as ImageIcon, Video,
  ShieldAlert, HardHat, PhoneCall, Info, X, ArrowRight
} from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { api } from '../../../services/api';

const categories = [
  { id: 'infrastructure', name: 'Road & Infrastructure', icon: HardHat, color: 'bg-amber-500' },
  { id: 'utility', name: 'Utility (Water/Electric)', icon: AlertTriangle, color: 'bg-blue-500' },
  { id: 'safety', name: 'Safety & Crime', icon: ShieldAlert, color: 'bg-red-500' },
  { id: 'telecom', name: 'Telecommunication', icon: PhoneCall, color: 'bg-purple-500' },
  { id: 'other', name: 'Other Illegal Activity', icon: Info, color: 'bg-slate-500' },
];

const CityReport: React.FC = () => {
  const { setView, profile } = useGlobalState();
  const [step, setStep] = useState<'CATEGORY' | 'FORM' | 'SUCCESS'>('CATEGORY');
  const [selectedCategory, setSelectedCategory] = useState<typeof categories[0] | null>(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCategorySelect = (cat: typeof categories[0]) => {
    setSelectedCategory(cat);
    setStep('FORM');
  };

  const handleCaptureLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        setIsLocating(false);
      }, (error) => {
        console.error("Error getting location", error);
        setIsLocating(false);
        alert("Could not get your location. Please ensure GPS is enabled.");
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!profile || !selectedCategory) return;
    setIsSubmitting(true);
    try {
      await api.submitReport({
        userId: profile.id,
        category: selectedCategory.id,
        description,
        location,
        mediaUrl: mediaPreview // In real app, upload to storage first
      });
      setStep('SUCCESS');
    } catch (error) {
      console.error("Submission failed", error);
      alert("Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-slate-950 text-white pb-24"
    >
      {/* Header */}
      <div className="p-6 flex items-center gap-4 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl sticky top-0 z-30">
        <button 
          onClick={() => step === 'FORM' ? setStep('CATEGORY') : setView('home')}
          className="p-2 bg-slate-900 rounded-xl text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-xl font-bold">City Reporting</h2>
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          {step === 'CATEGORY' && (
            <motion.div 
              key="category"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">What would you like to report?</h1>
                <p className="text-slate-400">Select a category to help us route your report to the right department.</p>
              </div>

              <div className="grid gap-4">
                {categories.map((cat) => (
                  <button 
                    key={cat.id}
                    onClick={() => handleCategorySelect(cat)}
                    className="flex items-center gap-4 p-5 bg-slate-900/50 border border-white/5 rounded-3xl hover:bg-slate-900 hover:border-white/10 transition-all active:scale-[0.98] text-left group"
                  >
                    <div className={`p-4 ${cat.color} rounded-2xl text-white shadow-lg group-hover:scale-110 transition-transform`}>
                      <cat.icon size={24} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg">{cat.name}</h3>
                      <p className="text-xs text-slate-500">Report incidents in this category</p>
                    </div>
                    <ArrowRight size={20} className="text-slate-700 group-hover:text-white transition-colors" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 'FORM' && (
            <motion.div 
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 ${selectedCategory?.color} rounded-lg text-white`}>
                  {selectedCategory && <selectedCategory.icon size={20} />}
                </div>
                <h2 className="text-xl font-bold">{selectedCategory?.name} Report</h2>
              </div>

              {/* Media Upload */}
              <div className="space-y-3">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Evidence (Photo/Video)</p>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-video bg-slate-900 border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-emerald-500/50 transition-all overflow-hidden relative group"
                >
                  {mediaPreview ? (
                    <>
                      <img src={mediaPreview} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <p className="text-sm font-bold">Change Media</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="p-4 bg-slate-800 rounded-full text-slate-400 group-hover:text-emerald-500 transition-colors">
                        <Camera size={32} />
                      </div>
                      <p className="text-sm text-slate-500">Tap to upload or take a photo</p>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="image/*,video/*" 
                    className="hidden" 
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-3">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Description</p>
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the incident in detail..."
                  className="w-full bg-slate-900 border border-white/10 rounded-3xl p-5 min-h-[150px] outline-none focus:border-emerald-500 transition-all text-slate-200"
                />
              </div>

              {/* Location */}
              <div className="space-y-3">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Location</p>
                <button 
                  onClick={handleCaptureLocation}
                  className={`w-full p-5 rounded-3xl border flex items-center justify-between transition-all ${location ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-slate-900 border-white/10 text-slate-400'}`}
                >
                  <div className="flex items-center gap-3">
                    <MapPin size={20} />
                    <span className="font-bold">
                      {isLocating ? 'Pinging Location...' : location ? 'Location Captured' : 'Ping Active Location'}
                    </span>
                  </div>
                  {isLocating ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : location ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <ArrowRight size={20} />
                  )}
                </button>
                {location && (
                  <p className="text-[10px] text-slate-500 font-mono text-center">
                    Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button 
                onClick={handleSubmit}
                disabled={isSubmitting || !description || !selectedCategory}
                className="w-full bg-emerald-500 text-slate-950 font-bold py-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                {isSubmitting ? 'Submitting Report...' : 'Submit to City Admin'}
              </button>
            </motion.div>
          )}

          {step === 'SUCCESS' && (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8 py-12"
            >
              <div className="w-24 h-24 bg-emerald-500 rounded-full mx-auto flex items-center justify-center shadow-2xl shadow-emerald-500/40">
                <CheckCircle2 size={48} className="text-slate-950" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold">Report Received</h2>
                <p className="text-slate-400">Thank you for helping us keep Addis Ababa safe and functional. Your report has been logged.</p>
              </div>

              <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 text-left space-y-4">
                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Reference ID</span>
                  <span className="text-sm font-mono text-emerald-500">#REP-{Math.random().toString(36).substring(7).toUpperCase()}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Our response team has been notified. You can track the status of this report in your profile activity.
                </p>
              </div>

              <button 
                onClick={() => setView('home')}
                className="w-full bg-white text-slate-950 font-bold py-5 rounded-2xl transition-all active:scale-95"
              >
                Back to Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default CityReport;
