/**
 * Utility functions
 */
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { OrderStatus, EscrowState, DeliveryStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency
 */
export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}

/**
 * Format date
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Get status color configuration
 */
export function getOrderStatusConfig(status: OrderStatus) {
  const configs: Record<OrderStatus, { label: string; color: string; bgColor: string }> = {
    [OrderStatus.CREATED]: { label: 'Created', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    [OrderStatus.SHARIAH_PENDING]: { label: 'Shariah Review', color: 'text-amber-600', bgColor: 'bg-amber-100' },
    [OrderStatus.SHARIAH_APPROVED]: { label: 'Shariah Approved', color: 'text-green-600', bgColor: 'bg-green-100' },
    [OrderStatus.SHARIAH_REJECTED]: { label: 'Shariah Rejected', color: 'text-red-600', bgColor: 'bg-red-100' },
    [OrderStatus.AI_PENDING]: { label: 'AI Review', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    [OrderStatus.AI_APPROVED]: { label: 'AI Approved', color: 'text-green-600', bgColor: 'bg-green-100' },
    [OrderStatus.AI_REJECTED]: { label: 'AI Rejected', color: 'text-red-600', bgColor: 'bg-red-100' },
    [OrderStatus.BANK_PENDING]: { label: 'Bank Review', color: 'text-amber-600', bgColor: 'bg-amber-100' },
    [OrderStatus.BANK_APPROVED]: { label: 'Bank Approved', color: 'text-green-600', bgColor: 'bg-green-100' },
    [OrderStatus.BANK_REJECTED]: { label: 'Bank Rejected', color: 'text-red-600', bgColor: 'bg-red-100' },
    [OrderStatus.ESCROW_LOCKED]: { label: 'Escrow Locked', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    [OrderStatus.PREPARING]: { label: 'Preparing', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    [OrderStatus.DELIVERY_PENDING]: { label: 'Delivery Pending', color: 'text-amber-600', bgColor: 'bg-amber-100' },
    [OrderStatus.DELIVERY_IN_TRANSIT]: { label: 'In Transit', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    [OrderStatus.DELIVERED]: { label: 'Delivered', color: 'text-green-600', bgColor: 'bg-green-100' },
    [OrderStatus.DELIVERY_FAILED]: { label: 'Delivery Failed', color: 'text-red-600', bgColor: 'bg-red-100' },
    [OrderStatus.ESCROW_RELEASED]: { label: 'Completed', color: 'text-green-600', bgColor: 'bg-green-100' },
    [OrderStatus.ESCROW_REVERTED]: { label: 'Reverted', color: 'text-red-600', bgColor: 'bg-red-100' },
    [OrderStatus.CANCELLED]: { label: 'Cancelled', color: 'text-gray-600', bgColor: 'bg-gray-100' },
  };
  return configs[status] || configs[OrderStatus.CREATED];
}

export function getEscrowStateConfig(state: EscrowState) {
  const configs: Record<EscrowState, { label: string; color: string; bgColor: string }> = {
    [EscrowState.PENDING]: { label: 'Pending', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    [EscrowState.LOCKED]: { label: 'Locked', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    [EscrowState.RELEASED]: { label: 'Released', color: 'text-green-600', bgColor: 'bg-green-100' },
    [EscrowState.REVERTED]: { label: 'Reverted', color: 'text-red-600', bgColor: 'bg-red-100' },
    [EscrowState.FROZEN]: { label: 'Frozen', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  };
  return configs[state] || configs[EscrowState.PENDING];
}

export function getDeliveryStatusConfig(status: DeliveryStatus) {
  const configs: Record<DeliveryStatus, { label: string; color: string; bgColor: string }> = {
    [DeliveryStatus.PENDING]: { label: 'Pending', color: 'text-gray-600', bgColor: 'bg-gray-100' },
    [DeliveryStatus.ASSIGNED]: { label: 'Assigned', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    [DeliveryStatus.IN_TRANSIT]: { label: 'In Transit', color: 'text-blue-600', bgColor: 'bg-blue-100' },
    [DeliveryStatus.DELIVERED]: { label: 'Delivered', color: 'text-green-600', bgColor: 'bg-green-100' },
    [DeliveryStatus.FAILED]: { label: 'Failed', color: 'text-red-600', bgColor: 'bg-red-100' },
  };
  return configs[status] || configs[DeliveryStatus.PENDING];
}

/**
 * Get halal status badge config
 */
export function getHalalStatusConfig(status?: string) {
  if (!status) {
    return { label: 'Pending', color: 'text-amber-600', bgColor: 'bg-amber-100' };
  }
  const configs: Record<string, { label: string; color: string; bgColor: string }> = {
    HALAL: { label: 'Halal', color: 'text-green-600', bgColor: 'bg-green-100' },
    HARAM: { label: 'Haram', color: 'text-red-600', bgColor: 'bg-red-100' },
    PENDING: { label: 'Pending', color: 'text-amber-600', bgColor: 'bg-amber-100' },
  };
  return configs[status] || configs.PENDING;
}


