import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Users, ShieldCheck, Calendar as CalendarIcon, 
  MapPin, Clock, AlertTriangle, CheckCircle2, X, 
  FileText, Briefcase, GraduationCap, ChevronRight,
  Eye, EyeOff, Lock, Star, Filter, LogOut
} from 'lucide-react';
import { useGlobalState } from '../../context/GlobalStateContext';
import { ConsentEngine } from '../../../services/ConsentEngine';
import { JobEngine, JobProfile, JobConsentRequest, Interview } from '../../../services/JobEngine';
import * as mammoth from 'mammoth';

// Helper to convert Base64 to ArrayBuffer for Mammoth
function base64ToArrayBuffer(base64: string) {
  try {
    const binaryString = window.atob(base64.split(',')[1]);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  } catch (e) {
    console.error("Error converting base64 to array buffer", e);
    return new ArrayBuffer(0);
  }
}

// Mock Data for Talent Radar
const MOCK_TALENT = [
  { id: 'cit_1', name: 'Abebe Kebede', verified: true, education: 'BSc Computer Science', experience: 4, skills: ['React', 'Node.js', 'PostgreSQL'], trustScore: 95, status: 'NONE' },
  { id: 'cit_2', name: 'Sara Tadesse', verified: true, education: 'MSc Data Science', experience: 2, skills: ['Python', 'Machine Learning', 'SQL'], trustScore: 88, status: 'PENDING' },
  { id: 'cit_3', name: 'Dawit Mekonnen', verified: true, education: 'BA Business Admin', experience: 6, skills: ['Project Management', 'Agile', 'Scrum'], trustScore: 92, status: 'GRANTED' },
  { id: 'cit_4', name: 'Meron Hailu', verified: false, education: 'Diploma IT', experience: 1, skills: ['HTML', 'CSS', 'JavaScript'], trustScore: 60, status: 'NONE' },
];

const MOCK_INTERVIEWS = [
  { id: 'int_1', candidate: 'Dawit Mekonnen', role: 'Project Manager', date: '2026-03-05', time: '10:00 AM', location: 'Bole Atlas, CityLink HQ' }
];

const EmployerDashboard: React.FC = () => {
  const { profile, setProfile, setView } = useGlobalState();
  const [activeTab, setActiveTab] = useState<'radar' | 'permissions' | 'interviews' | 'jobs'>('radar');
  const [searchQuery, setSearchQuery] = useState('');
  const [talent, setTalent] = useState<JobProfile[]>([]);
  const [requests, setRequests] = useState<JobConsentRequest[]>([]);
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [jobPostings, setJobPostings] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [viewingApplicationsForJob, setViewingApplicationsForJob] = useState<string | null>(null);
  const [merchantRating, setMerchantRating] = useState(98); // Mock rating

  // Secure Viewer State
  const [viewingDoc, setViewingDoc] = useState<any | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportField, setReportField] = useState('Education');
  const [reportNotes, setReportNotes] = useState('');

  // Interview Scheduler State
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);

  // Job Posting State
  const [postJobModalOpen, setPostJobModalOpen] = useState(false);
  
  // Resume Preview State
  const [showPreview, setShowPreview] = useState(false);
  const [docxHtml, setDocxHtml] = useState<string | null>(null);

  // Convert DOCX to HTML when viewingDoc changes
  useEffect(() => {
    if (viewingDoc?.resumeUrl && viewingDoc.resumeUrl.includes('wordprocessingml.document')) {
       try {
         const base64 = viewingDoc.resumeUrl;
         const arrayBuffer = base64ToArrayBuffer(base64);
         mammoth.convertToHtml({ arrayBuffer })
           .then((result: any) => {
              setDocxHtml(result.value);
           })
           .catch((err: any) => console.error("Mammoth conversion error:", err));
       } catch (e) {
         console.error("DOCX processing error:", e);
         setDocxHtml(null);
       }
    } else {
      setDocxHtml(null);
    }
  }, [viewingDoc]);

  useEffect(() => {
    if (!profile?.id) return;
    
    const loadData = async () => {
      const t = await JobEngine.getTalentPool();
      setTalent(t);
      const r = await JobEngine.getMerchantRequests(profile.id);
      setRequests(r);
      const i = await JobEngine.getMerchantInterviews(profile.id);
      setInterviews(i);
      const j = await JobEngine.getJobPostings();
      setJobPostings(j.filter((job: any) => job.merchantId === profile.id));
      const a = await JobEngine.getMerchantApplications(profile.id);
      setApplications(a);
    };

    loadData();
    const unsubscribe = JobEngine.subscribe(loadData);
    
    // Add polling for cross-tab updates
    const interval = setInterval(loadData, 5000);

    return () => { 
      unsubscribe(); 
      clearInterval(interval);
    };
  }, [profile?.id]);

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    
    const formData = new FormData(e.target as HTMLFormElement);
    const requirements = (formData.get('requirements') as string).split(',').map(s => s.trim());

    await JobEngine.createJobPosting({
      merchantId: profile.id,
      merchantName: profile.merchant_name || 'Employer',
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      requirements,
      location: formData.get('location') as string,
      salaryRange: formData.get('salary') as string,
      type: formData.get('type') as any,
    });
    
    setPostJobModalOpen(false);
  };

  const handleRequestAccess = async (citizenId: string) => {
    if (!profile?.id) return;
    try {
      await JobEngine.requestAccess(profile.id, profile.merchant_name || 'Employer', citizenId, 'ALL_DOCS');
    } catch (error) {
      console.error(error);
    }
  };

  const handleViewDocument = async (candidateId: string) => {
    const req = requests.find(r => r.citizenId === candidateId && r.status === 'GRANTED');
    if (!req) return;
    
    let candidate = talent.find(t => t.citizenId === candidateId);
    if (!candidate) {
       // Fetch profile directly if not in talent pool
       candidate = await JobEngine.getProfile(candidateId);
    }
    
    if (candidate) {
      setViewingDoc(candidate);
    }
  };

  const handleReportDiscrepancy = async () => {
    if (!profile?.id || !viewingDoc) return;
    try {
      await ConsentEngine.reportDiscrepancy(profile.id, viewingDoc.id, reportField);
      alert(`Warning sent to ${viewingDoc.name}: "Your form states one thing, but your certificate shows another. Please update your profile."`);
      setReportModalOpen(false);
      setViewingDoc(null);
      // Penalize merchant slightly for reporting to prevent abuse (mock logic)
      setMerchantRating(prev => Math.max(0, prev - 2));
    } catch (error) {
      console.error(error);
    }
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id || !selectedCandidate) return;
    
    const formData = new FormData(e.target as HTMLFormElement);
    await JobEngine.scheduleInterview({
      merchantId: profile.id,
      citizenId: selectedCandidate.citizenId,
      merchantName: profile.merchant_name || 'Employer',
      candidateName: selectedCandidate.name,
      role: formData.get('role') as string,
      date: formData.get('date') as string,
      time: formData.get('time') as string,
      location: formData.get('location') as string,
    });
    
    setScheduleModalOpen(false);
    setSelectedCandidate(null);
  };

  const handleLogout = () => {
    setProfile(null);
    setView('home');
  };

  const filteredTalent = talent.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const grantedRequests = requests.filter(r => r.status === 'GRANTED');

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-200 font-sans selection:bg-indigo-500/30 pb-20">
      {/* Header / Navy Theme */}
      <div className="bg-[#1A237E] pt-8 pb-6 px-6 shadow-2xl border-b border-indigo-900/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center border border-indigo-400/30 shrink-0">
                <Briefcase className="w-6 h-6 text-indigo-300" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">{profile?.merchant_name || 'Employer Portal'}</h1>
                <p className="text-indigo-200 text-xs sm:text-sm font-medium">Recruitment & Talent Acquisition</p>
              </div>
            </div>
          </div>
          
          {/* Merchant Rating and Logout */}
          <div className="flex items-center gap-4 self-end sm:self-auto">
            <div className="bg-indigo-950/50 border border-indigo-800/50 rounded-2xl p-2 sm:p-3 flex items-center gap-3 backdrop-blur-md">
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-300 hidden sm:block">Employer Rating</p>
                <p className="text-lg sm:text-xl font-black text-white">{merchantRating}<span className="text-xs sm:text-sm text-indigo-400">/100</span></p>
              </div>
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shrink-0">
                <Star className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 fill-emerald-400" />
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="bg-indigo-950/50 hover:bg-red-500/20 border border-indigo-800/50 hover:border-red-500/50 rounded-2xl p-2 sm:p-3 flex items-center justify-center backdrop-blur-md transition-all group shrink-0"
              title="Log Out"
            >
              <LogOut className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-300 group-hover:text-red-400 transition-colors" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mt-6 sm:mt-8 bg-indigo-950/40 p-1.5 rounded-2xl border border-indigo-800/50 backdrop-blur-sm overflow-x-auto no-scrollbar w-full sm:w-fit">
          {[
            { id: 'radar', label: 'Talent Radar', icon: Search },
            { id: 'permissions', label: 'Permissions', icon: ShieldCheck },
            { id: 'interviews', label: 'War-Room', icon: CalendarIcon },
            { id: 'jobs', label: 'Job Postings', icon: Briefcase }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50' 
                  : 'text-indigo-300 hover:text-white hover:bg-indigo-800/50'
              }`}
            >
              <tab.icon className="w-4 h-4 shrink-0" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto">
        {/* TALENT RADAR */}
        {activeTab === 'radar' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                <input 
                  type="text"
                  placeholder="Search by skills, education, or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                />
              </div>
              <button className="bg-slate-900 border border-slate-800 rounded-2xl px-6 flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-700 transition-all">
                <Filter className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-950/50 border-b border-slate-800">
                    <th className="p-5 text-xs font-bold uppercase tracking-widest text-slate-500">Candidate</th>
                    <th className="p-5 text-xs font-bold uppercase tracking-widest text-slate-500">Education & Exp</th>
                    <th className="p-5 text-xs font-bold uppercase tracking-widest text-slate-500">Top Skills</th>
                    <th className="p-5 text-xs font-bold uppercase tracking-widest text-slate-500 text-center">Trust</th>
                    <th className="p-5 text-xs font-bold uppercase tracking-widest text-slate-500 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredTalent.map(candidate => (
                    <tr key={candidate.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/30">
                            {candidate.name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{candidate.name}</span>
                              {candidate.verified && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                              {candidate.resumeUrl && (
                                <div className="bg-blue-500/20 p-1 rounded-md" title="Resume Available">
                                  <FileText className="w-3 h-3 text-blue-400" />
                                </div>
                              )}
                            </div>
                            <span className="text-xs text-slate-500">ID: {candidate.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-slate-300 flex items-center gap-2"><GraduationCap className="w-3.5 h-3.5 text-slate-500"/> {candidate.education}</span>
                          <span className="text-xs text-slate-500 flex items-center gap-2"><Briefcase className="w-3.5 h-3.5"/> {candidate.experience} Years Exp.</span>
                        </div>
                      </td>
                      <td className="p-5">
                        <div className="flex flex-wrap gap-2">
                          {candidate.skills.slice(0, 3).map(skill => (
                            <span key={skill} className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-[10px] font-bold uppercase tracking-wider border border-slate-700">
                              {skill}
                            </span>
                          ))}
                          {candidate.skills.length > 3 && <span className="text-xs text-slate-500">+{candidate.skills.length - 3}</span>}
                        </div>
                      </td>
                      <td className="p-5 text-center">
                        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black">
                          {candidate.trustScore}
                        </div>
                      </td>
                      <td className="p-5 text-right">
                        {(() => {
                          const req = requests.find(r => r.citizenId === candidate.citizenId);
                          const status = req ? req.status : 'NONE';
                          
                          if (status === 'NONE' || status === 'DENIED') {
                            return (
                              <button 
                                onClick={() => handleRequestAccess(candidate.citizenId)}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-900/20"
                              >
                                Request Access
                              </button>
                            );
                          } else if (status === 'PENDING') {
                            return (
                              <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/10 text-amber-400 text-sm font-bold border border-amber-500/20">
                                <Clock className="w-4 h-4" /> Pending
                              </span>
                            );
                          } else {
                            return (
                              <button 
                                onClick={() => handleViewDocument(candidate.citizenId)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-900/20 flex items-center gap-2 ml-auto"
                              >
                                <Eye className="w-4 h-4" /> View Docs
                              </button>
                            );
                          }
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* JOB POSTINGS */}
        {activeTab === 'jobs' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Active Job Postings</h2>
              <button 
                onClick={() => setPostJobModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-900/20 flex items-center gap-2"
              >
                <Briefcase className="w-4 h-4" /> Post New Job
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {jobPostings.map(job => (
                <div key={job.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group hover:border-indigo-500/30 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-white">{job.title}</h3>
                      <p className="text-indigo-400 text-sm font-medium">{job.type.replace('_', ' ')} • {job.salaryRange}</p>
                    </div>
                    <div className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/20">
                      {job.status}
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm mb-4 line-clamp-2">{job.description}</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {job.requirements.slice(0, 3).map((req: string) => (
                      <span key={req} className="px-2 py-1 bg-slate-800 text-slate-300 rounded-lg text-xs font-bold border border-slate-700">
                        {req}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-500 border-t border-slate-800 pt-4 mt-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3" /> {job.location}
                      <span className="mx-1">•</span>
                      <Clock className="w-3 h-3" /> Posted {new Date(job.createdAt).toLocaleDateString()}
                    </div>
                    <button 
                      onClick={() => setViewingApplicationsForJob(job.id)}
                      className="text-indigo-400 hover:text-white font-bold transition-colors"
                    >
                      View Applications ({applications.filter(a => a.jobId === job.id).length})
                    </button>
                  </div>
                </div>
              ))}
              {jobPostings.length === 0 && (
                <div className="col-span-full text-center py-12 bg-slate-900/50 border border-slate-800 rounded-3xl border-dashed">
                  <Briefcase className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-400 font-medium">No active job postings.</p>
                  <p className="text-slate-600 text-sm">Create a new job to start attracting talent.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* PERMISSION MANAGER */}
        {activeTab === 'permissions' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pending */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Pending Requests ({pendingRequests.length})
              </h3>
              <div className="space-y-3">
                {pendingRequests.map(req => {
                  const candidate = talent.find(t => t.citizenId === req.citizenId);
                  return (
                  <div key={req.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold">
                        {candidate?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-white">{candidate?.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">Requested recently</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">Awaiting Citizen</span>
                  </div>
                )})}
                {pendingRequests.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No pending requests.</p>}
              </div>
            </div>

            {/* Granted */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500 mb-6 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Granted Access ({grantedRequests.length})
              </h3>
              <div className="space-y-3">
                {grantedRequests.map(req => {
                  const candidate = talent.find(t => t.citizenId === req.citizenId);
                  return (
                  <div key={req.id} className="bg-slate-950 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between relative overflow-hidden">
                    <div className="absolute left-0 top-0 w-1 h-full bg-emerald-500" />
                    <div className="flex items-center gap-3 pl-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold border border-emerald-500/20">
                        {candidate?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-white">{candidate?.name || 'Unknown'}</p>
                        <p className="text-xs text-emerald-500/70">Access expires in 24h</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setSelectedCandidate(candidate); setScheduleModalOpen(true); }}
                        className="p-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-xl transition-colors border border-indigo-500/20"
                        title="Schedule Interview"
                      >
                        <CalendarIcon className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleViewDocument(req.citizenId)}
                        className="p-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl transition-colors border border-emerald-500/20"
                        title="View Documents"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )})}
                {grantedRequests.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No granted requests.</p>}
              </div>
            </div>
          </motion.div>
        )}

        {/* INTERVIEW WAR-ROOM */}
        {activeTab === 'interviews' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Upcoming Interviews</h2>
              <button 
                onClick={() => setScheduleModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-900/20 flex items-center gap-2"
              >
                <CalendarIcon className="w-4 h-4" /> Schedule New
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {interviews.map(interview => (
                <div key={interview.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/10 transition-colors" />
                  
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div>
                      <h3 className="font-bold text-lg text-white">{interview.candidateName}</h3>
                      <p className="text-indigo-400 text-sm font-medium">{interview.role}</p>
                    </div>
                    <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center border border-slate-800">
                      <Briefcase className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>

                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center gap-3 text-sm text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                      <CalendarIcon className="w-4 h-4 text-indigo-400" />
                      {new Date(interview.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {interview.time}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-800/50">
                      <MapPin className="w-4 h-4 text-emerald-400" />
                      <span className="truncate">{interview.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* SECURE VIEWER MODAL (No-Screenshot Logic) */}
      <AnimatePresence>
        {viewingDoc && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
            onContextMenu={(e) => e.preventDefault()} // Disable right click
          >
            {/* Dynamic Watermark Overlay to deter screenshots */}
            <div className="absolute inset-0 pointer-events-none opacity-10 flex flex-wrap justify-center items-center overflow-hidden z-50">
              {Array.from({ length: 50 }).map((_, i) => (
                <span key={i} className="text-white text-2xl font-black transform -rotate-45 m-8 select-none">
                  {profile?.merchant_name} • {new Date().toISOString().split('T')[0]}
                </span>
              ))}
            </div>

            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl relative z-40 overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-950/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
                    <Lock className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Secure Document Viewer</h3>
                    <p className="text-xs text-emerald-500 font-mono">End-to-End Encrypted • No Screenshots Allowed</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setReportModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-bold border border-red-500/20 transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4" /> Report Discrepancy
                  </button>
                  <button onClick={() => setViewingDoc(null)} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 bg-slate-900 select-none">
                {/* Detailed Document Content */}
                <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-2xl text-slate-900 min-h-[600px] relative overflow-hidden">
                  
                  {/* Header */}
                  <div className="bg-slate-50 p-8 border-b border-slate-200 flex justify-between items-start">
                    <div>
                      <h1 className="text-3xl font-serif font-bold text-slate-900">{viewingDoc.name}</h1>
                      <p className="text-slate-500 font-medium mt-1 flex items-center gap-2">
                        <MapPin className="w-4 h-4"/> Addis Ababa, Ethiopia
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="inline-block bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 uppercase tracking-wide mb-2">
                        Verified Candidate
                      </div>
                      <p className="text-sm text-slate-400 font-mono">ID: {viewingDoc.citizenId.substring(0, 8)}...</p>
                    </div>
                  </div>

                  <div className="p-8 space-y-8">
                    {/* Resume View Toggle */}
                    {viewingDoc.resumeUrl && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col gap-4">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                              <FileText className="w-5 h-5"/>
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800">Uploaded Resume</h4>
                              <p className="text-xs text-slate-500">Document • {viewingDoc.resumeUrl.length > 1000 ? (viewingDoc.resumeUrl.length / 1024).toFixed(1) + ' KB' : 'Unknown Size'}</p>
                            </div>
                          </div>
                          <button 
                            onClick={() => setShowPreview(!showPreview)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-blue-900/20"
                          >
                            {showPreview ? 'Hide Preview' : 'Preview Document'}
                          </button>
                        </div>
                        
                        {showPreview && (
                          <div className="w-full border border-slate-200 rounded-lg overflow-hidden bg-slate-100 min-h-[500px] relative">
                            {viewingDoc.resumeUrl.startsWith('data:image') ? (
                              <img src={viewingDoc.resumeUrl} alt="Resume" className="w-full h-auto object-contain" />
                            ) : viewingDoc.resumeUrl.startsWith('data:application/pdf') ? (
                              <iframe src={viewingDoc.resumeUrl} className="w-full h-[800px]" title="Resume PDF"></iframe>
                            ) : docxHtml ? (
                              <div className="prose max-w-none p-8 bg-white overflow-y-auto max-h-[800px]" dangerouslySetInnerHTML={{ __html: docxHtml }} />
                            ) : (
                              <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                                <FileText className="w-12 h-12 mb-2 opacity-50" />
                                <p>Preview not available for this file type.</p>
                                <a href={viewingDoc.resumeUrl} download="resume" className="mt-4 text-blue-600 underline text-sm font-bold">Download File</a>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Work History */}
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-100 pb-2">Professional Experience</h3>
                      {viewingDoc.workHistory && viewingDoc.workHistory.length > 0 ? (
                        <div className="space-y-6">
                          {viewingDoc.workHistory.map((work: any, idx: number) => (
                            <div key={idx} className="relative pl-6 border-l-2 border-slate-200">
                              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-slate-300"></div>
                              <h4 className="font-bold text-lg text-slate-900">{work.role}</h4>
                              <p className="text-indigo-600 font-medium text-sm mb-1">{work.company}</p>
                              <p className="text-xs text-slate-500 mb-2 font-mono">{work.start} - {work.end}</p>
                              {work.desc && <p className="text-sm text-slate-600 leading-relaxed">{work.desc}</p>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-400 italic text-sm">No detailed work history provided.</p>
                      )}
                    </div>

                    {/* Education */}
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-100 pb-2">Education</h3>
                      {viewingDoc.educationDetails && viewingDoc.educationDetails.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {viewingDoc.educationDetails.map((edu: any, idx: number) => (
                            <div key={idx} className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                              <div className="w-10 h-10 bg-white rounded-lg shadow-sm flex items-center justify-center mb-3 text-slate-400 border border-slate-100">
                                <GraduationCap className="w-5 h-5"/>
                              </div>
                              <h4 className="font-bold text-slate-900">{edu.degree}</h4>
                              <p className="text-sm text-slate-600">{edu.school}</p>
                              <p className="text-xs text-slate-400 mt-1 font-mono">Class of {edu.year}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                         <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                            <GraduationCap className="w-5 h-5 text-slate-400"/>
                            <div>
                              <h4 className="font-bold text-slate-900">{viewingDoc.education || 'Not Specified'}</h4>
                              <p className="text-xs text-slate-500">Primary Education Record</p>
                            </div>
                         </div>
                      )}
                    </div>

                    {/* Skills */}
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-100 pb-2">Skills & Competencies</h3>
                      <div className="flex flex-wrap gap-2">
                        {viewingDoc.skills.map((skill: string) => (
                          <span key={skill} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold border border-slate-200">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Footer Seal */}
                  <div className="bg-slate-50 p-6 border-t border-slate-200 flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest mb-1">Generated by Career Hub</p>
                      <div className="h-8 w-32 bg-slate-200/50 rounded animate-pulse"></div>
                    </div>
                    <div className="w-20 h-20 border-4 border-slate-200 rounded-full flex items-center justify-center opacity-50 grayscale">
                      <ShieldCheck className="w-10 h-10 text-slate-300" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* REPORT DISCREPANCY MODAL */}
      <AnimatePresence>
        {reportModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-red-500/30 rounded-3xl w-full max-w-md p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center border border-red-500/30">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Report Mismatch</h3>
                  <p className="text-sm text-slate-400">Flag incorrect profile data</p>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Mismatched Field</label>
                  <select 
                    value={reportField}
                    onChange={(e) => setReportField(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  >
                    <option value="Education">Education Level</option>
                    <option value="Experience">Years of Experience</option>
                    <option value="Skills">Claimed Skills</option>
                    <option value="Identity">Identity / Name</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Details (Optional)</label>
                  <textarea 
                    value={reportNotes}
                    onChange={(e) => setReportNotes(e.target.value)}
                    placeholder="e.g., Form says Masters, but certificate is a Diploma."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white h-24 resize-none focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>
                
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                  <p className="text-xs text-red-400 font-medium leading-relaxed">
                    <strong className="font-black">Warning:</strong> Submitting this report will send an automated warning to the candidate. False reporting will negatively impact your Employer Trust Score.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setReportModalOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleReportDiscrepancy}
                  className="flex-1 py-3 rounded-xl font-bold bg-red-600 hover:bg-red-500 text-white transition-colors shadow-lg shadow-red-900/20"
                >
                  Submit Report
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SCHEDULE INTERVIEW MODAL */}
      <AnimatePresence>
        {scheduleModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Schedule Interview</h3>
                <button onClick={() => setScheduleModalOpen(false)} className="text-slate-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleScheduleInterview} className="space-y-4">
                {selectedCandidate ? (
                  <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl mb-4">
                    <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-1">Candidate</p>
                    <p className="font-bold text-white">{selectedCandidate.name}</p>
                    <input type="hidden" name="candidateId" value={selectedCandidate.citizenId} />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Select Candidate</label>
                    <select 
                      name="candidateId" 
                      required 
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500"
                      onChange={(e) => {
                        const candidate = talent.find(t => t.citizenId === e.target.value);
                        setSelectedCandidate(candidate);
                      }}
                    >
                      <option value="">-- Select a Candidate --</option>
                      {talent.map(t => (
                        <option key={t.citizenId} value={t.citizenId}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Role / Position</label>
                  <input required name="role" type="text" placeholder="e.g. Senior Developer" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Date</label>
                    <input required name="date" type="date" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500 [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Time</label>
                    <input required name="time" type="time" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500 [color-scheme:dark]" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Location (CityLink Maps)</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input required name="location" type="text" placeholder="Search location..." className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>

                <button type="submit" className="w-full py-4 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-lg shadow-indigo-900/20 mt-4">
                  Send Invite
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* APPLICATIONS MODAL */}
      <AnimatePresence>
        {viewingApplicationsForJob && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl p-6 shadow-2xl max-h-[90vh] flex flex-col"
            >
              <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-xl font-bold text-white">Job Applications</h3>
                  <p className="text-indigo-400 text-sm font-medium">
                    {jobPostings.find(j => j.id === viewingApplicationsForJob)?.title}
                  </p>
                </div>
                <button onClick={() => setViewingApplicationsForJob(null)} className="text-slate-500 hover:text-white bg-slate-800 p-2 rounded-xl transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {applications.filter(app => app.jobId === viewingApplicationsForJob).length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-400 font-medium">No applications yet.</p>
                  </div>
                ) : (
                  applications.filter(app => app.jobId === viewingApplicationsForJob).map(app => (
                    <div key={app.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-indigo-500/30 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-lg border border-slate-700">
                          {app.citizenName?.charAt(0) || '?'}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-lg">{app.citizenName || 'Unknown Candidate'}</h4>
                          <p className="text-xs text-slate-500 flex items-center gap-2">
                            <Clock className="w-3 h-3" /> Applied {new Date(app.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                          app.status === 'APPLIED' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                          app.status === 'REVIEWING' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          app.status === 'INTERVIEW' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                          app.status === 'OFFERED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {app.status}
                        </div>
                        
                        <div className="h-8 w-px bg-slate-800 hidden md:block"></div>

                        <button 
                          onClick={async () => {
                            // Find the candidate in talent pool to view docs
                            let candidate = talent.find(t => t.citizenId === app.citizenId);
                            if (!candidate) {
                                // Try to fetch profile directly
                                candidate = await JobEngine.getProfile(app.citizenId);
                            }
                            
                            if (candidate) {
                              setViewingDoc(candidate);
                            } else {
                              alert("Candidate profile details not available.");
                            }
                          }}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        
                        <button 
                          onClick={() => {
                             setSelectedCandidate({ 
                               citizenId: app.citizenId, 
                               name: app.citizenName 
                             }); 
                             setScheduleModalOpen(true);
                          }}
                          className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-xl transition-colors border border-indigo-500/20"
                          title="Schedule Interview"
                        >
                          <CalendarIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* POST JOB MODAL */}
      <AnimatePresence>
        {postJobModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Post New Job</h3>
                <button onClick={() => setPostJobModalOpen(false)} className="text-slate-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateJob} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Job Title</label>
                  <input required name="title" type="text" placeholder="e.g. Senior Software Engineer" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Type</label>
                    <select name="type" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500">
                      <option value="FULL_TIME">Full Time</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="CONTRACT">Contract</option>
                      <option value="INTERNSHIP">Internship</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Salary Range</label>
                    <input required name="salary" type="text" placeholder="e.g. 25k - 40k ETB" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input required name="location" type="text" placeholder="e.g. Addis Ababa (Remote)" className="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Description</label>
                  <textarea required name="description" rows={4} placeholder="Describe the role and responsibilities..." className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500 resize-none" />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Requirements (Comma Separated)</label>
                  <input required name="requirements" type="text" placeholder="e.g. React, Node.js, 3+ Years Exp" className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-white focus:outline-none focus:border-indigo-500" />
                </div>

                <button type="submit" className="w-full py-4 rounded-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors shadow-lg shadow-indigo-900/20 mt-4">
                  Publish Job
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EmployerDashboard;
