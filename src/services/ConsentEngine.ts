// Simple random UUID generator for browser
const randomUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// ==========================================
// 1. DATA MODEL (Prisma / PostgreSQL Schema)
// ==========================================
/*
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model CitizenProfile {
  id              String   @id @default(uuid())
  faydaId         String   @unique // Fayda ID for primary verification in Addis Ababa
  fullName        String
  phoneNumber     String
  trustScore      Int      @default(100)
  isBanned        Boolean  @default(false)
  
  documents       Document[]
  consentRequests ConsentRequest[]
  reports         DiscrepancyReport[]
}

model MerchantProfile {
  id              String   @id @default(uuid())
  businessName    String
  isVerified      Boolean  @default(false)
  
  consentRequests ConsentRequest[]
  reportsMade     DiscrepancyReport[]
}

model Document {
  id              String   @id @default(uuid())
  citizenId       String
  citizen         CitizenProfile @relation(fields: [citizenId], references: [id])
  docType         String   // e.g., "DEGREE", "CERTIFICATE", "ID"
  s3ObjectKey     String
  isVerified      Boolean  @default(false)
}

model ConsentRequest {
  id              String   @id @default(uuid())
  merchantId      String
  citizenId       String
  docType         String
  status          ConsentStatus @default(PENDING)
  createdAt       DateTime @default(now())
  expiresAt       DateTime?
  
  merchant        MerchantProfile @relation(fields: [merchantId], references: [id])
  citizen         CitizenProfile  @relation(fields: [citizenId], references: [id])
}

model DiscrepancyReport {
  id              String   @id @default(uuid())
  merchantId      String
  citizenId       String
  fieldFlagged    String   // e.g., "Graduation Year", "University Name"
  createdAt       DateTime @default(now())

  merchant        MerchantProfile @relation(fields: [merchantId], references: [id])
  citizen         CitizenProfile  @relation(fields: [citizenId], references: [id])
}

enum ConsentStatus {
  PENDING
  APPROVED
  REJECTED
  EXPIRED
}
*/

// ==========================================
// TYPES & MOCKS FOR IMPLEMENTATION
// ==========================================

type ConsentStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

interface ConsentRequest {
  id: string;
  merchantId: string;
  citizenId: string;
  docType: string;
  status: ConsentStatus;
  createdAt: Date;
}

interface DiscrepancyReport {
  id: string;
  merchantId: string;
  citizenId: string;
  fieldFlagged: string;
  createdAt: Date;
}

interface CitizenProfile {
  id: string;
  faydaId: string;
  phoneNumber: string;
  trustScore: number;
  isBanned: boolean;
}

// Mock SMS Service (Crucial for Addis Ababa context)
const smsService = {
  sendSMS: async (phoneNumber: string, message: string) => {
    console.log(`[SMS Sent to ${phoneNumber}]: ${message}`);
  }
};

// Mock Secure Storage Service (e.g., AWS S3)
const s3Service = {
  generateSignedUrl: async (objectKey: string, expiresInMinutes: number): Promise<string> => {
    // In a real app: s3.getSignedUrlPromise('getObject', { Bucket, Key, Expires: expiresInMinutes * 60 })
    const expiresAt = Date.now() + expiresInMinutes * 60000;
    return `https://secure-storage.citylink.et/docs/${objectKey}?token=${randomUUID()}&expires=${expiresAt}`;
  }
};

// ==========================================
// 2. CONSENT ENGINE LOGIC
// ==========================================

export class ConsentEngine {
  /**
   * Step 1 & 2: Merchant requests access to a Citizen's document.
   * Creates a PENDING request and notifies the citizen.
   */
  static async requestDocumentAccess(merchantId: string, citizenId: string, docType: string) {
    try {
      const res = await fetch('/api/jobs/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_id: merchantId, citizen_id: citizenId, requested_docs: docType })
      });
      return await res.json();
    } catch (e) {
      return null;
    }
  }

  static async grantDocumentAccess(requestId: string, citizenId: string, s3ObjectKey: string) {
    try {
      const res = await fetch(`/api/jobs/requests/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'GRANTED' })
      });
      
      // Generate a signed, short-lived URL that expires in 10 minutes
      const signedUrl = await s3Service.generateSignedUrl(s3ObjectKey, 10);

      return {
        success: true,
        message: "Access granted successfully.",
        temporaryUrl: signedUrl,
        expiresIn: "10 minutes"
      };
    } catch (e) {
      throw new Error("Failed to grant access");
    }
  }

  static async reportDiscrepancy(merchantId: string, citizenId: string, fieldFlagged: string) {
    try {
      const res = await fetch('/api/jobs/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_id: merchantId, citizen_id: citizenId, field_flagged: fieldFlagged })
      });
      return await res.json();
    } catch (e) {
      return { success: false, message: "Failed to report discrepancy." };
    }
  }
}
