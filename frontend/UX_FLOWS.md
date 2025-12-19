# UX Flow Documentation
## Shariah-Compliant AI Escrow Platform

---

## Overview

This document describes the user experience flows for each role in the platform. Each flow is designed to be **simple, transparent, and trustworthy**.

---

## 🛒 BUYER Flow

### Flow 1: Browse and Order Products

```
1. Login → Buyer Dashboard
   └─> Quick stats: Active orders, Completed orders
   └─> Recent orders list
   └─> "Browse Products" button

2. Browse Products (/buyer/products)
   └─> Product catalog grid
   └─> Category filters
   └─> Each product shows:
       • Name, description, price
       • Shariah compliance badge (HALAL/HARAM/PENDING)
       • "Order" button

3. Click "Order" on product
   └─> Product detail page (to be implemented)
   └─> Order form:
       • Quantity selector
       • Financing requested (checkbox)
       • Notes (optional)
       • "Place Order" button

4. Submit Order
   └─> Order created
   └─> Redirect to order details page
```

### Flow 2: Track Order Status

```
1. My Orders (/buyer/orders)
   └─> List of all orders
   └─> Status filters: All, Active, Completed
   └─> Each order card shows:
       • Order ID, amount, quantity
       • Status badge
       • "View Details" button

2. Order Details (/buyer/orders/[id])
   └─> Status Timeline (visual progress)
   └─> Order Information card
   └─> Shariah Compliance card
   └─> AI Risk Assessment card
   └─> Escrow Status card
   └─> Delivery Confirmation (when applicable)

3. Confirm Delivery
   └─> When status is DELIVERED or DELIVERY_PENDING
   └─> Two buttons:
       • "Confirm Delivery" (green)
       • "Report Issue" (red)
   └─> After confirmation:
       • AI validates delivery
       • Escrow released (if valid)
       • Order status updated
```

### UX Principles Applied

✅ **Status-driven UI**: Color-coded badges and timeline  
✅ **Trust signals**: Shariah badges, escrow status  
✅ **Explainable AI**: Risk scores with reasoning  
✅ **Simple workflow**: Clear steps, minimal clicks  
✅ **Transparency**: All information visible

---

## 🏪 SELLER Flow

### Flow 1: Manage Products

```
1. Login → Seller Dashboard
   └─> Stats: Active products, Pending orders
   └─> Recent orders list
   └─> "Add Product" button

2. My Products (/seller/products)
   └─> List of seller's products
   └─> Each product shows:
       • Name, description, price, category
       • Halal status
       • Edit/Delete actions

3. Create Product
   └─> Form fields:
       • Name (required)
       • Description (optional)
       • Category (required)
       • Price (required)
   └─> Submit → Product created with PENDING halal status
   └─> Shariah validation runs automatically
```

### Flow 2: View Orders

```
1. Orders (/seller/orders)
   └─> List of orders received
   └─> Each order shows:
       • Order ID, buyer, amount, quantity
       • Status badge
       • "View Details" button

2. Order Details
   └─> Full order information
   └─> Status timeline
   └─> Escrow status (when locked)
   └─> Delivery information
```

### UX Principles Applied

✅ **Minimal form inputs**: Only essential fields  
✅ **Clear status indicators**: Order status badges  
✅ **Quick actions**: Easy product creation  
✅ **Transparency**: Escrow status visible

---

## 🏦 BANK Flow

### Flow 1: Review Financing Requests

```
1. Login → Bank Dashboard
   └─> Stats:
       • Pending approvals count
       • Locked escrows count
       • Total escrow volume
   └─> Recent pending orders list

2. Pending Orders (/bank/orders)
   └─> Filter by status
   └─> List of orders awaiting approval
   └─> Each order card shows:
       • Order ID, amount, buyer, seller
       • Status badge
       • "Review" button

3. Order Review (/bank/orders/[id])
   └─> Status Timeline
   └─> Order Information
   └─> Shariah Compliance Card:
       • Compliance status (✓/✗)
       • Transaction structure validation
       • Violations (if any)
   └─> AI Risk Assessment Card:
       • Decision (APPROVED/REJECTED/PENDING)
       • Credit score, fraud score, delivery reliability
       • AI reasoning
       • Risk factors
   └─> Escrow Status (if applicable)

4. Approval Decision
   └─> Validation checks shown:
       • Shariah Compliance: ✓/✗
       • AI Risk Assessment: APPROVED/REJECTED
   └─> Action buttons:
       • "Approve Financing" (enabled if both checks pass)
       • "Reject" (always enabled)
   └─> On approval:
       • Escrow locked
       • Order status → ESCROW_LOCKED
       • Seller notified
   └─> On rejection:
       • Reason required
       • Order status → BANK_REJECTED
       • Buyer notified
```

### Flow 2: Monitor Escrow

```
1. Escrow Monitor (/bank/escrow)
   └─> List of all escrows
   └─> Filter by state: LOCKED, RELEASED, REVERTED, FROZEN
   └─> Each escrow shows:
       • Order ID, amount, state
       • Timestamps
       • Actions (release, revert, freeze)

2. Escrow Details
   └─> Full escrow information
   └─> Related order details
   └─> State history
   └─> Actions available based on state
```

### UX Principles Applied

✅ **Explainable AI**: Full reasoning displayed  
✅ **Transparency**: All compliance checks visible  
✅ **Clear decision points**: Validation checks before approval  
✅ **Trust signals**: Shariah compliance prominently shown  
✅ **Status-driven UI**: Color-coded states

---

## 🚚 DELIVERY Flow

### Flow 1: Manage Deliveries

```
1. Login → Delivery Dashboard
   └─> Stats:
       • Assigned deliveries count
       • In-transit count
   └─> Recent deliveries list

2. My Deliveries (/delivery/assignments)
   └─> List of assigned deliveries
   └─> Each delivery shows:
       • Order ID, amount
       • Current status
       • "Manage" button

3. Delivery Details (/delivery/assignments/[id])
   └─> Order information
   └─> Delivery status
   └─> Tracking information
   └─> Status update form:
       • Status dropdown (PENDING, ASSIGNED, IN_TRANSIT, DELIVERED, FAILED)
       • Delivery notes
       • "Update Status" button
   └─> On status update:
       • Order status updated
       • Buyer notified (if delivered)
```

### UX Principles Applied

✅ **Simple workflow**: Clear status updates  
✅ **Minimal inputs**: Only essential fields  
✅ **Status-driven UI**: Clear status indicators

---

## 🔄 Common Flows

### Order Status Progression

```
CREATED
  ↓
SHARIAH_PENDING → SHARIAH_APPROVED (or REJECTED)
  ↓
AI_PENDING → AI_APPROVED (or REJECTED)
  ↓
BANK_PENDING → BANK_APPROVED (or REJECTED)
  ↓
ESCROW_LOCKED
  ↓
PREPARING
  ↓
DELIVERY_PENDING → DELIVERY_IN_TRANSIT
  ↓
DELIVERED
  ↓
ESCROW_RELEASED (completed)
```

### Status Colors

- **Green**: Approved, Completed, Released
- **Amber**: Pending, Warning
- **Red**: Rejected, Failed, Reverted
- **Blue**: In Progress, Locked, In Transit
- **Gray**: Neutral, Created, Cancelled

---

## 🎨 UI States

### Loading States

- **Skeleton loaders** for lists
- **Spinner** for actions
- **Disabled buttons** during operations

### Empty States

- **Friendly messages**: "No orders yet"
- **Call-to-action**: "Browse Products" button
- **Helpful guidance**: What to do next

### Error States

- **Inline errors** for form fields
- **Toast notifications** for API errors
- **Error pages** for critical failures

### Success States

- **Success badges** after actions
- **Confirmation messages**
- **Status updates** reflected immediately

---

## 🔐 Authentication Flow

```
1. User visits platform
   └─> Check for auth token
   └─> If no token → Redirect to /login

2. Login Page (/login)
   └─> Username/password form
   └─> Submit → Authenticate with Keycloak
   └─> Receive JWT token
   └─> Extract user role from token
   └─> Store token in localStorage
   └─> Redirect to role-specific dashboard:
       • BUYER → /buyer
       • SELLER → /seller
       • BANK → /bank
       • DELIVERY → /delivery

3. Protected Routes
   └─> Check token on each page load
   └─> Verify role matches route
   └─> If unauthorized → Redirect to login
```

---

## 📱 Responsive Design

### Mobile (< 768px)
- Single column layouts
- Stacked cards
- Full-width buttons
- Collapsible sidebar

### Tablet (768px - 1024px)
- Two-column grids where appropriate
- Sidebar remains visible
- Optimized spacing

### Desktop (> 1024px)
- Multi-column layouts
- Sidebar always visible
- Maximum content width
- Hover states enabled

---

## ♿ Accessibility

### Keyboard Navigation
- Tab through interactive elements
- Enter/Space to activate buttons
- Escape to close modals

### Screen Readers
- ARIA labels on icons
- Semantic HTML structure
- Alt text for images
- Status announcements

### Visual
- High contrast colors
- Clear focus indicators
- Readable font sizes
- Sufficient spacing

---

## 🎯 Key UX Principles

1. **Clarity First**
   - Clear labels and instructions
   - Obvious next steps
   - No ambiguity

2. **Trust Through Transparency**
   - Show all relevant information
   - Explain AI decisions
   - Display compliance status

3. **Minimal Cognitive Load**
   - One primary action per screen
   - Progressive disclosure
   - Contextual help

4. **Status-Driven Design**
   - Color-coded states
   - Visual progress indicators
   - Clear status language

5. **Error Prevention**
   - Validation before submission
   - Confirmation for critical actions
   - Clear error messages

---

*Documentation Version: 1.0*  
*Last Updated: 2024*



