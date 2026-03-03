export type UserRole = 'citizen' | 'merchant' | 'minister';

export type MerchantStatus = 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface UserProfile {
  id: string;
  phone: string;
  email?: string;
  role: UserRole;
  name?: string;
  balance?: number;
  registration_complete: boolean;
  merchant_status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  merchant_name?: string;
  merchant_type?: string;
  isLoggedIn: boolean;
  kyc_status?: 'NONE' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  id_number?: string;
  business_license?: string;
  error?: string;
}

export type ViewState = 
  | 'home' 
  | 'services' 
  | 'wallet' 
  | 'profile' 
  | 'service_detail'
  | 'onboarding'
  | 'transport_hub'
  | 'city_report'
  | 'ekub'
  | 'marketplace'
  | 'merchant_application'
  | 'merchant_dashboard' 
  | 'merchant_inventory' 
  | 'merchant_qr'
  | 'minister_dashboard'
  | 'minister_analytics'
  | 'ekub_merchant_dashboard'
  | 'parking_citizen_hub'
  | 'traffic_fines'
  | 'school_fees'
  | 'wallet_funding'
  | 'transaction_history'
  | 'payment_receipt'
  | 'job_dashboard'
  | 'employer_dashboard';

export type OnboardingStage = 
  | 'WELCOME'
  | 'PHONE'
  | 'OTP'
  | 'ROLE_SELECTION'
  | 'MERCHANT_TYPE_SELECTION'
  | 'KYC_FORM'
  | 'KYC_ID_SCAN'
  | 'KYC_FACE'
  | 'KYB_FORM'
  | 'KYB_DOCS'
  | 'SUCCESS'
  | 'PENDING_APPROVAL'
  | 'COMPLETE';

export interface Transaction {
  id: string;
  userId: string;
  merchantId: string;
  amount: number;
  type: string;
  status: string;
  description?: string;
  timestamp: string;
}

export interface CityService {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
  price: number;
}

export interface Journey {
  id: string;
  userId: string;
  type: 'LRT' | 'BUS';
  startStation: string;
  startTime: string;
  endStation?: string;
  endTime?: string;
  fare?: number;
  status: 'ACTIVE' | 'COMPLETED';
}

export interface EkubMember {
  id: string;
  userId: string; // Link to the actual user
  name: string;
  avatarUrl?: string;
  contributionStatus: 'PAID' | 'PENDING' | 'DEFAULTED';
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface EkubRound {
  id: string;
  ekubId: string;
  roundNumber: number;
  winnerId: string | null; // ID of the winner
  payoutDate: string;
  status: 'PENDING_CONTRIBUTIONS' | 'READY_FOR_PAYOUT' | 'COMPLETED';
  totalCollected: number;
  escrowReleased: boolean;
  guarantor1Id?: string | null;
  guarantor2Id?: string | null;
}

export interface Ekub {
  id: string;
  name: string;
  creatorId: string;
  contributionAmount: number;
  frequency: 'WEEKLY' | 'MONTHLY';
  memberCount: number;
  maxMembers: number;
  currentRoundNumber: number;
  nextPayoutDate: string | null;
  escrowBalance: number; // Funds held in escrow
  members: EkubMember[];
  rounds: EkubRound[];
  status: 'FORMING' | 'ACTIVE' | 'COMPLETED';
}

export interface Product {
  id: string;
  merchantId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  stock: number;
  sellerName?: string;
  sellerLocation?: string;
}

export interface ParkingSession {
  id: string;
  userId: string;
  spotId: string;
  spotName: string;
  startTime: string;
  endTime?: string;
  pricePerHour: number;
  duration?: string;
  totalCost?: number;
  status: 'ACTIVE' | 'COMPLETED';
}

export interface ParkingSpot {
  id: string;
  lotId: string;
  spotNumber: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'OUT_OF_SERVICE';
  occupiedBy: string | null; // userId
  checkInTime: string | null;
}

export interface ParkingLot {
  id: string;
  merchantId: string;
  name: string;
  address: string;
  capacity: number;
  totalSpots: number;
  availableSpots: number;
  baseRate: number;
  additionalRate: number;
  dailyMax: number;
  createdAt: string;
  spots: ParkingSpot[];
}

export interface Order {
  id: string;
  buyerId: string;
  productId: string;
  product: Product;
  quantity: number;
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'DISPUTED' | 'CANCELLED';
  escrowStatus: 'FUNDED' | 'RELEASED' | 'REFUNDED' | 'DISPUTED';
  createdAt: string;
  trackingNumber?: string;
  confirmationCode?: string;
  disputeReason?: string;
  shippingAddress?: string;
}

export interface TrafficFine {
  id: string;
  plateNumber: string;
  noticeNumber: string; // Official Addis Ababa Ticket/Notice Number
  violationType: string;
  location: string;
  amount: number;
  date: string;
  status: 'UNPAID' | 'PAID' | 'OVERDUE';
  officerId?: string;
  evidenceUrl?: string;
}

export interface Student {
  id: string;
  name: string;
  schoolName: string;
  grade: string;
  parentPhone: string;
  paymentCode?: string; // Unique code for bank/mobile money payments
}

export interface SchoolFee {
  id: string;
  studentId: string;
  feeType: 'TUITION' | 'REGISTRATION' | 'UNIFORM' | 'TRANSPORT' | 'LAB' | 'LIBRARY' | 'BOOK' | 'EXTRACURRICULAR' | 'OTHER';
  amount: number;
  dueDate: string;
  status: 'UNPAID' | 'PAID' | 'PARTIAL';
  academicYear: string;
  term: string;
  invoiceNumber?: string;
}
