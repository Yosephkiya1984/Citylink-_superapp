import { UserProfile, Transaction, CityService, Journey, EkubMember, EkubRound, Ekub, Product, Order, ParkingSession, TrafficFine, Student, SchoolFee } from '../types';

const API_BASE = window.location.origin + '/api';

export const api = {
  async login(phone: string): Promise<UserProfile> {
    return this.post('/login', { phone });
  },

  async register(data: any): Promise<UserProfile> {
    return this.post('/register', data);
  },

  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      return await this.get(`/user/${userId}`);
    } catch (e) {
      return null;
    }
  },

  async getTransactions(userId: string): Promise<Transaction[]> {
    try {
      return await this.get(`/transactions/${userId}`);
    } catch (e) {
      console.error("Failed to fetch transactions:", e);
      return [];
    }
  },

  async createCheckoutSession(data: { 
    amount: number; 
    currency: string; 
    productName: string; 
    successUrl: string; 
    cancelUrl: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    txRef?: string;
  }): Promise<{ url: string }> {
    return this.post('/create-checkout-session', data);
  },

  async pay(userId: string, merchantId: string, amount: number, description: string) {
    return this.post('/pay', { userId, merchantId, amount, description });
  },

  async getServices(): Promise<CityService[]> {
    try {
      return await this.get('/services');
    } catch (e) {
      console.error("Failed to fetch services:", e);
      return [];
    }
  },

  async getAdminStats() {
    return this.get('/admin/stats');
  },

  async verifyMerchant(userId: string, status: string) {
    return this.post('/admin/verify-merchant', { userId, status });
  },

  async getHealth() {
    return this.get('/health');
  },

  async fetchUtilityBill(type: string, customerId: string) {
    return this.get(`/utility/bill/${type}/${customerId}`);
  },

  async startJourney(userId: string, type: 'LRT' | 'BUS', startStation: string) {
    return this.post('/transport/journey/start', { userId, type, startStation });
  },

  async endJourney(journeyId: string, endStation: string) {
    return this.post('/transport/journey/end', { journeyId, endStation });
  },

  async submitReport(reportData: any) {
    return this.post('/reports', reportData);
  },

  async getDiscoverEkubs() {
    try {
      return await this.get('/ekub/discover');
    } catch (e) {
      console.error("Failed to fetch discoverable ekubs:", e);
      return [];
    }
  },

  async getEkubDetails(id: string) {
    return this.get(`/ekub/${id}`);
  },

  async joinEkub(ekubId: string, userId: string) {
    return this.post(`/ekub/${ekubId}/join`, { userId });
  },

  async approveEkubMember(ekubId: string, userId: string) {
    return this.post(`/ekub/${ekubId}/approve`, { userId });
  },

  async drawEkubWinner(ekubId: string, roundNumber: number) {
    return this.post(`/ekub/${ekubId}/draw`, { roundNumber });
  },

  async signEkubWinner(ekubId: string, roundNumber: number, userId: string) {
    return this.post(`/ekub/${ekubId}/sign`, { roundNumber, userId });
  },

  async disburseEkub(ekubId: string, roundNumber: number) {
    return this.post(`/ekub/${ekubId}/payout`, { roundNumber });
  },

  async getMarketplaceProducts() {
    return this.get('/marketplace/products');
  },

  async getMerchantProducts(merchantId: string) {
    return this.get(`/marketplace/merchant/${merchantId}/products`);
  },

  async createProduct(productData: any) {
    return this.post('/marketplace/products', productData);
  },

  async createOrder(buyerId: string, productId: string, quantity: number, shippingAddress?: string) {
    return this.post('/marketplace/orders', { buyerId, productId, quantity, shippingAddress });
  },

  async getUserOrders(userId: string) {
    return this.get(`/marketplace/orders/${userId}`);
  },

  async confirmDelivery(orderId: string, code: string) {
    return this.post(`/marketplace/orders/${orderId}/confirm`, { code });
  },

  async raiseDispute(orderId: string, reason: string) {
    return this.post(`/marketplace/orders/${orderId}/dispute`, { reason });
  },

  async shipOrder(orderId: string, trackingNumber?: string) {
    return this.post(`/marketplace/orders/${orderId}/ship`, { trackingNumber });
  },

  async getMerchantOrders(merchantId: string) {
    return this.get(`/marketplace/merchant/${merchantId}/orders`);
  },

  async getMerchantStats(merchantId: string) {
    return this.get(`/merchant/${merchantId}/stats`);
  },

  async updateOrderStatus(orderId: string, status: string) {
    return this.post(`/marketplace/orders/${orderId}/status`, { status });
  },

  async applyToBeMerchant(applicationData: any) {
    return this.post('/merchant/apply', applicationData);
  },

  async startParkingSession(userId: string, spotId: string, pricePerHour: number): Promise<ParkingSession> {
    return this.post('/parking/session/start', { userId, spotId, pricePerHour });
  },

  async endParkingSession(sessionId: string): Promise<ParkingSession> {
    return this.post('/parking/session/end', { sessionId });
  },

  async getUserParkingSessions(userId: string): Promise<ParkingSession[]> {
    return this.get(`/parking/session/user/${userId}`);
  },

  async createParkingLot(lotData: any): Promise<any> {
    return this.post('/parking/lots', lotData);
  },

  async getMerchantParkingLots(merchantId: string): Promise<any[]> {
    return this.get(`/parking/lots/${merchantId}`);
  },

  async getMerchantParkingSessions(merchantId: string): Promise<ParkingSession[]> {
    return this.get(`/parking/session/merchant/${merchantId}`);
  },

  async getParkingLotDetails(lotId: string): Promise<any> {
    return this.get(`/parking/lots/single/${lotId}`);
  },

  async updateParkingLot(lotId: string, lotData: any): Promise<any> {
    return this.put(`/parking/lots/${lotId}`, lotData);
  },

  async getParkingLotSpots(lotId: string): Promise<any[]> {
    return this.get(`/parking/lots/${lotId}/spots`);
  },

  async updateParkingSpot(lotId: string, spotId: string, spotData: any): Promise<any> {
    return this.put(`/parking/lots/${lotId}/spots/${spotId}`, spotData);
  },

  async getAvailableParkingSpots(query?: string): Promise<any[]> {
    const url = query ? `/parking/spots/available?q=${encodeURIComponent(query)}` : '/parking/spots/available';
    return this.get(url);
  },

  async getTrafficFines(identifier: string): Promise<TrafficFine[]> {
    return this.get(`/traffic/fines/${identifier}`);
  },

  async payTrafficFine(fineId: string, userId: string, provider: 'citylink' | 'telebirr' | 'cbe' = 'citylink'): Promise<any> {
    return this.post(`/traffic/fines/${fineId}/pay`, { userId, provider });
  },

  async getStudentFees(identifier: string): Promise<{ student: Student; fees: SchoolFee[] }> {
    return this.get(`/education/student/${identifier}`);
  },

  async paySchoolFee(feeId: string, userId: string, provider: 'citylink' | 'telebirr' | 'cbe' = 'citylink'): Promise<any> {
    return this.post(`/education/fees/${feeId}/pay`, { userId, provider });
  },

  async fundWallet(userId: string, amount: number, bankId: string, bankAccount: string): Promise<any> {
    return this.post('/wallet/fund', { userId, amount, bankId, bankAccount });
  },

  async logout() {
    return this.post('/logout', {});
  },

  async getPendingMerchants() {
    return this.get('/admin/pending-merchants');
  },

  async withdrawFunds(merchantId: string, amount: number, method: string, accountDetails: any) {
    return this.post('/merchant/withdraw', { merchantId, amount, method, accountDetails });
  },

  async get(url: string) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout
    
    try {
      const res = await fetch(`${API_BASE}${url}`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const text = await res.text();
        let errorMsg = 'API GET request failed';
        try {
          const errorData = JSON.parse(text);
          if (typeof errorData.error === 'string') {
            errorMsg = errorData.error;
          } else if (typeof errorData.message === 'string') {
            errorMsg = errorData.message;
          } else {
            errorMsg = JSON.stringify(errorData);
          }
        } catch (e) {
          errorMsg = text || errorMsg;
        }
        throw new Error(errorMsg);
      }
      return res.json();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. Please check your connection.');
      }
      throw err;
    }
  },

  async post(url: string, data: any) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for POST
    
    try {
      const res = await fetch(`${API_BASE}${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const text = await res.text();
        let errorMsg = 'API POST request failed';
        try {
          const errorData = JSON.parse(text);
          if (typeof errorData.error === 'string') {
            errorMsg = errorData.error;
          } else if (typeof errorData.message === 'string') {
            errorMsg = errorData.message;
          } else {
            errorMsg = JSON.stringify(errorData);
          }
        } catch (e) {
          errorMsg = text || errorMsg;
        }
        throw new Error(errorMsg);
      }
      return res.json();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. Please check your connection.');
      }
      throw err;
    }
  },

  async put(url: string, data: any) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for PUT
    
    try {
      const res = await fetch(`${API_BASE}${url}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      if (!res.ok) {
        const text = await res.text();
        let errorMsg = 'API PUT request failed';
        try {
          const errorData = JSON.parse(text);
          if (typeof errorData.error === 'string') {
            errorMsg = errorData.error;
          } else if (typeof errorData.message === 'string') {
            errorMsg = errorData.message;
          } else {
            errorMsg = JSON.stringify(errorData);
          }
        } catch (e) {
          errorMsg = text || errorMsg;
        }
        throw new Error(errorMsg);
      }
      return res.json();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Request timed out. Please check your connection.');
      }
      throw err;
    }
  }
};
