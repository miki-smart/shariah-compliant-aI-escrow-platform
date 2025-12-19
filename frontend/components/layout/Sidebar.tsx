/**
 * Sidebar - Role-based navigation sidebar
 * Updated to match emerald/teal auth design
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  role: UserRole;
}

const roleNavigation: Record<UserRole, Array<{ href: string; label: string; icon: any }>> = {
  BUYER: [
    { href: '/buyer', label: 'Dashboard', icon: Home },
    { href: '/buyer/products', label: 'Browse Products', icon: ShoppingBag },
    { href: '/buyer/orders', label: 'My Orders', icon: FileText },
  ],
  SELLER: [
    { href: '/seller', label: 'Dashboard', icon: Home },
    { href: '/seller/products', label: 'My Products', icon: Package },
    { href: '/seller/orders', label: 'Orders', icon: FileText },
  ],
  BANK: [
    { href: '/bank', label: 'Dashboard', icon: Home },
    { href: '/bank/orders', label: 'Pending Orders', icon: FileText },
    { href: '/bank/escrow', label: 'Escrow Monitor', icon: Shield },
  ],
  DELIVERY: [
    { href: '/delivery', label: 'Dashboard', icon: Home },
    { href: '/delivery/assignments', label: 'My Deliveries', icon: Truck },
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
  const navItems = roleNavigation[role] || [];
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

      {/* Navigation */}
      <nav className="p-4 space-y-1">
        <p className="px-4 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Main Menu
        </p>
        {navItems.map((item) => {
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
