# Frontend Architecture Documentation
## Shariah-Compliant AI Escrow Platform

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Component Hierarchy](#component-hierarchy)
5. [Role-Based Pages](#role-based-pages)
6. [API Integration](#api-integration)
7. [Design System](#design-system)
8. [UX Flows](#ux-flows)
9. [State Management](#state-management)
10. [Authentication](#authentication)

---

## Overview

The frontend is built with **Next.js 14** and **TypeScript**, providing a modern, type-safe, and performant user experience. The architecture emphasizes:

- **Role-based routing** for different user types (Buyer, Seller, Bank, Delivery)
- **Component-driven development** with reusable UI components
- **API-driven architecture** with centralized API client
- **Trust signals** through clear status indicators and Shariah compliance badges
- **Explainable AI** with transparent risk scoring displays

---

## Technology Stack

### Core Framework
- **Next.js 14** - React framework with SSR/SSG support
- **TypeScript** - Type safety and developer experience
- **React 18** - UI library

### Styling
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Icon library

### Data Fetching
- **React Query** - Server state management and caching
- **Axios** - HTTP client

### Forms & Validation
- **React Hook Form** - Form state management
- **Zod** - Schema validation

### State Management
- **Zustand** - Lightweight state management (optional, for client state)

---

## Project Structure

```
frontend/
├── components/
│   ├── layout/           # Layout components (Header, Sidebar, DashboardLayout)
│   ├── orders/           # Order-related components
│   ├── products/         # Product-related components
│   └── ui/              # Reusable UI components (Button, Card, Badges, etc.)
├── lib/
│   ├── api-client.ts    # Centralized API client
│   └── utils.ts         # Utility functions
├── pages/
│   ├── buyer/           # Buyer role pages
│   ├── seller/          # Seller role pages
│   ├── bank/            # Bank role pages
│   ├── delivery/        # Delivery role pages
│   ├── login.tsx        # Authentication page
│   ├── index.tsx        # Landing/redirect page
│   └── _app.tsx         # App wrapper
├── styles/
│   └── globals.css      # Global styles
├── types/
│   └── index.ts         # TypeScript type definitions
├── package.json
├── tsconfig.json
├── tailwind.config.js
└── next.config.js
```

---

## Component Hierarchy

### Layout Components

#### `DashboardLayout`
Main wrapper for authenticated user dashboards. Provides:
- Header with user info and logout
- Role-based sidebar navigation
- Consistent page structure

#### `Sidebar`
Role-specific navigation menu:
- **BUYER**: Dashboard, Browse Products, My Orders
- **SELLER**: Dashboard, My Products, Orders
- **BANK**: Dashboard, Pending Orders, Escrow Monitor
- **DELIVERY**: Dashboard, My Deliveries

#### `Header`
Top navigation bar with:
- Platform branding
- User role indicator
- Logout button

### UI Components

#### `StatusBadge`
Reusable status indicator with color coding:
```tsx
<StatusBadge
  label="Approved"
  color="text-green-600"
  bgColor="bg-green-100"
/>
```

#### `ShariahBadge`
Special badge for Shariah compliance:
- HALAL (green)
- HARAM (red)
- PENDING (amber)

#### `Button`
Consistent button component with variants:
- `primary` - Main actions
- `secondary` - Secondary actions
- `danger` - Destructive actions
- `outline` - Outlined style
- `ghost` - Minimal style

#### `Card` & `CardHeader`
Container components for content sections:
```tsx
<Card>
  <CardHeader title="Order Details" subtitle="View order information" />
  {/* Content */}
</Card>
```

#### `OrderStatusTimeline`
Visual timeline showing order progression through statuses:
- Color-coded states
- Progress indicators
- Rejection handling

#### `AIScoreCard`
Display AI risk assessment with:
- Decision badge (APPROVED/REJECTED/PENDING)
- Credit score, fraud score, delivery reliability
- AI reasoning explanation
- Risk factors list

#### `ShariahComplianceCard`
Shariah compliance results:
- Compliance status
- Transaction structure validation
- Violations list
- Review notes

#### `EscrowStatusCard`
Escrow state and financial information:
- Current state (LOCKED, RELEASED, etc.)
- Escrow amount
- Timestamps (locked, released, reverted)

### Domain Components

#### `OrderCard`
Compact order display for lists:
- Order ID, amount, quantity
- Status badge
- Quick actions

#### `ProductCard`
Product display with:
- Product name, description, price
- Shariah compliance badge
- Order action button

---

## Role-Based Pages

### BUYER Pages

#### `/buyer` (Dashboard)
- Overview stats (active orders, completed)
- Recent orders list
- Quick actions (browse products)

#### `/buyer/products`
- Product catalog with filtering
- Category filters
- Product cards with Shariah badges

#### `/buyer/orders`
- All buyer orders
- Status filtering (active, completed, rejected)
- Order cards with status indicators

#### `/buyer/orders/[id]`
- Full order details
- Status timeline
- Escrow status
- AI risk scores
- Shariah compliance
- Delivery confirmation actions

### SELLER Pages

#### `/seller` (Dashboard)
- Active products count
- Pending orders
- Quick actions (add product)

#### `/seller/products`
- Product management
- Create/edit products
- Product listings

#### `/seller/orders`
- Orders received
- Order status tracking
- Escrow status

### BANK Pages

#### `/bank` (Dashboard)
- Pending financing approvals
- Locked escrows count
- Total escrow volume

#### `/bank/orders`
- All orders requiring bank review
- Filtering by status

#### `/bank/orders/[id]`
- Full order review
- AI risk assessment
- Shariah compliance check
- Approval/rejection actions
- Escrow monitoring

### DELIVERY Pages

#### `/delivery` (Dashboard)
- Assigned deliveries
- In-transit count
- Delivery management

#### `/delivery/assignments/[id]`
- Delivery details
- Status updates
- Tracking information

---

## API Integration

### API Client (`lib/api-client.ts`)

Centralized HTTP client with:
- Base URL configuration
- Automatic token injection
- Error handling (401 redirects)
- Type-safe methods for all endpoints

### Usage Example

```tsx
import { useQuery } from 'react-query';
import { apiClient } from '@/lib/api-client';

function MyComponent() {
  const { data: orders, isLoading } = useQuery(
    'orders',
    () => apiClient.getOrders()
  );
  
  // Use orders data
}
```

### Available Methods

#### Products
- `getProducts(params?)` - List products
- `getProduct(id)` - Get product details
- `createProduct(data)` - Create product (Seller only)

#### Orders
- `getOrders(params?)` - List orders (role-filtered)
- `getOrder(id)` - Get order details
- `createOrder(data)` - Create order (Buyer only)
- `bankApproveOrder(id)` - Approve financing (Bank only)
- `bankRejectOrder(id, reason?)` - Reject financing (Bank only)
- `confirmDelivery(id, confirmed, notes?)` - Confirm delivery (Buyer only)

#### Escrow
- `getEscrow(orderId)` - Get escrow details
- `releaseEscrow(orderId)` - Release funds (Bank only)
- `revertEscrow(orderId, reason?)` - Revert funds (Bank only)
- `freezeEscrow(orderId, reason?)` - Freeze escrow (Bank only)

#### Shariah
- `getShariahResult(orderId)` - Get compliance result
- `validateShariah(data)` - Validate order
- `reviewShariah(data)` - Manual review

#### AI
- `getAIDecision(orderId)` - Get AI decision
- `evaluateAI(data)` - Evaluate order
- `validateDeliveryAI(orderId)` - Validate delivery

#### Delivery
- `getDelivery(orderId)` - Get delivery details
- `createDelivery(data)` - Create delivery (Delivery only)
- `updateDeliveryStatus(orderId, data)` - Update status
- `confirmDeliveryDelivery(orderId, data)` - Confirm delivery

---

## Design System

### Color Palette

#### Primary Colors
- `primary-50` to `primary-900` - Main brand colors (blue scale)

#### Status Colors
- `status.success` - Green (#10b981) - Approved/completed
- `status.warning` - Amber (#f59e0b) - Pending
- `status.error` - Red (#ef4444) - Rejected/failed
- `status.info` - Blue (#3b82f6) - In-progress
- `status.neutral` - Gray (#6b7280) - Neutral states

#### Shariah Colors
- `shariah.halal` - Green (#10b981)
- `shariah.haram` - Red (#ef4444)
- `shariah.pending` - Amber (#f59e0b)

#### Escrow Colors
- `escrow.pending` - Gray
- `escrow.locked` - Blue
- `escrow.released` - Green
- `escrow.reverted` - Red
- `escrow.frozen` - Amber

### Typography

- **Font Family**: Inter (system fallback)
- **Headings**: Bold, various sizes (text-3xl, text-2xl, text-xl, text-lg)
- **Body**: Regular weight, text-base (16px)
- **Small text**: text-sm (14px), text-xs (12px)

### Spacing

- Consistent spacing scale (4px base unit)
- Common gaps: gap-2, gap-4, gap-6
- Padding: p-4, p-6, p-8

### Status Indicators

All statuses use consistent color coding:
- **Green** - Success/approved/completed
- **Amber** - Pending/warning
- **Red** - Error/rejected/failed
- **Blue** - In-progress/info
- **Gray** - Neutral/pending

---

## UX Flows

### Buyer Flow

1. **Browse Products** (`/buyer/products`)
   - View product catalog
   - Filter by category
   - See Shariah compliance badges
   - Click "Order" on product

2. **Place Order** (Product detail page)
   - Select quantity
   - Request financing (optional)
   - Submit order
   - Redirect to order details

3. **Track Order** (`/buyer/orders/[id]`)
   - View status timeline
   - See AI risk scores
   - Check Shariah compliance
   - Monitor escrow status
   - Confirm delivery when received

### Seller Flow

1. **Manage Products** (`/seller/products`)
   - Create new products
   - Edit existing products
   - View product listings

2. **View Orders** (`/seller/orders`)
   - See incoming orders
   - Track order status
   - Monitor escrow state

### Bank Flow

1. **Review Pending Orders** (`/bank/orders`)
   - See orders awaiting approval
   - Filter by status

2. **Order Review** (`/bank/orders/[id]`)
   - Review AI risk scores
   - Check Shariah compliance
   - View order details
   - Approve or reject financing
   - Monitor escrow after approval

### Delivery Flow

1. **View Assignments** (`/delivery`)
   - See assigned deliveries
   - Track delivery status

2. **Update Status** (`/delivery/assignments/[id]`)
   - Update delivery status
   - Add tracking information
   - Submit delivery confirmation

---

## State Management

### Server State (React Query)

All API data is managed with React Query:
- Automatic caching
- Background refetching
- Loading/error states
- Optimistic updates

### Client State

For simple client state (e.g., form inputs, UI toggles), use React `useState`.

For complex client state, consider Zustand (optional).

---

## Authentication

### Current Implementation

- Mock authentication in `/login`
- Token stored in `localStorage`
- Token injected in API requests via interceptor

### Production Integration

1. **Keycloak Integration**
   - Use Keycloak JavaScript adapter
   - Redirect to Keycloak login
   - Handle token refresh
   - Extract user roles from JWT

2. **Protected Routes**
   - Middleware to check authentication
   - Role-based route protection
   - Redirect to login if unauthorized

3. **Token Management**
   - Store token securely
   - Handle token expiration
   - Refresh tokens automatically

---

## Trust Signals & UX Principles

### Status-Driven UI
- Color-coded status badges throughout
- Clear visual hierarchy
- Consistent status language

### Explainable AI
- AI scores displayed prominently
- Reasoning shown in readable format
- Risk factors listed clearly

### Shariah Compliance
- Halal/Haram badges on products
- Compliance cards on order details
- Clear violation explanations

### Minimal Form Inputs
- Only essential fields
- Clear labels and placeholders
- Inline validation

### Clear Call-to-Actions
- Primary actions stand out
- Secondary actions de-emphasized
- Disabled states for unavailable actions

---

## Next Steps

1. **Keycloak Integration**
   - Implement SSO login flow
   - Extract user roles from JWT
   - Handle token refresh

2. **Form Handling**
   - Add React Hook Form to order/product forms
   - Implement validation with Zod
   - Error handling and display

3. **Error Handling**
   - Global error boundary
   - User-friendly error messages
   - Retry mechanisms

4. **Loading States**
   - Skeleton loaders
   - Optimistic updates
   - Progress indicators

5. **Responsive Design**
   - Mobile-first approach
   - Tablet optimizations
   - Desktop enhancements

6. **Accessibility**
   - ARIA labels
   - Keyboard navigation
   - Screen reader support

7. **Testing**
   - Unit tests for components
   - Integration tests for flows
   - E2E tests for critical paths

---

## Component Usage Examples

### Creating an Order

```tsx
import { useMutation } from 'react-query';
import { apiClient } from '@/lib/api-client';

function CreateOrderForm() {
  const mutation = useMutation(
    (data) => apiClient.createOrder(data),
    {
      onSuccess: () => {
        router.push('/buyer/orders');
      },
    }
  );
  
  // Form implementation
}
```

### Displaying Order Status

```tsx
import { OrderStatusTimeline } from '@/components/ui/OrderStatusTimeline';
import { getOrderStatusConfig } from '@/lib/utils';

function OrderDetails({ order }) {
  const statusConfig = getOrderStatusConfig(order.status);
  
  return (
    <>
      <OrderStatusTimeline currentStatus={order.status} />
      <StatusBadge
        label={statusConfig.label}
        color={statusConfig.color}
        bgColor={statusConfig.bgColor}
      />
    </>
  );
}
```

### Showing AI Scores

```tsx
import { AIScoreCard } from '@/components/ui/AIScoreCard';
import { useQuery } from 'react-query';

function OrderReview({ orderId }) {
  const { data: aiDecision } = useQuery(
    ['ai-decision', orderId],
    () => apiClient.getAIDecision(orderId)
  );
  
  return aiDecision && <AIScoreCard decision={aiDecision} />;
}
```

---

*Documentation Version: 1.0*  
*Last Updated: 2024*


