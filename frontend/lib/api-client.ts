/**
 * API Client - Centralized HTTP client for backend API
 */
import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  Order,
  OrderCreate,
  OrderListResponse,
  BankApprovalRequest,
  DeliveryConfirmationRequest,
  SellerProcessRequest,
  CancelOrderRequest,
  OrderStatusHistory,
  Product,
  ProductCreate,
  ProductUpdate,
  ProductListResponse,
  ProductFilters,
  ShariahValidationResult,
  Escrow,
  ShariahResult,
  ShariahValidationRequest,
  ShariahReviewRequest,
  AIDecision,
  AIEvaluationRequest,
  Delivery,
  DeliveryCreate,
  DeliveryStatusUpdate,
  DeliveryConfirmation,
  RegistrationData,
  RegistrationResponse,
  User,
  ShariahCategory,
} from '@/types';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor - Add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - Handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
  }

  // ============ PRODUCTS ============
  async getProducts(
    params?: ProductFilters & { page?: number; page_size?: number }
  ): Promise<ProductListResponse> {
    const response = await this.client.get('/products', { params });
    return response.data;
  }

  async getAvailableProducts(
    params?: { 
      page?: number; 
      page_size?: number; 
      category?: string; 
      search?: string;
      min_price?: number;
      max_price?: number;
    }
  ): Promise<ProductListResponse> {
    const response = await this.client.get('/products/available', { params });
    return response.data;
  }

  async getMyProducts(
    params?: { page?: number; page_size?: number }
  ): Promise<ProductListResponse> {
    const response = await this.client.get('/products/my-products', { params });
    return response.data;
  }

  async getProductsPendingReview(
    params?: { page?: number; page_size?: number }
  ): Promise<ProductListResponse> {
    const response = await this.client.get('/products/pending-review', { params });
    return response.data;
  }

  async getProduct(productId: string): Promise<Product> {
    const response = await this.client.get(`/products/${productId}`);
    return response.data;
  }

  async createProduct(data: ProductCreate): Promise<Product> {
    const response = await this.client.post('/products', data);
    return response.data;
  }

  async updateProduct(productId: string, data: ProductUpdate): Promise<Product> {
    const response = await this.client.put(`/products/${productId}`, data);
    return response.data;
  }

  async deleteProduct(productId: string): Promise<{ message: string; success: boolean; product_id: string }> {
    const response = await this.client.delete(`/products/${productId}`);
    return response.data;
  }

  async submitShariahReview(
    productId: string, 
    shariahCategory: ShariahCategory, 
    notes?: string
  ): Promise<Product> {
    const response = await this.client.post(`/products/${productId}/shariah-review`, {
      product_id: productId,
      shariah_category: shariahCategory,
      notes,
    });
    return response.data;
  }

  async revalidateProduct(productId: string): Promise<ShariahValidationResult> {
    const response = await this.client.post(`/products/${productId}/revalidate`);
    return response.data;
  }

  async updateProductStock(productId: string, quantity: number): Promise<Product> {
    const response = await this.client.patch(`/products/${productId}/stock`, null, {
      params: { quantity },
    });
    return response.data;
  }

  async toggleProductActive(productId: string): Promise<Product> {
    const response = await this.client.patch(`/products/${productId}/toggle-active`);
    return response.data;
  }

  // ============ ORDERS ============
  async getOrders(params?: { 
    status?: string; 
    financing_requested?: boolean;
    skip?: number; 
    limit?: number;
  }): Promise<OrderListResponse> {
    const response = await this.client.get('/orders', { params });
    return response.data;
  }

  async getMyOrders(params?: {
    role_filter?: 'buyer' | 'seller';
    status?: string;
    skip?: number;
    limit?: number;
  }): Promise<OrderListResponse> {
    const response = await this.client.get('/orders/my-orders', { params });
    return response.data;
  }

  async getPendingApprovalOrders(params?: {
    skip?: number;
    limit?: number;
  }): Promise<OrderListResponse> {
    const response = await this.client.get('/orders/pending-approval', { params });
    return response.data;
  }

  async getOrder(orderId: string): Promise<Order> {
    const response = await this.client.get(`/orders/${orderId}`);
    return response.data;
  }

  async getOrderHistory(orderId: string): Promise<OrderStatusHistory[]> {
    const response = await this.client.get(`/orders/${orderId}/history`);
    return response.data;
  }

  async createOrder(data: OrderCreate): Promise<Order> {
    const response = await this.client.post('/orders', data);
    return response.data;
  }

  async bankApproveOrder(orderId: string, data?: BankApprovalRequest): Promise<Order> {
    const response = await this.client.post(`/orders/${orderId}/bank-approve`, data || { approved: true });
    return response.data;
  }

  async bankRejectOrder(orderId: string, data: BankApprovalRequest): Promise<Order> {
    const response = await this.client.post(`/orders/${orderId}/bank-reject`, data);
    return response.data;
  }

  async sellerProcessOrder(orderId: string, data: SellerProcessRequest): Promise<Order> {
    const response = await this.client.post(`/orders/${orderId}/seller-process`, data);
    return response.data;
  }

  async confirmDelivery(orderId: string, data: DeliveryConfirmationRequest): Promise<Order> {
    const response = await this.client.post(`/orders/${orderId}/confirm-delivery`, data);
    return response.data;
  }

  async cancelOrder(orderId: string, data: CancelOrderRequest): Promise<Order> {
    const response = await this.client.post(`/orders/${orderId}/cancel`, data);
    return response.data;
  }

  // ============ ESCROW ============
  async getEscrow(orderId: string): Promise<Escrow> {
    const response = await this.client.get(`/escrow/order/${orderId}`);
    return response.data;
  }

  async releaseEscrow(orderId: string): Promise<Escrow> {
    const response = await this.client.post(`/escrow/${orderId}/release`);
    return response.data;
  }

  async revertEscrow(orderId: string, reason?: string): Promise<Escrow> {
    const response = await this.client.post(`/escrow/${orderId}/revert`, null, {
      params: { reason },
    });
    return response.data;
  }

  async freezeEscrow(orderId: string, reason?: string): Promise<Escrow> {
    const response = await this.client.post(`/escrow/${orderId}/freeze`, null, {
      params: { reason },
    });
    return response.data;
  }

  // ============ SHARIAH ============
  async getShariahResult(orderId: string): Promise<ShariahResult> {
    const response = await this.client.get(`/shariah/order/${orderId}`);
    return response.data;
  }

  async validateShariah(data: ShariahValidationRequest): Promise<ShariahResult> {
    const response = await this.client.post('/shariah/validate', data);
    return response.data;
  }

  async reviewShariah(data: ShariahReviewRequest): Promise<ShariahResult> {
    const response = await this.client.post('/shariah/review', data);
    return response.data;
  }

  // ============ AI ============
  async getAIDecision(orderId: string): Promise<AIDecision> {
    const response = await this.client.get(`/ai/order/${orderId}`);
    return response.data;
  }

  async evaluateAI(data: AIEvaluationRequest): Promise<AIDecision> {
    const response = await this.client.post('/ai/evaluate', data);
    return response.data;
  }

  async validateDeliveryAI(orderId: string): Promise<{ ai_validated: boolean; message: string }> {
    const response = await this.client.post(`/ai/validate-delivery`, null, {
      params: { order_id: orderId },
    });
    return response.data;
  }

  // ============ DELIVERY ============
  async getDelivery(orderId: string): Promise<Delivery> {
    const response = await this.client.get(`/delivery/order/${orderId}`);
    return response.data;
  }

  async createDelivery(data: DeliveryCreate): Promise<Delivery> {
    const response = await this.client.post('/delivery', data);
    return response.data;
  }

  async updateDeliveryStatus(orderId: string, data: DeliveryStatusUpdate): Promise<Delivery> {
    const response = await this.client.put(`/delivery/${orderId}/status`, data);
    return response.data;
  }

  async confirmDeliveryDelivery(orderId: string, data: DeliveryConfirmation): Promise<Delivery> {
    const response = await this.client.post(`/delivery/${orderId}/confirm`, data);
    return response.data;
  }

  async assignLiability(orderId: string, liableParty: string): Promise<Delivery> {
    const response = await this.client.post(`/delivery/${orderId}/assign-liability`, null, {
      params: { liable_party: liableParty },
    });
    return response.data;
  }

  // ============ AUTH & REGISTRATION ============
  async register(data: RegistrationData): Promise<RegistrationResponse> {
    // Map frontend role values to backend enum values
    const roleMapping: Record<string, string> = {
      'BUYER': 'buyer',
      'SELLER': 'seller',
      'BANK': 'bank',
      'DELIVERY': 'delivery_provider',
    };
    
    const payload = {
      ...data,
      role: roleMapping[data.role] || data.role.toLowerCase(),
    };
    
    const response = await this.client.post('/auth/register', payload);
    return response.data;
  }

  async login(
    email: string, 
    password: string, 
    rememberMe: boolean = false
  ): Promise<{ user: User; token: string; refresh_token?: string }> {
    const response = await this.client.post('/auth/login', { 
      email, 
      password,
      remember_me: rememberMe,
    });
    
    // Map response to expected format
    const result = {
      user: response.data.user,
      token: response.data.access_token,
      refresh_token: response.data.refresh_token,
    };
    
    return result;
  }

  async refreshTokens(refreshToken: string): Promise<{ user: User; token: string; refresh_token?: string }> {
    const response = await this.client.post('/auth/refresh', { 
      refresh_token: refreshToken 
    });
    
    return {
      user: response.data.user,
      token: response.data.access_token,
      refresh_token: response.data.refresh_token,
    };
  }

  async verifyEmail(token: string): Promise<{ message: string; success: boolean }> {
    const response = await this.client.post('/auth/verify-email', { token });
    return response.data;
  }

  async resendVerification(email: string): Promise<{ message: string; success: boolean }> {
    const response = await this.client.post('/auth/resend-verification', { email });
    return response.data;
  }

  async forgotPassword(email: string): Promise<{ message: string; success: boolean }> {
    const response = await this.client.post('/auth/forgot-password', { email });
    return response.data;
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string; success: boolean }> {
    const response = await this.client.post('/auth/reset-password', { 
      token, 
      new_password: newPassword,
      confirm_password: newPassword,
    });
    return response.data;
  }

  async changePassword(
    currentPassword: string, 
    newPassword: string
  ): Promise<{ message: string; success: boolean }> {
    const response = await this.client.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: newPassword,
    });
    return response.data;
  }

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get('/auth/me');
    return response.data;
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await this.client.patch('/auth/me', data);
    return response.data;
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  // ============ BUYER ESCROW & TRANSACTIONS ============
  async getBuyerEscrows(): Promise<Escrow[]> {
    const response = await this.client.get('/escrow/buyer');
    return response.data;
  }

  async getBuyerTransactions(): Promise<any[]> {
    const response = await this.client.get('/transactions/buyer');
    return response.data;
  }

  // ============ BANK ESCROW MANAGEMENT ============
  async getAllEscrows(params?: { status?: string; skip?: number; limit?: number }): Promise<Escrow[]> {
    const response = await this.client.get('/escrow', { params });
    return response.data;
  }

  async getEscrowsForRelease(): Promise<Escrow[]> {
    const response = await this.client.get('/escrow/pending-release');
    return response.data;
  }

  async getAllShariahResults(params?: { status?: string; skip?: number; limit?: number }): Promise<ShariahResult[]> {
    const response = await this.client.get('/shariah/results', { params });
    return response.data;
  }

  async getEscrowStats(): Promise<any> {
    const response = await this.client.get('/escrow/stats');
    return response.data;
  }

  async getComplianceStats(): Promise<any> {
    const response = await this.client.get('/shariah/stats');
    return response.data;
  }

  // ============ SELLER PAYMENTS & ESCROW ============
  async getSellerPayments(): Promise<any[]> {
    const response = await this.client.get('/payments/seller');
    return response.data;
  }

  async getSellerEscrows(): Promise<Escrow[]> {
    const response = await this.client.get('/escrow/seller');
    return response.data;
  }

  async getSellerTransactions(): Promise<any[]> {
    const response = await this.client.get('/transactions/seller');
    return response.data;
  }

  // ============ AUDIT ============
  async getAuditSummary(days?: number): Promise<any> {
    const response = await this.client.get('/audit/summary', { params: { days } });
    return response.data;
  }

  async getAuditLogs(params?: { page?: number; page_size?: number; entity_type?: string; action?: string; actor_type?: string }): Promise<any> {
    const response = await this.client.get('/audit/logs', { params });
    return response.data;
  }

  async getAuditEntityTypes(): Promise<string[]> {
    const response = await this.client.get('/audit/entity-types');
    return response.data;
  }

  async getAuditActions(): Promise<string[]> {
    const response = await this.client.get('/audit/actions');
    return response.data;
  }

  // ============ RELEASE GATE ============
  async checkReleaseConditions(orderId: string): Promise<any> {
    const response = await this.client.get(`/orders/${orderId}/release-conditions`);
    return response.data;
  }

  async executeRelease(orderId: string): Promise<any> {
    const response = await this.client.post(`/orders/${orderId}/release`);
    return response.data;
  }

  // ============ FUND ESCROW ============
  async fundEscrow(orderId: string, data: { amount: number; bank_reference?: string; notes?: string }): Promise<any> {
    const response = await this.client.post(`/escrow/${orderId}/fund`, data);
    return response.data;
  }

  // ============ SHARIAH CERTIFICATE ============
  async getShariahCertificate(orderId: string): Promise<any> {
    const response = await this.client.get(`/shariah/certificate/${orderId}`);
    return response.data;
  }
}

export const apiClient = new ApiClient();



