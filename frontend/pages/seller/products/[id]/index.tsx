/**
 * Product Detail Page - View and manage a single product
 */
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api-client';
import { Product, ProductStatus, ShariahCategory, ProductCategory } from '@/types';
import { 
  ArrowLeft, Package, Edit, Trash, Eye, EyeOff, Shield, 
  AlertTriangle, CheckCircle, Clock, DollarSign, Box, Truck,
  Calendar, Tag, Award, BarChart3, Settings, RefreshCw
} from 'lucide-react';

const STATUS_CONFIG: Record<ProductStatus, { bg: string; text: string; label: string; icon: typeof CheckCircle }> = {
  [ProductStatus.ACTIVE]: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Active', icon: CheckCircle },
  [ProductStatus.INACTIVE]: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Inactive', icon: EyeOff },
  [ProductStatus.OUT_OF_STOCK]: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Out of Stock', icon: Box },
  [ProductStatus.PENDING_APPROVAL]: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pending Review', icon: Clock },
  [ProductStatus.REJECTED]: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected', icon: AlertTriangle },
};

const SHARIAH_CONFIG: Record<ShariahCategory, { bg: string; text: string; label: string; icon: typeof Shield }> = {
  [ShariahCategory.HALAL]: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Halal Certified', icon: CheckCircle },
  [ShariahCategory.HARAM]: { bg: 'bg-red-100', text: 'text-red-700', label: 'Non-Compliant', icon: AlertTriangle },
  [ShariahCategory.MASHBOOH]: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Requires Review', icon: Clock },
  [ShariahCategory.PENDING_REVIEW]: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pending Review', icon: Clock },
};

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

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: product, isLoading, error } = useQuery<Product>(
    ['product', id],
    () => apiClient.getProduct(id as string),
    { enabled: !!id }
  );

  const toggleActiveMutation = useMutation(
    () => apiClient.toggleProductActive(id as string),
    {
      onSuccess: (updatedProduct) => {
        queryClient.setQueryData(['product', id], updatedProduct);
        queryClient.invalidateQueries(['my-products']);
        queryClient.invalidateQueries(['seller-products']);
      },
    }
  );

  const deleteMutation = useMutation(
    () => apiClient.deleteProduct(id as string),
    {
      onSuccess: () => {
        router.push('/seller/products');
      },
    }
  );

  const handleDelete = () => {
    deleteMutation.mutate();
    setShowDeleteConfirm(false);
  };

  if (isLoading) {
    return (
      <DashboardLayout role="SELLER">
        <div className="space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
              <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
            </div>
            <div className="space-y-6">
              <div className="h-48 bg-gray-200 rounded-xl animate-pulse" />
              <div className="h-32 bg-gray-200 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !product) {
    return (
      <DashboardLayout role="SELLER">
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Product Not Found</h2>
          <p className="text-gray-500 mb-6">The product you're looking for doesn't exist or you don't have access to it.</p>
          <Link href="/seller/products">
            <Button variant="gradient">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Products
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const statusConfig = STATUS_CONFIG[product.status];
  const shariahConfig = SHARIAH_CONFIG[product.shariah_category];
  const StatusIcon = statusConfig.icon;
  const ShariahIcon = shariahConfig.icon;

  return (
    <DashboardLayout role="SELLER">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/seller/products">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
              <p className="text-gray-500">SKU: {product.sku || 'N/A'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => toggleActiveMutation.mutate()}
              disabled={toggleActiveMutation.isLoading}
            >
              {product.is_active ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Deactivate
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Activate
                </>
              )}
            </Button>
            <Link href={`/seller/products/${id}/edit`}>
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Button 
              variant="outline" 
              className="text-red-600 hover:bg-red-50 border-red-200"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Overview */}
            <Card>
              <CardHeader 
                title="Product Overview" 
                icon={<Package className="w-5 h-5 text-white" />}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Image */}
                <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
                  {product.thumbnail_url ? (
                    <img 
                      src={product.thumbnail_url} 
                      alt={product.name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <Package className="w-24 h-24 text-gray-300" />
                  )}
                </div>

                {/* Product Info */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-500">Category</label>
                    <p className="font-medium text-gray-900">
                      {CATEGORY_LABELS[product.category]}
                      {product.subcategory && ` / ${product.subcategory}`}
                    </p>
                  </div>

                  <div>
                    <label className="text-sm text-gray-500">Description</label>
                    <p className="text-gray-700">{product.description || 'No description provided'}</p>
                  </div>

                  {product.tags && product.tags.length > 0 && (
                    <div>
                      <label className="text-sm text-gray-500">Tags</label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {product.tags.map((tag, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-lg">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Pricing & Inventory */}
            <Card>
              <CardHeader 
                title="Pricing & Inventory" 
                icon={<DollarSign className="w-5 h-5 text-white" />}
              />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Price</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ETB {Number(product.price).toFixed(2)}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Stock</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {product.stock_quantity}
                    <span className="text-sm font-normal text-gray-500 ml-1">{product.unit}</span>
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Min Order</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {product.min_order_quantity}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500 mb-1">Max Order</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {product.max_order_quantity || '∞'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Shipping Info */}
            <Card>
              <CardHeader 
                title="Shipping Information" 
                icon={<Truck className="w-5 h-5 text-white" />}
              />
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Estimated Delivery</p>
                  <p className="font-medium text-gray-900">{product.estimated_delivery_days} days</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Weight</p>
                  <p className="font-medium text-gray-900">{product.weight_kg ? `${product.weight_kg} kg` : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Shipping Class</p>
                  <p className="font-medium text-gray-900">{product.shipping_class || 'Standard'}</p>
                </div>
                {product.dimensions && (
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Dimensions</p>
                    <p className="font-medium text-gray-900">
                      {product.dimensions.length} × {product.dimensions.width} × {product.dimensions.height} {product.dimensions.unit || 'cm'}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Halal Certification */}
            {(product.halal_certification || product.certification_body) && (
              <Card>
                <CardHeader 
                  title="Halal Certification" 
                  icon={<Award className="w-5 h-5 text-white" />}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {product.halal_certification && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Certificate Number</p>
                      <p className="font-medium text-gray-900">{product.halal_certification}</p>
                    </div>
                  )}
                  {product.certification_body && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Certifying Body</p>
                      <p className="font-medium text-gray-900">{product.certification_body}</p>
                    </div>
                  )}
                  {product.certification_expiry && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Expiry Date</p>
                      <p className="font-medium text-gray-900">{product.certification_expiry}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">Status</h3>
              
              <div className="space-y-4">
                <div className={`p-4 rounded-xl ${statusConfig.bg}`}>
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`w-5 h-5 ${statusConfig.text}`} />
                    <div>
                      <p className={`font-medium ${statusConfig.text}`}>{statusConfig.label}</p>
                      <p className="text-sm opacity-75">Product Status</p>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-xl ${shariahConfig.bg}`}>
                  <div className="flex items-center gap-3">
                    <ShariahIcon className={`w-5 h-5 ${shariahConfig.text}`} />
                    <div>
                      <p className={`font-medium ${shariahConfig.text}`}>{shariahConfig.label}</p>
                      <p className="text-sm opacity-75">Shariah Compliance</p>
                    </div>
                  </div>
                </div>

                {product.shariah_notes && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Shariah Notes</p>
                    <p className="text-sm text-gray-700">{product.shariah_notes}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Quick Stats */}
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">Quick Stats</h3>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-500">Available</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    product.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {product.is_available ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-500">Active</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    product.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {product.is_active ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-500">Halal</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    product.is_halal ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {product.is_halal ? 'Yes' : 'Pending'}
                  </span>
                </div>
              </div>
            </Card>

            {/* Timestamps */}
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">History</h3>
              
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">Created</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(product.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
                {product.updated_at && (
                  <div className="flex items-center gap-3">
                    <RefreshCw className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Last Updated</p>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(product.updated_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Actions */}
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
              
              <div className="space-y-2">
                <Link href={`/seller/products/${id}/edit`} className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Product
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => toggleActiveMutation.mutate()}
                  disabled={toggleActiveMutation.isLoading}
                >
                  {product.is_active ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      Deactivate Product
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Activate Product
                    </>
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-red-600 hover:bg-red-50 border-red-200"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash className="w-4 h-4 mr-2" />
                  Delete Product
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="max-w-md w-full mx-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Product?</h3>
                <p className="text-gray-500 mb-6">
                  Are you sure you want to delete "{product.name}"? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
                    Cancel
                  </Button>
                  <Button 
                    variant="primary" 
                    className="bg-red-500 hover:bg-red-600"
                    onClick={handleDelete}
                    disabled={deleteMutation.isLoading}
                  >
                    {deleteMutation.isLoading ? 'Deleting...' : 'Delete Product'}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

