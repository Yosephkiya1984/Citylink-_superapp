import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, ShieldCheck, User, Store, ArrowRight, 
  Camera, CheckCircle2, Landmark, Building2, MapPin,
  FileText, Fingerprint, Sparkles, Car, Users, Clock, Bus, Briefcase
} from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { OnboardingStage, UserRole } from '../../../types';
import { api } from '../../../services/api';

const OnboardingFlow: React.FC = () => {
  const { setProfile, setView, onboardingStage, setOnboardingStage } = useGlobalState();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [role, setRole] = useState<UserRole>('citizen');
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const nextStage = (stage: OnboardingStage) => setOnboardingStage(stage);

  const handlePhoneSubmit = async () => {
    setLoading(true);
    // Simulate OTP send
    setTimeout(() => {
      setLoading(false);
      nextStage('OTP');
    }, 1500);
  };

  const handleOtpSubmit = async () => {
    setLoading(true);
    // Simulate OTP verify and check if user exists
    try {
      const user = await api.login(phone);
      if (user && !user.error) {
        setProfile({ ...user, isLoggedIn: true });
      } else {
        nextStage('ROLE_SELECTION');
      }
    } catch (e) {
      nextStage('ROLE_SELECTION');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const res = await api.register({
        phone,
        role,
        ...formData
      });
      if (res && !res.error) {
        const profile = { ...res, isLoggedIn: true };
        setProfile(profile);
        if (role === 'merchant') {
          // For merchants, we log them in and their status will be PENDING, App.tsx will route them
        } else {
          // For citizens, they go to the success screen
          nextStage('SUCCESS');
        }
      } else if (res && res.error) {
        alert(`Registration failed: ${res.error}`);
      }
    } catch (e) {
      alert('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStage = () => {
    switch (onboardingStage) {
      case 'WELCOME':
        return (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center space-y-8"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20 animate-pulse" />
              <div className="relative p-8 bg-slate-900 rounded-[2.5rem] border border-white/10">
                <Landmark size={80} className="text-emerald-500" />
              </div>
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight">Addis Ababa <span className="text-emerald-500">Citylink</span></h1>
              <p className="text-slate-400 max-w-xs mx-auto leading-relaxed">
                The unified digital portal for every citizen and merchant in the capital.
              </p>
            </div>
            <button 
              onClick={() => nextStage('PHONE')}
              className="w-full bg-emerald-500 text-slate-950 font-bold py-5 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              Get Started <ArrowRight size={20} />
            </button>
          </motion.div>
        );

      case 'PHONE':
        return (
          <div className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Your Phone</h2>
              <p className="text-slate-400">Enter your mobile number to begin.</p>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                <span className="text-slate-500 font-bold">+251</span>
              </div>
              <input 
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="911 234 567"
                className="w-full bg-slate-900 border border-white/10 rounded-2xl py-5 pl-16 pr-5 text-xl font-mono focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
            <button 
              onClick={handlePhoneSubmit}
              disabled={loading || phone.length < 9}
              className="w-full bg-white text-slate-950 font-bold py-5 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            >
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </div>
        );

      case 'OTP':
        return (
          <div className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Verify</h2>
              <p className="text-slate-400">Enter the 6-digit code sent to +251 {phone}</p>
            </div>
            <div className="flex justify-between gap-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <input 
                  key={i}
                  type="text"
                  maxLength={1}
                  className="w-12 h-16 bg-slate-900 border border-white/10 rounded-xl text-center text-2xl font-bold focus:border-emerald-500 outline-none"
                  onChange={(e) => {
                    if (e.target.value && i < 6) {
                      (e.target.nextSibling as HTMLInputElement)?.focus();
                    }
                    if (i === 6) setOtp('123456'); // Simulate full OTP
                  }}
                />
              ))}
            </div>
            <button 
              onClick={handleOtpSubmit}
              disabled={loading}
              className="w-full bg-emerald-500 text-slate-950 font-bold py-5 rounded-2xl transition-all"
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </div>
        );

      case 'ROLE_SELECTION':
        return (
          <div className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Who are you?</h2>
              <p className="text-slate-400">Select your primary role in the Citylink ecosystem.</p>
            </div>
            <div className="grid gap-4">
              <button 
                onClick={() => { setRole('citizen'); nextStage('KYC_FORM'); }}
                className="p-6 bg-slate-900 border border-white/10 rounded-3xl flex items-center gap-6 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left group"
              >
                <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl group-hover:scale-110 transition-transform">
                  <User size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Citizen</h3>
                  <p className="text-slate-500 text-sm">Access public services, transport, and utilities.</p>
                </div>
              </button>
              <button 
                onClick={() => { setRole('merchant'); nextStage('MERCHANT_TYPE_SELECTION'); }}
                className="p-6 bg-slate-900 border border-white/10 rounded-3xl flex items-center gap-6 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left group"
              >
                <div className="p-4 bg-blue-500/10 text-blue-500 rounded-2xl group-hover:scale-110 transition-transform">
                  <Store size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Merchant</h3>
                  <p className="text-slate-500 text-sm">Accept payments, manage business, and grow.</p>
                </div>
              </button>
            </div>
          </div>
        );

      case 'MERCHANT_TYPE_SELECTION':
        return (
          <div className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Merchant Type</h2>
              <p className="text-slate-400">What kind of merchant are you?</p>
            </div>
            <div className="grid gap-4">
              <button 
                onClick={() => { setFormData({ ...formData, merchant_type: 'seller' }); nextStage('KYC_FORM'); }}
                className="p-6 bg-slate-900 border border-white/10 rounded-3xl flex items-center gap-6 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left group"
              >
                <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl group-hover:scale-110 transition-transform">
                  <Store size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Seller Merchant</h3>
                  <p className="text-slate-500 text-sm">Sell goods on the marketplace.</p>
                </div>
              </button>
              <button 
                onClick={() => { setFormData({ ...formData, merchant_type: 'parking' }); nextStage('KYC_FORM'); }}
                className="p-6 bg-slate-900 border border-white/10 rounded-3xl flex items-center gap-6 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left group"
              >
                <div className="p-4 bg-blue-500/10 text-blue-500 rounded-2xl group-hover:scale-110 transition-transform">
                  <Car size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Parking Merchant</h3>
                  <p className="text-slate-500 text-sm">Manage a parking garage.</p>
                </div>
              </button>
              <button 
                onClick={() => { setFormData({ ...formData, merchant_type: 'ekub' }); nextStage('KYC_FORM'); }}
                className="p-6 bg-slate-900 border border-white/10 rounded-3xl flex items-center gap-6 hover:border-violet-500/50 hover:bg-violet-500/5 transition-all text-left group"
              >
                <div className="p-4 bg-violet-500/10 text-violet-500 rounded-2xl group-hover:scale-110 transition-transform">
                  <Users size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Ekub Merchant</h3>
                  <p className="text-slate-500 text-sm">Organize community savings groups.</p>
                </div>
              </button>
              <button 
                onClick={() => { setFormData({ ...formData, merchant_type: 'bus' }); nextStage('KYC_FORM'); }}
                className="p-6 bg-slate-900 border border-white/10 rounded-3xl flex items-center gap-6 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all text-left group"
              >
                <div className="p-4 bg-orange-500/10 text-orange-500 rounded-2xl group-hover:scale-110 transition-transform">
                  <Bus size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Bus Merchant</h3>
                  <p className="text-slate-500 text-sm">Manage public transport ticketing.</p>
                </div>
              </button>
              <button 
                onClick={() => { setFormData({ ...formData, merchant_type: 'employer' }); nextStage('KYC_FORM'); }}
                className="p-6 bg-slate-900 border border-white/10 rounded-3xl flex items-center gap-6 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-left group"
              >
                <div className="p-4 bg-indigo-500/10 text-indigo-500 rounded-2xl group-hover:scale-110 transition-transform">
                  <Briefcase size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Employer Merchant</h3>
                  <p className="text-slate-500 text-sm">Recruit and verify talent.</p>
                </div>
              </button>
            </div>
          </div>
        );

      case 'KYC_FORM':
        return (
          <div className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Citizen KYC</h2>
              <p className="text-slate-400">Please provide your official details.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Full Name</label>
                <input 
                  type="text"
                  placeholder="Abebe Bikila"
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 px-5 outline-none focus:border-emerald-500"
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">National ID Number</label>
                <input 
                  type="text"
                  placeholder="123456789012"
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 px-5 outline-none focus:border-emerald-500"
                  onChange={(e) => setFormData({ ...formData, id_number: e.target.value })}
                />
                <p className="text-xs text-emerald-500/80 mt-1">Hint: For testing, use a 12-digit number starting with '123'</p>
              </div>
            </div>
            <button 
              onClick={() => nextStage('KYC_ID_SCAN')}
              className="w-full bg-emerald-500 text-slate-950 font-bold py-5 rounded-2xl transition-all"
            >
              Continue to Verification
            </button>
          </div>
        );

      case 'KYC_ID_SCAN':
        return (
          <div className="space-y-8 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Scan ID</h2>
              <p className="text-slate-400">Place your National ID card within the frame.</p>
            </div>
            <div className="aspect-[3/2] bg-slate-900 rounded-3xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/10 to-transparent" />
              <Camera size={48} className="text-slate-500" />
              <p className="text-xs font-bold text-slate-500 uppercase">Front of ID Card</p>
              <div className="absolute top-4 right-4 text-emerald-500">
                <ShieldCheck size={24} />
              </div>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => nextStage('KYC_FORM')}
                className="w-1/3 bg-slate-800 text-white font-bold py-5 rounded-2xl transition-all"
              >
                Back
              </button>
              <button 
                onClick={() => nextStage('KYC_FACE')}
                className="w-2/3 bg-white text-slate-950 font-bold py-5 rounded-2xl transition-all"
              >
                Capture & Continue
              </button>
            </div>
          </div>
        );

      case 'KYC_FACE':
        return (
          <div className="space-y-8 text-center">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Face Match</h2>
              <p className="text-slate-400">Look directly into the camera and blink.</p>
            </div>
            <div className="w-64 h-64 mx-auto bg-slate-900 rounded-full border-4 border-emerald-500/30 flex flex-col items-center justify-center gap-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/10 to-transparent" />
              <Fingerprint size={64} className="text-emerald-500 animate-pulse" />
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => nextStage('KYC_FORM')}
                disabled={loading}
                className="w-1/3 bg-slate-800 text-white font-bold py-5 rounded-2xl transition-all disabled:opacity-50"
              >
                Back
              </button>
              <button 
                onClick={role === 'citizen' ? handleRegister : () => nextStage('KYB_FORM')}
                disabled={loading}
                className="w-2/3 bg-emerald-500 text-slate-950 font-bold py-5 rounded-2xl transition-all disabled:opacity-50"
              >
                {loading ? 'Processing...' : (role === 'citizen' ? 'Complete Verification' : 'Continue to Business Verification')}
              </button>
            </div>
          </div>
        );

      case 'KYB_FORM':
        const mType = formData.merchant_type || 'seller';
        return (
          <div className="space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Merchant KYB</h2>
              <p className="text-slate-400">Register your business with the city.</p>
            </div>
            <div className="space-y-4">
              {/* Common Fields */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  {mType === 'ekub' ? 'Ekub/Organizer Name' : 'Business Name'}
                </label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                  <input 
                    type="text"
                    placeholder={mType === 'ekub' ? "Addis Ekub" : "Addis Coffee Shop"}
                    className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 pl-12 pr-5 outline-none focus:border-blue-500"
                    onChange={(e) => setFormData({ ...formData, merchant_name: e.target.value })}
                  />
                </div>
              </div>

              {/* Conditional Fields based on Merchant Type */}
              {mType === 'seller' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Trade License Number</label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        type="text"
                        placeholder="BL-2024-889"
                        className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 pl-12 pr-5 outline-none focus:border-blue-500"
                        onChange={(e) => setFormData({ ...formData, business_license: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">TIN Number</label>
                    <div className="relative">
                      <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        type="text"
                        placeholder="1234567890"
                        className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 pl-12 pr-5 outline-none focus:border-blue-500"
                        onChange={(e) => setFormData({ ...formData, tin_number: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              {mType === 'parking' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">AATMA Permit Number</label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        type="text"
                        placeholder="AATMA-PK-2024-123"
                        className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 pl-12 pr-5 outline-none focus:border-blue-500"
                        onChange={(e) => setFormData({ ...formData, business_license: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Parking Zone/Location</label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        type="text"
                        placeholder="Bole, Around Edna Mall"
                        className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 pl-12 pr-5 outline-none focus:border-blue-500"
                        onChange={(e) => setFormData({ ...formData, parking_location: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              {mType === 'ekub' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Woreda Recognition Letter No.</label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        type="text"
                        placeholder="WR-2024-456"
                        className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 pl-12 pr-5 outline-none focus:border-blue-500"
                        onChange={(e) => setFormData({ ...formData, business_license: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Guarantor National ID</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        type="text"
                        placeholder="Fayda ID or Kebele ID"
                        className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 pl-12 pr-5 outline-none focus:border-blue-500"
                        onChange={(e) => setFormData({ ...formData, guarantor_id: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              {mType === 'bus' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Transport Bureau Route Permit</label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        type="text"
                        placeholder="AATB-RT-2024-789"
                        className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 pl-12 pr-5 outline-none focus:border-blue-500"
                        onChange={(e) => setFormData({ ...formData, business_license: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Vehicle Registration No. (Plate)</label>
                    <div className="relative">
                      <Car className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        type="text"
                        placeholder="AA-3-12345"
                        className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 pl-12 pr-5 outline-none focus:border-blue-500"
                        onChange={(e) => setFormData({ ...formData, vehicle_plate: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

              {mType === 'employer' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Trade License / Investment Permit</label>
                    <div className="relative">
                      <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        type="text"
                        placeholder="INV-2024-321"
                        className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 pl-12 pr-5 outline-none focus:border-blue-500"
                        onChange={(e) => setFormData({ ...formData, business_license: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pension Agency Reg. No.</label>
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                      <input 
                        type="text"
                        placeholder="PEN-2024-654"
                        className="w-full bg-slate-900 border border-white/10 rounded-2xl py-4 pl-12 pr-5 outline-none focus:border-blue-500"
                        onChange={(e) => setFormData({ ...formData, pension_number: e.target.value })}
                      />
                    </div>
                  </div>
                </>
              )}

            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => nextStage('KYC_FACE')}
                disabled={loading}
                className="w-1/3 bg-slate-800 text-white font-bold py-5 rounded-2xl transition-all disabled:opacity-50"
              >
                Back
              </button>
              <button 
                onClick={handleRegister}
                disabled={loading}
                className="w-2/3 bg-blue-500 text-white font-bold py-5 rounded-2xl transition-all disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Submit for Review'}
              </button>
            </div>
          </div>
        );

      case 'SUCCESS':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-8"
          >
            <div className="w-24 h-24 bg-emerald-500 rounded-full mx-auto flex items-center justify-center shadow-2xl shadow-emerald-500/40">
              <CheckCircle2 size={48} className="text-slate-950" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Welcome to Citylink</h2>
              <p className="text-slate-400">Your account has been successfully created and verified.</p>
            </div>
            <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-6 flex items-center gap-4 text-left">
              <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <Sparkles size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase">Bonus</p>
                <p className="text-sm text-white">You've received <span className="text-emerald-500 font-bold">ETB 1,000.00</span> welcome balance!</p>
              </div>
            </div>
            <button 
              onClick={() => setOnboardingStage('COMPLETE')}
              className="w-full bg-white text-slate-950 font-bold py-5 rounded-2xl transition-all"
            >
              Enter Portal
            </button>
          </motion.div>
        );

      case 'PENDING_APPROVAL':
        return (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-8"
          >
            <div className="w-24 h-24 bg-amber-500 rounded-full mx-auto flex items-center justify-center shadow-2xl shadow-amber-500/40">
              <Clock size={48} className="text-slate-950" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold">Application Submitted</h2>
              <p className="text-slate-400">Your merchant application is under review. You will be notified upon approval.</p>
            </div>
            <button 
              onClick={() => setOnboardingStage('COMPLETE')}
              className="w-full bg-white text-slate-950 font-bold py-5 rounded-2xl transition-all"
            >
              Go to Citizen Portal
            </button>
          </motion.div>
        );

      case 'COMPLETE':
        return (
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 font-medium">Entering Portal...</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        <AnimatePresence mode="wait">
          <motion.div
            key={onboardingStage}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStage()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OnboardingFlow;
