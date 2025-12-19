# Frontend - Shariah-Compliant AI Escrow Platform

Modern, elegant frontend built with Next.js and TypeScript for the Shariah-Compliant AI Escrow Platform.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
cd frontend
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## 📁 Project Structure

```
frontend/
├── components/        # React components
│   ├── layout/       # Layout components
│   ├── orders/       # Order components
│   ├── products/     # Product components
│   └── ui/          # Reusable UI components
├── lib/              # Utilities and API client
├── pages/            # Next.js pages (routes)
├── styles/           # Global styles
├── types/            # TypeScript types
└── ...config files
```

## 🎨 Design System

### Colors

- **Primary**: Blue scale (primary-50 to primary-900)
- **Status**: Green (success), Amber (warning), Red (error), Blue (info)
- **Shariah**: Green (halal), Red (haram), Amber (pending)
- **Escrow**: Gray (pending), Blue (locked), Green (released), Red (reverted)

### Components

- `StatusBadge` - Status indicators
- `ShariahBadge` - Shariah compliance badges
- `Button` - Consistent buttons
- `Card` - Content containers
- `OrderStatusTimeline` - Visual order progression
- `AIScoreCard` - AI risk assessment display
- `ShariahComplianceCard` - Compliance results
- `EscrowStatusCard` - Escrow state display

## 🔐 Authentication

Currently uses mock authentication. In production, integrate with Keycloak:

1. Install Keycloak JavaScript adapter
2. Configure Keycloak connection
3. Update login flow
4. Extract roles from JWT token

## 📚 Documentation

- [Frontend Architecture](./FRONTEND_ARCHITECTURE.md) - Complete architecture documentation
- [UX Flows](./UX_FLOWS.md) - User experience flow documentation

## 🛠️ Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **React Query** - Data fetching
- **Axios** - HTTP client

## 🎯 Key Features

- ✅ Role-based routing (Buyer, Seller, Bank, Delivery)
- ✅ Status-driven UI with color coding
- ✅ Shariah compliance badges
- ✅ Explainable AI indicators
- ✅ Escrow status monitoring
- ✅ Responsive design
- ✅ Type-safe API integration

## 📝 Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
NEXT_PUBLIC_KEYCLOAK_REALM=sharia-escrow
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=escrow-frontend
```

## 🧪 Testing

```bash
npm run test
```

## 📦 Build for Production

```bash
npm run build
```

The production build will be in the `.next` directory.

## 🤝 Contributing

1. Follow TypeScript best practices
2. Use existing component patterns
3. Maintain consistent styling with Tailwind
4. Add proper TypeScript types
5. Document complex logic

---

*Built with ❤️ for ethical finance*



