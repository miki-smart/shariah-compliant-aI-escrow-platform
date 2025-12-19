/**
 * Sidebar - Role-based navigation sidebar
 * Updated to match emerald/teal auth design with escrow/finance menu items
 */
import Link from 'next/link';
import { useRouter } from 'next/router';
import { UserRole } from '@/types';
import {
  ShoppingBag,
  Package,
  Building2,
  Truck,
  Home,
  FileText,
  Shield,
  TrendingUp,
  Settings,
  HelpCircle,
  Wallet,
  CreditCard,
  ClipboardCheck,
  History,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Lock,
  FileCheck,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  role: UserRole;
}

interface NavItem {
  href: string;
  label: string;
  icon: any;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const roleNavigation: Record<UserRole, NavSection[]> = {
  BUYER: [
    {
      title: 'Main Menu',
      items: [
        { href: '/buyer', label: 'Dashboard', icon: Home },
        { href: '/buyer/products', label: 'Browse Products', icon: ShoppingBag },
        { href: '/buyer/orders', label: 'My Orders', icon: FileText },
      ],
    },
    {
      title: 'Escrow & Payments',
      items: [
        { href: '/buyer/escrow', label: 'Escrow Status', icon: Lock },
        { href: '/buyer/transactions', label: 'Transactions', icon: History },
      ],
    },
  ],
  SELLER: [
    {
      title: 'Main Menu',
      items: [
        { href: '/seller', label: 'Dashboard', icon: Home },
        { href: '/seller/products', label: 'My Products', icon: Package },
        { href: '/seller/orders', label: 'Orders', icon: FileText },
      ],
    },
    {
      title: 'Payments & Finance',
      items: [
        { href: '/seller/payments', label: 'Payments', icon: DollarSign },
        { href: '/seller/escrow', label: 'Escrow Releases', icon: Wallet },
        { href: '/seller/transactions', label: 'Transaction History', icon: History },
      ],
    },
  ],
  BANK: [
    {
      title: 'Main Menu',
      items: [
        { href: '/bank', label: 'Dashboard', icon: Home },
        { href: '/bank/orders', label: 'Pending Approvals', icon: FileText },
      ],
    },
    {
      title: 'Escrow Management',
      items: [
        { href: '/bank/escrow', label: 'Escrow Monitor', icon: Shield },
        { href: '/bank/releases', label: 'Release Queue', icon: CheckCircle2 },
        { href: '/bank/transactions', label: 'All Transactions', icon: History },
      ],
    },
    {
      title: 'Compliance & Audit',
      items: [
        { href: '/bank/compliance', label: 'Shariah Compliance', icon: FileCheck },
        { href: '/bank/audit', label: 'Audit Logs', icon: ClipboardCheck },
        { href: '/bank/reports', label: 'Reports', icon: BarChart3 },
      ],
    },
  ],
  DELIVERY: [
    {
      title: 'Main Menu',
      items: [
        { href: '/delivery', label: 'Dashboard', icon: Home },
        { href: '/delivery/assignments', label: 'My Deliveries', icon: Truck },
        { href: '/delivery/history', label: 'Delivery History', icon: History },
      ],
    },
  ],
};

const roleIcons: Record<UserRole, any> = {
  BUYER: ShoppingBag,
  SELLER: Package,
  BANK: Building2,
  DELIVERY: Truck,
};

const roleColors: Record<UserRole, string> = {
  BUYER: 'from-emerald-500 to-teal-500',
  SELLER: 'from-blue-500 to-cyan-500',
  BANK: 'from-amber-500 to-orange-500',
  DELIVERY: 'from-violet-500 to-purple-500',
};

export function Sidebar({ role }: SidebarProps) {
  const router = useRouter();
  const navSections = roleNavigation[role] || [];
  const RoleIcon = roleIcons[role];

  return (
    <aside className="w-64 bg-white/70 backdrop-blur-sm border-r border-gray-200/50 min-h-[calc(100vh-73px)] sticky top-[73px]">
      {/* Portal Header */}
      <div className="p-6 border-b border-gray-100">
        <div className={cn(
          "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 shadow-lg",
          roleColors[role]
        )}>
          <RoleIcon className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">
          {role === 'BUYER' && 'Buyer Portal'}
          {role === 'SELLER' && 'Seller Portal'}
          {role === 'BANK' && 'Bank Portal'}
          {role === 'DELIVERY' && 'Delivery Portal'}
        </h2>
        <p className="text-sm text-gray-500 mt-1">Shariah Compliant Platform</p>
      </div>

      {/* Navigation Sections */}
      <nav className="p-4 space-y-6 pb-32">
        {navSections.map((section, sectionIdx) => (
          <div key={sectionIdx}>
            <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = router.pathname === item.href || 
                  (item.href !== `/${role.toLowerCase()}` && router.pathname.startsWith(item.href));
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                      isActive
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium shadow-md shadow-emerald-200'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      {/* Bottom Section */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-white/50">
        <div className="space-y-1">
          <Link
            href="/settings"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">Settings</span>
          </Link>
          <Link
            href="/help"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm">Help Center</span>
          </Link>
        </div>
      </div>
    </aside>
  );
}

