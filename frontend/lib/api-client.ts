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
  ShariahResult,
  ShariahValidationRequest,
  ShariahReviewRequest,
  AIDecision,
  AIEvaluationRequest,
  Delivery,
  DeliveryCreate,
  DeliveryStatusUpdate,
  DeliveryConfirmation,
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
}

export const apiClient = new ApiClient();


