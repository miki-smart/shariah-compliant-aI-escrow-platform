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



