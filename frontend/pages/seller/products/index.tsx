/**
 * Seller Products Page - Manage product listings
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api-client';
import { Product, ProductStatus, ShariahCategory } from '@/types';
import Link from 'next/link';
import { 
  Plus, Package, Search, Filter, MoreVertical, Edit, Trash, 
  Eye, EyeOff, Shield, AlertTriangle, CheckCircle, Clock,
  RefreshCw
} from 'lucide-react';

const STATUS_COLORS: Record<ProductStatus, { bg: string; text: string; label: string }> = {
  [ProductStatus.ACTIVE]: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Active' },
  [ProductStatus.INACTIVE]: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Inactive' },
  [ProductStatus.OUT_OF_STOCK]: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Out of Stock' },
  [ProductStatus.PENDING_APPROVAL]: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pending Review' },
  [ProductStatus.REJECTED]: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
};

const SHARIAH_ICONS: Record<ShariahCategory, { icon: typeof Shield; color: string }> = {
  [ShariahCategory.HALAL]: { icon: CheckCircle, color: 'text-emerald-500' },
  [ShariahCategory.HARAM]: { icon: AlertTriangle, color: 'text-red-500' },
  [ShariahCategory.MASHBOOH]: { icon: Clock, color: 'text-amber-500' },
  [ShariahCategory.PENDING_REVIEW]: { icon: Clock, color: 'text-blue-500' },
};

export default function SellerProductsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatus | ''>('');
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery(
    ['my-products', page, searchTerm, statusFilter],
    () => apiClient.getMyProducts({ page, page_size: 12 }),
    { keepPreviousData: true }
  );

  const toggleActiveMutation = useMutation(
    (productId: string) => apiClient.toggleProductActive(productId),
    {
      onMutate: async (productId) => {
        // Cancel any outgoing refetches
        await queryClient.cancelQueries(['my-products']);
        
        // Snapshot the previous value
        const previousData = queryClient.getQueryData(['my-products', page, searchTerm, statusFilter]);
        
        // Optimistically update the cache
        queryClient.setQueryData(['my-products', page, searchTerm, statusFilter], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            products: old.products.map((p: Product) => {
              if (p.id !== productId) return p;
              const newIsActive = !p.is_active;
              return {
                ...p,
                is_active: newIsActive,
                // Also update status for UI consistency
                status: newIsActive ? ProductStatus.ACTIVE : ProductStatus.INACTIVE,
              };
            }),
          };
        });
        
        return { previousData };
      },
      onError: (err, productId, context) => {
        // Rollback on error
        if (context?.previousData) {
          queryClient.setQueryData(['my-products', page, searchTerm, statusFilter], context.previousData);
        }
      },
      onSettled: () => {
        // Always refetch after error or success
        queryClient.invalidateQueries(['my-products']);
        queryClient.invalidateQueries(['seller-products']); // Also update dashboard
      },
    }
  );

  const deleteMutation = useMutation(
    (productId: string) => apiClient.deleteProduct(productId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['my-products']);
        queryClient.invalidateQueries(['seller-products']); // Also update dashboard
      },
    }
  );

  const products = data?.products || [];
  const totalProducts = data?.total || 0;
  const activeProducts = products.filter(p => p.status === ProductStatus.ACTIVE).length;
  const pendingProducts = products.filter(p => p.status === ProductStatus.PENDING_APPROVAL).length;

  const filteredProducts = products.filter(p => {
    if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (statusFilter && p.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const handleDelete = async (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteMutation.mutate(productId);
    }
  };

  return (
    <DashboardLayout role="SELLER">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Products</h1>
            <p className="text-gray-500">Manage your product catalog</p>
          </div>
          <Link href="/seller/products/new">
            <Button variant="gradient">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Products"
            value={totalProducts}
            icon={<Package className="w-6 h-6 text-blue-600" />}
          />
          <StatCard
            title="Active"
            value={activeProducts}
            icon={<CheckCircle className="w-6 h-6 text-emerald-600" />}
          />
          <StatCard
            title="Pending Review"
            value={pendingProducts}
            icon={<Clock className="w-6 h-6 text-amber-600" />}
          />
          <StatCard
            title="Shariah Compliant"
            value={products.filter(p => p.is_halal).length}
            icon={<Shield className="w-6 h-6 text-teal-600" />}
          />
        </div>

        {/* Filters */}
        <Card padding="sm">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ProductStatus | '')}
                className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
              >
                <option value="">All Status</option>
                {Object.values(ProductStatus).map(status => (
                  <option key={status} value={status}>
                    {STATUS_COLORS[status].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onToggleActive={() => toggleActiveMutation.mutate(product.id)}
                onDelete={() => handleDelete(product.id)}
              />
            ))}
          </div>
        ) : (
          <Card>
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm || statusFilter 
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first product'}
              </p>
              {!searchTerm && !statusFilter && (
                <Link href="/seller/products/new">
                  <Button variant="gradient">Add Your First Product</Button>
                </Link>
              )}
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

// Product Card Component
function ProductCard({ 
  product, 
  onToggleActive, 
  onDelete 
}: { 
  product: Product; 
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const statusConfig = STATUS_COLORS[product.status];
  const shariahConfig = SHARIAH_ICONS[product.shariah_category];
  const ShariahIcon = shariahConfig.icon;

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
      {/* Shariah Badge */}
      <div className="absolute top-3 right-3 z-10">
        <div className={`p-1.5 rounded-lg bg-white shadow-sm ${shariahConfig.color}`}>
          <ShariahIcon className="w-4 h-4" />
        </div>
      </div>

      {/* Product Image Placeholder */}
      <Link href={`/seller/products/${product.id}`}>
        <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-4 flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity">
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
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <Link href={`/seller/products/${product.id}`}>
            <h3 className="font-semibold text-gray-900 line-clamp-1 hover:text-emerald-600 cursor-pointer transition-colors">{product.name}</h3>
          </Link>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-20">
                <Link href={`/seller/products/${product.id}`}>
                  <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                </Link>
                <Link href={`/seller/products/${product.id}/edit`}>
                  <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                </Link>
                <button 
                  onClick={() => {
                    setShowMenu(false);
                    onToggleActive();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  {product.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {product.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button 
                  onClick={() => {
                    setShowMenu(false);
                    onDelete();
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <Trash className="w-4 h-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-500 line-clamp-2">
          {product.description || 'No description'}
        </p>

        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="text-lg font-bold text-gray-900">
              ETB {Number(product.price).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">
              {product.stock_quantity} {product.unit} in stock
            </p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Click overlay */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowMenu(false)}
        />
      )}
    </Card>
  );
}

