/**
 * DashboardLayout - Main layout wrapper for authenticated users
 * Matches the light emerald/teal auth design
 */
import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface DashboardLayoutProps {
  children: ReactNode;
  role: 'BUYER' | 'SELLER' | 'BANK' | 'DELIVERY';
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 relative">
      {/* Background Pattern */}
      <div className="fixed inset-0 opacity-40 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Subtle floating shapes */}
      <div className="fixed top-20 left-10 w-72 h-72 bg-emerald-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-20 right-10 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed top-1/2 right-1/4 w-64 h-64 bg-emerald-100/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10">
        <Header role={role} />
        <div className="flex">
          <Sidebar role={role} />
          <main className="flex-1 p-6 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

