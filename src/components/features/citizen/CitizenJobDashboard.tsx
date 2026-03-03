import React, { useState, KeyboardEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, 
  Briefcase, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  ChevronRight, 
  AlertTriangle,
  GraduationCap,
  Star,
  Lock,
  Sparkles,
  Award,
  BookOpen,
  TrendingUp,
  X
} from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { JobEngine, JobProfile, JobConsentRequest } from '../../../services/JobEngine';

// --- i18n Mock (Localization for English / Amharic) ---
const translations = {
  en: {
    dashboard: "Career Hub",
    trustScore: "Trust Score",
    verified: "Fayda Verified",
    reputation: "Excellent Standing",
    needsAttention: "Needs Attention",
    fixScore: "Re-verify your BA Degree to boost your score.",
    recentPings: "Access Requests",
    noRequests: "Your vault is secure. No pending requests.",
    grantView: "Grant Access",
    decline: "Decline",
    securityNote: "10-min secure view. Screen recording disabled.",
    updateProfile: "Enhance Profile",
    updateDesc: "Add skills & experience to unlock better opportunities.",
    step1: "Education Level",
    step2: "Years of Experience",
    step3: "Top Skills",
    next: "Continue",
    submit: "Complete Profile",
    back: "Back",
    required: "Required",
    activeApps: "Active Apps",
    vault: "Secure Vault",
    addSkill: "Type a skill and press Enter...",
  },
  am: {
    dashboard: "የስራ ማዕከል",
    trustScore: "የእምነት ነጥብ",
    verified: "በፋይዳ የተረጋገጠ",
    reputation: "ጥሩ ስም",
    needsAttention: "ትኩረት ይፈልጋል",
    fixScore: "ነጥብዎን ለማሳደግ የዲግሪዎን መረጃ እንደገና ያረጋግጡ።",
    recentPings: "የመዳረሻ ጥያቄዎች",
    noRequests: "ምንም በመጠባበቅ ላይ ያሉ ጥያቄዎች የሉም።",
    grantView: "እይታ ፍቀድ",
    decline: "አይቀበሉም",
    securityNote: "ለ10 ደቂቃ እይታ። ስክሪን መቅረጽ ተሰናክሏል።",
    updateProfile: "መገለጫ ያሳድጉ",
    updateDesc: "የተሻሉ እድሎችን ለማግኘት ክህሎቶችን ያክሉ።",
    step1: "የትምህርት ደረጃ",
    step2: "የልምድ ዓመታት",
    step3: "ዋና ክህሎቶች",
    next: "ቀጥል",
    submit: "መገለጫ ጨርስ",
    back: "ተመለስ",
    required: "ግዴታ",
    activeApps: "ማመልከቻዎች",
    vault: "ዲጂታል ካዝና",
    addSkill: "ክህሎት ይጻፉ እና Enter ይጫኑ...",
  }
};

type Language = 'en' | 'am';

// --- Mock Data ---
const MOCK_REQUESTS = [
  { id: '1', merchantName: 'EthioTech Solutions', businessType: 'Technology', docType: 'BSc Computer Science', time: '2m ago' },
  { id: '2', merchantName: 'Addis Bank', businessType: 'Finance', docType: 'Fayda ID', time: '1h ago' }
];

// --- Components ---

const CircularProgress = ({ score }: { score: number }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const isHigh = score > 80;
  const color = isHigh ? 'text-emerald-400' : score > 50 ? 'text-amber-400' : 'text-red-400';
  const glow = isHigh ? 'drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]' : '';

  return (
    <div className="relative flex items-center justify-center w-28 h-28">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
        <circle
          className="text-white/10"
          strokeWidth="6"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="50"
          cy="50"
        />
        <motion.circle
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className={`${color} ${glow}`}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx="50"
          cy="50"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-white">
        <span className="text-3xl font-black tracking-tighter">{score}</span>
      </div>
    </div>
  );
};

export const CitizenJobDashboard: React.FC = () => {
  const { profile } = useGlobalState();
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [jobProfile, setJobProfile] = useState<JobProfile | null>(null);
  const [requests, setRequests] = useState<JobConsentRequest[]>([]);
  const [activeApplications, setActiveApplications] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [availableJobs, setAvailableJobs] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showProfileReview, setShowProfileReview] = useState(false);
  const [formStep, setFormStep] = useState(1);

  // Form State
  const [formData, setFormData] = useState({
    education: '',
    experience: 0,
    skills: [] as string[],
    workHistory: [] as any[],
    educationDetails: [] as any[],
    certifications: [] as any[],
    resumeFile: null as File | null,
    resumeUrl: ''
  });
  const [skillInput, setSkillInput] = useState('');
  
  // Temporary state for adding new entries
  const [newWork, setNewWork] = useState({ role: '', company: '', start: '', end: '', desc: '' });
  const [newEdu, setNewEdu] = useState({ school: '', degree: '', year: '' });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!profile?.id) return;
    
    const loadData = async () => {
      const p = await JobEngine.getProfile(profile.id);
      setJobProfile(p);
      if (p) {
        setFormData({
          education: p.education || '',
          experience: p.experience || 0,
          skills: p.skills || [],
          workHistory: p.workHistory || [],
          educationDetails: p.educationDetails || [],
          certifications: p.certifications || [],
          resumeFile: null,
          resumeUrl: p.resumeUrl || ''
        });
      }
      const reqs = await JobEngine.getCitizenRequests(profile.id);
      setRequests(reqs.filter((r: any) => r.status === 'PENDING'));
      
      const apps = await JobEngine.getApplications(profile.id);
      setActiveApplications(apps);

      const ints = await JobEngine.getCitizenInterviews(profile.id);
      setInterviews(ints);

      const jobs = await JobEngine.getJobPostings();
      setAvailableJobs(jobs);
    };

    loadData();
    const unsubscribe = JobEngine.subscribe(loadData);
    return () => { unsubscribe(); };
  }, [profile?.id]);

  const handleApply = async (job: any) => {
    if (!profile?.id) return;
    await JobEngine.applyToJob(profile.id, job.id, job.merchantId, job.merchantName, job.title);
    alert(`Application submitted for ${job.title} at ${job.merchantName}!`);
  };

  const handleGrant = async (id: string) => {
    await JobEngine.updateRequestStatus(id, 'GRANTED');
  };
  const handleDecline = async (id: string) => {
    await JobEngine.updateRequestStatus(id, 'DENIED');
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const validateStep = () => {
    const newErrors: Record<string, string> = {};
    if (formStep === 1 && !formData.education) newErrors.education = t.required;
    // Step 2 is slider, always valid
    if (formStep === 3 && formData.skills.length === 0) newErrors.skills = t.required;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => { 
    if (validateStep()) {
      // Auto-save pending entries when moving from Step 4
      if (formStep === 4) {
        let updatedWorkHistory = [...formData.workHistory];
        let updatedEducationDetails = [...formData.educationDetails];
        let hasUpdates = false;

        if (newWork.role && newWork.company) {
          updatedWorkHistory.push({ ...newWork, id: Date.now() });
          setNewWork({ role: '', company: '', start: '', end: '', desc: '' });
          hasUpdates = true;
        }

        if (newEdu.school && newEdu.degree) {
          updatedEducationDetails.push({ ...newEdu, id: Date.now() + 1 });
          setNewEdu({ school: '', degree: '', year: '' });
          hasUpdates = true;
        }

        if (hasUpdates) {
          setFormData(prev => ({
            ...prev,
            workHistory: updatedWorkHistory,
            educationDetails: updatedEducationDetails
          }));
        }
      }
      setFormStep(s => Math.min(5, s + 1)); 
    }
  };
  const prevStep = () => setFormStep(s => Math.max(1, s - 1));

  const submitForm = async () => {
    if (validateStep() && profile?.id) {
      let finalResumeUrl = formData.resumeUrl;
      
      if (formData.resumeFile) {
        // Convert to Base64 for persistence in mock backend
        const reader = new FileReader();
        reader.readAsDataURL(formData.resumeFile);
        reader.onload = async () => {
          finalResumeUrl = reader.result as string;
          
          await JobEngine.updateProfile(profile.id, profile.name || 'Citizen', {
            ...formData,
            resumeUrl: finalResumeUrl
          });
          setShowForm(false);
          setFormStep(1);
        };
      } else {
        await JobEngine.updateProfile(profile.id, profile.name || 'Citizen', {
          ...formData,
          resumeUrl: finalResumeUrl
        });
        setShowForm(false);
        setFormStep(1);
      }
    }
  };

  const handleAddSkill = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      if (!formData.skills.includes(skillInput.trim())) {
        setFormData({ ...formData, skills: [...formData.skills, skillInput.trim()] });
      }
      setSkillInput('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skillToRemove) });
  };

  const addWorkHistory = () => {
    if (newWork.role && newWork.company) {
      setFormData({ ...formData, workHistory: [...formData.workHistory, { ...newWork, id: Date.now() }] });
      setNewWork({ role: '', company: '', start: '', end: '', desc: '' });
    }
  };

  const removeWorkHistory = (id: number) => {
    setFormData({ ...formData, workHistory: formData.workHistory.filter(w => w.id !== id) });
  };

  const addEducation = () => {
    if (newEdu.school && newEdu.degree) {
      setFormData({ ...formData, educationDetails: [...formData.educationDetails, { ...newEdu, id: Date.now() }] });
      setNewEdu({ school: '', degree: '', year: '' });
    }
  };

  const removeEducation = (id: number) => {
    setFormData({ ...formData, educationDetails: formData.educationDetails.filter(e => e.id !== id) });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFormData({ ...formData, resumeFile: file });

      // Convert to Base64 for persistence
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setFormData(prev => ({ ...prev, resumeUrl: base64String }));
      };
      reader.readAsDataURL(file);
    }
  };

  const eduOptions = [
    { id: 'highschool', label: 'High School', icon: <BookOpen className="w-6 h-6" /> },
    { id: 'bachelor', label: "Bachelor's Degree", icon: <GraduationCap className="w-6 h-6" /> },
    { id: 'master', label: "Master's Degree", icon: <Award className="w-6 h-6" /> }
  ];

  return (
    <div className="min-h-screen bg-[#020617] pb-24 font-sans selection:bg-blue-500/30">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-b from-[#0047AB] to-[#020617] pt-8 pb-12 px-6 rounded-b-[40px] shadow-2xl overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -right-[10%] w-[70%] h-[70%] rounded-full bg-blue-400/10 blur-3xl" />
          <div className="absolute bottom-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-emerald-400/10 blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-black text-white tracking-tight">{t.dashboard}</h1>
            <button 
              onClick={() => setLang(lang === 'en' ? 'am' : 'en')}
              className="px-4 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-sm font-bold text-white backdrop-blur-md border border-white/10 transition-colors"
            >
              {lang === 'en' ? 'አማርኛ' : 'English'}
            </button>
          </div>
          
          <div className="flex items-center gap-6 bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-xl shadow-xl">
            <CircularProgress score={jobProfile?.trustScore || 0} />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-emerald-400 text-sm tracking-wide uppercase">{jobProfile?.verified ? t.verified : 'Unverified'}</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-1">{t.trustScore}</h2>
              {(jobProfile?.trustScore || 0) > 80 ? (
                <p className="text-sm text-blue-200 flex items-center gap-1.5 font-medium">
                  <Sparkles className="w-4 h-4 text-amber-300" /> {t.reputation}
                </p>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm text-amber-400 flex items-center gap-1 font-bold">
                    <AlertTriangle className="w-4 h-4" /> {t.needsAttention}
                  </p>
                  <p className="text-xs text-blue-200">{t.fixScore}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 -mt-6 space-y-6 relative z-20">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <motion.div 
            whileHover={{ scale: 1.02 }} 
            onClick={() => scrollToSection('active-applications')}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between cursor-pointer hover:border-blue-500/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mb-4 border border-blue-500/30">
              <Briefcase className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-3xl font-black text-white">{activeApplications.length}</p>
              <p className="text-sm text-slate-400 font-medium">{t.activeApps}</p>
            </div>
          </motion.div>

          <motion.div 
            whileHover={{ scale: 1.02 }} 
            onClick={() => scrollToSection('secure-vault')}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col justify-between cursor-pointer hover:border-indigo-500/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-4 border border-indigo-500/30">
              <FileText className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-3xl font-black text-white">{requests.length}</p>
              <p className="text-sm text-slate-400 font-medium">{t.vault}</p>
            </div>
          </motion.div>
        </div>

        {/* Premium Update Profile CTA */}
        <div className="flex gap-3">
          <motion.button 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowForm(true)}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-1 shadow-xl shadow-blue-900/20 group"
          >
            <div className="bg-slate-900/40 backdrop-blur-sm rounded-[22px] p-5 flex items-center justify-between border border-white/10 group-hover:bg-transparent transition-colors duration-300 h-full">
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shadow-inner shrink-0">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="block font-bold text-lg text-white mb-0.5">{t.updateProfile}</span>
                  <span className="block text-xs text-blue-200 font-medium line-clamp-1">{t.updateDesc}</span>
                </div>
              </div>
            </div>
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowProfileReview(true)}
            className="w-24 bg-slate-800 rounded-3xl p-1 shadow-xl border border-slate-700 group"
          >
            <div className="bg-slate-900/40 backdrop-blur-sm rounded-[22px] p-2 flex flex-col items-center justify-center h-full gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                <FileText className="w-4 h-4 text-slate-300" />
              </div>
              <span className="text-[10px] font-bold text-slate-300 text-center leading-tight">Review<br/>Profile</span>
            </div>
          </motion.button>
        </div>

        {/* Upcoming Interviews Section */}
        {interviews.length > 0 && (
          <div id="upcoming-interviews" className="pt-2">
            <h3 className="text-xl font-bold text-white mb-4 px-2">Upcoming Interviews</h3>
            <div className="space-y-3">
              {interviews.map((int) => (
                <div key={int.id} className="bg-indigo-900/20 border border-indigo-500/30 rounded-2xl p-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-500/10 rounded-bl-full -mr-4 -mt-4" />
                  
                  <div className="flex justify-between items-start mb-3 relative z-10">
                    <div>
                      <h4 className="font-bold text-white text-lg">{int.role}</h4>
                      <p className="text-indigo-300 font-medium">{int.merchantName}</p>
                    </div>
                    <div className="bg-indigo-500/20 px-3 py-1 rounded-full text-xs font-bold text-indigo-300 border border-indigo-500/30">
                      {int.status}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 relative z-10">
                    <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-800/50">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Date & Time</p>
                      <p className="text-white font-bold text-sm">{new Date(int.date).toLocaleDateString()} • {int.time}</p>
                    </div>
                    <div className="bg-slate-900/50 p-2 rounded-xl border border-slate-800/50">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">Location</p>
                      <p className="text-white font-bold text-sm truncate">{int.location}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Applications Section */}
        <div id="active-applications" className="pt-2">
          <h3 className="text-xl font-bold text-white mb-4 px-2">Active Applications</h3>
          <div className="space-y-3">
            {activeApplications.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 text-center">
                <Briefcase className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                <p className="text-slate-400 text-sm font-medium">No active applications yet.</p>
              </div>
            ) : (
              activeApplications.map((app) => (
                <div key={app.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-white">{app.role}</h4>
                    <p className="text-sm text-slate-400">{app.merchantName || app.company}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      app.status === 'INTERVIEW' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {app.status}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-1">{new Date(app.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Available Jobs Section */}
        <div id="available-jobs" className="pt-4">
          <h3 className="text-xl font-bold text-white mb-4 px-2">Recommended Jobs</h3>
          <div className="space-y-4">
            {availableJobs.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 text-center">
                <Briefcase className="w-10 h-10 text-slate-700 mx-auto mb-2" />
                <p className="text-slate-400 text-sm font-medium">No jobs available right now.</p>
              </div>
            ) : (
              availableJobs.map((job) => {
                const isApplied = activeApplications.some(app => app.jobId === job.id);
                return (
                  <motion.div 
                    key={job.id}
                    whileHover={{ scale: 1.01 }}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className="font-bold text-lg text-white">{job.title}</h4>
                        <p className="text-sm text-blue-400 font-medium">{job.merchantName}</p>
                      </div>
                      <div className="bg-slate-800 px-3 py-1 rounded-full text-xs font-bold text-slate-300 border border-slate-700">
                        {job.type.replace('_', ' ')}
                      </div>
                    </div>
                    
                    <p className="text-sm text-slate-400 mb-4 line-clamp-2">{job.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {job.requirements.slice(0, 3).map((req: string) => (
                        <span key={req} className="px-2 py-1 bg-slate-800/50 text-slate-400 rounded-lg text-[10px] font-bold border border-slate-700/50">
                          {req}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                      <p className="text-xs text-slate-500 font-medium">{job.salaryRange}</p>
                      {isApplied ? (
                        <span className="text-emerald-500 text-sm font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" /> Applied
                        </span>
                      ) : (
                        <button 
                          onClick={() => handleApply(job)}
                          className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shadow-lg shadow-blue-900/20"
                        >
                          Apply Now
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>

        {/* Secure Vault Requests */}
        <div id="secure-vault" className="pt-4">
          <div className="flex items-center justify-between mb-4 px-2">
            <h3 className="text-xl font-bold text-white">Secure Vault: Access Requests</h3>
            {requests.length > 0 && (
              <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2.5 py-1 rounded-full border border-red-500/20">
                {requests.length} New
              </span>
            )}
          </div>
          
          <div className="space-y-4">
            <AnimatePresence>
              {requests.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 text-center"
                >
                  <Lock className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm font-medium">{t.noRequests}</p>
                </motion.div>
              ) : (
                requests.map((req) => (
                  <motion.div 
                    key={req.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -50, scale: 0.95 }}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg relative overflow-hidden"
                  >
                    {/* Security Pattern Background */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent pointer-events-none" />
                    
                    <div className="flex justify-between items-start mb-5 relative z-10">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-bold text-lg text-white">{req.merchantName}</h4>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                            {new Date(req.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <p className="text-sm text-blue-400 font-medium">{req.docType}</p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shadow-inner">
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      </div>
                    </div>
                    
                    <div className="flex gap-3 mb-4 relative z-10">
                      <button 
                        onClick={() => handleGrant(req.id)}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-900/20"
                      >
                        <CheckCircle2 className="w-5 h-5" /> {t.grantView}
                      </button>
                      <button 
                        onClick={() => handleDecline(req.id)}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-colors border border-slate-700"
                      >
                        <XCircle className="w-5 h-5" /> {t.decline}
                      </button>
                    </div>
                    
                    <div className="bg-slate-950/50 rounded-xl p-3 flex items-start gap-2 border border-slate-800/50">
                      <Lock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-slate-400 leading-relaxed font-medium">
                        {t.securityNote}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Profile Review Modal */}
      <AnimatePresence>
        {showProfileReview && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setShowProfileReview(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 w-full max-w-md rounded-3xl border border-slate-800 shadow-2xl overflow-hidden max-h-[80vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                <h2 className="text-xl font-bold text-white">My Profile</h2>
                <button onClick={() => setShowProfileReview(false)} className="text-slate-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold text-white">
                    {profile?.name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{profile?.name}</h3>
                    <p className="text-sm text-slate-400">{jobProfile?.verified ? 'Verified Citizen' : 'Unverified'}</p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-800 p-3 rounded-xl text-center">
                    <p className="text-xs text-slate-400">Trust Score</p>
                    <p className="text-lg font-bold text-emerald-400">{jobProfile?.trustScore || 0}</p>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-xl text-center">
                    <p className="text-xs text-slate-400">Experience</p>
                    <p className="text-lg font-bold text-blue-400">{jobProfile?.experience || 0}y</p>
                  </div>
                  <div className="bg-slate-800 p-3 rounded-xl text-center">
                    <p className="text-xs text-slate-400">Education</p>
                    <p className="text-lg font-bold text-purple-400 capitalize">{jobProfile?.education || '-'}</p>
                  </div>
                </div>

                {/* Skills */}
                <div>
                  <h4 className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {jobProfile?.skills && jobProfile.skills.length > 0 ? (
                      jobProfile.skills.map(s => (
                        <span key={s} className="px-3 py-1 bg-slate-800 text-slate-300 rounded-lg text-sm font-medium border border-slate-700">
                          {s}
                        </span>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 italic">No skills added yet.</p>
                    )}
                  </div>
                </div>

                {/* Work History */}
                <div>
                  <h4 className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Work History</h4>
                  <div className="space-y-3">
                    {jobProfile?.workHistory && jobProfile.workHistory.length > 0 ? (
                      jobProfile.workHistory.map((w: any) => (
                        <div key={w.id} className="border-l-2 border-slate-700 pl-3">
                          <p className="text-white font-bold">{w.role}</p>
                          <p className="text-sm text-slate-400">{w.company}</p>
                          <p className="text-xs text-slate-500">{w.start} - {w.end}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500 italic">No work history added.</p>
                    )}
                  </div>
                </div>

                {/* Resume */}
                <div>
                  <h4 className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Resume</h4>
                  {jobProfile?.resumeUrl ? (
                    <div className="bg-slate-800 p-3 rounded-xl flex items-center gap-3">
                      <FileText className="w-5 h-5 text-blue-400" />
                      <span className="text-sm text-slate-300 font-medium truncate flex-1">Resume Uploaded</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic">No resume uploaded.</p>
                  )}
                </div>
              </div>
              
              <div className="p-4 border-t border-slate-800 bg-slate-950/50">
                <button 
                  onClick={() => { setShowProfileReview(false); setShowForm(true); }}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors"
                >
                  Edit Profile
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* World-Class Form Modal (Bottom Sheet Style) */}
      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-end justify-center sm:items-center sm:p-4"
          >
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-slate-900 w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] shadow-2xl border border-slate-800 max-h-[90vh] flex flex-col"
            >
              <div className="p-8 pb-0 shrink-0">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h2 className="text-2xl font-black text-white">{t.updateProfile}</h2>
                    <p className="text-sm text-slate-400 font-medium mt-1">Step {formStep} of 5</p>
                  </div>
                  <button onClick={() => setShowForm(false)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Sleek Progress Bar */}
                <div className="flex gap-2 mb-6">
                  {[1, 2, 3, 4, 5].map(step => (
                    <div key={step} className="h-1.5 flex-1 rounded-full bg-slate-800 overflow-hidden">
                      <motion.div 
                        className="h-full bg-blue-500"
                        initial={{ width: 0 }}
                        animate={{ width: step <= formStep ? '100%' : '0%' }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Steps */}
              <div className="p-8 pt-2 overflow-y-auto flex-1 min-h-0">
                {/* Step 1: Selectable Cards */}
                {formStep === 1 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <label className="block text-lg font-bold text-white mb-4">{t.step1}</label>
                    <div className="space-y-3">
                      {eduOptions.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setFormData({...formData, education: opt.id})}
                          className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                            formData.education === opt.id 
                              ? 'border-blue-500 bg-blue-500/10 text-white' 
                              : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                          }`}
                        >
                          <div className={`p-3 rounded-xl ${formData.education === opt.id ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                            {opt.icon}
                          </div>
                          <span className="font-bold text-lg">{opt.label}</span>
                          {formData.education === opt.id && <CheckCircle2 className="w-6 h-6 ml-auto text-blue-500" />}
                        </button>
                      ))}
                    </div>
                    {errors.education && <p className="text-red-400 text-sm mt-3 font-medium flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> {errors.education}</p>}
                  </motion.div>
                )}

                {/* Step 2: Custom Thick Slider */}
                {formStep === 2 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <label className="block text-lg font-bold text-white mb-8">{t.step2}</label>
                    <div className="text-center mb-8">
                      <span className="text-6xl font-black text-blue-400">{formData.experience}</span>
                      <span className="text-xl text-slate-500 font-bold ml-2">years</span>
                    </div>
                    <input 
                      type="range" min="0" max="20" 
                      className="w-full h-4 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      value={formData.experience}
                      onChange={e => setFormData({...formData, experience: parseInt(e.target.value)})}
                    />
                    <div className="flex justify-between text-sm font-bold text-slate-500 mt-4">
                      <span>Entry Level</span>
                      <span>Veteran (20+)</span>
                    </div>
                  </motion.div>
                )}

                {/* Step 3: Tag Input */}
                {formStep === 3 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                    <label className="block text-lg font-bold text-white mb-4">{t.step3}</label>
                    
                    <div className="bg-slate-800/50 border-2 border-slate-700 rounded-2xl p-4 focus-within:border-blue-500 transition-colors">
                      <div className="flex flex-wrap gap-2 mb-2">
                        <AnimatePresence>
                          {formData.skills.map(skill => (
                            <motion.span 
                              key={skill}
                              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                              className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-xl text-sm font-bold flex items-center gap-2"
                            >
                              {skill}
                              <button onClick={() => removeSkill(skill)} className="hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                              </button>
                            </motion.span>
                          ))}
                        </AnimatePresence>
                      </div>
                      <input 
                        type="text"
                        className="w-full bg-transparent text-white placeholder-slate-500 font-medium outline-none mt-2"
                        placeholder={t.addSkill}
                        value={skillInput}
                        onChange={e => setSkillInput(e.target.value)}
                        onKeyDown={handleAddSkill}
                      />
                    </div>
                    {errors.skills && <p className="text-red-400 text-sm mt-3 font-medium flex items-center gap-1"><AlertTriangle className="w-4 h-4"/> {errors.skills}</p>}
                  </motion.div>
                )}

                {/* Step 4: Work History & Education Details */}
                {formStep === 4 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    {/* Work History Section */}
                    <div>
                      <label className="block text-lg font-bold text-white mb-4">Work History</label>
                      <div className="space-y-3 mb-4">
                        {formData.workHistory.map((work) => (
                          <div key={work.id} className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex justify-between items-center">
                            <div>
                              <p className="font-bold text-white">{work.role}</p>
                              <p className="text-xs text-slate-400">{work.company} • {work.start} - {work.end}</p>
                            </div>
                            <button onClick={() => removeWorkHistory(work.id)} className="text-slate-500 hover:text-red-400"><X className="w-4 h-4"/></button>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input placeholder="Role" className="bg-slate-800 rounded-lg p-2 text-sm text-white border border-slate-700" value={newWork.role} onChange={e => setNewWork({...newWork, role: e.target.value})} />
                        <input placeholder="Company" className="bg-slate-800 rounded-lg p-2 text-sm text-white border border-slate-700" value={newWork.company} onChange={e => setNewWork({...newWork, company: e.target.value})} />
                        <input placeholder="Start Year" className="bg-slate-800 rounded-lg p-2 text-sm text-white border border-slate-700" value={newWork.start} onChange={e => setNewWork({...newWork, start: e.target.value})} />
                        <input placeholder="End Year" className="bg-slate-800 rounded-lg p-2 text-sm text-white border border-slate-700" value={newWork.end} onChange={e => setNewWork({...newWork, end: e.target.value})} />
                      </div>
                      <button onClick={addWorkHistory} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 font-bold rounded-lg text-sm border border-dashed border-slate-600">+ Add Position</button>
                    </div>

                    {/* Education Details Section */}
                    <div>
                      <label className="block text-lg font-bold text-white mb-4">Education Details</label>
                      <div className="space-y-3 mb-4">
                        {formData.educationDetails.map((edu) => (
                          <div key={edu.id} className="bg-slate-800/50 p-3 rounded-xl border border-slate-700 flex justify-between items-center">
                            <div>
                              <p className="font-bold text-white">{edu.degree}</p>
                              <p className="text-xs text-slate-400">{edu.school} • {edu.year}</p>
                            </div>
                            <button onClick={() => removeEducation(edu.id)} className="text-slate-500 hover:text-red-400"><X className="w-4 h-4"/></button>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input placeholder="School/University" className="bg-slate-800 rounded-lg p-2 text-sm text-white border border-slate-700" value={newEdu.school} onChange={e => setNewEdu({...newEdu, school: e.target.value})} />
                        <input placeholder="Degree" className="bg-slate-800 rounded-lg p-2 text-sm text-white border border-slate-700" value={newEdu.degree} onChange={e => setNewEdu({...newEdu, degree: e.target.value})} />
                        <input placeholder="Graduation Year" className="bg-slate-800 rounded-lg p-2 text-sm text-white border border-slate-700" value={newEdu.year} onChange={e => setNewEdu({...newEdu, year: e.target.value})} />
                      </div>
                      <button onClick={addEducation} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 font-bold rounded-lg text-sm border border-dashed border-slate-600">+ Add Education</button>
                    </div>
                  </motion.div>
                )}

                {/* Step 5: Credential Upload */}
                {formStep === 5 && (
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                     <label className="block text-lg font-bold text-white mb-4">Upload Credentials</label>
                     
                     <div className="border-2 border-dashed border-slate-700 rounded-3xl p-8 text-center hover:bg-slate-800/30 transition-colors relative">
                        <input 
                          type="file" 
                          accept=".pdf,.doc,.docx,.jpg,.png"
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-400">
                          <FileText className="w-8 h-8" />
                        </div>
                        <h3 className="text-white font-bold mb-2">
                          {formData.resumeFile ? formData.resumeFile.name : "Drop your Resume / CV here"}
                        </h3>
                        <p className="text-slate-500 text-sm">
                          {formData.resumeFile ? "Click to change file" : "or click to browse (PDF, DOCX, JPG)"}
                        </p>
                     </div>

                     <div className="mt-6 bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex gap-3">
                        <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
                        <p className="text-xs text-amber-200/80 leading-relaxed">
                          Your documents are encrypted and stored in your secure vault. Employers can only view them with your explicit permission (10-min access).
                        </p>
                     </div>
                  </motion.div>
                )}

                {/* Form Actions - Moved inside scrollable area */}
                <div className="pt-8 pb-2 flex gap-4">
                  {formStep > 1 && (
                    <button 
                      onClick={prevStep}
                      className="flex-1 py-4 rounded-2xl font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors"
                    >
                      {t.back}
                    </button>
                  )}
                  <button 
                    onClick={formStep === 5 ? submitForm : nextStep}
                    className="flex-[2] py-4 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20"
                  >
                    {formStep === 5 ? t.submit : t.next}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CitizenJobDashboard;
