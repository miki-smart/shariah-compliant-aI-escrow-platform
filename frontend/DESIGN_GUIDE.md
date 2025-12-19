# Sharia Escrow Design Guide

A comprehensive design system for the Shariah-Compliant Escrow Platform frontend.

---

## 🎨 Brand Identity

### Brand Name
**Sharia Escrow** - Displayed as:
```
<span className="text-emerald-600">Sharia</span> Escrow
```

### Tagline
*Trust & Compliance Platform*

---

## 🌈 Color Palette

### Primary Colors (Emerald/Teal)
Our primary palette reflects trust, growth, and Islamic finance values.

| Color | Tailwind Class | Hex | Usage |
|-------|---------------|-----|-------|
| Emerald 50 | `emerald-50` | `#ecfdf5` | Backgrounds, hover states |
| Emerald 100 | `emerald-100` | `#d1fae5` | Light accents, borders |
| Emerald 200 | `emerald-200` | `#a7f3d0` | Decorative elements |
| Emerald 500 | `emerald-500` | `#10b981` | Primary buttons, icons |
| Emerald 600 | `emerald-600` | `#059669` | Primary text, active states |
| Emerald 700 | `emerald-700` | `#047857` | Hover states |
| Teal 50 | `teal-50` | `#f0fdfa` | Background gradients |
| Teal 500 | `teal-500` | `#14b8a6` | Gradient endpoints |
| Teal 600 | `teal-600` | `#0d9488` | Secondary accents |

### Role-Specific Colors

| Role | Gradient | Usage |
|------|----------|-------|
| Buyer | `from-emerald-500 to-teal-500` | Primary portal color |
| Seller | `from-blue-500 to-cyan-500` | Seller-specific accents |
| Bank | `from-amber-500 to-orange-500` | Financial/approval elements |
| Delivery | `from-violet-500 to-purple-500` | Delivery-specific accents |

### Status Colors

| Status | Color | Class |
|--------|-------|-------|
| Success | Emerald | `bg-emerald-100 text-emerald-700` |
| Warning | Amber | `bg-amber-100 text-amber-700` |
| Error | Red | `bg-red-100 text-red-700` |
| Info | Blue | `bg-blue-100 text-blue-700` |
| Neutral | Gray | `bg-gray-100 text-gray-700` |

### Neutral Colors

| Purpose | Light Theme |
|---------|-------------|
| Background | `bg-gradient-to-br from-emerald-50 via-white to-teal-50` |
| Card Background | `bg-white` or `bg-white/70` |
| Primary Text | `text-gray-900` |
| Secondary Text | `text-gray-600` |
| Muted Text | `text-gray-500` |
| Disabled Text | `text-gray-400` |
| Border | `border-gray-200` or `border-gray-200/60` |

---

## 🔤 Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

### Heading Hierarchy

| Element | Classes | Example Usage |
|---------|---------|---------------|
| Page Title | `text-3xl font-bold text-gray-900` | Dashboard titles |
| Section Title | `text-2xl font-bold text-gray-900` | Major sections |
| Card Title | `text-lg font-semibold text-gray-900` | Card headers |
| Subsection | `text-base font-medium text-gray-900` | Minor sections |
| Label | `text-sm font-medium text-gray-700` | Form labels |
| Caption | `text-xs text-gray-500` | Helper text |

### Text Colors

| Type | Class | Usage |
|------|-------|-------|
| Primary | `text-gray-900` | Headlines, important text |
| Secondary | `text-gray-600` | Descriptions |
| Muted | `text-gray-500` | Subtle text |
| Disabled | `text-gray-400` | Inactive elements |
| Brand | `text-emerald-600` | Brand accent text |
| Link | `text-emerald-600 hover:text-emerald-700` | Interactive links |

---

## 🎯 Design Patterns

### Background Pattern
The signature background uses a gradient with an SVG pattern overlay:

```tsx
<div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 relative">
  {/* Pattern Overlay */}
  <div className="fixed inset-0 opacity-40 pointer-events-none">
    <div className="absolute inset-0" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
    }} />
  </div>
  
  {/* Floating Decorative Shapes */}
  <div className="fixed top-20 left-10 w-72 h-72 bg-emerald-200/20 rounded-full blur-3xl pointer-events-none" />
  <div className="fixed bottom-20 right-10 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl pointer-events-none" />
</div>
```

### Glassmorphism Effect
Used for headers and floating elements:

```tsx
<header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
```

---

## 🧩 Components

### Button Variants

```tsx
// Primary - Main actions
<Button variant="primary">Sign In</Button>
// Classes: bg-emerald-600 text-white hover:bg-emerald-700

// Gradient - Featured actions
<Button variant="gradient">Get Started</Button>
// Classes: bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200

// Secondary - Secondary actions
<Button variant="secondary">Cancel</Button>
// Classes: bg-gray-100 text-gray-900 hover:bg-gray-200

// Outline - Tertiary actions
<Button variant="outline">View All</Button>
// Classes: border-2 border-gray-200 text-gray-700 hover:bg-gray-50

// Ghost - Subtle actions
<Button variant="ghost">Learn More</Button>
// Classes: text-gray-700 hover:bg-gray-100

// Danger - Destructive actions
<Button variant="danger">Delete</Button>
// Classes: bg-red-600 text-white hover:bg-red-700
```

### Button Sizes

```tsx
<Button size="sm">Small</Button>   // px-3 py-1.5 text-sm
<Button size="md">Medium</Button>  // px-4 py-2.5 text-sm (default)
<Button size="lg">Large</Button>   // px-6 py-3 text-base
```

### Cards

```tsx
// Default Card
<Card>Content</Card>
// Classes: bg-white border border-gray-200/60 shadow-sm rounded-xl

// Gradient Card (for CTAs)
<Card variant="gradient">Content</Card>
// Classes: bg-gradient-to-br from-white to-gray-50 border shadow-md

// Bordered Card
<Card variant="bordered">Content</Card>
// Classes: bg-white border-2 border-emerald-100

// Stat Card
<StatCard
  title="Active Orders"
  value={42}
  icon={<FileText className="w-6 h-6 text-emerald-600" />}
  trend={{ value: 12, positive: true }}
/>
```

### Gradient Action Cards
Used for quick action panels:

```tsx
<Card className="bg-gradient-to-br from-emerald-500 to-teal-600 border-0 text-white">
  <div className="flex items-start justify-between">
    <div>
      <h3 className="text-lg font-semibold mb-2">Card Title</h3>
      <p className="text-emerald-100 text-sm mb-4">Description text</p>
      <button className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">
        Action
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
      <Icon className="w-8 h-8" />
    </div>
  </div>
</Card>
```

### Form Inputs

```tsx
<input
  type="text"
  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all"
  placeholder="Enter value..."
/>
```

### Status Badges

```tsx
// Success
<span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
  Completed
</span>

// Warning
<span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
  Pending
</span>

// Info
<span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
  In Progress
</span>
```

---

## 📐 Spacing

### Container
```tsx
<div className="container mx-auto px-6">
```

### Section Spacing
- Between major sections: `space-y-8` or `py-20`
- Between cards/items: `space-y-4` or `gap-6`
- Card internal padding: `p-6` (default) or `p-4` (compact)

### Grid Layouts
```tsx
// Stats grid
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">

// Feature grid
<div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">

// Two-column layout
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
```

---

## 🌀 Animations & Transitions

### Standard Transition
```tsx
className="transition-all"
// or more specific:
className="transition-colors"
className="transition-transform"
```

### Hover Scale
```tsx
className="hover:scale-110 transition-transform"
```

### Loading Spinner
```tsx
<svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
</svg>
```

### Skeleton Loading
```tsx
<div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
```

### Pulse Indicator
```tsx
<span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
```

---

## 📱 Responsive Design

### Breakpoints
| Breakpoint | Min Width | Usage |
|------------|-----------|-------|
| `sm:` | 640px | Small tablets |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops |
| `xl:` | 1280px | Desktops |
| `2xl:` | 1536px | Large screens |

### Common Patterns
```tsx
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

// Responsive flex direction
<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

// Responsive text
<h1 className="text-3xl md:text-4xl lg:text-5xl font-bold">
```

---

## 🎭 Empty States

```tsx
<div className="text-center py-12">
  <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
    <Icon className="w-8 h-8 text-gray-400" />
  </div>
  <h3 className="text-lg font-medium text-gray-900 mb-2">No items yet</h3>
  <p className="text-gray-500 mb-6">Description of what to do next.</p>
  <Button variant="gradient">Action Button</Button>
</div>
```

---

## 🔔 Notification Indicators

```tsx
// Badge with dot
<button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
  <Bell className="w-5 h-5" />
  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
</button>
```

---

## 🖼️ Icons

We use **Lucide React** for icons throughout the application.

### Common Icons
```tsx
import {
  // Navigation
  Home, ArrowRight, ArrowLeft, ChevronDown,
  
  // Actions
  Plus, Edit, Trash, Search, Filter,
  
  // Status
  CheckCircle, Clock, AlertCircle, XCircle,
  
  // Domain
  ShoppingBag, Package, FileText, Shield,
  Truck, Building2, DollarSign, TrendingUp,
  
  // User
  User, LogOut, Settings, Bell, HelpCircle,
} from 'lucide-react';
```

### Icon Sizes
| Context | Size | Class |
|---------|------|-------|
| Inline with text | 16px | `w-4 h-4` |
| Button icons | 16-20px | `w-4 h-4` or `w-5 h-5` |
| Card icons | 20-24px | `w-5 h-5` or `w-6 h-6` |
| Feature icons | 24-32px | `w-6 h-6` or `w-8 h-8` |
| Hero icons | 32-48px | `w-8 h-8` or `w-12 h-12` |

---

## 📋 Layout Structure

### Dashboard Layout
```
┌─────────────────────────────────────────────────────┐
│ Header (sticky, glassmorphic)                       │
├──────────┬──────────────────────────────────────────┤
│ Sidebar  │ Main Content                             │
│ (fixed)  │                                          │
│          │ ┌──────────────────────────────────────┐ │
│ Logo     │ │ Page Header                          │ │
│          │ ├──────────────────────────────────────┤ │
│ Nav      │ │ Stats Grid                           │ │
│ Items    │ ├──────────────────────────────────────┤ │
│          │ │ Quick Actions                        │ │
│          │ ├──────────────────────────────────────┤ │
│ Settings │ │ Content Cards                        │ │
│ Help     │ └──────────────────────────────────────┘ │
└──────────┴──────────────────────────────────────────┘
```

### Auth Pages Layout
```
┌─────────────────────────────────────────────────────┐
│                                                     │
│              Logo + Tagline                         │
│                                                     │
│         ┌─────────────────────────┐                 │
│         │ Auth Card               │                 │
│         │                         │                 │
│         │ Form Fields             │                 │
│         │                         │                 │
│         │ Submit Button           │                 │
│         │                         │                 │
│         └─────────────────────────┘                 │
│                                                     │
│              Footer Note                            │
└─────────────────────────────────────────────────────┘
```

---

## ✅ Do's and Don'ts

### Do's ✅
- Use the emerald/teal gradient for primary actions
- Maintain consistent spacing using the spacing scale
- Use rounded-xl for cards and buttons
- Apply subtle shadows for depth
- Use glassmorphic effects for overlays
- Include loading and empty states

### Don'ts ❌
- Don't use pure black (`#000`), use `gray-900` instead
- Don't use sharp corners, always use rounded corners
- Don't use heavy drop shadows, keep them subtle
- Don't mix different color schemes on the same page
- Don't forget hover and focus states
- Don't use inline styles when Tailwind classes exist

---

## 🔧 Utility Classes

### Common Utilities
```tsx
// Glassmorphic card
"bg-white/70 backdrop-blur-sm border border-gray-200/60 rounded-xl"

// Gradient button
"bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200"

// Icon container
"w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100"

// Focus ring
"focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
```

---

## 📦 File Structure

```
frontend/
├── components/
│   ├── layout/
│   │   ├── DashboardLayout.tsx
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   └── Card.tsx
│   ├── auth/
│   │   └── ProtectedRoute.tsx
│   └── orders/
│       └── OrderCard.tsx
├── pages/
│   ├── _app.tsx
│   ├── index.tsx
│   ├── login.tsx
│   ├── register.tsx
│   ├── buyer/
│   ├── seller/
│   ├── bank/
│   └── delivery/
├── lib/
│   ├── api-client.ts
│   ├── auth-context.tsx
│   └── utils.ts
└── types/
    └── index.ts
```

---

*Last updated: December 2025*

