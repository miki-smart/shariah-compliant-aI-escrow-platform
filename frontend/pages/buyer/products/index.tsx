/**
 * Buyer Products Listing Page
 * Browse available products
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery } from 'react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { Product, ShariahCategory } from '@/types';
import { 
  Package, 
  Search, 
  Shield, 
  AlertCircle, 
  Clock, 
  ShoppingCart,
  Filter,
  Star,
} from 'lucide-react';

const SHARIAH_CONFIG: Record<ShariahCategory, { bg: string; text: string; label: string }> = {
  [ShariahCategory.HALAL]: { bg: 'bg-emerald-50', text: 'text-emerald-600', label: 'Halal' },
  [ShariahCategory.HARAM]: { bg: 'bg-red-50', text: 'text-red-600', label: 'Non-Compliant' },
  [ShariahCategory.DOUBTFUL]: { bg: 'bg-amber-50', text: 'text-amber-600', label: 'Doubtful' },
  [ShariahCategory.PENDING_REVIEW]: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'Pending Review' },
};

export default function BuyerProductsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery(
    ['available-products', page, searchTerm, category],
    () => apiClient.getAvailableProducts({ 
      page, 
      page_size: 12,
      category: category || undefined,
      search: searchTerm || undefined,
    }),
    { 
      enabled: !!user && !authLoading,
      keepPreviousData: true,
    }
  );

  // Handle authentication and authorization
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    const userRole = user.role || (user as any).roles?.[0];
    if (userRole && userRole !== 'buyer') {
      const dashboardRoutes: Record<string, string> = {
        seller: '/seller',
        bank: '/bank',
        delivery_provider: '/delivery',
        admin: '/admin',
      };
      router.push(dashboardRoutes[userRole] || '/');
    }
  }, [user, authLoading, router]);

  // Show loading state while checking auth
  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const userRole = user.role || (user as any).roles?.[0];
  if (userRole !== 'buyer') {
    return null;
  }

  const products = data?.products || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 12);

  const getShariahConfig = (category: ShariahCategory) => {
    return SHARIAH_CONFIG[category] || SHARIAH_CONFIG[ShariahCategory.PENDING_REVIEW];
  };

  return (
    <DashboardLayout role="BUYER">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Browse Products 🛍️</h1>
            <p className="text-gray-500 mt-1">
              Discover Shariah-compliant products from verified sellers
            </p>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              >
                <option value="">All Categories</option>
                <option value="electronics">Electronics</option>
                <option value="food">Food & Beverages</option>
                <option value="clothing">Clothing</option>
                <option value="home">Home & Living</option>
                <option value="health">Health & Beauty</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-80 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : error ? (
          <Card>
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Products</h3>
              <p className="text-gray-500">Please try again later.</p>
            </div>
          </Card>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map(product => {
              const shariahConfig = getShariahConfig(product.shariah_category);
              return (
                <Link key={product.id} href={`/buyer/products/${product.id}`}>
                  <Card className="h-full hover:shadow-lg hover:border-emerald-200 transition-all cursor-pointer group">
                    {/* Product Image */}
                    <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden mb-4">
                      {product.thumbnail_url ? (
                        <img
                          src={product.thumbnail_url}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-16 h-16 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="space-y-3">
                      {/* Shariah Badge */}
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${shariahConfig.bg} ${shariahConfig.text}`}>
                          <Shield className="w-3 h-3" />
                          {shariahConfig.label}
                        </span>
                      </div>

                      {/* Name & Category */}
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors line-clamp-2">
                          {product.name}
                        </h3>
                        <p className="text-sm text-gray-500">{product.category}</p>
                      </div>

                      {/* Price */}
                      <div className="flex items-center justify-between">
                        <p className="text-lg font-bold text-emerald-600">
                          {product.currency} {Number(product.price).toLocaleString()}
                        </p>
                        {product.stock_quantity > 0 ? (
                          <span className="text-xs text-gray-500">
                            {product.stock_quantity} in stock
                          </span>
                        ) : (
                          <span className="text-xs text-red-500">Out of stock</span>
                        )}
                      </div>

                      {/* Seller Info */}
                      <div className="pt-3 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                          by {product.seller?.business_name || product.seller?.full_name || 'Verified Seller'}
                        </p>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card>
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500">
                {searchTerm || category 
                  ? 'Try adjusting your search or filters'
                  : 'Check back later for new products'}
              </p>
            </div>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

