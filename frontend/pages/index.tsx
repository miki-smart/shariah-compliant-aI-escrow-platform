/**
 * Landing page - Beautiful intro with auth redirect
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Shield, Lock, Truck, Building2, ArrowRight } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check auth and redirect to appropriate dashboard
    const token = localStorage.getItem('auth_token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        const role = userData.role?.toLowerCase() || 'buyer';
        const dashboardRoutes: Record<string, string> = {
          buyer: '/buyer',
          seller: '/seller',
          bank: '/bank',
          delivery_provider: '/delivery',
          admin: '/admin',
        };
        router.push(dashboardRoutes[role] || '/buyer');
      return;
      } catch (e) {
        // Invalid user data, continue to landing page
      }
    }
    setIsChecking(false);
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  const features = [
    {
      icon: Shield,
      title: 'Shariah Compliant',
      description: 'All transactions follow Islamic finance principles with full Shariah oversight.',
    },
    {
      icon: Lock,
      title: 'Secure Escrow',
      description: 'Funds are held securely until delivery is confirmed by both parties.',
    },
    {
      icon: Building2,
      title: 'Bank Integration',
      description: 'Seamless integration with Islamic banking for Murabaha financing.',
    },
    {
      icon: Truck,
      title: 'Delivery Tracking',
      description: 'Real-time delivery tracking with proof of delivery confirmation.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2310b981' fill-opacity='0.08'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Floating shapes */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-emerald-100/40 rounded-full blur-3xl" />

      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">
                <span className="text-emerald-600">Sharia</span> Escrow
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button variant="gradient">Get Started</Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero */}
        <section className="container mx-auto px-6 py-20 text-center">
          <div className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-sm font-medium mb-8">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Trusted by 500+ businesses across East Africa
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Shariah-Compliant
              <span className="block bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                Escrow Platform
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              Secure, transparent, and ethically-aligned transactions. 
              Built for businesses that value trust and Islamic finance principles.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register">
                <Button variant="gradient" size="lg" className="min-w-[200px]">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="outline" size="lg" className="min-w-[200px]">
                  Sign In to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose Sharia Escrow?
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our platform combines cutting-edge technology with Islamic finance principles 
              to provide a trustworthy escrow service.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-white/70 backdrop-blur-sm border border-gray-200/60 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all group"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-100 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto px-6 py-20">
          <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }} />
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-emerald-100 mb-8 max-w-xl mx-auto">
                Join hundreds of businesses using our Shariah-compliant escrow service 
                for secure and ethical transactions.
              </p>
              <Link href="/register">
                <Button 
                  size="lg" 
                  className="bg-white text-emerald-600 hover:bg-gray-100 shadow-xl min-w-[200px]"
                >
                  Create Free Account
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="container mx-auto px-6 py-12 border-t border-gray-200/50">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-900">Sharia Escrow</span>
            </div>
            <p className="text-sm text-gray-500">
              © 2025 Sharia Escrow. All transactions are Shariah-compliant.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}

