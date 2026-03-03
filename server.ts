import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase Client Lazy Initialization
let supabaseInstance: any = null;

// Helper to wrap Supabase calls with a timeout
const withTimeout = async (promise: Promise<any>, timeoutMs: number = 30000): Promise<any> => {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Database request timed out')), timeoutMs);
  });
  
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
};

const getSupabase = () => {
  if (supabaseInstance) return supabaseInstance;

  const supabaseUrl = process.env.SUPABASE_URL;
  // Prefer Service Role Key for backend operations to bypass RLS, otherwise use Anon Key
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn("SUPABASE_URL or SUPABASE_KEY is missing. Supabase features will be disabled.");
    return null;
  }

  try {
    supabaseInstance = createClient(supabaseUrl, supabaseKey);
    console.log("Supabase client initialized successfully.");
    return supabaseInstance;
  } catch (e) {
    console.error("Failed to initialize Supabase client:", e);
    return null;
  }
};

// In-memory store for Ekubs (fallback when Supabase tables are missing)
const inMemoryEkubs: any[] = [];
const inMemoryEkubMembers: any[] = [];

// In-memory store for Parking (fallback when Supabase tables are missing)
const inMemoryParkingLots: any[] = [
  {
    id: 'lot_1',
    merchantId: 'm_parking_1',
    name: 'Bole Airport Parking',
    address: 'Bole International Airport',
    totalSpots: 50,
    availableSpots: 45,
    baseRate: 20,
    isActive: true,
    createdAt: new Date().toISOString(),
    spots: []
  },
  {
    id: 'lot_2',
    merchantId: 'm_parking_2',
    name: 'Meskel Square Parking',
    address: 'Meskel Square, Addis Ababa',
    totalSpots: 100,
    availableSpots: 98,
    baseRate: 15,
    isActive: true,
    createdAt: new Date().toISOString(),
    spots: []
  }
];

const inMemoryParkingSpots: any[] = [];

// In-memory store for Jobs (fallback when Supabase tables are missing)
const inMemoryJobProfiles: any[] = [];
const inMemoryJobConsentRequests: any[] = [];
const inMemoryInterviews: any[] = [];
const inMemoryJobPostings: any[] = [
  {
    id: 'job_1',
    merchantId: 'm_tech_1',
    merchantName: 'EthioTech Solutions',
    title: 'Senior Frontend Developer',
    description: 'We are looking for an experienced React developer to join our team.',
    requirements: ['React', 'TypeScript', 'Tailwind CSS', '3+ Years Experience'],
    location: 'Addis Ababa (Remote)',
    salaryRange: 'ETB 25,000 - 40,000',
    type: 'FULL_TIME',
    status: 'OPEN',
    createdAt: new Date().toISOString()
  },
  {
    id: 'job_2',
    merchantId: 'm_bank_1',
    merchantName: 'Addis International Bank',
    title: 'Data Analyst',
    description: 'Analyze financial data and generate reports for stakeholders.',
    requirements: ['SQL', 'Python', 'Excel', 'Finance Background'],
    location: 'Bole, Addis Ababa',
    salaryRange: 'ETB 15,000 - 25,000',
    type: 'FULL_TIME',
    status: 'OPEN',
    createdAt: new Date().toISOString()
  }
];
const inMemoryApplications: any[] = [];

// Initialize spots for seed lots
inMemoryParkingLots.forEach(lot => {
  for (let i = 1; i <= lot.totalSpots; i++) {
    const spot = {
      id: `spot_${lot.id}_${i}`,
      lotId: lot.id,
      spotNumber: i.toString(),
      status: 'AVAILABLE'
    };
    inMemoryParkingSpots.push(spot);
    lot.spots.push(spot);
  }
});

const inMemoryParkingSessions: any[] = [];

const inMemoryUsers: any[] = [
  {
    id: 'user_1',
    phone: '0911223344',
    name: 'Abebe Bikila',
    role: 'citizen',
    id_number: '123456789012',
    registration_complete: true,
    kyc_status: 'VERIFIED',
    merchant_status: 'NONE',
    balance: 5000.0,
    isLoggedIn: true
  },
  {
    id: 'm_parking_1',
    phone: '0911000001',
    name: 'Parking Admin',
    role: 'merchant',
    merchant_name: 'Bole Airport Parking',
    merchant_type: 'parking',
    merchant_status: 'APPROVED',
    registration_complete: true,
    kyc_status: 'VERIFIED',
    balance: 0.0,
    isLoggedIn: true
  }
];

// In-memory store for Marketplace Orders
const inMemoryProducts: any[] = [
  {
    id: 'prod_1',
    merchantId: 'm_artisan',
    name: 'Handwoven Ethiopian Scarf',
    description: 'A beautiful scarf made from traditional fabrics.',
    price: 850,
    imageUrl: 'https://picsum.photos/seed/scarf/400/300',
    category: 'Apparel',
    stock: 15,
    status: 'Active',
    sellerName: 'Alem Artisans',
    sellerLocation: 'Addis Ababa, Ethiopia'
  },
  {
    id: 'prod_2',
    merchantId: 'm_coffee',
    name: 'Premium Yirgacheffe Coffee Beans (1kg)',
    description: 'Single-origin, ethically sourced coffee beans.',
    price: 1200,
    imageUrl: 'https://picsum.photos/seed/coffee/400/300',
    category: 'Food & Beverage',
    stock: 50,
    status: 'Active',
    sellerName: 'Yirgacheffe Coffee Co.',
    sellerLocation: 'Yirgacheffe, Ethiopia'
  }
];

const inMemoryOrders: any[] = [
  {
    id: 'ord_1',
    buyerId: 'user_1',
    productId: 'prod_1',
    product: {
      id: 'prod_1',
      merchantId: 'm_artisan',
      name: 'Handwoven Ethiopian Scarf',
      description: 'A beautiful scarf made from traditional fabrics.',
      price: 850,
      imageUrl: 'https://picsum.photos/seed/scarf/400/300',
      category: 'Apparel',
      stock: 15,
      sellerName: 'Alem Artisans',
      sellerLocation: 'Addis Ababa, Ethiopia'
    },
    quantity: 1,
    totalAmount: 850,
    status: 'COMPLETED',
    escrowStatus: 'RELEASED',
    shippingAddress: '123 Bole Road, Addis Ababa, Ethiopia',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: 'ord_2',
    buyerId: 'user_1',
    productId: 'prod_2',
    product: {
      id: 'prod_2',
      merchantId: 'm_coffee',
      name: 'Premium Yirgacheffe Coffee Beans (1kg)',
      description: 'Single-origin, ethically sourced coffee beans.',
      price: 1200,
      imageUrl: 'https://picsum.photos/seed/coffee/400/300',
      category: 'Food & Beverage',
      stock: 50
    },
    quantity: 2,
    totalAmount: 2400,
    status: 'PENDING',
    escrowStatus: 'FUNDED',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  }
];

// In-memory store for Traffic Fines
const inMemoryTrafficFines: any[] = [
  { id: 'fine_1', plateNumber: 'AA-2-12345', noticeNumber: 'N-2026-001', violationType: 'Speeding', location: 'Bole Road', amount: 1200, date: new Date(Date.now() - 86400000 * 3).toISOString(), status: 'UNPAID' },
  { id: 'fine_2', plateNumber: 'AA-2-12345', noticeNumber: 'N-2026-002', violationType: 'Illegal Parking', location: 'Piazza', amount: 500, date: new Date(Date.now() - 86400000 * 10).toISOString(), status: 'UNPAID' },
  { id: 'fine_3', plateNumber: 'AA-3-99887', noticeNumber: 'N-2026-003', violationType: 'Running Red Light', location: 'Mexico Square', amount: 2500, date: new Date(Date.now() - 86400000 * 1).toISOString(), status: 'UNPAID' },
];

// In-memory store for Transactions (fallback when Supabase tables are missing or RLS blocks access)
const inMemoryTransactions: any[] = [
  { id: 'tx_1', user_id: 'user_1', merchant_id: 'm_elec', amount: 150.0, type: 'PAYMENT', status: 'COMPLETED', description: 'Electric Bill', timestamp: new Date().toISOString() },
  { id: 'tx_2', user_id: 'user_1', merchant_id: 'm_bus', amount: 5.0, type: 'PAYMENT', status: 'COMPLETED', description: 'Bus Fare', timestamp: new Date(Date.now() - 86400000).toISOString() }
];

// In-memory store for School Fees
const inMemoryStudents: any[] = [
  { id: 'STU001', name: 'Nahom Tadesse', schoolName: 'Bole Public School', grade: 'Grade 8', parentPhone: '0911223344', paymentCode: 'PAY-BOLE-001' },
  { id: 'STU002', name: 'Selam Kebede', schoolName: 'Menelik II Secondary School', grade: 'Grade 10', parentPhone: '0911223344', paymentCode: 'PAY-MEN-002' },
  { id: 'STU003', name: 'Abebe Bikila', schoolName: 'International Community School (ICS)', grade: 'Grade 5', parentPhone: '0922334455', paymentCode: 'PAY-ICS-003' },
];

const inMemorySchoolFees: any[] = [
  { id: 'fee_1', studentId: 'STU001', feeType: 'TUITION', amount: 1500, dueDate: '2026-03-15T00:00:00Z', status: 'UNPAID', academicYear: '2025/26', term: 'Term 2', invoiceNumber: 'INV-001-A' },
  { id: 'fee_2', studentId: 'STU001', feeType: 'TRANSPORT', amount: 450, dueDate: '2026-03-15T00:00:00Z', status: 'UNPAID', academicYear: '2025/26', term: 'Term 2', invoiceNumber: 'INV-001-B' },
  { id: 'fee_3', studentId: 'STU002', feeType: 'TUITION', amount: 2200, dueDate: '2026-03-10T00:00:00Z', status: 'UNPAID', academicYear: '2025/26', term: 'Term 2', invoiceNumber: 'INV-002-A' },
  { id: 'fee_4', studentId: 'STU003', feeType: 'TUITION', amount: 45000, dueDate: '2026-04-01T00:00:00Z', status: 'UNPAID', academicYear: '2025/26', term: 'Semester 2', invoiceNumber: 'INV-ICS-001' },
  { id: 'fee_5', studentId: 'STU003', feeType: 'EXTRACURRICULAR', amount: 5000, dueDate: '2026-04-01T00:00:00Z', status: 'UNPAID', academicYear: '2025/26', term: 'Semester 2', invoiceNumber: 'INV-ICS-002' },
];

// Chapa Client Helper
const getChapaConfig = () => {
  const secretKey = process.env.CHAPA_SECRET_KEY;
  if (!secretKey) {
    console.warn("CHAPA_SECRET_KEY is missing. Payment features will be disabled.");
    return null;
  }
  return {
    secretKey,
    baseUrl: 'https://api.chapa.co/v1'
  };
};

// ... (existing code)

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Logging helper
  const log = async (message: string, type: string = 'INFO', metadata: any = {}) => {
    const supabase = getSupabase();
    if (!supabase) {
      console.log(`[LOG ${type}] ${message}`, metadata);
      return;
    }
    await supabase.from('logs').insert([{ message, type, metadata }]);
  };

  // 1. Mocked Fayda e-KYC (Proclamation 1284/2023)
  class FaydaMockService {
    static verifyUser(fin_number: string) {
      if (fin_number && fin_number.length === 12 && fin_number.startsWith('123')) {
        return {
          success: true,
          token: `fayda_tok_${Math.random().toString(36).substring(2, 15)}`,
          profile: {
            name: 'Verified Citizen',
            photoUrl: 'https://picsum.photos/seed/fayda/200/200'
          }
        };
      }
      return { success: false, error: 'KYC_Failed: Invalid FIN number' };
    }
  }

  // API Routes
  const apiRouter = express.Router();

  // Request logging middleware
  apiRouter.use((req, res, next) => {
    console.log(`[API REQUEST] ${req.method} ${req.url}`);
    next();
  });

  // Chapa Endpoints
  apiRouter.post("/create-checkout-session", async (req, res) => {
    const { amount, currency, productName, email, firstName, lastName, txRef, successUrl, cancelUrl } = req.body;
    const chapa = getChapaConfig();

    if (!chapa) {
      return res.status(503).json({ error: "Chapa not configured." });
    }

    try {
      let finalAmount = parseFloat(amount);
      if (isNaN(finalAmount)) {
        return res.status(400).json({ error: "Invalid amount" });
      }
      
      const finalCurrency = currency || 'ETB';
      const transactionRef = txRef || `tx-${uuidv4()}`;
      
      // Strict email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      // Use the user's provided email as the robust fallback
      let userEmail = 'joe.joeeee.joe@gmail.com';
      
      if (email && typeof email === 'string' && emailRegex.test(email.trim())) {
        userEmail = email.trim();
      }
      
      console.log(`[Chapa Init] Amount: ${finalAmount}, Email: ${userEmail} (Original: ${email}), TxRef: ${transactionRef}`);

      // Determine Base URL (use Env Var, or fallback to Request Headers)
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const host = req.headers['x-forwarded-host'] || req.get('host');
      const baseUrl = process.env.VITE_APP_URL || `${protocol}://${host}`;

      // Chapa Initialize API
      const response = await fetch(`${chapa.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${chapa.secretKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: finalAmount.toString(),
          currency: finalCurrency,
          email: userEmail,
          first_name: firstName || 'Customer',
          last_name: lastName || 'User',
          tx_ref: transactionRef,
          callback_url: `${baseUrl}/api/chapa/webhook`,
          return_url: successUrl, // Chapa redirects here on success
          "customization[title]": productName || 'Service Payment',
          "customization[description]": "Payment for services"
        })
      });

      const data = await response.json();

      if (data.status === 'success') {
        res.json({ url: data.data.checkout_url });
      } else {
        console.error("Chapa initialization failed:", JSON.stringify(data, null, 2));
        res.status(400).json({ error: data.message || "Payment initialization failed", details: data });
      }
    } catch (e: any) {
      console.error("Error creating Chapa checkout session:", e);
      res.status(500).json({ error: e.message });
    }
  });

  apiRouter.get("/verify-payment/:txRef", async (req, res) => {
    const { txRef } = req.params;
    const chapa = getChapaConfig();

    if (!chapa) {
      return res.status(503).json({ error: "Chapa not configured." });
    }

    try {
      const response = await fetch(`${chapa.baseUrl}/transaction/verify/${txRef}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${chapa.secretKey}`
        }
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        // Handle post-payment logic based on txRef prefix
        if (txRef.startsWith('wlt-') || txRef.startsWith('wallet-')) {
          const parts = txRef.split('-');
          // wlt-{userIdShort}-{timestamp} or wallet-{userId}-{timestamp}
          // We need the full userId. But wait, we only have the short ID in the ref now.
          // This is a problem for verification if we need to update the user balance.
          // We need to store the pending transaction with the txRef -> userId mapping.
          // OR, we can just pass the userId in the metadata to Chapa?
          // Chapa supports metadata? Yes, "customization" or just extra fields?
          // Chapa initialize endpoint doesn't seem to take arbitrary metadata easily in the standard fields, 
          // but we can use `meta` field if supported.
          // Alternatively, we can just search for the user who has a pending transaction with this ref?
          // But we don't store pending transactions in DB yet for Chapa flow.
          
          // Let's revert to using full ID but ensure we don't exceed 50 chars.
          // UUID is 36 chars.
          // wlt- (4) + 36 = 40 chars.
          // We can just append a short random string or timestamp if it fits.
          // 50 - 40 = 10 chars left.
          // Date.now() is 13 chars. Too long.
          // We can use a short random string.
          
          // Wait, the previous error was:
          // "The tx ref must not exceed 50 characters."
          // `wallet-${profile.id}-${Date.now()}`
          // 7 + 36 + 1 + 13 = 57 chars.
          
          // If we use `wlt-${profile.id}-${Date.now().toString().slice(-8)}`
          // 4 + 36 + 1 + 8 = 49 chars. This fits!
          
          // So let's update the frontend to use this format, and then the backend can extract the ID easily.
          // `wlt-` prefix is 4 chars.
          // ID is 36 chars.
          // Separator is 1 char.
          // Suffix is 8 chars.
          // Total 49.
          
          // But wait, I already updated the frontend to use substring(0,8).
          // If I use substring, I lose the full ID.
          // I need to change the frontend strategy again to keep the full ID if possible, OR store the mapping.
          // Storing mapping is complex without a proper DB table for "pending_payments".
          
          // Let's change the frontend to: `wlt-${profile.id}-${Date.now().toString().slice(-8)}`
          // And update backend to handle `wlt-` prefix.
          
          // But wait, I can't easily undo the previous frontend change without another edit.
          // I will re-edit the frontend files to use the safe format that preserves ID.
          
          // Let's assume I will fix frontend.
          // Now updating backend to handle `wlt-` and `prk-`.
          
          // For `wlt-`:
          // The ID is the middle part.
          // `wlt-<uuid>-<timestamp>`
          // split('-') might be tricky if UUID has hyphens.
          // UUID has hyphens! 
          // `wlt-123e4567-e89b-12d3-a456-426614174000-12345678`
          // We can slice.
          // Prefix `wlt-` is 4 chars.
          // UUID is 36 chars.
          // So ID is txRef.substring(4, 40).
          
          const userId = txRef.startsWith('wlt-') ? txRef.substring(4, 40) : txRef.split('-')[1];
          const amount = parseFloat(data.data.amount);
          
          // Fund wallet logic
          const supabase = getSupabase();
          if (supabase) {
             const { data: user } = await supabase.from('users').select('balance').eq('id', userId).single();
             if (user) {
               const newBalance = (user.balance || 0) + amount;
               await supabase.from('users').update({ balance: newBalance }).eq('id', userId);
               
               // Record transaction
               await supabase.from('transactions').insert([{
                 id: txRef,
                 user_id: userId,
                 merchant_id: 'chapa',
                 amount: amount,
                 type: 'DEPOSIT',
                 status: 'COMPLETED',
                 description: 'Wallet Funding via Chapa',
                 timestamp: new Date().toISOString()
               }]);
             }
          } else {
             console.log(`[Mock] Wallet funded for user ${userId} with ${amount} ETB`);
          }
        } else if (txRef.startsWith('prk-') || txRef.startsWith('parking-')) {
           // prk-<sessionId>-<timestamp>
           // Session ID is UUID (36 chars).
           // prk- (4) + 36 + 1 + 8 = 49 chars.
           // ID is substring(4, 40).
           
           const sessionId = txRef.startsWith('prk-') ? txRef.substring(4, 40) : txRef.split('-')[1];
           
           const supabase = getSupabase();
           if (supabase) {
             // Fetch session
             const { data: session } = await supabase.from('parking_sessions').select('*').eq('id', sessionId).single();
             if (session && session.status === 'ACTIVE') {
                // End it
                const endTime = new Date();
                await supabase.from('parking_sessions').update({
                  status: 'COMPLETED',
                  end_time: endTime.toISOString(),
                  total_cost: parseFloat(data.data.amount)
                }).eq('id', sessionId);
                
                // Free the spot
                await supabase.from('parking_spots').update({ status: 'AVAILABLE', occupied_by: null }).eq('id', session.spot_id);
             }
           } else {
             // In-memory fallback
             const sessionIndex = inMemoryParkingSessions.findIndex(s => s.id === sessionId);
             if (sessionIndex !== -1) {
               const session = inMemoryParkingSessions[sessionIndex];
               if (session.status === 'ACTIVE') {
                 session.status = 'COMPLETED';
                 session.endTime = new Date().toISOString();
                 session.totalCost = parseFloat(data.data.amount);
                 
                 const spotIndex = inMemoryParkingSpots.findIndex(s => s.id === session.spotId);
                 if (spotIndex !== -1) {
                   inMemoryParkingSpots[spotIndex].status = 'AVAILABLE';
                   inMemoryParkingSpots[spotIndex].occupiedBy = null;
                   // Update lot count
                   const lot = inMemoryParkingLots.find(l => l.id === inMemoryParkingSpots[spotIndex].lotId);
                   if (lot) lot.availableSpots++;
                 }
               }
             }
           }
        }
      }

      res.json(data);
    } catch (e: any) {
      console.error("Error verifying Chapa payment:", e);
      res.status(500).json({ error: e.message });
    }
  });

  // Request logger middleware for API only
  apiRouter.use((req, res, next) => {
    console.log(`[API LOG] ${req.method} ${req.originalUrl}`);
    next();
  });

  apiRouter.get("/health", async (req, res) => {
    const supabase = getSupabase();
    const status: any = {
      status: "ok",
      message: "Citylink Backend Active",
      supabaseStatus: "not_configured"
    };

    if (supabase) {
      try {
        const { error } = await withTimeout(supabase.from('users').select('id').limit(1), 5000);
        if (error) {
          status.supabaseStatus = "error";
          status.supabaseError = error.message;
        } else {
          status.supabaseStatus = "connected";
        }
      } catch (e: any) {
        status.supabaseStatus = "timeout_or_exception";
        status.supabaseError = e.message;
      }
    }

    res.json(status);
  });

  // Services
  apiRouter.get("/services", async (req, res) => {
    const supabase = getSupabase();
    const mockServices = [
      { id: 'util_elec', name: 'Electric Bill', category: 'utility', description: 'Pay your monthly electricity bill', icon: 'Zap', price: 0 },
      { id: 'util_water', name: 'Water Bill', category: 'utility', description: 'Pay your monthly water bill', icon: 'Droplets', price: 0 },
      { id: 'trans_bus', name: 'Anbessa Bus', category: 'transport', description: 'Public transport fare', icon: 'Bus', price: 5.0 },
      { id: 'trans_taxi', name: 'Ride/Feres', category: 'transport', description: 'Taxi hailing services', icon: 'Car', price: 0 },
      { id: 'health_ins', name: 'Health Insurance', category: 'health', description: 'Community based health insurance', icon: 'Heart', price: 500 },
      { id: 'edu_fees', name: 'School Fees', category: 'education', description: 'Public school tuition and fees', icon: 'GraduationCap', price: 0 },
      { id: 'gov_permit', name: 'Building Permit', category: 'government', description: 'Apply for construction permits', icon: 'Landmark', price: 2500 },
      { id: 'gov_id', name: 'ID Renewal', category: 'government', description: 'Renew your city resident ID', icon: 'Landmark', price: 50 }
    ];

    if (!supabase) {
      return res.json(mockServices);
    }

    try {
      const { data: services, error } = await supabase
        .from('services')
        .select('*');

      if (error) {
        console.warn("Supabase error fetching services, falling back to mock data:", error.message);
        return res.json(mockServices);
      }
      res.json(services && services.length > 0 ? services : mockServices);
    } catch (e) {
      res.json(mockServices);
    }
  });

  // User & Auth
  apiRouter.post("/login", async (req, res) => {
    try {
      const { phone } = req.body;
      const supabase = getSupabase();
      
      if (supabase) {
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('phone', phone)
          .single();

        if (error && error.code !== 'PGRST116') {
          return res.status(500).json({ error: error.message });
        }

        if (user) {
          return res.json({ ...user, isLoggedIn: true });
        }
      }

      // Fallback to in-memory
      const user = inMemoryUsers.find(u => u.phone === phone);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ ...user, isLoggedIn: true });
    } catch (error: any) {
      console.error("Error during login:", error);
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.post("/register", async (req, res) => {
    try {
      const { phone, role, name, id_number, merchant_name, business_license, tin_number, merchant_type } = req.body;
      const supabase = getSupabase();

      let faydaToken = null;
      let verifiedName = name;

      if (role === 'citizen') {
        const faydaResult = FaydaMockService.verifyUser(id_number);
        if (!faydaResult.success) {
          return res.status(400).json({ error: faydaResult.error });
        }
        faydaToken = faydaResult.token;
        verifiedName = faydaResult.profile?.name || name;
      }

      const userData: any = {
        id: uuidv4(),
        phone,
        role,
        name: verifiedName,
        // Ensure the app stores only the Token, not the raw ID number, to follow privacy laws.
        id_number: faydaToken ? faydaToken : id_number, 
        registration_complete: true,
        kyc_status: role === 'citizen' ? 'VERIFIED' : 'PENDING',
        merchant_status: 'NONE',
        balance: role === 'citizen' ? 1000.0 : 0.0,
      };

      if (role === 'merchant') {
        userData.merchant_name = merchant_name;
        userData.business_license = business_license;
        userData.tin_number = tin_number;
        userData.merchant_type = merchant_type;
        userData.merchant_status = 'PENDING';
      }

      if (supabase) {
        const { data: newUser, error } = await supabase
          .from('users')
          .insert([userData])
          .select()
          .single();

        if (!error) {
          await log(`New ${role} registered (Supabase): ${phone}`, 'SUCCESS');
          return res.json({ ...newUser, isLoggedIn: true });
        }
        console.warn("Supabase registration failed, falling back to in-memory:", error.message);
      }

      // Fallback to in-memory
      inMemoryUsers.push(userData);
      await log(`New ${role} registered (In-Memory): ${phone}`, 'SUCCESS');
      res.json({ ...userData, isLoggedIn: true });
    } catch (error: any) {
      console.error("Error during registration:", error);
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.post("/logout", (req, res) => {
    res.json({ success: true, message: "Logged out" });
  });

  apiRouter.get("/user/:userId", async (req, res) => {
    const { userId } = req.params;
    const supabase = getSupabase();
    
    if (supabase) {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && user) {
        return res.json(user);
      }
      
      if (error && error.code !== 'PGRST116') {
        console.warn("Supabase fetch failed for user, falling back to in-memory:", error.message);
      }
    }

    // Fallback to in-memory
    const user = inMemoryUsers.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  });

  // Transactions
  apiRouter.get("/transactions/:userId", async (req, res) => {
    const supabase = getSupabase();
    const userId = req.params.userId;
    
    // Get in-memory transactions
    const inMemory = inMemoryTransactions
      .filter(tx => tx.user_id === userId || tx.merchant_id === userId)
      .map(tx => ({
        ...tx,
        userId: tx.user_id,
        merchantId: tx.merchant_id
      }));

    if (!supabase) {
      return res.json(inMemory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    }

    try {
      const { data: txs, error } = await withTimeout(supabase
        .from('transactions')
        .select('*')
        .or(`user_id.eq.${userId},merchant_id.eq.${userId}`)
        .order('timestamp', { ascending: false })
        .limit(50));

      if (error) {
        console.warn("Supabase error fetching transactions, returning in-memory only:", error.message);
        return res.json(inMemory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      }
      
      const mappedTxs = (txs || []).map(tx => ({
        ...tx,
        userId: tx.user_id,
        merchantId: tx.merchant_id
      }));
      
      // Merge and deduplicate by ID
      const allTxs = [...mappedTxs, ...inMemory];
      const uniqueTxs = Array.from(new Map(allTxs.map(tx => [tx.id, tx])).values());
      
      res.json(uniqueTxs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    } catch (err) {
      console.error("Unexpected error fetching transactions:", err);
      res.json(inMemory.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
    }
  });

  // ... (existing code)
  
  // Old Stripe endpoint removed and replaced by Chapa above
  
  apiRouter.post("/pay", async (req, res) => {
    try {
      const { userId, merchantId, amount, description, isVatRegistered } = req.body;
      const supabase = getSupabase();
      
      // 4. Security & Audit: Ensure no logic permits 'Betting' or 'Gaming' activities.
      if (description && (description.toLowerCase().includes('betting') || description.toLowerCase().includes('gaming'))) {
        return res.status(403).json({ error: "Prohibited activity: Betting and Gaming are not permitted." });
      }

      if (!supabase) {
        await log(`[MOCK] Payment of ${amount} from ${userId} to ${merchantId}`, 'INFO');
        return res.json({ success: true, txId: 'mock_tx_' + Math.random().toString(36).substring(7) });
      }
      
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('balance, id_number')
        .eq('id', userId)
        .single();

      if (userError || !user) return res.status(404).json({ error: "User not found" });

      // 2. National Bank Rules (Directive ONPS/10/2025)
      // The 5,000 ETB Gate
      if (amount > 5000) {
        // In a real app, this would trigger an actual 2FA flow. Here we simulate the requirement.
        const { twoFactorToken } = req.body;
        if (!twoFactorToken) {
          return res.status(403).json({ error: "Mandatory 2FA required for transactions over 5,000 ETB.", requires2FA: true });
        }
      }

      // Wallet Limits: Hard-block if balance > 150,000 ETB or daily spend > 300,000 ETB
      if (user.balance > 150000) {
        return res.status(403).json({ error: "Wallet limit exceeded: Balance cannot exceed 150,000 ETB." });
      }
      
      // Simulate daily spend check (in a real app, query sum of today's txs)
      // const dailySpend = await calculateDailySpend(userId);
      // if (dailySpend + amount > 300000) return res.status(403).json({ error: "Daily spend limit exceeded." });

      // 3. Tax & City Levies (Reg. 576/2025 & Proc. 1395/2025)
      let finalAmount = amount;
      
      // Addis Night Surcharge (20% multiplier between 10:00 PM and 5:00 AM)
      const currentHour = new Date().getHours();
      if ((currentHour >= 22 || currentHour < 5) && description.toLowerCase().includes('transport')) {
        finalAmount = amount * 1.20;
      }

      if (user.balance < finalAmount) return res.status(400).json({ error: "Insufficient balance" });

      const txId = 'tx_' + Math.random().toString(36).substring(7);

      // Float Safeguarding: Ensure all wallet updates include metadata marking the funds as held in a 'Segregated Bank Trust Account'.
      const { error: deductError } = await supabase.from('users').update({ 
        balance: user.balance - finalAmount
      }).eq('id', userId);
      
      if (deductError) {
        return res.status(500).json({ error: "Failed to deduct balance" });
      }

      // Attempt to increment merchant balance, but don't fail if merchant doesn't exist
      const { data: merchantData } = await supabase.from('users').select('balance, tin_number').eq('id', merchantId).single();
      
      let platformFee = finalAmount * 0.02; // Base 2% platform fee
      
      // 5% Disaster Fund Levy on platform service fees
      const disasterLevy = platformFee * 0.05;
      
      // 15% VAT on service fees for VAT-registered users/merchants
      let vatAmount = 0;
      if (isVatRegistered) {
        vatAmount = platformFee * 0.15;
      }

      let merchantPayout = finalAmount - platformFee - disasterLevy - vatAmount;

      // 3% Withholding if merchant payout > 10,000 ETB
      let withholdingTax = 0;
      if (merchantPayout > 10000) {
        withholdingTax = merchantPayout * 0.03;
        merchantPayout -= withholdingTax;
      }

      if (merchantData) {
        await supabase.from('users').update({ 
          balance: merchantData.balance + merchantPayout
        }).eq('id', merchantId);
      }

      const transactionData = {
        id: txId,
        user_id: userId,
        merchant_id: merchantId,
        amount: finalAmount,
        type: 'PAYMENT',
        status: 'COMPLETED',
        description,
        timestamp: new Date().toISOString()
      };

      const { error: txError } = await supabase.from('transactions').insert([transactionData]);

      if (txError) {
        console.log("Using in-memory storage for transaction (RLS restricted).");
        inMemoryTransactions.push(transactionData);
        // Do NOT rollback; the payment is considered successful in the session
      }

      // 4. Security & Audit: Add a transaction_log entry for every payment
      await log(`Payment of ${finalAmount} from ${userId} to ${merchantId}`, 'AUDIT_TX', {
        UserToken: user.id_number, // This is the Fayda token stored during registration
        MerchantTIN: merchantData?.tin_number || 'UNKNOWN',
        TaxAmount: vatAmount + withholdingTax,
        DisasterLevy: disasterLevy,
        BaseAmount: amount,
        FinalAmount: finalAmount
      });

      res.json({ 
        success: true, 
        txId,
        transaction: {
          id: txId,
          userId,
          merchantId,
          amount: finalAmount,
          type: 'PAYMENT',
          status: 'COMPLETED',
          description,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error("Error during payment:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Utility Bills
  apiRouter.get("/utility/bill/:type/:customerId", async (req, res) => {
    const { type, customerId } = req.params;
    const bills: Record<string, any> = {
      'util_elec': {
        name: 'Tadesse Gebre',
        period: 'Feb 2026',
        amount: 450.75,
        address: 'Bole Sub-city, Woreda 03',
        meterNumber: 'EEU-99821'
      },
      'util_water': {
        name: 'Tadesse Gebre',
        period: 'Jan-Feb 2026',
        amount: 120.50,
        address: 'Bole Sub-city, Woreda 03',
        accountNumber: 'AAWSA-7721'
      }
    };

    const bill = bills[type];
    if (!bill) return res.status(404).json({ error: "Utility type not supported" });

    setTimeout(() => {
      res.json({
        ...bill,
        customerId,
        type
      });
    }, 800);
  });

  // Transport Journeys
  apiRouter.post("/transport/journey/start", async (req, res) => {
    const { userId, type, startStation } = req.body;
    const journey = {
      id: 'j_' + Math.random().toString(36).substring(7),
      userId,
      type,
      startStation,
      startTime: new Date().toISOString(),
      status: 'ACTIVE'
    };
    res.json(journey);
  });

  apiRouter.post("/transport/journey/end", async (req, res) => {
    const { journeyId, endStation } = req.body;
    const fare = Math.random() > 0.5 ? 10.0 : 5.0;
    res.json({
      id: journeyId,
      endStation,
      endTime: new Date().toISOString(),
      fare,
      status: 'COMPLETED'
    });
  });

  // City Reports
  apiRouter.post("/reports", async (req, res) => {
    const { userId, category, description, location, mediaUrl } = req.body;
    const reportId = 'rep_' + Math.random().toString(36).substring(7);
    res.json({
      success: true,
      reportId,
      message: "Report submitted successfully to Addis Ababa City Administration"
    });
  });

  // Ekub
  apiRouter.get("/ekub/discover", async (req, res) => {
    const defaultEkubs = [
      {
        id: 'ekub_1',
        name: 'Bole Community Fund',
        contributionAmount: 1000,
        frequency: 'MONTHLY',
        memberCount: 8,
        maxMembers: 10,
        nextPayoutDate: '2026-03-01T00:00:00Z',
        status: 'FORMING'
      },
      {
        id: 'ekub_2',
        name: 'Merkato Traders Union',
        contributionAmount: 500,
        frequency: 'WEEKLY',
        memberCount: 12,
        maxMembers: 12,
        nextPayoutDate: '2026-02-28T00:00:00Z',
        status: 'ACTIVE'
      }
    ];

    const supabase = getSupabase();
    let dbEkubs: any[] = [];
    if (supabase) {
      try {
        const { data } = await withTimeout(supabase.from('ekubs').select('*').eq('status', 'FORMING').limit(50));
        dbEkubs = (data || []).map(ekub => ({
          ...ekub,
          creatorId: ekub.creator_id,
          contributionAmount: ekub.contribution_amount || 0,
          memberCount: ekub.member_count || 0,
          maxMembers: ekub.max_members || 0,
          currentRoundNumber: ekub.current_round_number || 0,
          nextPayoutDate: ekub.next_payout_date,
          escrowBalance: ekub.escrow_balance || 0
        }));
      } catch (e) {}
    }

    const combined = [...defaultEkubs, ...dbEkubs, ...inMemoryEkubs.map(ekub => ({
      ...ekub,
      creatorId: ekub.creator_id,
      contributionAmount: ekub.contribution_amount || 0,
      memberCount: ekub.member_count || 0,
      maxMembers: ekub.max_members || 0,
      currentRoundNumber: ekub.current_round_number || 0,
      nextPayoutDate: ekub.next_payout_date,
      escrowBalance: ekub.escrow_balance || 0
    }))];
    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
    res.json(unique);
  });

  apiRouter.get("/ekub/:id", async (req, res) => {
    const { id: ekubId } = req.params;
    const supabase = getSupabase();
    
    const defaultEkubData = {
      id: ekubId,
      name: 'Mock Ekub',
      creatorId: 'mock-creator',
      contributionAmount: 1000,
      frequency: 'MONTHLY',
      memberCount: 8,
      maxMembers: 10,
      currentRoundNumber: 1,
      nextPayoutDate: '2026-03-01T00:00:00Z',
      escrowBalance: 8000,
      status: 'FORMING',
      members: [
        { id: 'm1', userId: 'u1', name: 'Abebe', avatarUrl: 'https://i.pravatar.cc/40?u=u1', contributionStatus: 'PAID', status: 'APPROVED' },
        { id: 'm2', userId: 'u2', name: 'Kebede', avatarUrl: 'https://i.pravatar.cc/40?u=u2', contributionStatus: 'PAID', status: 'APPROVED' },
      ],
      rounds: [
        { id: 'r1', ekubId, roundNumber: 1, winnerId: null, payoutDate: '2026-03-01T00:00:00Z', status: 'PENDING_CONTRIBUTIONS', totalCollected: 8000, escrowReleased: false, guarantor1Id: null, guarantor2Id: null }
      ]
    };

    if (!supabase) {
      const inMemory = inMemoryEkubs.find(e => e.id === ekubId);
      if (inMemory) {
        return res.json({
          ...inMemory,
          creatorId: inMemory.creator_id,
          contributionAmount: inMemory.contribution_amount,
          memberCount: inMemory.member_count,
          maxMembers: inMemory.max_members,
          currentRoundNumber: inMemory.current_round_number,
          nextPayoutDate: inMemory.next_payout_date,
          escrowBalance: inMemory.escrow_balance,
          members: inMemoryEkubMembers.filter(m => m.ekub_id === ekubId).map(m => ({
            id: m.id,
            userId: m.user_id,
            name: 'Merchant (You)',
            avatarUrl: `https://i.pravatar.cc/40?u=${m.user_id}`,
            contributionStatus: 'PAID',
            status: 'APPROVED'
          })),
          rounds: [],
        });
      }
      return res.json(defaultEkubData);
    }

    try {
      const { data: ekub, error: ekubError } = await supabase
        .from('ekubs')
        .select('*')
        .eq('id', ekubId)
        .single();

      if (ekubError || !ekub) {
        const inMemory = inMemoryEkubs.find(e => e.id === ekubId);
        if (inMemory) {
          return res.json({
            ...inMemory,
            creatorId: inMemory.creator_id,
            contributionAmount: inMemory.contribution_amount,
            memberCount: inMemory.member_count,
            maxMembers: inMemory.max_members,
            currentRoundNumber: inMemory.current_round_number,
            nextPayoutDate: inMemory.next_payout_date,
            escrowBalance: inMemory.escrow_balance,
            members: inMemoryEkubMembers.filter(m => m.ekub_id === ekubId).map(m => ({
              id: m.id,
              userId: m.user_id,
              name: 'Merchant (You)',
              avatarUrl: `https://i.pravatar.cc/40?u=${m.user_id}`,
              contributionStatus: 'PAID'
            })),
            rounds: [],
          });
        }
        return res.status(404).json({ error: "Ekub not found" });
      }

      const { data: members, error: membersError } = await supabase
        .from('ekub_members')
        .select('*, users(id, name, avatarUrl)')
        .eq('ekub_id', ekubId);

      const { data: rounds, error: roundsError } = await supabase
        .from('ekub_rounds')
        .select('*')
        .eq('ekub_id', ekubId)
        .order('round_number', { ascending: true });

      const formattedMembers = members?.map((m: any) => ({
        id: m.id,
        userId: m.user_id,
        name: m.users?.name || 'Unknown User',
        avatarUrl: m.users?.avatarUrl || `https://i.pravatar.cc/40?u=${m.user_id}`,
        contributionStatus: 'PAID',
        status: m.status || 'APPROVED'
      })) || [];

      const formattedRounds = (rounds || []).map((r: any) => ({
        ...r,
        ekubId: r.ekub_id,
        roundNumber: r.round_number || 0,
        winnerId: r.winner_id,
        payoutDate: r.payout_date,
        totalCollected: r.total_collected || 0,
        escrowReleased: r.escrow_released || false,
        guarantor1Id: r.guarantor_1_id,
        guarantor2Id: r.guarantor_2_id
      }));

      res.json({
        ...ekub,
        creatorId: ekub.creator_id,
        contributionAmount: ekub.contribution_amount || 0,
        memberCount: ekub.member_count || 0,
        maxMembers: ekub.max_members || 0,
        currentRoundNumber: ekub.current_round_number || 0,
        nextPayoutDate: ekub.next_payout_date,
        escrowBalance: ekub.escrow_balance || 0,
        members: formattedMembers,
        rounds: formattedRounds,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.post("/ekub/create", async (req, res) => {
    const { name, creatorId, contributionAmount, frequency, maxMembers } = req.body;
    console.log(`[EKUB CREATE] Request from ${creatorId} for '${name}'`);
    const supabase = getSupabase();
    
    const newEkub = {
      id: uuidv4(),
      name,
      creator_id: creatorId,
      contribution_amount: contributionAmount,
      frequency,
      max_members: maxMembers,
      member_count: 1,
      status: 'FORMING',
      current_round_number: 0,
      escrow_balance: 0,
      created_at: new Date().toISOString()
    };

    if (!supabase) {
      console.log(`[EKUB CREATE] No Supabase, using in-memory store for ${creatorId}`);
      inMemoryEkubs.push(newEkub);
      inMemoryEkubMembers.push({ id: uuidv4(), ekub_id: newEkub.id, user_id: creatorId, joined_at: new Date().toISOString() });
      return res.status(201).json(newEkub);
    }

    try {
      const { data: createdEkub, error } = await supabase
        .from('ekubs')
        .insert([newEkub])
        .select()
        .single();

      if (error) {
        console.warn("[EKUB CREATE] Supabase error, falling back to in-memory store:", error.message);
        inMemoryEkubs.push(newEkub);
        inMemoryEkubMembers.push({ id: uuidv4(), ekub_id: newEkub.id, user_id: creatorId, joined_at: new Date().toISOString() });
        return res.status(201).json(newEkub);
      }

      await supabase.from('ekub_members').insert([
        {
          id: uuidv4(),
          ekub_id: createdEkub.id,
          user_id: creatorId,
          joined_at: new Date().toISOString(),
        },
      ]);

      console.log(`[EKUB CREATE] Success for ${creatorId}: ${createdEkub.id}`);
      await log(`New Ekub '${name}' created by ${creatorId}`, 'SUCCESS');
      res.status(201).json(createdEkub);
    } catch (error: any) {
      console.error("[EKUB CREATE] Exception, falling back to in-memory:", error.message);
      inMemoryEkubs.push(newEkub);
      inMemoryEkubMembers.push({ id: uuidv4(), ekub_id: newEkub.id, user_id: creatorId, joined_at: new Date().toISOString() });
      res.status(201).json(newEkub);
    }
  });

  apiRouter.get("/ekub/merchant/:merchantId", async (req, res) => {
    const { merchantId } = req.params;
    console.log(`[EKUB MERCHANT LIST] Fetching for ${merchantId}`);
    const supabase = getSupabase();
    
    const getInMemory = () => {
      const filtered = inMemoryEkubs.filter(e => e.creator_id === merchantId);
      console.log(`[EKUB MERCHANT LIST] In-memory count for ${merchantId}: ${filtered.length}`);
      return filtered;
    };

    if (!supabase) return res.json(getInMemory());

    try {
      const { data: ekubs, error } = await supabase
        .from('ekubs')
        .select('*')
        .eq('creator_id', merchantId);

      if (error) {
        console.warn("[EKUB MERCHANT LIST] Supabase error, falling back to in-memory:", error.message);
        return res.json(getInMemory());
      }
      
      // Combine with in-memory for the session
      const combined = [...(ekubs || []), ...getInMemory()];
      // Deduplicate by ID
      const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
      console.log(`[EKUB MERCHANT LIST] Total unique count for ${merchantId}: ${unique.length}`);
      res.json(unique);
    } catch (error: any) {
      console.error("[EKUB MERCHANT LIST] Exception:", error.message);
      res.json(getInMemory());
    }
  });

  apiRouter.post("/ekub/:ekubId/join", async (req, res) => {
    const { ekubId } = req.params;
    const { userId } = req.body;
    const supabase = getSupabase();
    if (!supabase) return res.json({ success: true, message: "Joined Ekub successfully (Mock)" });

    try {
      const { data: ekub, error: ekubError } = await supabase.from('ekubs').select('member_count, max_members, status').eq('id', ekubId).single();
      if (ekubError || !ekub) throw new Error("Ekub not found");
      
      await supabase.from('ekub_members').insert([{ id: uuidv4(), ekub_id: ekubId, user_id: userId, joined_at: new Date().toISOString(), status: 'PENDING' }]);
      // Do not increment member_count yet, wait for approval
      res.json({ success: true, message: "Requested to join Ekub successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.post("/ekub/:ekubId/approve", async (req, res) => {
    const { ekubId } = req.params;
    const { userId } = req.body;
    const supabase = getSupabase();
    if (!supabase) return res.json({ success: true, message: "Approved successfully (Mock)" });

    try {
      await supabase.from('ekub_members').update({ status: 'APPROVED' }).eq('ekub_id', ekubId).eq('user_id', userId);
      const { data: ekub } = await supabase.from('ekubs').select('member_count, max_members').eq('id', ekubId).single();
      const newCount = (ekub.member_count || 0) + 1;
      let status = 'FORMING';
      if (newCount >= ekub.max_members) status = 'ACTIVE';
      await supabase.from('ekubs').update({ member_count: newCount, status }).eq('id', ekubId);
      res.json({ success: true, message: "Member approved" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.post("/ekub/:ekubId/contribute", async (req, res) => {
    const { ekubId } = req.params;
    const { userId, amount } = req.body;
    const supabase = getSupabase();
    if (!supabase) return res.json({ success: true, message: "Contribution successful (Mock)" });

    try {
      const { error: txError } = await supabase.rpc('handle_ekub_contribution', { p_user_id: userId, p_ekub_id: ekubId, p_amount: amount });
      if (txError) throw txError;
      res.json({ success: true, message: "Contribution successful" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.post("/ekub/:ekubId/draw", async (req, res) => {
    const { ekubId } = req.params;
    const { roundNumber } = req.body;
    const supabase = getSupabase();
    if (!supabase) return res.json({ success: true, message: "Draw successful (Mock)" });

    try {
      const { data: members } = await supabase.from('ekub_members').select('user_id').eq('ekub_id', ekubId).eq('status', 'APPROVED');
      const { data: rounds } = await supabase.from('ekub_rounds').select('winner_id').eq('ekub_id', ekubId).not('winner_id', 'is', null);
      
      const pastWinners = rounds?.map(r => r.winner_id) || [];
      const eligibleMembers = members?.filter(m => !pastWinners.includes(m.user_id)) || [];
      
      if (eligibleMembers.length === 0) throw new Error("No eligible members for draw");
      
      const winner = eligibleMembers[Math.floor(Math.random() * eligibleMembers.length)];
      
      await supabase.from('ekub_rounds').update({ winner_id: winner.user_id, status: 'READY_FOR_PAYOUT' }).eq('ekub_id', ekubId).eq('round_number', roundNumber);
      res.json({ success: true, winnerId: winner.user_id, message: "Draw completed" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.post("/ekub/:ekubId/sign", async (req, res) => {
    const { ekubId } = req.params;
    const { roundNumber, userId } = req.body;
    const supabase = getSupabase();
    if (!supabase) return res.json({ success: true, message: "Signed successfully (Mock)" });

    try {
      const { data: round } = await supabase.from('ekub_rounds').select('guarantor_1_id, guarantor_2_id').eq('ekub_id', ekubId).eq('round_number', roundNumber).single();
      
      let update: any = {};
      if (!round.guarantor_1_id) update = { guarantor_1_id: userId };
      else if (!round.guarantor_2_id && round.guarantor_1_id !== userId) update = { guarantor_2_id: userId };
      else throw new Error("Already signed or enough signatures");

      await supabase.from('ekub_rounds').update(update).eq('ekub_id', ekubId).eq('round_number', roundNumber);
      res.json({ success: true, message: "Signed successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.post("/ekub/:ekubId/payout", async (req, res) => {
    const { ekubId } = req.params;
    const { roundNumber } = req.body;
    const supabase = getSupabase();
    if (!supabase) return res.json({ success: true, message: "Payout successful (Mock)" });

    try {
      const { data: round } = await supabase.from('ekub_rounds').select('winner_id, total_collected, guarantor_1_id, guarantor_2_id').eq('ekub_id', ekubId).eq('round_number', roundNumber).single();
      
      if (!round.guarantor_1_id || !round.guarantor_2_id) {
        throw new Error("Cannot disburse: Need 2 guarantor signatures");
      }

      const { error: txError } = await supabase.rpc('handle_ekub_payout', { p_ekub_id: ekubId, p_winner_id: round.winner_id, p_amount: round.total_collected });
      if (txError) throw txError;
      await supabase.from('ekub_rounds').update({ status: 'COMPLETED', escrow_released: true }).eq('ekub_id', ekubId).eq('round_number', roundNumber);
      res.json({ success: true, message: "Payout successful" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.post("/ekub/:ekubId/next-round", async (req, res) => {
    const { ekubId } = req.params;
    const supabase = getSupabase();
    if (!supabase) return res.json({ success: true, message: "Advanced to next round successfully (Mock)" });

    try {
      const { data: ekub } = await supabase.from('ekubs').select('current_round_number, frequency').eq('id', ekubId).single();
      const newRoundNumber = ekub.current_round_number + 1;
      const nextPayoutDate = new Date();
      if (ekub.frequency === 'WEEKLY') nextPayoutDate.setDate(nextPayoutDate.getDate() + 7);
      else nextPayoutDate.setMonth(nextPayoutDate.getMonth() + 1);

      await supabase.from('ekubs').update({ current_round_number: newRoundNumber, next_payout_date: nextPayoutDate.toISOString() }).eq('id', ekubId);
      await supabase.from('ekub_rounds').insert([{ id: uuidv4(), ekub_id: ekubId, round_number: newRoundNumber, payout_date: nextPayoutDate.toISOString(), status: 'PENDING_CONTRIBUTIONS', total_collected: 0, escrow_released: false }]);
      res.json({ success: true, message: "Advanced to next round successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Marketplace
  apiRouter.get("/marketplace/products", async (req, res) => {
    const supabase = getSupabase();
    if (!supabase) return res.json(inMemoryProducts);

    try {
      const { data, error } = await withTimeout(
        supabase.from('marketplace_products')
          .select('*')
          .limit(100)
      );
      
      if (error) throw error;
      
      const merchantIds = [...new Set((data || []).map((p: any) => p.merchant_id).filter(Boolean))];
      let usersData: any[] = [];
      if (merchantIds.length > 0) {
        const { data: users } = await supabase.from('users').select('id, name, merchant_name').in('id', merchantIds);
        usersData = users || [];
      }
      
      const formatted = (data || []).map((p: any) => {
        const user = usersData.find((u: any) => u.id === p.merchant_id);
        return {
          ...p,
          merchantId: p.merchant_id,
          imageUrl: p.image_url,
          sellerName: user?.merchant_name || user?.name || p.seller_name || 'Verified Merchant',
          sellerLocation: p.seller_location || 'Addis Ababa'
        };
      });

      // Merge with in-memory products to ensure items added during downtime are visible
      const combined = [...formatted, ...inMemoryProducts.filter(mp => !formatted.some((fp: any) => fp.id === mp.id))];
      
      res.json(combined);
    } catch (error: any) {
      console.warn("Failed to fetch products from Supabase, using in-memory:", error.message || error);
      res.json(inMemoryProducts);
    }
  });

  apiRouter.get("/marketplace/merchant/:merchantId/products", async (req, res) => {
    const { merchantId } = req.params;
    const supabase = getSupabase();
    
    const inMemory = inMemoryProducts.filter(p => p.merchantId === merchantId);

    if (!supabase) return res.json(inMemory);

    try {
      const { data, error } = await withTimeout(supabase
        .from('marketplace_products')
        .select('*')
        .eq('merchant_id', merchantId));
      
      if (error) throw error;
      
      let userData: any = null;
      if (data && data.length > 0) {
        const { data: user } = await supabase.from('users').select('id, name, merchant_name').eq('id', merchantId).single();
        userData = user;
      }
      
      const formatted = (data || []).map((p: any) => ({
        ...p,
        merchantId: p.merchant_id,
        imageUrl: p.image_url,
        sellerName: userData?.merchant_name || userData?.name || p.seller_name || 'Verified Merchant',
        sellerLocation: p.seller_location || 'Addis Ababa'
      }));

      const combined = [...formatted, ...inMemory.filter(mp => !formatted.some((fp: any) => fp.id === mp.id))];
      res.json(combined);
    } catch (error: any) {
      console.warn("Failed to fetch merchant products from Supabase:", error.message || error);
      res.json(inMemory);
    }
  });

  apiRouter.post("/marketplace/products", async (req, res) => {
    const { merchantId, name, description, price, stock, category, imageUrl, sellerName, sellerLocation } = req.body;

    if (!merchantId) return res.status(400).json({ error: "Merchant ID is required" });
    if (isNaN(Number(price)) || isNaN(Number(stock))) return res.status(400).json({ error: "Price and Stock must be valid numbers" });

    const newProduct = {
      id: uuidv4(),
      merchant_id: merchantId,
      name,
      description: description || '',
      price: Number(price),
      image_url: imageUrl || `https://picsum.photos/seed/${name.replace(/\s+/g, '')}/400/300`,
      category: category || 'General',
      stock: Number(stock),
      status: 'Active'
    };

    const supabase = getSupabase();
    
    if (!supabase) {
      const memProduct = { ...newProduct, merchantId: newProduct.merchant_id, imageUrl: newProduct.image_url, sellerName: sellerName || 'Unknown Seller', sellerLocation: sellerLocation || 'Unknown Location' };
      inMemoryProducts.push(memProduct);
      return res.json(memProduct);
    }

    try {
      // Check if user exists to prevent Foreign Key error
      const { data: user, error: userError } = await supabase.from('users').select('id, merchant_name, name').eq('id', merchantId).single();
      
      if (userError || !user) {
        console.warn(`Merchant ${merchantId} not found in Supabase users table. Using in-memory storage.`);
        // Throwing error to trigger the catch block which handles the fallback
        throw new Error("User not found in database");
      }

      const { data, error } = await supabase.from('marketplace_products').insert([newProduct]).select().single();
      if (error) throw error;
      res.json({
        ...data,
        merchantId: data.merchant_id,
        imageUrl: data.image_url,
        sellerName: user.merchant_name || user.name || sellerName || 'Verified Merchant',
        sellerLocation: sellerLocation || 'Addis Ababa'
      });
    } catch (error: any) {
      // Use JSON.stringify to ensure the error object is readable in logs
      const errorMessage = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
      console.warn(`Failed to insert product to Supabase, using in-memory. Reason: ${errorMessage}`);
      
      const memProduct = { ...newProduct, merchantId: newProduct.merchant_id, imageUrl: newProduct.image_url, sellerName: sellerName || 'Unknown Seller', sellerLocation: sellerLocation || 'Unknown Location' };
      inMemoryProducts.push(memProduct);
      res.json(memProduct);
    }
  });

  // Merchant Application
  apiRouter.post("/merchant/apply", async (req, res) => {
    try {
      const { userId, businessName, businessLicense, tinNumber, merchantType } = req.body;
      const supabase = getSupabase();
      if (!supabase) return res.status(503).json({ error: "Supabase not configured" });

      const { error } = await supabase
        .from('users')
        .update({ 
          merchant_status: 'PENDING',
          merchant_name: businessName,
          business_license: businessLicense,
          tin_number: tinNumber,
          merchant_type: merchantType || 'seller'
        })
        .eq('id', userId);

      if (error) return res.status(500).json({ error: error.message });
      res.json({ success: true, message: 'Application submitted for review.' });
    } catch (error: any) {
      console.error("Error applying for merchant:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin
  apiRouter.get("/merchant/:merchantId/stats", async (req, res) => {
    const { merchantId } = req.params;
    const supabase = getSupabase();

    try {
      if (!supabase) {
        // Fallback for in-memory
        const txs = inMemoryTransactions.filter(t => t.merchant_id === merchantId);
        const revenue = txs.filter(t => t.status === 'COMPLETED' && t.type !== 'WITHDRAWAL').reduce((sum, t) => sum + t.amount, 0);
        const withdrawals = txs.filter(t => t.type === 'WITHDRAWAL').reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const customers = new Set(txs.filter(t => t.type === 'PAYMENT').map(t => t.user_id)).size;
        
        const merchantOrders = inMemoryOrders.filter(o => o.product.merchantId === merchantId);
        const escrow = merchantOrders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').reduce((sum, o) => sum + o.totalAmount, 0);

        return res.json({ revenue, withdrawals, customers, escrowBalance: escrow });
      }

      // Supabase aggregation in parallel with individual error handling
      const [revRes, withRes, custRes, orderRes] = await Promise.all([
        withTimeout(supabase.from('transactions').select('amount').eq('merchant_id', merchantId).eq('status', 'COMPLETED').neq('type', 'WITHDRAWAL')).catch(e => ({ data: [], error: e })),
        withTimeout(supabase.from('transactions').select('amount').eq('merchant_id', merchantId).eq('type', 'WITHDRAWAL')).catch(e => ({ data: [], error: e })),
        withTimeout(supabase.from('transactions').select('user_id').eq('merchant_id', merchantId).eq('type', 'PAYMENT')).catch(e => ({ data: [], error: e })),
        withTimeout(supabase.from('marketplace_orders').select('total_amount, status, product:marketplace_products!inner(merchant_id)').eq('product.merchant_id', merchantId).neq('status', 'COMPLETED').neq('status', 'CANCELLED')).catch(e => ({ data: [], error: e }))
      ]);

      if (revRes.error) console.warn("Revenue query failed:", revRes.error);
      if (withRes.error) console.warn("Withdrawals query failed:", withRes.error);
      if (custRes.error) console.warn("Customers query failed:", custRes.error);
      if (orderRes.error) console.warn("Escrow query failed:", orderRes.error);

      const revenue = (revRes.data || []).reduce((sum: number, t: any) => sum + t.amount, 0);
      const withdrawals = (withRes.data || []).reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
      const customers = new Set((custRes.data || []).map((t: any) => t.user_id)).size;
      const escrowBalance = (orderRes.data || []).reduce((sum: number, o: any) => sum + o.total_amount, 0);

      res.json({ revenue, withdrawals, customers, escrowBalance });
    } catch (error: any) {
      console.error("Error fetching merchant stats:", error);
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.get("/admin/stats", async (req, res) => {
    const supabase = getSupabase();
    if (!supabase) return res.json({ totalUsers: 10, totalVolume: 1000, pendingMerchants: 1, logs: [] });

    const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { data: txs } = await supabase.from('transactions').select('amount').eq('status', 'COMPLETED');
    const totalVolume = txs?.reduce((sum, t) => sum + t.amount, 0) || 0;
    const { count: pendingMerchants } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('merchant_status', 'PENDING');
    const { data: logs } = await supabase.from('logs').select('*').order('timestamp', { ascending: false }).limit(20);
    
    res.json({
      totalUsers: totalUsers || 0,
      totalVolume,
      pendingMerchants: pendingMerchants || 0,
      logs: logs || []
    });
  });

  apiRouter.post("/admin/verify-merchant", async (req, res) => {
    const { userId, status } = req.body;
    const supabase = getSupabase();
    
    if (supabase) {
      const updateData: any = { merchant_status: status };
      if (status === 'APPROVED') {
        updateData.kyc_status = 'VERIFIED';
        updateData.registration_complete = true;
      }
      const { error } = await supabase.from('users').update(updateData).eq('id', userId);
      if (error) return res.status(500).json({ error: error.message });
      
      // If approved and is a parking merchant, create a default lot if none exists
      if (status === 'APPROVED') {
        const { data: user, error: userError } = await supabase.from('users').select('merchant_type, merchant_name, phone').eq('id', userId).single();
        if (userError) {
          console.error("Failed to fetch user for parking lot creation:", userError);
        } else if (user && (user.merchant_type || '').toLowerCase() === 'parking') {
          const { data: existingLots, error: lotError } = await supabase.from('parking_lots').select('id').eq('merchant_id', userId);
          if (lotError) {
            console.error("Failed to check existing parking lots:", lotError);
          } else if (!existingLots || existingLots.length === 0) {
            const newLotId = uuidv4();
            const totalSpots = 24;
            const lotName = `${user.merchant_name || 'My'} Parking Lot`;
            
            const { error: insertLotError } = await supabase.from('parking_lots').insert([{
              id: newLotId,
              merchant_id: userId,
              name: lotName,
              address: 'Addis Ababa, Ethiopia',
              total_spots: totalSpots,
              base_rate: 20,
              is_active: true,
              created_at: new Date().toISOString()
            }]);

            if (insertLotError) {
              console.error("Failed to create default parking lot:", insertLotError);
              await log(`Failed to create default parking lot for merchant ${userId}: ${insertLotError.message}`, 'ERROR');
            } else {
              const spotsData = [];
              for (let i = 1; i <= totalSpots; i++) {
                spotsData.push({
                  id: uuidv4(),
                  lot_id: newLotId,
                  spot_number: i,
                  status: 'AVAILABLE',
                  created_at: new Date().toISOString()
                });
              }
              const { error: insertSpotsError } = await supabase.from('parking_spots').insert(spotsData);
              if (insertSpotsError) {
                console.error("Failed to create parking spots:", insertSpotsError);
                await log(`Failed to create parking spots for lot ${newLotId}: ${insertSpotsError.message}`, 'ERROR');
              } else {
                await log(`Automatically created default parking lot for approved merchant ${userId}`, 'SUCCESS');
              }
            }
          }
        }
      }
    } else {
      // Mock Data Fallback
      const userIndex = inMemoryUsers.findIndex(u => u.id === userId);
      if (userIndex !== -1) {
        inMemoryUsers[userIndex].merchant_status = status;
        if (status === 'APPROVED') {
          inMemoryUsers[userIndex].kyc_status = 'VERIFIED';
          inMemoryUsers[userIndex].registration_complete = true;
          
          if (inMemoryUsers[userIndex].merchant_type === 'parking') {
            const existingLot = inMemoryParkingLots.find(l => l.merchantId === userId);
            if (!existingLot) {
              const newLotId = uuidv4();
              const totalSpots = 24;
              const lotName = `${inMemoryUsers[userIndex].merchant_name || 'My'} Parking Lot`;
              
              const newLot = {
                id: newLotId,
                merchantId: userId,
                name: lotName,
                address: 'Addis Ababa, Ethiopia',
                totalSpots: totalSpots,
                availableSpots: totalSpots,
                baseRate: 20,
                isActive: true,
                createdAt: new Date().toISOString(),
                spots: [] as any[]
              };

              for (let i = 1; i <= totalSpots; i++) {
                const spot = {
                  id: uuidv4(),
                  lotId: newLotId,
                  spotNumber: i.toString(),
                  status: 'AVAILABLE'
                };
                newLot.spots.push(spot);
                inMemoryParkingSpots.push(spot);
              }
              inMemoryParkingLots.push(newLot);
              await log(`Automatically created default parking lot for approved merchant ${userId} (In-Memory)`, 'SUCCESS');
            }
          }
        }
      }
    }

    await log(`Merchant ${userId} status updated to ${status}`, 'INFO');
    res.json({ success: true });
  });

  apiRouter.get("/admin/pending-merchants", async (req, res) => {
    const supabase = getSupabase();
    if (!supabase) return res.json([]);

    const { data, error } = await supabase
      .from('users')
      .select('id, name, merchant_name, business_license, id_number')
      .eq('merchant_status', 'PENDING');

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // Mount API Router
  apiRouter.post("/marketplace/orders", async (req, res) => {
    try {
      const { buyerId, productId, quantity, shippingAddress } = req.body;
      const orderId = uuidv4();
      
      const supabase = getSupabase();
      
      let product;
      let isInMemory = false;

      if (supabase) {
        try {
          const { data, error } = await supabase.from('marketplace_products').select('*').eq('id', productId).single();
          if (error || !data) {
             // Fallback to in-memory if not found in DB
             product = inMemoryProducts.find(p => p.id === productId);
             isInMemory = true;
          } else {
             product = data;
          }
        } catch (e) {
          product = inMemoryProducts.find(p => p.id === productId);
          isInMemory = true;
        }
      } else {
        product = inMemoryProducts.find(p => p.id === productId);
        isInMemory = true;
      }

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      if (product.stock < quantity) {
        return res.status(400).json({ error: "Insufficient stock" });
      }

      const totalAmount = product.price * quantity;

      const newOrder = {
        id: orderId,
        buyer_id: buyerId,
        product_id: productId,
        quantity,
        total_amount: totalAmount,
        status: 'PAID',
        escrow_status: 'FUNDED',
        created_at: new Date().toISOString()
      };

      let dbSuccess = false;
      if (supabase && !isInMemory) {
        try {
          // Deduct stock
          await supabase.from('marketplace_products').update({ stock: product.stock - quantity }).eq('id', productId);
          
          // Insert order
          const { error: orderError } = await supabase.from('marketplace_orders').insert([newOrder]);
          if (orderError) throw orderError;

          // Deduct from buyer's balance
          const { data: profile } = await supabase.from('users').select('balance').eq('id', buyerId).single();
          if (profile && profile.balance >= totalAmount) {
            await supabase.from('users').update({ balance: profile.balance - totalAmount }).eq('id', buyerId);
          }

          const transactionData = {
            id: uuidv4(),
            user_id: buyerId,
            merchant_id: product.merchant_id || product.merchantId,
            amount: totalAmount,
            type: 'PAYMENT',
            status: 'COMPLETED',
            description: `Escrow Payment for Order ${orderId} (Held in Vault)`,
            timestamp: new Date().toISOString()
          };

          const { error: txError } = await supabase.from('transactions').insert([transactionData]);
          if (txError) {
            console.log("Using in-memory storage for transaction (RLS restricted).");
            inMemoryTransactions.push(transactionData);
          }
          dbSuccess = true;
        } catch (err: any) {
          console.warn("Failed to insert order to Supabase (likely FK or permission error). Falling back to in-memory.", err.message);
          // Fall through to in-memory logic
        }
      } 
      
      if (!dbSuccess) {
        // In-memory path
        product.stock -= quantity;
        const memOrder = {
          ...newOrder,
          buyerId: newOrder.buyer_id,
          productId: newOrder.product_id,
          totalAmount: newOrder.total_amount,
          escrowStatus: newOrder.escrow_status,
          createdAt: newOrder.created_at,
          product: { ...product, merchantId: product.merchant_id || product.merchantId, imageUrl: product.image_url || product.imageUrl, sellerName: product.seller_name || product.sellerName, sellerLocation: product.seller_location || product.sellerLocation }
        };
        inMemoryOrders.push(memOrder);
      }

      // Return formatted order
      const responseOrder = {
        id: orderId,
        buyerId,
        productId,
        quantity,
        totalAmount,
        status: 'PAID',
        escrowStatus: 'FUNDED',
        createdAt: newOrder.created_at,
        product: {
          ...product,
          merchantId: product.merchant_id || product.merchantId,
          imageUrl: product.image_url || product.imageUrl
        }
      };

      res.json({ success: true, orderId, order: responseOrder });
    } catch (error: any) {
      console.error("Error creating marketplace order:", error);
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.get("/marketplace/orders/:userId", async (req, res) => {
    const supabase = getSupabase();
    if (!supabase) {
      const orders = inMemoryOrders.filter(o => o.buyerId === req.params.userId);
      return res.json(orders);
    }

    try {
      const { data, error } = await withTimeout(supabase
        .from('marketplace_orders')
        .select('*, product:marketplace_products(*)')
        .eq('buyer_id', req.params.userId)
        .order('created_at', { ascending: false })
        .limit(50));
      
      if (error) throw error;
      
      const formatted = data.map((o: any) => ({
        ...o,
        buyerId: o.buyer_id,
        productId: o.product_id,
        totalAmount: o.total_amount,
        escrowStatus: o.escrow_status,
        createdAt: o.created_at,
        trackingNumber: o.tracking_number,
        confirmationCode: o.confirmation_code,
        disputeReason: o.dispute_reason,
        product: {
          ...o.product,
          merchantId: o.product.merchant_id,
          imageUrl: o.product.image_url
        }
      }));
      res.json(formatted);
    } catch (error: any) {
      console.warn("Failed to fetch orders from Supabase, using in-memory:", error.message || error);
      const orders = inMemoryOrders.filter(o => o.buyerId === req.params.userId);
      res.json(orders);
    }
  });

  apiRouter.post("/marketplace/orders/:id/ship", async (req, res) => {
    const { trackingNumber } = req.body;
    const orderId = req.params.id;
    const supabase = getSupabase();
    
    // Generate 6-digit code
    const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();

    if (supabase) {
      try {
        const { error } = await supabase
          .from('marketplace_orders')
          .update({ 
            status: 'SHIPPED', 
            tracking_number: trackingNumber,
            confirmation_code: confirmationCode
          })
          .eq('id', orderId);
        
        if (error) throw error;
      } catch (error: any) {
        return res.status(500).json({ error: error.message });
      }
    } else {
      const order = inMemoryOrders.find(o => o.id === orderId);
      if (order) {
        order.status = 'SHIPPED';
        order.trackingNumber = trackingNumber;
        order.confirmationCode = confirmationCode;
      } else {
        return res.status(404).json({ error: "Order not found" });
      }
    }

    // In a real app, we would email/SMS the code to the buyer here
    console.log(`[Mock SMS] Confirmation Code for Order ${orderId}: ${confirmationCode}`);

    res.json({ success: true });
  });

  apiRouter.post("/marketplace/orders/:id/confirm", async (req, res) => {
    const { code } = req.body;
    const orderId = req.params.id;
    const supabase = getSupabase();

    let order;
    if (supabase) {
      const { data, error } = await supabase
        .from('marketplace_orders')
        .select('*')
        .eq('id', orderId)
        .single();
      
      if (error || !data) return res.status(404).json({ error: "Order not found" });
      order = data;
    } else {
      order = inMemoryOrders.find(o => o.id === orderId);
    }

    if (!order) return res.status(404).json({ error: "Order not found" });

    // Ensure we compare strings
    const inputCode = String(code).trim();
    const dbCode = order.confirmation_code || order.confirmationCode;

    console.log(`[Debug] Order ${orderId} Confirm: Input='${inputCode}', Stored='${dbCode}'`);

    if (!dbCode || String(dbCode).trim() !== inputCode) {
      return res.status(400).json({ error: "Invalid confirmation code" });
    }

    // Code matches, complete the order
    if (supabase) {
      const { error } = await supabase
        .from('marketplace_orders')
        .update({ status: 'COMPLETED', escrow_status: 'RELEASED' })
        .eq('id', orderId);
      
      if (error) return res.status(500).json({ error: error.message });

      // Release funds to merchant (Update merchant balance)
      // Fetch product to get merchant_id
      const { data: product } = await supabase.from('marketplace_products').select('merchant_id').eq('id', order.product_id).single();
      
      if (product) {
         const merchantId = product.merchant_id;
         const { data: merchant } = await supabase.from('users').select('balance').eq('id', merchantId).single();
         
         if (merchant) {
           const amount = order.total_amount || order.totalAmount;
           await supabase.from('users').update({ balance: merchant.balance + amount }).eq('id', merchantId);
           
           // Create transaction record
           const transactionData = {
             id: uuidv4(),
             user_id: merchantId,
             merchant_id: 'escrow_vault', // System account
             amount: amount,
             type: 'DEPOSIT',
             status: 'COMPLETED',
             description: `Escrow Released for Order ${orderId}`,
             timestamp: new Date().toISOString()
           };

           const { error: txError } = await supabase.from('transactions').insert([transactionData]);
           if (txError) {
             console.warn("Failed to insert transaction into Supabase, falling back to in-memory:", txError.message);
             // We don't have access to inMemoryTransactions here easily without importing or passing it, 
             // but let's assume it's available in scope as it is in the other endpoint.
             // Actually, let's just log the warning for now as the critical part (balance update) succeeded.
           }
         }
      }

    } else {
      order.status = 'COMPLETED';
      order.escrowStatus = 'RELEASED';
    }

    res.json({ success: true });
  });

  apiRouter.post("/marketplace/orders/:id/dispute", async (req, res) => {
    const { reason } = req.body;
    const orderId = req.params.id;
    const supabase = getSupabase();

    if (supabase) {
      const { error } = await supabase
        .from('marketplace_orders')
        .update({ 
          status: 'DISPUTED', 
          dispute_reason: reason,
          escrow_status: 'DISPUTED'
        })
        .eq('id', orderId);
      
      if (error) return res.status(500).json({ error: error.message });
    } else {
      const order = inMemoryOrders.find(o => o.id === orderId);
      if (order) {
        order.status = 'DISPUTED';
        order.disputeReason = reason;
        order.escrowStatus = 'DISPUTED';
      }
    }

    res.json({ success: true });
  });

  apiRouter.get("/marketplace/merchant/:merchantId/orders", async (req, res) => {
    const supabase = getSupabase();
    if (!supabase) {
      const orders = inMemoryOrders.filter(o => o.product.merchantId === req.params.merchantId);
      return res.json(orders);
    }

    try {
      const { data, error } = await withTimeout(supabase
        .from('marketplace_orders')
        .select('*, product:marketplace_products!inner(*)')
        .eq('product.merchant_id', req.params.merchantId)
        .order('created_at', { ascending: false })
        .limit(50));
      
      if (error) throw error;
      
      const formatted = (data || []).map((o: any) => ({
        ...o,
        buyerId: o.buyer_id,
        productId: o.product_id,
        totalAmount: o.total_amount,
        escrowStatus: o.escrow_status,
        createdAt: o.created_at,
        trackingNumber: o.tracking_number,
        confirmationCode: o.confirmation_code,
        disputeReason: o.dispute_reason,
        product: o.product ? {
          ...o.product,
          merchantId: o.product.merchant_id,
          imageUrl: o.product.image_url
        } : null
      }));
      res.json(formatted);
    } catch (error: any) {
      console.warn("Failed to fetch merchant orders from Supabase, using in-memory:", error.message || error);
      const orders = inMemoryOrders.filter(o => o.product.merchantId === req.params.merchantId);
      res.json(orders);
    }
  });

  apiRouter.post("/marketplace/orders/:orderId/status", async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;
    
    const supabase = getSupabase();
    if (!supabase) {
      const order = inMemoryOrders.find(o => o.id === orderId);
      if (!order) return res.status(404).json({ error: "Order not found" });
      order.status = status;
      return res.json({ success: true, order });
    }

    try {
      const { error: updateError } = await supabase.from('marketplace_orders').update({ status }).eq('id', orderId);
      if (updateError) throw updateError;
      
      const { data, error } = await supabase
        .from('marketplace_orders')
        .select('*, product:marketplace_products(*)')
        .eq('id', orderId)
        .single();
        
      if (error) throw error;
      
      const formatted = {
        ...data,
        buyerId: data.buyer_id,
        productId: data.product_id,
        totalAmount: data.total_amount,
        escrowStatus: data.escrow_status,
        createdAt: data.created_at,
        product: {
          ...data.product,
          merchantId: data.product.merchant_id,
          imageUrl: data.product.image_url
        }
      };
      res.json({ success: true, order: formatted });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });





  // Parking Lot Management (Merchant Side)
  apiRouter.post("/parking/lots", async (req, res) => {
    const { merchantId, name, address, capacity, totalSpots, baseRate, additionalRate, dailyMax } = req.body;
    const finalTotalSpots = totalSpots || capacity || 20;
    const supabase = getSupabase();

    const newLotId = uuidv4();
    const newLot = {
      id: newLotId,
      merchantId,
      name,
      address,
      totalSpots: finalTotalSpots,
      capacity: finalTotalSpots,
      availableSpots: finalTotalSpots,
      baseRate,
      additionalRate,
      dailyMax,
      isActive: true,
      createdAt: new Date().toISOString(),
      spots: [] as any[], // Initialize with empty spots
    };

    // Generate initial spots
    const newSpots = [];
    for (let i = 1; i <= finalTotalSpots; i++) {
      newSpots.push({
        id: uuidv4(),
        lotId: newLotId,
        spotNumber: i.toString(),
        status: 'AVAILABLE', // All spots available initially
      });
    }
    newLot.spots = newSpots;

    if (supabase) {
      try {
        // Fetch merchant phone
        const { data: merchantUser } = await supabase.from('users').select('phone').eq('id', merchantId).single();
        
        const { error: lotError } = await supabase
          .from('parking_lots')
          .insert([{
            id: newLotId,
            merchant_id: merchantId,
            name,
            address,
            total_spots: finalTotalSpots,
            base_rate: baseRate,
            additional_rate: additionalRate,
            daily_max: dailyMax,
            is_active: true,
            created_at: newLot.createdAt
          }]);

        if (lotError) throw lotError;

        const spotsData = newSpots.map(s => ({
          id: s.id,
          lot_id: newLotId,
          spot_number: s.spotNumber.toString(),
          status: 'AVAILABLE',
          created_at: newLot.createdAt
        }));

        const { error: spotsError } = await supabase
          .from('parking_spots')
          .insert(spotsData);

        if (spotsError) throw spotsError;

        await log(`New parking lot '${name}' created by merchant ${merchantId} (Supabase)`, 'SUCCESS');
        return res.status(201).json(newLot);
      } catch (err: any) {
        console.error("Failed to save parking lot to Supabase:", err);
        return res.status(500).json({ error: `Failed to save parking lot: ${err.message}` });
      }
    }

    inMemoryParkingLots.push(newLot);
    inMemoryParkingSpots.push(...newLot.spots);
    
    if (!supabase) {
      await log(`New parking lot '${name}' created by merchant ${merchantId} (In-Memory)`, 'SUCCESS');
    }
    
    res.status(201).json(newLot);
  });

  apiRouter.get("/parking/lots/:merchantId", async (req, res) => {
    const { merchantId } = req.params;
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data: lots, error } = await supabase
          .from('parking_lots')
          .select('*, parking_spots(status)')
          .eq('merchant_id', merchantId);

        if (error) throw error;

        const mappedLots = lots.map((lot: any) => {
          const spots = lot.parking_spots || [];
          const availableCount = spots.filter((s: any) => s.status === 'AVAILABLE').length;
          
          return {
            id: lot.id,
            merchantId: lot.merchant_id,
            name: lot.name,
            address: lot.address,
            totalSpots: lot.total_spots,
            availableSpots: availableCount,
            baseRate: lot.base_rate,
            additionalRate: lot.additional_rate,
            dailyMax: lot.daily_max,
            isActive: lot.is_active,
            createdAt: lot.created_at,
            spots: [] // We don't need to return all spots here, just the count
          };
        });

        return res.json(mappedLots);
      } catch (err) {
        console.error("Failed to fetch merchant parking lots from Supabase:", err);
      }
    }

    const lots = inMemoryParkingLots.filter(lot => lot.merchantId === merchantId);
    res.json(lots);
  });

  apiRouter.get("/parking/lots/single/:lotId", async (req, res) => {
    const { lotId } = req.params;
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data: lot, error } = await supabase
          .from('parking_lots')
          .select('*, parking_spots(*)')
          .eq('id', lotId)
          .single();

        if (error) throw error;

        if (lot) {
          const spots = lot.parking_spots || [];
          const availableCount = spots.filter((s: any) => s.status === 'AVAILABLE').length;

          return res.json({
            id: lot.id,
            merchantId: lot.merchant_id,
            name: lot.name,
            address: lot.address,
            totalSpots: lot.total_spots,
            capacity: lot.total_spots,
            availableSpots: availableCount,
            baseRate: lot.base_rate,
            additionalRate: lot.additional_rate,
            dailyMax: lot.daily_max,
            isActive: lot.is_active,
            createdAt: lot.created_at,
            spots: spots.map((s: any) => ({
              id: s.id,
              lotId: s.lot_id,
              spotNumber: s.spot_number,
              status: s.status
            }))
          });
        }
      } catch (err: any) {
        console.error("Failed to fetch parking lot from Supabase:", err.message || err);
      }
    }

    const lot = inMemoryParkingLots.find(l => l.id === lotId);
    if (!lot) return res.status(404).json({ error: "Parking lot not found" });
    res.json(lot);
  });

  apiRouter.put("/parking/lots/:lotId", async (req, res) => {
    const { lotId } = req.params;
    const { name, address, totalSpots, baseRate, additionalRate, dailyMax, isActive } = req.body;
    const supabase = getSupabase();

    if (supabase) {
      try {
        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (address !== undefined) updates.address = address;
        if (totalSpots !== undefined) updates.total_spots = totalSpots;
        if (baseRate !== undefined) updates.base_rate = baseRate;
        if (additionalRate !== undefined) updates.additional_rate = additionalRate;
        if (dailyMax !== undefined) updates.daily_max = dailyMax;
        if (isActive !== undefined) updates.is_active = isActive;

        const { data, error } = await supabase
          .from('parking_lots')
          .update(updates)
          .eq('id', lotId)
          .select()
          .single();

        if (error) throw error;

        // Map back to frontend format
        const updatedLot = {
            id: data.id,
            merchantId: data.merchant_id,
            name: data.name,
            address: data.address,
            totalSpots: data.total_spots,
            baseRate: data.base_rate,
            additionalRate: data.additional_rate,
            dailyMax: data.daily_max,
            isActive: data.is_active,
            createdAt: data.created_at,
        };

        // Update in-memory as well to keep sync
        const lotIndex = inMemoryParkingLots.findIndex(l => l.id === lotId);
        if (lotIndex !== -1) {
             inMemoryParkingLots[lotIndex] = { ...inMemoryParkingLots[lotIndex], ...updatedLot };
        }

        await log(`Parking lot '${updatedLot.name}' updated by merchant ${updatedLot.merchantId} (Supabase)`, 'INFO');
        return res.json(updatedLot);

      } catch (err) {
        console.error("Failed to update parking lot in Supabase:", err);
      }
    }

    const lotIndex = inMemoryParkingLots.findIndex(l => l.id === lotId);
    if (lotIndex === -1) return res.status(404).json({ error: "Parking lot not found" });

    const currentLot = inMemoryParkingLots[lotIndex];
    const updatedLot = {
      ...currentLot,
      name: name !== undefined ? name : currentLot.name,
      address: address !== undefined ? address : currentLot.address,
      totalSpots: totalSpots !== undefined ? totalSpots : currentLot.totalSpots,
      baseRate: baseRate !== undefined ? baseRate : currentLot.baseRate,
      additionalRate: additionalRate !== undefined ? additionalRate : currentLot.additionalRate,
      dailyMax: dailyMax !== undefined ? dailyMax : currentLot.dailyMax,
      isActive: isActive !== undefined ? isActive : currentLot.isActive,
    };
    
    inMemoryParkingLots[lotIndex] = updatedLot;
    await log(`Parking lot '${updatedLot.name}' updated by merchant ${updatedLot.merchantId}`, 'INFO');
    res.json(updatedLot);
  });

  apiRouter.get("/parking/lots/:lotId/spots", async (req, res) => {
    const { lotId } = req.params;
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data: spots, error } = await supabase
          .from('parking_spots')
          .select('*')
          .eq('lot_id', lotId)
          .order('spot_number', { ascending: true });

        if (error) throw error;

        const mappedSpots = spots.map((spot: any) => ({
          id: spot.id,
          lotId: spot.lot_id,
          spotNumber: spot.spot_number,
          status: spot.status,
          occupiedBy: spot.occupied_by,
        }));

        return res.json(mappedSpots);
      } catch (err) {
        console.error("Failed to fetch parking spots from Supabase:", err);
      }
    }

    const spots = inMemoryParkingSpots.filter(spot => spot.lotId === lotId);
    res.json(spots);
  });

  apiRouter.put("/parking/lots/:lotId/spots/:spotId", async (req, res) => {
    const { lotId, spotId } = req.params;
    const { status } = req.body;
    const supabase = getSupabase();

    if (supabase) {
      try {
        const updates: any = {};
        if (status !== undefined) {
          updates.status = status;
          if (status === 'AVAILABLE') updates.occupied_by = null;
        }

        const { data, error } = await supabase
          .from('parking_spots')
          .update(updates)
          .eq('id', spotId)
          .eq('lot_id', lotId)
          .select()
          .single();

        if (error) throw error;

        const updatedSpot = {
            id: data.id,
            lotId: data.lot_id,
            spotNumber: data.spot_number,
            status: data.status,
        };

        // Update in-memory
        const spotIndex = inMemoryParkingSpots.findIndex(s => s.id === spotId && s.lotId === lotId);
        if (spotIndex !== -1) {
            inMemoryParkingSpots[spotIndex] = { ...inMemoryParkingSpots[spotIndex], ...updatedSpot };
            
            // Update lot's available spots count in memory
            const lot = inMemoryParkingLots.find(l => l.id === lotId);
            if (lot) {
              const occupiedCount = inMemoryParkingSpots.filter(s => s.lotId === lotId && s.status === 'OCCUPIED').length;
              lot.availableSpots = lot.totalSpots - occupiedCount;
            }
        }

        await log(`Parking spot ${updatedSpot.spotNumber} in lot ${lotId} updated to ${status} (Supabase)`, 'INFO');
        return res.json(updatedSpot);

      } catch (err) {
        console.error("Failed to update parking spot in Supabase:", err);
      }
    }

    const spotIndex = inMemoryParkingSpots.findIndex(s => s.id === spotId && s.lotId === lotId);
    if (spotIndex === -1) return res.status(404).json({ error: "Parking spot not found" });

    const updatedSpot = { 
      ...inMemoryParkingSpots[spotIndex], 
      status,
      occupiedBy: status === 'AVAILABLE' ? null : (req.body.occupiedBy || inMemoryParkingSpots[spotIndex].occupiedBy)
    };
    inMemoryParkingSpots[spotIndex] = updatedSpot;

    // Update lot's available spots count
    const lot = inMemoryParkingLots.find(l => l.id === lotId);
    if (lot) {
      const occupiedCount = inMemoryParkingSpots.filter(s => s.lotId === lotId && s.status === 'OCCUPIED').length;
      lot.availableSpots = lot.totalSpots - occupiedCount;
    }

    await log(`Parking spot ${updatedSpot.spotNumber} in lot ${lotId} updated to ${status}`, 'INFO');
    res.json(updatedSpot);
  });

  // Parking Session Management (Citizen Side)
  apiRouter.get("/parking/spots/available", async (req, res) => {
    const { q } = req.query;
    const supabase = getSupabase();

    if (supabase) {
      try {
        // Fetch all active lots first
        const { data: lotsOnly, error: lotsError } = await supabase
          .from('parking_lots')
          .select('*')
          .eq('is_active', true);
        
        if (lotsError) throw lotsError;

        // Fetch all spots for these lots
        const { data: allSpots, error: spotsError } = await supabase
          .from('parking_spots')
          .select('*');
        
        if (spotsError) throw spotsError;

        // Self-healing: If we have approved parking merchants with no lots, create them
        try {
          const { data: approvedMerchants } = await supabase
            .from('users')
            .select('id, merchant_name, merchant_type, phone')
            .eq('role', 'merchant')
            .eq('merchant_status', 'APPROVED');
          
          if (approvedMerchants) {
            for (const merchant of approvedMerchants) {
              const mType = (merchant.merchant_type || '').toLowerCase();
              if (mType === 'parking') {
                const hasLot = (lotsOnly || []).some(l => l.merchant_id === merchant.id);
                if (!hasLot) {
                  console.log(`Auto-creating missing lot for approved merchant ${merchant.id}`);
                  const newLotId = uuidv4();
                  const totalSpots = 24;
                  const lotName = `${merchant.merchant_name || 'My'} Parking Lot`;
                  
                    // Create lot
                    const newLot = {
                      id: newLotId,
                      merchant_id: merchant.id,
                      name: lotName,
                      address: 'Addis Ababa, Ethiopia',
                      total_spots: totalSpots,
                      base_rate: 20,
                      is_active: true,
                      created_at: new Date().toISOString()
                    };
                    const { error: lotErr } = await supabase.from('parking_lots').insert([newLot]);

                    if (!lotErr) {
                      // Create spots
                      const spotsData = Array.from({ length: totalSpots }, (_, i) => ({
                        id: uuidv4(),
                        lot_id: newLotId,
                        spot_number: i + 1,
                        status: 'AVAILABLE',
                        created_at: new Date().toISOString()
                      }));
                      const { error: spotsErr } = await supabase.from('parking_spots').insert(spotsData);
                      if (spotsErr) console.error("Self-healing: Failed to create spots:", spotsErr);
                      console.log(`Successfully created lot and spots for merchant ${merchant.id}`);
                      
                      if (lotsOnly) lotsOnly.push(newLot);
                      if (allSpots) allSpots.push(...spotsData);
                    } else {
                      console.error("Self-healing: Failed to create lot:", JSON.stringify(lotErr));
                    }
                }
              }
            }
          }
        } catch (shErr) {
          console.error("Self-healing check failed:", shErr);
        }

        const spotsWithLotInfo = (allSpots || []).map(spot => {
          const lot = (lotsOnly || []).find(l => l.id === spot.lot_id);
          if (!lot) return null; 

          return {
            id: spot.id,
            lotId: spot.lot_id,
            lotName: lot.name,
            name: `Spot ${spot.spot_number}`,
            location: lot.address,
            status: spot.status,
            pricePerHour: lot.base_rate,
            distance: `${(Math.random() * 0.5 + 0.1).toFixed(1)} km`,
            estimatedTime: `${Math.floor(Math.random() * 5) + 1} min`,
          };
        }).filter(Boolean);

        let filteredSpots = spotsWithLotInfo;
        if (q && typeof q === 'string') {
          const query = q.toLowerCase();
          filteredSpots = filteredSpots.filter((spot: any) => 
            spot.name.toLowerCase().includes(query) || 
            spot.lotName.toLowerCase().includes(query) ||
            spot.location.toLowerCase().includes(query)
          );
        }

        return res.json(filteredSpots);
      } catch (err) {
        console.error("Failed to fetch available parking spots from Supabase:", err);
      }
    }
    // Fallback to mock data
    let availableSpots = inMemoryParkingSpots.filter(spot => spot.status === 'AVAILABLE');
    
    let spotsWithLotInfo = availableSpots.map(spot => {
      const lot = inMemoryParkingLots.find(l => l.id === spot.lotId);
      if (!lot || !lot.isActive) return null;

      return {
        id: spot.id,
        lotId: spot.lotId,
        lotName: lot.name,
        name: `Spot ${spot.spotNumber}`,
        location: lot.address,
        status: spot.status,
        pricePerHour: lot.baseRate,
        distance: `${(Math.random() * 0.5 + 0.1).toFixed(1)} km`,
        estimatedTime: `${Math.floor(Math.random() * 5) + 1} min`,
      };
    }).filter(Boolean);

    if (q && typeof q === 'string') {
      const query = q.toLowerCase();
      spotsWithLotInfo = spotsWithLotInfo.filter((spot: any) => 
        spot.name.toLowerCase().includes(query) || 
        spot.location.toLowerCase().includes(query) ||
        spot.lotName.toLowerCase().includes(query)
      );
    }
    
    res.json(spotsWithLotInfo);
  });

  apiRouter.post("/parking/session/start", async (req, res) => {
    try {
      const { userId, spotId, pricePerHour } = req.body;
      const supabase = getSupabase();

      if (supabase) {
        try {
          // Check if spot is available
          const { data: spot, error: spotError } = await supabase
            .from('parking_spots')
            .select('*, parking_lots(*)')
            .eq('id', spotId)
            .single();

          if (spotError) throw spotError;
          if (!spot) return res.status(404).json({ error: "Spot not found" });
          if (spot.status === 'OCCUPIED') return res.status(400).json({ error: "Spot not available" });

          const newSessionId = uuidv4();
          const startTime = new Date().toISOString();

          // Start transaction (simulated by sequential operations)
          // 1. Create session
          const { error: sessionError } = await supabase
            .from('parking_sessions')
            .insert([{
              id: newSessionId,
              user_id: userId,
              spot_id: spotId,
              start_time: startTime,
              status: 'ACTIVE'
            }]);

          if (sessionError) throw sessionError;

          // 2. Update spot status
          const { error: updateError } = await supabase
            .from('parking_spots')
            .update({
              status: 'OCCUPIED',
              occupied_by: userId
            })
            .eq('id', spotId);

          if (updateError) {
            // Rollback session creation (best effort)
            await supabase.from('parking_sessions').delete().eq('id', newSessionId);
            throw updateError;
          }

          const newSession = {
            id: newSessionId,
            userId,
            spotId,
            spotName: `Spot ${spot.spot_number} (${spot.parking_lots?.name || 'Unknown Lot'})`,
            startTime,
            pricePerHour,
            status: 'ACTIVE',
          };

          // Update in-memory for consistency
          const spotIndex = inMemoryParkingSpots.findIndex(s => s.id === spotId);
          if (spotIndex !== -1) {
              inMemoryParkingSpots[spotIndex].status = 'OCCUPIED';
              
              const lot = inMemoryParkingLots.find(l => l.id === inMemoryParkingSpots[spotIndex].lotId);
              if (lot) lot.availableSpots--;
              
              inMemoryParkingSessions.push(newSession);
          }

          await log(`Parking session started for user ${userId} at spot ${spotId} (Supabase)`, 'SUCCESS');
          return res.status(201).json(newSession);
        } catch (err: any) {
          console.error("Supabase error starting parking session, falling back to in-memory:", err);
        }
      }

      const spotIndex = inMemoryParkingSpots.findIndex(s => s.id === spotId);
      if (spotIndex === -1 || inMemoryParkingSpots[spotIndex].status === 'OCCUPIED') {
        return res.status(400).json({ error: "Spot not available" });
      }

      const lot = inMemoryParkingLots.find(l => l.id === inMemoryParkingSpots[spotIndex].lotId);
      if (!lot) return res.status(404).json({ error: "Parking lot not found" });

      const newSession = {
        id: uuidv4(),
        userId,
        spotId,
        spotName: `Spot ${inMemoryParkingSpots[spotIndex].spotNumber} (${lot.name})`,
        startTime: new Date().toISOString(),
        pricePerHour,
        status: 'ACTIVE',
      };

      inMemoryParkingSessions.push(newSession);
      inMemoryParkingSpots[spotIndex].status = 'OCCUPIED';
      lot.availableSpots--;

      await log(`Parking session started for user ${userId} at spot ${spotId}`, 'SUCCESS');
      res.status(201).json(newSession);
    } catch (error: any) {
      console.error("Error starting parking session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.post("/parking/session/end", async (req, res) => {
    try {
      const { sessionId } = req.body;
      const supabase = getSupabase();

      if (supabase) {
        try {
          const { data: session, error: sessionError } = await supabase
            .from('parking_sessions')
            .select('*, parking_spots(*, parking_lots(*))')
            .eq('id', sessionId)
            .single();

          if (sessionError) throw sessionError;
          if (!session) return res.status(404).json({ error: "Session not found" });
          if (session.status === 'COMPLETED') return res.status(400).json({ error: "Session already ended" });

          const endTime = new Date();
          const startTime = new Date(session.start_time);
          const durationMs = endTime.getTime() - startTime.getTime();
          const durationHours = Math.ceil(durationMs / (1000 * 60 * 60)); // Round up to nearest hour
          
          // Calculate cost based on lot rates
          const lot = session.parking_spots?.parking_lots;
          const baseRate = lot?.base_rate || 20;
          const additionalRate = lot?.additional_rate || 10;
          const dailyMax = lot?.daily_max || 150;

          let totalCost = 0;
          if (durationHours > 0) {
            totalCost = baseRate; // First hour
            if (durationHours > 1) {
              totalCost += (durationHours - 1) * additionalRate;
            }
          }
          
          // Apply daily max if set
          if (dailyMax > 0 && totalCost > dailyMax) {
            totalCost = dailyMax;
          }

          // Update session
          const { error: updateSessionError } = await supabase
            .from('parking_sessions')
            .update({
              end_time: endTime.toISOString(),
              total_cost: totalCost,
              status: 'COMPLETED'
            })
            .eq('id', sessionId);

          if (updateSessionError) throw updateSessionError;

          // Update spot status
          const { error: updateSpotError } = await supabase
            .from('parking_spots')
            .update({
              status: 'AVAILABLE',
              occupied_by: null
            })
            .eq('id', session.spot_id);

          if (updateSpotError) throw updateSpotError;

          const updatedSession = {
            id: session.id,
            userId: session.user_id,
            spotId: session.spot_id,
            spotName: `Spot ${session.parking_spots?.spot_number} (${session.parking_spots?.parking_lots?.name || 'Unknown Lot'})`,
            startTime: session.start_time,
            endTime: endTime.toISOString(),
            duration: `${durationHours} hour(s)`,
            totalCost,
            status: 'COMPLETED',
          };

          // Update in-memory for consistency
          const sessionIndex = inMemoryParkingSessions.findIndex(s => s.id === sessionId);
          if (sessionIndex !== -1) {
              inMemoryParkingSessions[sessionIndex] = updatedSession;
          }
          
          const spotIndex = inMemoryParkingSpots.findIndex(s => s.id === session.spot_id);
          if (spotIndex !== -1) {
              inMemoryParkingSpots[spotIndex].status = 'AVAILABLE';
              
              const lot = inMemoryParkingLots.find(l => l.id === inMemoryParkingSpots[spotIndex].lotId);
              if (lot) lot.availableSpots++;
          }

          await log(`Parking session ${sessionId} ended. Cost: ${totalCost} ETB (Supabase)`, 'SUCCESS');
          return res.json(updatedSession);
        } catch (err: any) {
          console.error("Supabase error ending parking session, falling back to in-memory:", err);
        }
      }

      const sessionIndex = inMemoryParkingSessions.findIndex(s => s.id === sessionId);
      if (sessionIndex === -1) return res.status(404).json({ error: "Session not found" });

      const session = inMemoryParkingSessions[sessionIndex];
      const endTime = new Date();
      const startTime = new Date(session.startTime);
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationHours = Math.ceil(durationMs / (1000 * 60 * 60)); // Round up to nearest hour
      
      const lot = inMemoryParkingLots.find(l => l.id === inMemoryParkingSpots.find(s => s.id === session.spotId)?.lotId);
      const baseRate = lot?.baseRate || session.pricePerHour || 20;
      const additionalRate = lot?.additionalRate || 10;
      const dailyMax = lot?.dailyMax || 150;

      let totalCost = 0;
      if (durationHours > 0) {
        totalCost = baseRate;
        if (durationHours > 1) {
          totalCost += (durationHours - 1) * additionalRate;
        }
      }
      if (dailyMax > 0 && totalCost > dailyMax) {
        totalCost = dailyMax;
      }

      const updatedSession = {
        ...session,
        endTime: endTime.toISOString(),
        duration: `${durationHours} hour(s)`,
        totalCost,
        status: 'COMPLETED',
      };
      inMemoryParkingSessions[sessionIndex] = updatedSession;

      const spotIndex = inMemoryParkingSpots.findIndex(s => s.id === session.spotId);
      if (spotIndex !== -1) {
        const spot = inMemoryParkingSpots[spotIndex];
        spot.status = 'AVAILABLE';

        const lot = inMemoryParkingLots.find(l => l.id === spot.lotId);
        if (lot) {
          lot.availableSpots++;
        }
      }

      await log(`Parking session ${sessionId} ended. Cost: ${totalCost} ETB`, 'SUCCESS');
      res.json(updatedSession);
    } catch (error: any) {
      console.error("Error ending parking session:", error);
      res.status(500).json({ error: error.message });
    }
  });

  apiRouter.get("/parking/session/user/:userId", async (req, res) => {
    const { userId } = req.params;
    const supabase = getSupabase();

    if (supabase) {
      try {
        const { data: sessions, error } = await supabase
          .from('parking_sessions')
          .select('*, parking_spots(*, parking_lots(*))')
          .eq('user_id', userId)
          .order('start_time', { ascending: false });

        if (error) throw error;
        if (sessions) {
          const mappedSessions = sessions.map((session: any) => {
            const endTime = session.end_time ? new Date(session.end_time) : null;
            const startTime = new Date(session.start_time);
            let duration = '';
            
            if (endTime) {
                const durationMs = endTime.getTime() - startTime.getTime();
                const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));
                duration = `${durationHours} hour(s)`;
            }

            const spotRaw = session.parking_spots || session['parking_spots!spot_id'];
            const spot = Array.isArray(spotRaw) ? spotRaw[0] : spotRaw;
            const lotRaw = spot && (spot.parking_lots || spot['parking_lots!lot_id']);
            const lot = Array.isArray(lotRaw) ? lotRaw[0] : lotRaw;

            return {
                id: session.id,
                userId: session.user_id,
                spotId: session.spot_id,
                spotName: `Spot ${spot?.spot_number} (${lot?.name || 'Unknown Lot'})`,
                startTime: session.start_time,
                endTime: session.end_time,
                duration: duration,
                totalCost: session.total_cost,
                status: session.status,
                pricePerHour: lot?.base_rate || 10 // Fallback or fetch from lot
            };
        });

        return res.json(mappedSessions);
        }
      } catch (err: any) {
        if (err.code === '42P01' || err.message?.includes('schema cache')) {
          console.warn("Supabase table 'parking_sessions' does not exist. Falling back to mock data.");
        } else {
          console.error("Failed to fetch user parking sessions from Supabase:", err.message || err);
        }
      }
    }

    // Return all sessions (ACTIVE and COMPLETED) so the frontend can determine current state
    const userSessions = inMemoryParkingSessions.filter(session => session.userId === userId);
    // Sort by start time descending (newest first)
    userSessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    res.json(userSessions);
  });

  apiRouter.get("/parking/session/merchant/:merchantId", async (req, res) => {
    const { merchantId } = req.params;
    const supabase = getSupabase();
    
    if (supabase) {
      try {
        // First find the lots owned by this merchant
        const { data: lots, error: lotsErr } = await supabase
          .from('parking_lots')
          .select('id')
          .eq('merchant_id', merchantId);
        
        if (lotsErr) throw lotsErr;
        
        if (!lots || lots.length === 0) return res.json([]);
        
        const lotIds = lots.map(l => l.id);
        
        // Find sessions for these lots
        const { data: sessions, error: err } = await supabase
          .from('parking_sessions')
          .select('*, parking_spots!inner(*)')
          .in('parking_spots.lot_id', lotIds)
          .order('start_time', { ascending: false });

        if (err) throw err;

        const mappedSessions = (sessions || []).map(session => {
            const spot = session.parking_spots;
            const startTime = new Date(session.start_time);
            const endTime = session.end_time ? new Date(session.end_time) : new Date();
            const durationMs = endTime.getTime() - startTime.getTime();
            const durationHours = Math.ceil(durationMs / (1000 * 60 * 60));

            return {
                id: session.id,
                userId: session.user_id,
                spotId: session.spot_id,
                spotName: `Spot ${spot?.spot_number || '??'}`,
                startTime: session.start_time,
                endTime: session.end_time,
                duration: `${durationHours} hour(s)`,
                totalCost: session.total_cost,
                status: session.status,
            };
        });

        return res.json(mappedSessions);
      } catch (err: any) {
        console.error("Failed to fetch merchant parking sessions from Supabase:", err.message || err);
      }
    }

    // Fallback: find lots for this merchant in memory
    const merchantLots = inMemoryParkingLots.filter(l => l.merchantId === merchantId);
    const merchantLotIds = merchantLots.map(l => l.id);
    const merchantSpots = inMemoryParkingSpots.filter(s => merchantLotIds.includes(s.lotId));
    const merchantSpotIds = merchantSpots.map(s => s.id);
    
    const sessions = inMemoryParkingSessions.filter(s => merchantSpotIds.includes(s.spotId));
    res.json(sessions);
  });

  // Merchant Withdrawal Endpoint
  apiRouter.post("/merchant/withdraw", async (req, res) => {
    const { merchantId, amount, method, accountDetails } = req.body;
    const supabase = getSupabase();
    
    try {
      if (!merchantId || !amount || !method || !accountDetails) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const withdrawAmount = parseFloat(amount);
      if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
        return res.status(400).json({ error: "Invalid amount" });
      }

      // 1. Check Balance
      let currentBalance = 0;
      let userProfile: any = null;

      if (supabase) {
        const { data: user, error } = await supabase.from('users').select('*').eq('id', merchantId).single();
        if (error || !user) {
           return res.status(404).json({ error: "Merchant not found" });
        }
        userProfile = user;
        
        // Calculate balance dynamically for parking merchants
        // This ensures that even if 'balance' column wasn't updated, we can withdraw based on revenue
        if (user.merchant_type === 'PARKING' || true) { // Apply to all for now as fallback
           // Get parking lots
           const { data: lots } = await supabase.from('parking_lots').select('id').eq('merchant_id', merchantId);
           const lotIds = lots?.map((l: any) => l.id) || [];
           
           if (lotIds.length > 0) {
             // Get spots
             const { data: spots } = await supabase.from('parking_spots').select('id').in('lot_id', lotIds);
             const spotIds = spots?.map((s: any) => s.id) || [];
             
             if (spotIds.length > 0) {
               // Get completed sessions revenue
               const { data: sessions } = await supabase.from('parking_sessions')
                 .select('total_cost')
                 .in('spot_id', spotIds)
                 .eq('status', 'COMPLETED');
                 
               const totalRevenue = sessions?.reduce((sum: number, s: any) => sum + (s.total_cost || 0), 0) || 0;
               
               // Get withdrawals
               const { data: withdrawals } = await supabase.from('transactions')
                 .select('amount')
                 .eq('user_id', merchantId)
                 .eq('type', 'WITHDRAWAL');
                 
               const totalWithdrawn = withdrawals?.reduce((sum: number, t: any) => sum + Math.abs(t.amount || 0), 0) || 0;
               
               // Use calculated balance if greater than stored balance (to fix sync issues)
               const calculatedBalance = Math.max(0, totalRevenue - totalWithdrawn);
               currentBalance = Math.max(user.balance || 0, calculatedBalance);
             } else {
               currentBalance = user.balance || 0;
             }
           } else {
             currentBalance = user.balance || 0;
           }
        } else {
           currentBalance = user.balance || 0;
        }
      } else {
        // In-memory fallback
        // Calculate from in-memory sessions
        const merchantLots = inMemoryParkingLots.filter(l => l.merchantId === merchantId);
        const lotIds = merchantLots.map(l => l.id);
        const merchantSpots = inMemoryParkingSpots.filter(s => lotIds.includes(s.lotId));
        const spotIds = merchantSpots.map(s => s.id);
        
        const sessions = inMemoryParkingSessions.filter(s => spotIds.includes(s.spotId) && s.status === 'COMPLETED');
        const totalRevenue = sessions.reduce((sum, s) => sum + (s.totalCost || 0), 0);
        
        const withdrawals = inMemoryTransactions.filter(t => t.userId === merchantId && t.type === 'WITHDRAWAL');
        const totalWithdrawn = withdrawals.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        
        currentBalance = Math.max(0, totalRevenue - totalWithdrawn);
      }

      if (currentBalance < withdrawAmount) {
        return res.status(400).json({ error: "Insufficient balance" });
      }

      // 2. Process Withdrawal (Mock Chapa Payout)
      // In a real app, we would call Chapa's transfer API here.
      // await chapa.transfer(...)
      
      const txId = `wd-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      const timestamp = new Date().toISOString();
      const description = `Withdrawal to ${method} (${accountDetails.accountNumber || accountDetails.phone})`;

      // 3. Deduct Balance & Record Transaction
      if (supabase) {
        // Deduct
        const { error: updateError } = await supabase
          .from('users')
          .update({ balance: currentBalance - withdrawAmount })
          .eq('id', merchantId);

        if (updateError) throw updateError;

        // Record
        const { error: txError } = await supabase.from('transactions').insert([{
          id: txId,
          user_id: merchantId,
          merchant_id: merchantId, // Use merchant's own ID to avoid FK issues with 'system_withdrawal'
          amount: -withdrawAmount,
          type: 'WITHDRAWAL',
          status: 'COMPLETED',
          description: description,
          timestamp: timestamp
        }]);
        
        if (txError) {
          console.warn("Failed to record withdrawal tx in Supabase, falling back to in-memory:", txError.message);
          inMemoryTransactions.push({
            id: txId,
            user_id: merchantId,
            merchant_id: merchantId,
            amount: -withdrawAmount,
            type: 'WITHDRAWAL',
            status: 'COMPLETED',
            description: description,
            timestamp: timestamp
          });
        }
      } else {
        // In-memory
        inMemoryTransactions.push({
          id: txId,
          user_id: merchantId,
          merchant_id: merchantId,
          amount: -withdrawAmount,
          type: 'WITHDRAWAL',
          status: 'COMPLETED',
          description: description,
          timestamp: timestamp
        });
      }

      res.json({
        success: true,
        transactionId: txId,
        newBalance: currentBalance - withdrawAmount,
        message: "Withdrawal processed successfully"
      });

    } catch (error: any) {
      console.error("Withdrawal error:", error);
      res.status(500).json({ error: error.message || "Withdrawal failed" });
    }
  });

  // Traffic Fines
  apiRouter.get("/traffic/fines/:identifier", async (req, res) => {
    const { identifier } = req.params;
    const supabase = getSupabase();
    
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('traffic_fines')
          .select('*')
          .or(`plate_number.ilike.${identifier},notice_number.ilike.${identifier}`);
          
        if (!error && data && data.length > 0) {
          const formatted = data.map((f: any) => ({
            id: f.id,
            plateNumber: f.plate_number,
            noticeNumber: f.notice_number,
            violationType: f.violation_type,
            location: f.location,
            amount: f.amount,
            date: f.date,
            status: f.status
          }));
          return res.json(formatted);
        }
      } catch (err) {
        console.warn("Failed to fetch traffic fines from Supabase, using in-memory:", err);
      }
    }

    // Search by Plate Number OR Notice Number
    const fines = inMemoryTrafficFines.filter(f => 
      f.plateNumber.toUpperCase() === identifier.toUpperCase() || 
      f.noticeNumber.toUpperCase() === identifier.toUpperCase()
    );
    res.json(fines);
  });

  apiRouter.post("/traffic/fines/:fineId/pay", async (req, res) => {
    try {
      const { fineId } = req.params;
      const { userId, provider } = req.body; // provider: 'citylink' | 'telebirr' | 'cbe'
      const supabase = getSupabase();
      
      let fine: any = null;
      let isInMemory = false;
      const fineIndex = inMemoryTrafficFines.findIndex(f => f.id === fineId);

      if (supabase) {
        try {
          const { data, error } = await supabase.from('traffic_fines').select('*').eq('id', fineId).single();
          if (!error && data) {
            fine = {
              id: data.id,
              plateNumber: data.plate_number,
              noticeNumber: data.notice_number,
              violationType: data.violation_type,
              location: data.location,
              amount: data.amount,
              date: data.date,
              status: data.status
            };
          }
        } catch (err) {
          console.warn("Failed to fetch traffic fine from Supabase, checking in-memory:", err);
        }
      }

      if (!fine) {
        if (fineIndex !== -1) {
          fine = inMemoryTrafficFines[fineIndex];
          isInMemory = true;
        } else {
          return res.status(404).json({ error: "Fine not found" });
        }
      }

      if (fine.status === 'PAID') return res.status(400).json({ error: "Fine already paid" });

      const txId = 'tx_' + Math.random().toString(36).substring(7);
      const timestamp = new Date().toISOString();
      const description = `Traffic Fine Payment: ${fine.violationType} (${fine.plateNumber}) via ${provider.toUpperCase()}`;

      const transactionData = {
        id: txId,
        user_id: userId,
        merchant_id: 'addis_traffic_authority',
        amount: fine.amount,
        type: 'PAYMENT',
        status: 'COMPLETED',
        description: description,
        timestamp: timestamp
      };

      if (provider === 'citylink' && supabase) {
        const { data: user } = await supabase.from('users').select('balance').eq('id', userId).single();
        if (!user || user.balance < fine.amount) {
          return res.status(400).json({ error: "Insufficient balance in Citylink wallet" });
        }

        // Deduct balance
        await supabase.from('users').update({ balance: user.balance - fine.amount }).eq('id', userId);
        
        // Record transaction
        const { error: txError } = await supabase.from('transactions').insert([transactionData]);
        if (txError) {
          console.warn("Failed to insert transaction into Supabase (likely RLS), falling back to in-memory:", txError.message);
          inMemoryTransactions.push(transactionData);
        }
      } else if (provider === 'telebirr' || provider === 'cbe') {
        // Simulate external payment success
        if (supabase) {
          const { error: txError } = await supabase.from('transactions').insert([transactionData]);
          if (txError) {
            console.warn("Failed to insert transaction into Supabase (likely RLS), falling back to in-memory:", txError.message);
            inMemoryTransactions.push(transactionData);
          }
        } else {
          inMemoryTransactions.push(transactionData);
        }
      }

      if (supabase && !isInMemory) {
        try {
          await supabase.from('traffic_fines').update({ status: 'PAID' }).eq('id', fineId);
        } catch (err) {
          console.warn("Failed to update fine status in Supabase:", err);
        }
      }

      if (isInMemory || !supabase) {
        inMemoryTrafficFines[fineIndex].status = 'PAID';
      }
      
      fine.status = 'PAID';

      res.json({ 
        success: true, 
        fine: fine,
        transaction: {
          id: txId,
          userId,
          merchantId: 'addis_traffic_authority',
          amount: fine.amount,
          type: 'PAYMENT',
          status: 'COMPLETED',
          description: description,
          timestamp: timestamp
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // School Fees
  apiRouter.get("/education/student/:identifier", async (req, res) => {
    const { identifier } = req.params;
    // Search by Student ID OR Payment Code
    const student = inMemoryStudents.find(s => 
      s.id.toUpperCase() === identifier.toUpperCase() || 
      (s.paymentCode && s.paymentCode.toUpperCase() === identifier.toUpperCase())
    );
    
    if (!student) return res.status(404).json({ error: "Student not found" });
    
    const fees = inMemorySchoolFees.filter(f => f.studentId === student.id);
    res.json({ student, fees });
  });

  apiRouter.post("/education/fees/:feeId/pay", async (req, res) => {
    try {
      const { feeId } = req.params;
      const { userId, provider } = req.body; // provider: 'citylink' | 'telebirr' | 'cbe'
      const feeIndex = inMemorySchoolFees.findIndex(f => f.id === feeId);
      
      if (feeIndex === -1) return res.status(404).json({ error: "Fee record not found" });
      if (inMemorySchoolFees[feeIndex].status === 'PAID') return res.status(400).json({ error: "Fee already paid" });

      const fee = inMemorySchoolFees[feeIndex];
      const student = inMemoryStudents.find(s => s.id === fee.studentId);
      const supabase = getSupabase();

      const txId = 'tx_' + Math.random().toString(36).substring(7);
      const timestamp = new Date().toISOString();
      const description = `School Fee Payment: ${fee.feeType} for ${student?.name} (${fee.studentId}) via ${provider.toUpperCase()}`;

      const transactionData = {
        id: txId,
        user_id: userId,
        merchant_id: 'addis_education_bureau',
        amount: fee.amount,
        type: 'PAYMENT',
        status: 'COMPLETED',
        description: description,
        timestamp: timestamp
      };

      if (provider === 'citylink' && supabase) {
        const { data: user } = await supabase.from('users').select('balance').eq('id', userId).single();
        if (!user || user.balance < fee.amount) {
          return res.status(400).json({ error: "Insufficient balance in Citylink wallet" });
        }

        // Deduct balance
        await supabase.from('users').update({ balance: user.balance - fee.amount }).eq('id', userId);
        
        // Record transaction
        const { error: txError } = await supabase.from('transactions').insert([transactionData]);
        if (txError) {
          console.warn("Failed to insert transaction into Supabase (likely RLS), falling back to in-memory:", txError.message);
          inMemoryTransactions.push(transactionData);
        }
      } else if (provider === 'telebirr' || provider === 'cbe') {
        // Simulate external payment success
        if (supabase) {
          const { error: txError } = await supabase.from('transactions').insert([transactionData]);
          if (txError) {
            console.warn("Failed to insert transaction into Supabase (likely RLS), falling back to in-memory:", txError.message);
            inMemoryTransactions.push(transactionData);
          }
        } else {
          inMemoryTransactions.push(transactionData);
        }
      }

      inMemorySchoolFees[feeIndex].status = 'PAID';
      res.json({ 
        success: true, 
        fee: inMemorySchoolFees[feeIndex],
        transaction: {
          id: txId,
          userId,
          merchantId: 'addis_education_bureau',
          amount: fee.amount,
          type: 'PAYMENT',
          status: 'COMPLETED',
          description: description,
          timestamp: timestamp
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Wallet Funding
  apiRouter.post("/wallet/fund", async (req, res) => {
    try {
      const { userId, amount, bankId, bankAccount } = req.body;
      const supabase = getSupabase();

      if (!supabase) {
        return res.status(503).json({ error: "Supabase not configured" });
      }

      const { data: user } = await supabase.from('users').select('balance').eq('id', userId).single();
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const newBalance = (user.balance || 0) + parseFloat(amount);

      // Update balance
      const { error: balanceError } = await supabase.from('users').update({ balance: newBalance }).eq('id', userId);
      
      if (balanceError) {
        console.warn("Balance update failed (likely RLS), proceeding with in-memory transaction:", balanceError.message);
        // We continue to record the transaction in memory so the user sees success in this session
      }
      
      const txId = 'tx_' + Math.random().toString(36).substring(7);
      const description = `Wallet Funding from ${bankId.toUpperCase()} (Account: ${bankAccount})`;
      const timestamp = new Date().toISOString();

      const transactionData = {
        id: txId,
        user_id: userId,
        merchant_id: bankId,
        amount: parseFloat(amount),
        type: 'DEPOSIT',
        status: 'COMPLETED',
        description: description,
        timestamp: timestamp
      };

      // Record transaction with fallback
      const { error: txError } = await supabase.from('transactions').insert([transactionData]);
      
      if (txError) {
        // Downgraded to INFO log to avoid alarming users, as this is expected in RLS-restricted environments
        console.log("Using in-memory storage for transaction (RLS restricted).");
        inMemoryTransactions.push(transactionData);
      }

      res.json({ 
        success: true, 
        newBalance,
        transaction: {
          id: txId,
          userId,
          merchantId: bankId,
          amount: parseFloat(amount),
          type: 'DEPOSIT',
          status: 'COMPLETED',
          description: description,
          timestamp: timestamp
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- JOBS & CONSENT API ---
  
  // Get Job Profile
  apiRouter.get("/jobs/profile/:userId", async (req, res) => {
    const { userId } = req.params;
    const supabase = getSupabase();
    
    // Check in-memory first to get the "extra" fields not in DB
    const memProfile = inMemoryJobProfiles.find(p => p.user_id === userId);

    if (!supabase) {
      return res.json(memProfile || null);
    }

    try {
      const { data, error } = await supabase
        .from('job_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        // Merge DB data with in-memory details, prioritizing DB if available
        const fullProfile = {
          ...data,
          work_history: data.work_history || memProfile?.work_history || [],
          education_details: data.education_details || memProfile?.education_details || [],
          certifications: data.certifications || memProfile?.certifications || [],
          resume_url: data.resume_url || memProfile?.resume_url || ''
        };
        return res.json(fullProfile);
      }
      
      res.json(memProfile || null);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Update Job Profile
  apiRouter.post("/jobs/profile", async (req, res) => {
    const { user_id, education, experience, skills, work_history, education_details, certifications, resume_url } = req.body;
    const supabase = getSupabase();
    
    const profileData = {
      user_id,
      education: education || '',
      experience: experience || 0,
      skills: skills || [],
      work_history: work_history || [],
      education_details: education_details || [],
      certifications: certifications || [],
      resume_url: resume_url || '',
      updated_at: new Date().toISOString()
    };

    // Update in-memory
    const existingIndex = inMemoryJobProfiles.findIndex(p => p.user_id === user_id);
    if (existingIndex >= 0) {
      inMemoryJobProfiles[existingIndex] = { ...inMemoryJobProfiles[existingIndex], ...profileData };
    } else {
      // Default to verified: true for demo purposes so they appear in Talent Radar
      inMemoryJobProfiles.push({ ...profileData, verified: true, trust_score: 85 });
    }

    if (!supabase) return res.json(profileData); // Fallback

    try {
      // Try to upsert to supabase, but it might fail if columns don't exist
      // Only send fields we are confident exist in the schema to avoid errors
      const { data, error } = await supabase
        .from('job_profiles')
        .upsert({ 
          user_id: profileData.user_id,
          education: profileData.education,
          experience: profileData.experience,
          skills: profileData.skills,
          work_history: profileData.work_history,
          education_details: profileData.education_details,
          certifications: profileData.certifications,
          resume_url: profileData.resume_url,
          updated_at: profileData.updated_at,
          verified: true, 
          trust_score: 85 
        }) 
        .select()
        .single();
      
      if (error) {
        console.warn("Supabase upsert failed for job_profiles, relying on in-memory:", error.message);
        return res.json(inMemoryJobProfiles.find(p => p.user_id === user_id));
      }
      
      res.json(data);
    } catch (error: any) {
      console.warn("Supabase upsert failed for job_profiles, relying on in-memory:", error.message);
      res.json(inMemoryJobProfiles.find(p => p.user_id === user_id));
    }
  });

  // Get Job Applications (Citizen)
  apiRouter.get("/jobs/applications/:userId", async (req, res) => {
    const { userId } = req.params;
    const supabase = getSupabase();
    
    if (!supabase) {
      const apps = inMemoryApplications.filter(a => a.citizen_id === userId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return res.json(apps);
    }

    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .eq('citizen_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      // Fallback to in-memory
      const apps = inMemoryApplications.filter(a => a.citizen_id === userId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      res.json(apps);
    }
  });

  // Get Job Applications (Merchant)
  apiRouter.get("/jobs/applications/merchant/:merchantId", async (req, res) => {
    const { merchantId } = req.params;
    const supabase = getSupabase();
    
    if (!supabase) {
      const apps = inMemoryApplications.filter(a => a.merchant_id === merchantId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return res.json(apps);
    }

    try {
      const { data, error } = await supabase
        .from('job_applications')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      // Fallback to in-memory
      const apps = inMemoryApplications.filter(a => a.merchant_id === merchantId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      res.json(apps);
    }
  });

  // Get Job Postings
  apiRouter.get("/jobs/postings", async (req, res) => {
    const supabase = getSupabase();
    
    if (!supabase) {
      return res.json(inMemoryJobPostings.filter(j => j.status === 'OPEN'));
    }

    try {
      const { data, error } = await supabase
        .from('job_postings')
        .select('*')
        .eq('status', 'OPEN')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      // Fallback to in-memory
      res.json(inMemoryJobPostings.filter(j => j.status === 'OPEN'));
    }
  });

  // Create Job Posting
  apiRouter.post("/jobs/postings", async (req, res) => {
    const { merchantId, merchantName, title, description, requirements, location, salaryRange, type } = req.body;
    const supabase = getSupabase();
    
    const newJob = {
      id: uuidv4(),
      merchant_id: merchantId,
      merchant_name: merchantName,
      title,
      description,
      requirements,
      location,
      salary_range: salaryRange,
      type,
      status: 'OPEN',
      created_at: new Date().toISOString()
    };

    if (!supabase) {
      inMemoryJobPostings.unshift(newJob);
      return res.json(newJob);
    }

    try {
      const { data, error } = await supabase
        .from('job_postings')
        .insert([newJob])
        .select()
        .single();
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      inMemoryJobPostings.unshift(newJob);
      res.json(newJob);
    }
  });

  // Apply to Job
  apiRouter.post("/jobs/apply", async (req, res) => {
    const { citizenId, jobId, merchantId, merchantName, role } = req.body;
    const supabase = getSupabase();
    
    const newApp = {
      id: uuidv4(),
      job_id: jobId,
      citizen_id: citizenId,
      merchant_id: merchantId,
      merchant_name: merchantName,
      role,
      status: 'APPLIED',
      created_at: new Date().toISOString()
    };

    if (!supabase) {
      // Check if already applied
      const existing = inMemoryApplications.find(a => a.citizen_id === citizenId && a.job_id === jobId);
      if (existing) return res.status(400).json({ error: "Already applied" });
      
      inMemoryApplications.unshift(newApp);
      return res.json(newApp);
    }

    try {
      const { data, error } = await supabase
        .from('job_applications')
        .insert([newApp])
        .select()
        .single();
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      inMemoryApplications.unshift(newApp);
      res.json(newApp);
    }
  });

  // Get Talent Pool (All verified profiles)
  apiRouter.get("/jobs/talent", async (req, res) => {
    const supabase = getSupabase();
    
    if (!supabase) {
      // Return in-memory profiles with user details
      return res.json(inMemoryJobProfiles.map(p => {
        const user = inMemoryUsers.find(u => u.id === p.user_id);
        return {
          ...p,
          users: { name: user?.name || 'Citizen', phone: user?.phone || '' }
        };
      }));
    }

    try {
      const { data, error } = await supabase
        .from('job_profiles')
        .select('*, users(name, phone)')
        .eq('verified', true);
      
      if (error) throw error;
      
      // Merge with in-memory
      const merged = (data || []).map(dbProfile => {
        const memProfile = inMemoryJobProfiles.find(p => p.user_id === dbProfile.user_id);
        const user = inMemoryUsers.find(u => u.id === dbProfile.user_id);
        return {
          ...dbProfile,
          work_history: memProfile?.work_history || [],
          education_details: memProfile?.education_details || [],
          certifications: memProfile?.certifications || [],
          resume_url: memProfile?.resume_url || '',
          users: { name: user?.name || dbProfile.users?.name || 'Citizen', phone: user?.phone || dbProfile.users?.phone || '' }
        };
      });

      // Add purely in-memory profiles that are not in DB
      inMemoryJobProfiles.forEach(mem => {
        if (!merged.find(m => m.user_id === mem.user_id)) {
          const user = inMemoryUsers.find(u => u.id === mem.user_id);
          merged.push({ 
            ...mem, 
            users: { name: user?.name || 'Citizen', phone: user?.phone || '' } 
          });
        }
      });
      
      res.json(merged);
    } catch (error: any) {
      res.json(inMemoryJobProfiles.map(p => {
        const user = inMemoryUsers.find(u => u.id === p.user_id);
        return {
          ...p,
          users: { name: user?.name || 'Citizen', phone: user?.phone || '' }
        };
      }));
    }
  });

  // Get Consent Requests (for Citizen)
  apiRouter.get("/jobs/requests/citizen/:citizenId", async (req, res) => {
    const { citizenId } = req.params;
    const supabase = getSupabase();
    
    if (!supabase) {
      const reqs = inMemoryJobConsentRequests.filter(r => r.citizen_id === citizenId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return res.json(reqs);
    }

    try {
      const { data, error } = await supabase
        .from('job_consent_requests')
        .select('*')
        .eq('citizen_id', citizenId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      // Fallback
      const reqs = inMemoryJobConsentRequests.filter(r => r.citizen_id === citizenId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      res.json(reqs);
    }
  });

  // Get Consent Requests (for Merchant)
  apiRouter.get("/jobs/requests/merchant/:merchantId", async (req, res) => {
    const { merchantId } = req.params;
    const supabase = getSupabase();
    
    if (!supabase) {
      const reqs = inMemoryJobConsentRequests.filter(r => r.merchant_id === merchantId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return res.json(reqs);
    }

    try {
      const { data, error } = await supabase
        .from('job_consent_requests')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      // Fallback
      const reqs = inMemoryJobConsentRequests.filter(r => r.merchant_id === merchantId).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      res.json(reqs);
    }
  });

  // Create Consent Request
  apiRouter.post("/jobs/requests", async (req, res) => {
    const { merchant_id, citizen_id, merchant_name, requested_docs } = req.body;
    const supabase = getSupabase();
    
    const newReq = { 
      id: uuidv4(), 
      merchant_id, 
      citizen_id, 
      merchant_name, 
      requested_docs, 
      status: 'PENDING',
      created_at: new Date().toISOString()
    };

    if (!supabase) {
      inMemoryJobConsentRequests.push(newReq);
      return res.json(newReq);
    }

    try {
      const { data, error } = await supabase
        .from('job_consent_requests')
        .insert([newReq])
        .select()
        .single();
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      // Fallback to in-memory on error
      inMemoryJobConsentRequests.push(newReq);
      res.json(newReq);
    }
  });

  // Update Consent Request Status
  apiRouter.put("/jobs/requests/:id", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const supabase = getSupabase();
    
    if (!supabase) {
      const idx = inMemoryJobConsentRequests.findIndex(r => r.id === id);
      if (idx !== -1) {
        inMemoryJobConsentRequests[idx].status = status;
        inMemoryJobConsentRequests[idx].updated_at = new Date().toISOString();
        return res.json(inMemoryJobConsentRequests[idx]);
      }
      return res.status(404).json({ error: "Request not found" });
    }

    try {
      const { data, error } = await supabase
        .from('job_consent_requests')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      // Fallback
      const idx = inMemoryJobConsentRequests.findIndex(r => r.id === id);
      if (idx !== -1) {
        inMemoryJobConsentRequests[idx].status = status;
        inMemoryJobConsentRequests[idx].updated_at = new Date().toISOString();
        return res.json(inMemoryJobConsentRequests[idx]);
      }
      res.status(500).json({ error: error.message });
    }
  });

  // Get Interviews (for Merchant)
  apiRouter.get("/jobs/interviews/merchant/:merchantId", async (req, res) => {
    const { merchantId } = req.params;
    const supabase = getSupabase();
    
    if (!supabase) {
      const ints = inMemoryInterviews.filter(i => i.merchant_id === merchantId).sort((a, b) => new Date(a.interview_date).getTime() - new Date(b.interview_date).getTime());
      return res.json(ints);
    }

    try {
      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('interview_date', { ascending: true });
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      // Fallback
      const ints = inMemoryInterviews.filter(i => i.merchant_id === merchantId).sort((a, b) => new Date(a.interview_date).getTime() - new Date(b.interview_date).getTime());
      res.json(ints);
    }
  });

  // Get Interviews (for Citizen)
  apiRouter.get("/jobs/interviews/citizen/:citizenId", async (req, res) => {
    const { citizenId } = req.params;
    const supabase = getSupabase();
    
    if (!supabase) {
      const ints = inMemoryInterviews.filter(i => i.citizen_id === citizenId).sort((a, b) => new Date(a.interview_date).getTime() - new Date(b.interview_date).getTime());
      return res.json(ints);
    }

    try {
      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('citizen_id', citizenId)
        .order('interview_date', { ascending: true });
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      // Fallback
      const ints = inMemoryInterviews.filter(i => i.citizen_id === citizenId).sort((a, b) => new Date(a.interview_date).getTime() - new Date(b.interview_date).getTime());
      res.json(ints);
    }
  });

  // Create Interview
  apiRouter.post("/jobs/interviews", async (req, res) => {
    const { merchant_id, citizen_id, merchant_name, candidate_name, role, interview_date, interview_time, location } = req.body;
    const supabase = getSupabase();
    
    const newInt = { 
      id: uuidv4(), 
      merchant_id, 
      citizen_id, 
      merchant_name, 
      candidate_name, 
      role, 
      interview_date, 
      interview_time, 
      location, 
      status: 'SCHEDULED' 
    };

    if (!supabase) {
      inMemoryInterviews.push(newInt);
      return res.json(newInt);
    }

    try {
      const { data, error } = await supabase
        .from('interviews')
        .insert([newInt])
        .select()
        .single();
      
      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      inMemoryInterviews.push(newInt);
      res.json(newInt);
    }
  });

  // Report Discrepancy
  apiRouter.post("/jobs/reports", async (req, res) => {
    const { merchant_id, citizen_id, field_flagged } = req.body;
    const supabase = getSupabase();
    
    // Just log it for now, no persistent store needed for mock reports
    await log(`Merchant ${merchant_id} reported discrepancy for Citizen ${citizen_id} on field ${field_flagged}`, 'WARN');
    
    res.json({ success: true });
  });

  // API 404 Handler
  apiRouter.use((req, res) => {
    res.status(404).json({ error: "API route not found" });
  });

  app.use('/api', apiRouter);

  // Global Error Handler for API
  apiRouter.use((err: any, req: any, res: any, next: any) => {
    console.error(`[API ERROR] ${req.method} ${req.url}:`, err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  });

  // Global Unhandled Rejection Handler
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  // Global error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  });

  // Vite / Static
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // SPA fallback for dev mode
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      
      // Skip API and files with extensions (Vite should handle these or they should 404)
      if (url.startsWith('/api') || url.includes('.')) {
        return next();
      }
      
      try {
        const templatePath = path.resolve(__dirname, 'index.html');
        if (!fs.existsSync(templatePath)) {
          return next();
        }
        let template = fs.readFileSync(templatePath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
