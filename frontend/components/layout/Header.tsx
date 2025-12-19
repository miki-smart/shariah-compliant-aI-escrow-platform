/**
 * Header - Top navigation bar with user info
 */
import { UserRole } from '@/types';
import { Button } from '@/components/ui/Button';
import { LogOut, User } from 'lucide-react';

interface HeaderProps {
  role: UserRole;
}

export function Header({ role }: HeaderProps) {
  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    window.location.href = '/login';
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-gray-900">Sharia Escrow</h1>
          <span className="text-sm text-gray-500">• Trust & Compliance</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <User className="w-4 h-4" />
            <span className="capitalize">{role.toLowerCase()}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}


