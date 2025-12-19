/**
 * API Client - Centralized HTTP client for backend API
 */
import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  Order,
  OrderCreate,
  Product,
  ProductCreate,
  Escrow,
  EscrowBalance,
  EscrowFundRequest,
  EscrowOperationResult,
  EscrowTransaction,
  EscrowReleaseConditionsResponse,
  ShariahResult,
  ShariahStatusResponse,
  ShariahCertificate,
  ShariahValidationRequest,
  ShariahReviewRequest,
  ProductKeywordCheckRequest,
  ProductKeywordCheckResponse,
  ShariahRule,
  AIDecision,
  AIEvaluationRequest,
  Delivery,
  DeliveryCreate,
  DeliveryStatusUpdate,
  DeliveryConfirmation,
  ReleaseGateResponse,
  ManualReleaseRequest,
  ReleaseExecutionResult,
  AuditLogListResponse,
  AuditLogEntry,
  OrderAuditTrail,
  AuditLogSummary,
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
  async getProducts(params?: { skip?: number; limit?: number; category?: string }): Promise<Product[]> {
    const response = await this.client.get('/products', { params });
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

  // ============ ORDERS ============
  async getOrders(params?: { skip?: number; limit?: number }): Promise<Order[]> {
    const response = await this.client.get('/orders', { params });
    return response.data;
  }

  async getOrder(orderId: string): Promise<Order> {
    const response = await this.client.get(`/orders/${orderId}`);
    return response.data;
  }

  async createOrder(data: OrderCreate): Promise<Order> {
    const response = await this.client.post('/orders', data);
    return response.data;
  }

  async bankApproveOrder(orderId: string): Promise<Order> {
    const response = await this.client.post(`/orders/${orderId}/bank-approve`);
    return response.data;
  }

  async bankRejectOrder(orderId: string, reason?: string): Promise<Order> {
    const response = await this.client.post(`/orders/${orderId}/bank-reject`, null, {
      params: { reason },
    });
    return response.data;
  }

  async confirmDelivery(orderId: string, confirmed: boolean, notes?: string): Promise<Order> {
    const response = await this.client.post(`/orders/${orderId}/confirm-delivery`, null, {
      params: { confirmed, notes },
    });
    return response.data;
  }

  // ============ ESCROW ============
  async getEscrow(orderId: string): Promise<Escrow> {
    const response = await this.client.get(`/escrow/order/${orderId}`);
    return response.data;
  }

  async getEscrowById(escrowId: string): Promise<Escrow> {
    const response = await this.client.get(`/escrow/${escrowId}`);
    return response.data;
  }

  async getEscrowBalance(orderId: string): Promise<EscrowBalance> {
    const response = await this.client.get(`/escrow/${orderId}/balance`);
    return response.data;
  }

  async fundEscrow(orderId: string, data: EscrowFundRequest): Promise<EscrowOperationResult> {
    const response = await this.client.post(`/escrow/${orderId}/fund`, data);
    return response.data;
  }

  async releaseEscrow(orderId: string, reason?: string): Promise<EscrowOperationResult> {
    const response = await this.client.post(`/escrow/${orderId}/release`, {
      reason,
    });
    return response.data;
  }

  async refundEscrow(orderId: string, reason: string, refundTo: string = 'buyer'): Promise<EscrowOperationResult> {
    const response = await this.client.post(`/escrow/${orderId}/refund`, {
      reason,
      refund_to: refundTo,
    });
    return response.data;
  }

  async freezeEscrow(orderId: string, reason: string): Promise<EscrowOperationResult> {
    const response = await this.client.post(`/escrow/${orderId}/freeze`, {
      reason,
    });
    return response.data;
  }

  async getEscrowTransactions(
    orderId: string,
    page: number = 1,
    pageSize: number = 20
  ): Promise<{ transactions: EscrowTransaction[]; total: number; page: number; page_size: number; total_pages: number }> {
    const response = await this.client.get(`/escrow/${orderId}/transactions`, {
      params: { page, page_size: pageSize },
    });
    return response.data;
  }

  async getReleaseConditions(orderId: string): Promise<EscrowReleaseConditionsResponse> {
    const response = await this.client.get(`/escrow/${orderId}/release-conditions`);
    return response.data;
  }

  async updateReleaseCondition(
    orderId: string,
    conditionName: string,
    met: boolean
  ): Promise<{ success: boolean; message: string; all_conditions_met: boolean; can_release: boolean }> {
    const response = await this.client.put(`/escrow/${orderId}/release-conditions/${conditionName}`, null, {
      params: { met },
    });
    return response.data;
  }

  // ============ SHARIAH ============
  async getShariahResult(orderId: string): Promise<ShariahResult> {
    const response = await this.client.get(`/shariah/${orderId}/result`);
    return response.data;
  }

  async getShariahStatus(orderId: string): Promise<ShariahStatusResponse> {
    const response = await this.client.get(`/shariah/${orderId}/status`);
    return response.data;
  }

  async validateShariah(orderId: string, forceRevalidation: boolean = false): Promise<ShariahResult> {
    const response = await this.client.post(`/shariah/validate/${orderId}`, null, {
      params: { force_revalidation: forceRevalidation },
    });
    return response.data;
  }

  async getShariahCertificate(orderId: string): Promise<ShariahCertificate> {
    const response = await this.client.get(`/shariah/${orderId}/certificate`);
    return response.data;
  }

  async reviewShariah(orderId: string, data: ShariahReviewRequest): Promise<ShariahResult> {
    const response = await this.client.post(`/shariah/${orderId}/review`, data);
    return response.data;
  }

  async checkProductKeywords(data: ProductKeywordCheckRequest): Promise<ProductKeywordCheckResponse> {
    const response = await this.client.post('/shariah/check-keywords', data);
    return response.data;
  }

  async getShariahRules(): Promise<{ rules: ShariahRule[]; total: number }> {
    const response = await this.client.get('/shariah/rules');
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

  // ============ RELEASE GATE ============
  async checkReleaseConditions(orderId: string): Promise<ReleaseGateResponse> {
    const response = await this.client.get(`/release/conditions/${orderId}`);
    return response.data;
  }

  async executeRelease(orderId: string): Promise<ReleaseExecutionResult> {
    const response = await this.client.post(`/release/execute/${orderId}`);
    return response.data;
  }

  async manualRelease(orderId: string, data: ManualReleaseRequest): Promise<ReleaseExecutionResult> {
    const response = await this.client.post(`/release/manual/${orderId}`, data);
    return response.data;
  }

  async checkAutoRelease(orderId: string): Promise<{
    order_id: string;
    should_release: boolean;
    release_triggered: boolean;
    conditions_summary: Record<string, boolean>;
    message: string;
  }> {
    const response = await this.client.get(`/release/auto-check/${orderId}`);
    return response.data;
  }

  async simulateReleaseCheck(orderId: string, aiScenario?: string): Promise<ReleaseGateResponse> {
    const response = await this.client.post(`/release/simulate/${orderId}`, null, {
      params: aiScenario ? { ai_scenario: aiScenario } : undefined,
    });
    return response.data;
  }

  // ============ AUDIT ============
  async getAuditLogs(params: {
    page?: number;
    page_size?: number;
    entity_type?: string;
    entity_id?: string;
    action?: string;
    actor_type?: string;
    start_date?: string;
    end_date?: string;
  } = {}): Promise<AuditLogListResponse> {
    const response = await this.client.get('/audit/logs', { params });
    return response.data;
  }

  async getAuditLogDetail(logId: string): Promise<AuditLogEntry> {
    const response = await this.client.get(`/audit/logs/${logId}`);
    return response.data;
  }

  async getOrderAuditTrail(orderId: string): Promise<OrderAuditTrail> {
    const response = await this.client.get(`/audit/order/${orderId}`);
    return response.data;
  }

  async getAuditSummary(days: number = 7): Promise<AuditLogSummary> {
    const response = await this.client.get('/audit/summary', { params: { days } });
    return response.data;
  }

  async getAuditActions(): Promise<string[]> {
    const response = await this.client.get('/audit/actions');
    return response.data;
  }

  async getAuditEntityTypes(): Promise<string[]> {
    const response = await this.client.get('/audit/entity-types');
    return response.data;
  }
}

export const apiClient = new ApiClient();


