/**
 * Sidebar - Role-based navigation sidebar
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

export function Sidebar({ role }: SidebarProps) {
  const router = useRouter();

  const navItems = roleNavigation[role] || [];

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <div className="p-6">
        <h2 className="text-xl font-bold text-gray-900">
          {role === 'BUYER' && 'Buyer Portal'}
          {role === 'SELLER' && 'Seller Portal'}
          {role === 'BANK' && 'Bank Portal'}
          {role === 'DELIVERY' && 'Delivery Portal'}
        </h2>
      </div>
      <nav className="px-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = router.pathname === item.href || router.pathname.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}


