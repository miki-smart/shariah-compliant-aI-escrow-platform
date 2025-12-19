/**
 * TypeScript types matching backend schemas
 */

// Order Types
export enum OrderStatus {
  CREATED = 'CREATED',
  SHARIAH_PENDING = 'SHARIAH_PENDING',
  SHARIAH_APPROVED = 'SHARIAH_APPROVED',
  SHARIAH_REJECTED = 'SHARIAH_REJECTED',
  AI_PENDING = 'AI_PENDING',
  AI_APPROVED = 'AI_APPROVED',
  AI_REJECTED = 'AI_REJECTED',
  BANK_PENDING = 'BANK_PENDING',
  BANK_APPROVED = 'BANK_APPROVED',
  BANK_REJECTED = 'BANK_REJECTED',
  ESCROW_LOCKED = 'ESCROW_LOCKED',
  PREPARING = 'PREPARING',
  DELIVERY_PENDING = 'DELIVERY_PENDING',
  DELIVERY_IN_TRANSIT = 'DELIVERY_IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  DELIVERY_FAILED = 'DELIVERY_FAILED',
  ESCROW_RELEASED = 'ESCROW_RELEASED',
  ESCROW_REVERTED = 'ESCROW_REVERTED',
  CANCELLED = 'CANCELLED',
}

export interface OrderCreate {
  product_id: string;
  quantity: number;
  financing_requested: boolean;
  notes?: string;
}

export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  quantity: number;
  total_amount: number;
  status: OrderStatus;
  financing_requested: string;
  bank_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Product Types
export interface ProductCreate {
  name: string;
  description?: string;
  category: string;
  price: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  category: string;
  halal_status?: 'PENDING' | 'HALAL' | 'HARAM';
  seller_id: string;
  price: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Escrow Types
export enum EscrowState {
  PENDING = 'PENDING',
  LOCKED = 'LOCKED',
  RELEASED = 'RELEASED',
  REVERTED = 'REVERTED',
  FROZEN = 'FROZEN',
}

export interface Escrow {
  id: string;
  order_id: string;
  amount: number;
  state: EscrowState;
  bank_id: string;
  locked_at?: string;
  released_at?: string;
  reverted_at?: string;
  created_at: string;
  updated_at: string;
}

// Shariah Types
export interface ShariahResult {
  id: string;
  order_id: string;
  compliant: boolean;
  violations?: Array<Record<string, any>>;
  haram_products_detected: boolean;
  transaction_structure_valid?: boolean;
  review_notes?: string;
  reviewed_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ShariahValidationRequest {
  order_id: string;
}

export interface ShariahReviewRequest {
  order_id: string;
  compliant: boolean;
  review_notes?: string;
  violations?: Array<Record<string, any>>;
}

// AI Decision Types
export interface AIDecision {
  id: string;
  order_id: string;
  decision: 'APPROVED' | 'REJECTED' | 'PENDING';
  credit_score?: number;
  fraud_score?: number;
  delivery_reliability_score?: number;
  reasoning?: string;
  risk_factors?: Array<string>;
  created_at: string;
  updated_at: string;
}

export interface AIEvaluationRequest {
  order_id: string;
}

// Delivery Types
export enum DeliveryStatus {
  PENDING = 'PENDING',
  ASSIGNED = 'ASSIGNED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

export interface Delivery {
  id: string;
  order_id: string;
  provider_id: string;
  tracking_number?: string;
  status: DeliveryStatus;
  estimated_delivery?: string;
  actual_delivery?: string;
  delivery_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DeliveryCreate {
  order_id: string;
  provider_id: string;
  tracking_number?: string;
  estimated_delivery?: string;
}

export interface DeliveryStatusUpdate {
  status: DeliveryStatus;
  delivery_notes?: string;
}

export interface DeliveryConfirmation {
  confirmed: boolean;
  notes?: string;
}

// User & Auth Types
export interface User {
  id: string;
  username: string;
  email?: string;
  role?: string;           // Backend returns single role
  roles?: string[];        // Some places use roles array
  first_name?: string;
  last_name?: string;
  phone?: string;
  company_name?: string;
  is_verified?: boolean;
  created_at?: string;
}

export type UserRole = 'BUYER' | 'SELLER' | 'BANK' | 'DELIVERY';

// Registration Types
export interface RegistrationData {
  // Step 1: Role Selection
  role: UserRole;
  
  // Step 2: Account Info
  email: string;
  password: string;
  confirm_password: string;
  
  // Step 3: Personal/Business Info
  first_name: string;
  last_name: string;
  phone: string;
  company_name?: string;
  business_license?: string;
  address?: string;
  city?: string;
  country?: string;
  
  // Step 4: Shariah Acknowledgment
  shariah_acknowledged: boolean;
  terms_accepted: boolean;
}

export interface RegistrationResponse {
  user_id: string;
  email: string;
  message: string;
  verification_required: boolean;
}

export interface RoleInfo {
  id: UserRole;
  title: string;
  description: string;
  icon: string;
  features: string[];
}

// UI State Types
export interface StatusConfig {
  label: string;
  color: string;
  bgColor: string;
  icon?: string;
}


