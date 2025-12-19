/**
 * Header - Top navigation bar with user info
 * Updated to match emerald/teal auth design
 */
import { UserRole } from '@/types';
import { Button } from '@/components/ui/Button';
import { LogOut, User, Bell } from 'lucide-react';
import Link from 'next/link';

interface HeaderProps {
  role: UserRole;
}

export function Header({ role }: HeaderProps) {
  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-20 shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            <span className="text-emerald-600">Sharia</span> Escrow
          </h1>
          <span className="text-sm text-gray-400">• Trust & Compliance</span>
        </Link>
        
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-emerald-500 rounded-full" />
          </button>

          {/* User info */}
          <div className="flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 capitalize">{role.toLowerCase()}</p>
              <p className="text-xs text-gray-500">Active</p>
            </div>
          </div>

          {/* Logout */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="text-gray-600 hover:text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
