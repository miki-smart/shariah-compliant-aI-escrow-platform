/**
 * TypeScript types matching backend schemas
 */

// Order Types
export enum OrderStatus {
  CREATED = 'created',
  SHARIAH_VALIDATED = 'shariah_validated',
  AI_EVALUATED = 'ai_evaluated',
  PENDING_BANK_APPROVAL = 'pending_bank_approval',
  BANK_APPROVED = 'bank_approved',
  FUNDED = 'funded',
  PROCESSING = 'processing',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  DELIVERY_VERIFIED = 'delivery_verified',
  SETTLED = 'settled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  DISPUTED = 'disputed',
  BLOCKED = 'blocked',
  FROZEN = 'frozen',
}

export enum ShariahStatus {
  PENDING = 'pending',
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  REQUIRES_REVIEW = 'requires_review',
  VIOLATION_DETECTED = 'violation_detected',
}

export enum AIApprovalStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PENDING_REVIEW = 'pending_review',
  FLAGGED = 'flagged',
}

export enum BankApprovalStatus {
  NOT_REQUESTED = 'not_requested',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  REQUIRES_INFO = 'requires_info',
}

export enum ContractType {
  MURABAHA = 'murabaha',
  SALAM = 'salam',
  ISTISNA = 'istisna',
  MUSAWAMAH = 'musawamah',
  CASH = 'cash',
}

export enum OwnershipStatus {
  SELLER = 'seller',
  IN_TRANSIT = 'in_transit',
  BUYER = 'buyer',
}

export interface DeliveryAddress {
  street: string;
  city: string;
  state?: string;
  postal_code?: string;
  country: string;
  phone?: string;
  instructions?: string;
}

export interface OrderCreate {
  product_id: string;
  quantity: number;
  financing_requested: boolean;
  contract_type?: ContractType;
  delivery_address?: DeliveryAddress;
  notes?: string;
}

export interface UserSummary {
  id: string;
  email: string;
  full_name?: string;
  business_name?: string;
}

export interface ProductSummary {
  id: string;
  name: string;
  sku?: string;
  category: string;
  price: number;
  currency: string;
  thumbnail_url?: string;
}

export interface AIDecisionSummary {
  risk_score?: number;
  risk_level?: string;
  decision: string;
  factors?: Record<string, any>;
  explanation?: string;
}

export interface ShariahResultSummary {
  status: ShariahStatus;
  compliance_score?: number;
  violations?: string[];
  notes?: string;
}

export interface Order {
  id: string;
  order_number: string;
  
  // Parties
  buyer_id: string;
  seller_id: string;
  bank_id?: string;
  buyer?: UserSummary;
  seller?: UserSummary;
  
  // Product
  product_id: string;
  product?: ProductSummary;
  quantity: number;
  unit_price: number;
  
  // Amounts
  total_amount: number;
  buyer_down_payment: number;
  bank_financing_amount: number;
  currency: string;
  
  // Status
  status: OrderStatus;
  shariah_status: ShariahStatus;
  ai_approval_status: AIApprovalStatus;
  bank_approval_status: BankApprovalStatus;
  
  // Contract
  contract_type: ContractType;
  financing_requested: boolean;
  ownership_status: OwnershipStatus;
  
  // Delivery
  delivery_address?: DeliveryAddress;
  delivery_terms?: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  
  // Confirmations
  buyer_confirmed_at?: string;
  seller_confirmed_at?: string;
  provider_confirmed_at?: string;
  
  // Key timestamps
  shariah_validated_at?: string;
  ai_evaluated_at?: string;
  bank_approved_at?: string;
  escrow_locked_at?: string;
  escrow_released_at?: string;
  settled_at?: string;
  
  // Notes
  notes?: string;
  cancellation_reason?: string;
  
  // AI & Shariah
  ai_decision?: AIDecisionSummary;
  shariah_result?: ShariahResultSummary;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Computed
  is_active: boolean;
  can_be_cancelled: boolean;
  release_conditions_met: boolean;
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
  skip: number;
  limit: number;
}

export interface BankApprovalRequest {
  approved: boolean;
  reason?: string;
  financing_amount?: number;
  notes?: string;
}

export interface DeliveryConfirmationRequest {
  confirmed: boolean;
  delivery_date?: string;
  notes?: string;
  rating?: number;
}

export interface SellerProcessRequest {
  action: 'accept' | 'reject' | 'ship';
  estimated_delivery_date?: string;
  tracking_number?: string;
  notes?: string;
}

export interface CancelOrderRequest {
  reason: string;
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_status?: string;
  to_status: string;
  changed_by?: string;
  reason?: string;
  trigger_type: string;
  created_at: string;
}

// Product Types
export enum ProductCategory {
  FOOD_BEVERAGE = 'food_beverage',
  ELECTRONICS = 'electronics',
  CLOTHING_TEXTILE = 'clothing_textile',
  AGRICULTURE = 'agriculture',
  MANUFACTURING = 'manufacturing',
  RAW_MATERIALS = 'raw_materials',
  SERVICES = 'services',
  COSMETICS = 'cosmetics',
  PHARMACEUTICALS = 'pharmaceuticals',
  OTHER = 'other',
}

export enum ShariahCategory {
  HALAL = 'halal',
  HARAM = 'haram',
  MASHBOOH = 'mashbooh',
  PENDING_REVIEW = 'pending_review',
}

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUT_OF_STOCK = 'out_of_stock',
  PENDING_APPROVAL = 'pending_approval',
  REJECTED = 'rejected',
}

export interface ProductCreate {
  name: string;
  description?: string;
  sku?: string;
  category: ProductCategory;
  subcategory?: string;
  price: number;
  currency?: string;
  min_order_quantity?: number;
  max_order_quantity?: number;
  stock_quantity?: number;
  unit?: string;
  images?: string[];
  thumbnail_url?: string;
  weight_kg?: number;
  dimensions?: { length?: number; width?: number; height?: number; unit?: string };
  shipping_class?: string;
  estimated_delivery_days?: number;
  halal_certification?: string;
  certification_expiry?: string;
  certification_body?: string;
  tags?: string[];
  attributes?: Record<string, any>;
}

export interface ProductUpdate extends Partial<ProductCreate> {
  is_active?: boolean;
}

export interface SellerInfo {
  id: string;
  business_name?: string;
  username: string;
  city?: string;
  country?: string;
  seller_trust_score?: number;
}

export interface Product {
  id: string;
  seller_id: string;
  name: string;
  description?: string;
  sku?: string;
  category: ProductCategory;
  subcategory?: string;
  shariah_category: ShariahCategory;
  shariah_notes?: string;
  is_halal: boolean;
  is_haram: boolean;
  requires_shariah_review: boolean;
  price: number;
  currency: string;
  min_order_quantity: number;
  max_order_quantity?: number;
  stock_quantity: number;
  unit: string;
  is_available: boolean;
  status: ProductStatus;
  is_active: boolean;
  images?: string[];
  thumbnail_url?: string;
  weight_kg?: number;
  dimensions?: { length?: number; width?: number; height?: number; unit?: string };
  shipping_class?: string;
  estimated_delivery_days: number;
  halal_certification?: string;
  certification_expiry?: string;
  certification_body?: string;
  tags?: string[];
  attributes?: Record<string, any>;
  created_at: string;
  updated_at?: string;
  seller?: SellerInfo;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ShariahValidationResult {
  product_id: string;
  shariah_category: ShariahCategory;
  is_compliant: boolean;
  confidence_score: number;
  haram_indicators?: Array<{
    keyword: string;
    category: string;
    severity: string;
    location: string;
  }>;
  warnings?: string[];
  requires_manual_review: boolean;
  review_reason?: string;
  validated_at: string;
  validation_method: string;
}

export interface ProductFilters {
  category?: ProductCategory;
  shariah_category?: ShariahCategory;
  status?: ProductStatus;
  is_active?: boolean;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  seller_id?: string;
  search?: string;
}

// Escrow Types
export enum EscrowState {
  PENDING = 'pending',
  LOCKED = 'locked',
  RELEASED = 'released',
  REVERTED = 'reverted',
  FROZEN = 'frozen',
  PARTIALLY_RELEASED = 'partially_released',
}

export interface EscrowTransaction {
  id: string;
  escrow_id: string;
  transaction_type: string;
  status: string;
  amount: number;
  currency: string;
  from_account?: string;
  to_account?: string;
  reference_number: string;
  external_reference?: string;
  initiated_by?: string;
  initiator_type: string;
  description?: string;
  processed_at?: string;
  failure_reason?: string;
  created_at: string;
}

export interface ReleaseCondition {
  label: string;
  met: boolean;
  updated_at?: string;
  required: boolean;
}

export interface ReleaseConditions {
  shariah_compliant: ReleaseCondition;
  ai_approved: ReleaseCondition;
  buyer_confirmed: ReleaseCondition;
  provider_confirmed: ReleaseCondition;
  no_disputes: ReleaseCondition;
}

export interface Escrow {
  id: string;
  order_id: string;
  escrow_number: string;
  status: EscrowState;
  previous_status?: string;
  total_amount: number;
  bank_amount: number;
  buyer_amount: number;
  released_amount: number;
  refunded_amount: number;
  platform_fee: number;
  currency: string;
  bank_id?: string;
  bank_reference?: string;
  locked_at?: string;
  frozen_at?: string;
  released_at?: string;
  reverted_at?: string;
  created_at: string;
  updated_at: string;
  release_conditions?: Record<string, any>;
  available_balance: number;
  is_locked: boolean;
  is_frozen: boolean;
  is_terminal: boolean;
}

export interface EscrowBalance {
  escrow_id: string;
  order_id: string;
  total_amount: number;
  available_balance: number;
  released_amount: number;
  refunded_amount: number;
  platform_fee: number;
  currency: string;
  status: EscrowState;
  is_funded: boolean;
}

export interface EscrowFundRequest {
  amount: number;
  bank_reference?: string;
  notes?: string;
}

export interface EscrowOperationResult {
  success: boolean;
  message: string;
  escrow?: Escrow;
  transaction?: EscrowTransaction;
}

export interface EscrowReleaseConditionsResponse {
  escrow_id: string;
  order_id: string;
  status: string;
  conditions: ReleaseConditions;
  all_required_met: boolean;
  can_release: boolean;
}

// Shariah Types
export enum ShariahComplianceStatus {
  PENDING = 'pending',
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  REQUIRES_REVIEW = 'requires_review',
  VIOLATION_DETECTED = 'violation_detected',
}

export interface ShariahViolation {
  rule_code: string;
  rule_name: string;
  description: string;
  severity: string;
  violation_type: string;
}

export interface ShariahResult {
  id: string;
  order_id: string;
  status: ShariahComplianceStatus;
  compliance_score?: number;
  product_is_halal: boolean;
  product_category_compliant: boolean;
  haram_products_detected: boolean;
  haram_indicators?: Record<string, any>;
  transaction_compliant: boolean;
  contract_type_valid: boolean;
  no_riba_detected: boolean;
  no_gharar_detected: boolean;
  no_maisir_detected: boolean;
  violations?: ShariahViolation[];
  violation_count: number;
  primary_violation_type?: string;
  validation_method: string;
  rules_applied?: string[];
  principles_validated?: string[];
  requires_manual_review: boolean;
  review_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  review_decision?: string;
  explanation?: string;
  validated_at: string;
  created_at: string;
  updated_at: string;
}

export interface ShariahStatusResponse {
  order_id: string;
  status: ShariahComplianceStatus;
  is_compliant: boolean;
  violation_count: number;
  primary_violation?: string;
  validated_at?: string;
  requires_review: boolean;
  can_proceed: boolean;
}

export interface ShariahCertificate {
  certificate_id: string;
  order_id: string;
  order_number: string;
  status: ShariahComplianceStatus;
  compliance_score?: number;
  is_compliant: boolean;
  product_name: string;
  product_category: string;
  order_amount: number;
  currency: string;
  contract_type: string;
  buyer_name: string;
  seller_name: string;
  validation_method: string;
  principles_validated: string[];
  rules_applied: string[];
  validated_at: string;
  certificate_issued_at: string;
  valid_until?: string;
  verification_code: string;
  issued_by: string;
}

export interface ShariahValidationRequest {
  order_id: string;
  force_revalidation?: boolean;
}

export interface ShariahReviewRequest {
  decision: 'approve' | 'reject';
  notes?: string;
}

export interface ProductKeywordCheckRequest {
  product_name: string;
  description?: string;
}

export interface ProductKeywordCheckResponse {
  is_clean: boolean;
  found_keywords: string[];
  recommendation: string;
  risk_level: string;
}

export interface ShariahRule {
  code: string;
  name: string;
  description: string;
  category: string;
  severity: string;
  is_active: boolean;
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

// Release Gate Types
export enum ReleaseConditionStatus {
  MET = 'met',
  NOT_MET = 'not_met',
  PENDING = 'pending',
  NOT_APPLICABLE = 'not_applicable',
}

export interface ReleaseConditionDetail {
  name: string;
  label: string;
  status: ReleaseConditionStatus;
  is_required: boolean;
  checked_at?: string;
  details?: string;
}

export interface ReleaseGateResponse {
  order_id: string;
  escrow_id?: string;
  can_release: boolean;
  all_conditions_met: boolean;
  conditions: ReleaseConditionDetail[];
  required_conditions_met: number;
  required_conditions_total: number;
  escrow_status: string;
  escrow_amount: number;
  currency: string;
  checked_at: string;
  blocking_reasons: string[];
}

export interface ManualReleaseRequest {
  reason: string;
  override_conditions?: string[];
  authorization_code?: string;
}

export interface ReleaseExecutionResult {
  success: boolean;
  message: string;
  order_id: string;
  released_amount?: number;
  currency?: string;
  override_reason?: string;
  overridden_conditions?: string[];
}

// Audit Types
export enum AuditActionEnum {
  ORDER_CREATED = 'order_created',
  ORDER_STATUS_CHANGED = 'order_status_changed',
  ESCROW_FUNDED = 'escrow_funded',
  ESCROW_RELEASED = 'escrow_released',
  ESCROW_REVERTED = 'escrow_reverted',
  ESCROW_FROZEN = 'escrow_frozen',
  SHARIAH_VALIDATED = 'shariah_validated',
  SHARIAH_VIOLATION = 'shariah_violation',
  AI_DECISION_MADE = 'ai_decision_made',
  AI_OVERRIDE = 'ai_override',
  BANK_APPROVED = 'bank_approved',
  BANK_REJECTED = 'bank_rejected',
  DELIVERY_CONFIRMED_BUYER = 'delivery_confirmed_buyer',
  DISPUTE_CREATED = 'dispute_created',
  DISPUTE_RESOLVED = 'dispute_resolved',
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  actor_type: string;
  actor_id?: string;
  actor_name?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  changes?: Record<string, any>;
  description: string;
  reason?: string;
  correlation_id?: string;
  success: boolean;
  error_message?: string;
  ip_address?: string;
  created_at: string;
}

export interface AuditLogListResponse {
  logs: AuditLogEntry[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface AuditLogSummary {
  total_logs: number;
  logs_by_action: Record<string, number>;
  logs_by_entity: Record<string, number>;
  logs_by_actor_type: Record<string, number>;
  success_rate: number;
  recent_errors: AuditLogEntry[];
  time_range: {
    start: string;
    end: string;
  };
}

export interface OrderAuditTrail {
  order_id: string;
  events: AuditLogEntry[];
  timeline: Array<{
    timestamp: string;
    action: string;
    description: string;
    actor: string;
    success: boolean;
  }>;
  participants: Array<{
    id: string;
    name?: string;
    type: string;
    actions_count: number;
  }>;
  compliance_summary: {
    shariah_validation: string;
    ai_evaluation: string;
    total_events: number;
    error_events: number;
  };
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
  phone?: string;
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



