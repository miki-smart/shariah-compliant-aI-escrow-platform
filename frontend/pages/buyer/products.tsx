/**
 * Buyer Products - Browse and order Shariah-compliant products
 */
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useQuery } from 'react-query';
import { apiClient } from '@/lib/api-client';
import { Product, ProductCategory } from '@/types';
import { useState } from 'react';
import { Card, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { 
  Search, Filter, Shield, Package, ShoppingCart, 
  CheckCircle, Star, Truck, ArrowRight 
} from 'lucide-react';

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  [ProductCategory.FOOD_BEVERAGE]: 'Food & Beverage',
  [ProductCategory.ELECTRONICS]: 'Electronics',
  [ProductCategory.CLOTHING_TEXTILE]: 'Clothing & Textile',
  [ProductCategory.AGRICULTURE]: 'Agriculture',
  [ProductCategory.MANUFACTURING]: 'Manufacturing',
  [ProductCategory.RAW_MATERIALS]: 'Raw Materials',
  [ProductCategory.SERVICES]: 'Services',
  [ProductCategory.COSMETICS]: 'Cosmetics',
  [ProductCategory.PHARMACEUTICALS]: 'Pharmaceuticals',
  [ProductCategory.OTHER]: 'Other',
};

export default function BuyerProducts() {
  const [category, setCategory] = useState<ProductCategory | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  
  const { data, isLoading } = useQuery(
    ['available-products', category, searchTerm, page],
    () => apiClient.getAvailableProducts({ 
      page, 
      page_size: 12,
      category,
      search: searchTerm || undefined,
    }),
    { keepPreviousData: true }
  );

  const products = data?.products || [];
  const totalProducts = data?.total || 0;

  return (
    <DashboardLayout role="BUYER">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Browse Products</h1>
            <p className="text-gray-500">Find Shariah-compliant products for your business</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl">
            <Shield className="w-4 h-4" />
            All products are Shariah compliant
          </div>
        </div>

        {/* Search & Filters */}
        <Card padding="sm">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
              <Button
                variant={!category ? 'gradient' : 'outline'}
                size="sm"
                onClick={() => {
                  setCategory(undefined);
                  setPage(1);
                }}
              >
                All
              </Button>
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <Button
                  key={value}
                  variant={category === value ? 'gradient' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setCategory(value as ProductCategory);
                    setPage(1);
                  }}
                  className="whitespace-nowrap"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Results Count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {products.length} of {totalProducts} products
          </p>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="h-72 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <BuyerProductCard key={product.id} product={product} />
            ))}
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
        {data && data.total_pages > 1 && (
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
              Page {page} of {data.total_pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= data.total_pages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// Buyer Product Card Component
function BuyerProductCard({ product }: { product: Product }) {
  return (
    <Card className="group hover:shadow-lg transition-all hover:border-emerald-200 overflow-hidden">
      {/* Halal Badge */}
      <div className="absolute top-3 right-3 z-10">
        <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500 text-white rounded-full text-xs font-medium">
          <CheckCircle className="w-3 h-3" />
          Halal
        </div>
      </div>

      {/* Product Image */}
      <Link href={`/buyer/products/${product.id}`}>
        <div className="h-36 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-4 flex items-center justify-center group-hover:scale-[1.02] transition-transform cursor-pointer">
          {product.thumbnail_url ? (
            <img 
              src={product.thumbnail_url} 
              alt={product.name}
              className="w-full h-full object-cover rounded-lg"
            />
          ) : (
            <Package className="w-12 h-12 text-gray-300" />
          )}
        </div>
      </Link>

      {/* Product Info */}
      <div className="space-y-3">
        <div>
          <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider">
            {CATEGORY_LABELS[product.category] || product.category}
          </p>
          <Link href={`/buyer/products/${product.id}`}>
            <h3 className="font-semibold text-gray-900 line-clamp-1 mt-1 hover:text-emerald-600 cursor-pointer transition-colors">{product.name}</h3>
          </Link>
        </div>

        <p className="text-sm text-gray-500 line-clamp-2 min-h-[2.5rem]">
          {product.description || 'No description available'}
        </p>

        {/* Seller Info */}
        {product.seller && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-5 h-5 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-medium">
                {product.seller.business_name?.[0] || product.seller.username[0]}
              </span>
            </div>
            <span className="line-clamp-1">
              {product.seller.business_name || product.seller.username}
            </span>
            {product.seller.seller_trust_score && (
              <span className="flex items-center gap-0.5 text-amber-500">
                <Star className="w-3 h-3 fill-current" />
                {Number(product.seller.seller_trust_score).toFixed(1)}
              </span>
            )}
          </div>
        )}

        {/* Delivery Info */}
        <div className="flex items-center gap-1 text-xs text-gray-400">
          <Truck className="w-3 h-3" />
          Delivery in {product.estimated_delivery_days} days
        </div>

        {/* Price & Action */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div>
            <p className="text-lg font-bold text-gray-900">
              ETB {Number(product.price).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">
              Min. {product.min_order_quantity} {product.unit}
            </p>
          </div>
          <Link href={`/buyer/products/${product.id}`}>
            <Button variant="gradient" size="sm">
              View
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
