// Simple random UUID generator for browser
const randomUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export interface JobProfile {
  id: string;
  citizenId: string;
  name: string;
  education: string;
  experience: number;
  skills: string[];
  verified: boolean;
  trustScore: number;
  workHistory?: any[];
  educationDetails?: any[];
  certifications?: any[];
  resumeUrl?: string;
}

export interface JobConsentRequest {
  id: string;
  merchantId: string;
  merchantName: string;
  citizenId: string;
  docType: string;
  status: 'NONE' | 'PENDING' | 'GRANTED' | 'DENIED';
  createdAt: string;
}

export interface Interview {
  id: string;
  merchantId: string;
  citizenId: string;
  merchantName: string;
  candidateName: string;
  role: string;
  date: string;
  time: string;
  location: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
}

// Event listener system to trigger re-renders across components
type Listener = () => void;
const listeners: Set<Listener> = new Set();
const notifyListeners = () => listeners.forEach(l => l());

export interface JobPosting {
  id: string;
  merchantId: string;
  merchantName: string;
  title: string;
  description: string;
  requirements: string[];
  location: string;
  salaryRange: string;
  type: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP';
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  citizenId: string;
  merchantId: string;
  merchantName: string;
  role: string; // Job Title
  status: 'APPLIED' | 'REVIEWING' | 'INTERVIEW' | 'OFFERED' | 'REJECTED';
  date: string;
}

export class JobEngine {
  static subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  // --- JOB POSTINGS & APPLICATIONS ---
  static async createJobPosting(data: Omit<JobPosting, 'id' | 'createdAt' | 'status'>) {
    try {
      const res = await fetch('/api/jobs/postings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      notifyListeners();
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  static async getJobPostings() {
    try {
      const res = await fetch('/api/jobs/postings');
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((d: any) => ({
        id: d.id,
        merchantId: d.merchant_id,
        merchantName: d.merchant_name,
        title: d.title,
        description: d.description,
        requirements: d.requirements,
        location: d.location,
        salaryRange: d.salary_range,
        type: d.type,
        status: d.status,
        createdAt: d.created_at
      }));
    } catch (e) {
      return [];
    }
  }

  static async applyToJob(citizenId: string, jobId: string, merchantId: string, merchantName: string, role: string) {
    try {
      const res = await fetch('/api/jobs/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ citizenId, jobId, merchantId, merchantName, role })
      });
      notifyListeners();
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  // --- CITIZEN METHODS ---
  static async getProfile(citizenId: string) {
    try {
      const res = await fetch(`/api/jobs/profile/${citizenId}`);
      if (!res.ok) return null;
      const data = await res.json();
      return data ? {
        id: data.user_id,
        citizenId: data.user_id,
        name: data.name || 'Citizen',
        education: data.education,
        experience: data.experience,
        skills: data.skills,
        verified: data.verified,
        trustScore: data.trust_score,
        workHistory: data.work_history || [],
        educationDetails: data.education_details || [],
        certifications: data.certifications || [],
        resumeUrl: data.resume_url || ''
      } : null;
    } catch (e) {
      return null;
    }
  }

  static async updateProfile(citizenId: string, name: string, data: Partial<JobProfile>) {
    try {
      const res = await fetch('/api/jobs/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: citizenId,
          education: data.education || '',
          experience: data.experience || 0,
          skills: data.skills || [],
          work_history: data.workHistory || [],
          education_details: data.educationDetails || [],
          certifications: data.certifications || [],
          resume_url: data.resumeUrl || ''
        })
      });
      notifyListeners();
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  static async getCitizenRequests(citizenId: string) {
    try {
      const res = await fetch(`/api/jobs/requests/citizen/${citizenId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((d: any) => ({
        id: d.id,
        merchantId: d.merchant_id,
        merchantName: d.merchant_name,
        citizenId: d.citizen_id,
        docType: d.requested_docs,
        status: d.status,
        createdAt: d.created_at
      }));
    } catch (e) {
      return [];
    }
  }

  static async getApplications(citizenId: string) {
    try {
      const res = await fetch(`/api/jobs/applications/${citizenId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((d: any) => ({
        id: d.id,
        jobId: d.job_id,
        citizenId: d.citizen_id,
        merchantId: d.merchant_id,
        merchantName: d.merchant_name,
        role: d.role,
        status: d.status,
        date: d.created_at
      }));
    } catch (e) {
      return [];
    }
  }

  static async getMerchantApplications(merchantId: string) {
    try {
      const res = await fetch(`/api/jobs/applications/merchant/${merchantId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((d: any) => ({
        id: d.id,
        jobId: d.job_id,
        citizenId: d.citizen_id,
        merchantId: d.merchant_id,
        merchantName: d.merchant_name,
        citizenName: d.citizen_name,
        role: d.role,
        status: d.status,
        date: d.created_at,
        resumeUrl: d.resume_url,
        coverLetter: d.cover_letter
      }));
    } catch (e) {
      return [];
    }
  }

  static async getCitizenInterviews(citizenId: string) {
    try {
      const res = await fetch(`/api/jobs/interviews/citizen/${citizenId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((d: any) => ({
        id: d.id,
        merchantId: d.merchant_id,
        citizenId: d.citizen_id,
        merchantName: d.merchant_name,
        candidateName: d.candidate_name,
        role: d.role,
        date: d.interview_date,
        time: d.interview_time,
        location: d.location,
        status: d.status
      }));
    } catch (e) {
      return [];
    }
  }

  static async updateRequestStatus(requestId: string, status: 'GRANTED' | 'DENIED') {
    try {
      await fetch(`/api/jobs/requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      notifyListeners();
    } catch (e) {
      console.error(e);
    }
  }

  // --- MERCHANT METHODS ---
  static async getTalentPool() {
    try {
      const res = await fetch('/api/jobs/talent');
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((d: any) => ({
        id: d.user_id,
        citizenId: d.user_id,
        name: d.users?.name || 'Citizen',
        education: d.education,
        experience: d.experience,
        skills: d.skills,
        verified: d.verified,
        trustScore: d.trust_score,
        workHistory: d.work_history || [],
        educationDetails: d.education_details || [],
        certifications: d.certifications || [],
        resumeUrl: d.resume_url || ''
      }));
    } catch (e) {
      return [];
    }
  }

  static async getMerchantRequests(merchantId: string) {
    try {
      const res = await fetch(`/api/jobs/requests/merchant/${merchantId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((d: any) => ({
        id: d.id,
        merchantId: d.merchant_id,
        merchantName: d.merchant_name,
        citizenId: d.citizen_id,
        docType: d.requested_docs,
        status: d.status,
        createdAt: d.created_at
      }));
    } catch (e) {
      return [];
    }
  }

  static async requestAccess(merchantId: string, merchantName: string, citizenId: string, docType: string) {
    try {
      const res = await fetch('/api/jobs/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_id: merchantId, citizen_id: citizenId, merchant_name: merchantName, requested_docs: docType })
      });
      notifyListeners();
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  static async getMerchantInterviews(merchantId: string) {
    try {
      const res = await fetch(`/api/jobs/interviews/merchant/${merchantId}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((d: any) => ({
        id: d.id,
        merchantId: d.merchant_id,
        citizenId: d.citizen_id,
        merchantName: d.merchant_name,
        candidateName: d.candidate_name,
        role: d.role,
        date: d.interview_date,
        time: d.interview_time,
        location: d.location,
        status: d.status
      }));
    } catch (e) {
      return [];
    }
  }

  static async scheduleInterview(data: Omit<Interview, 'id' | 'status'>) {
    try {
      const res = await fetch('/api/jobs/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: data.merchantId,
          citizen_id: data.citizenId,
          merchant_name: data.merchantName,
          candidate_name: data.candidateName,
          role: data.role,
          interview_date: data.date,
          interview_time: data.time,
          location: data.location
        })
      });
      notifyListeners();
      return await res.json();
    } catch (e) {
      return null;
    }
  }
}
