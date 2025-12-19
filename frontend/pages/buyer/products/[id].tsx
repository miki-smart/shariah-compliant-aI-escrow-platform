/**
 * Buyer Product Detail Page - View product details and place orders
 */
import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useQuery, useMutation } from 'react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api-client';
import { Product, ProductCategory, ShariahCategory } from '@/types';
import { 
  ArrowLeft, Package, Shield, ShoppingCart, Truck, Star,
  CheckCircle, AlertTriangle, Clock, DollarSign, Box, Award,
  Minus, Plus, User, MapPin, Calendar, Info, Loader2
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

const SHARIAH_CONFIG: Record<ShariahCategory, { bg: string; text: string; label: string; icon: typeof Shield }> = {
  [ShariahCategory.HALAL]: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Halal Certified', icon: CheckCircle },
  [ShariahCategory.HARAM]: { bg: 'bg-red-100', text: 'text-red-700', label: 'Non-Compliant', icon: AlertTriangle },
  [ShariahCategory.MASHBOOH]: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Under Review', icon: Clock },
  [ShariahCategory.PENDING_REVIEW]: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Pending Review', icon: Clock },
};

export default function BuyerProductDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [quantity, setQuantity] = useState(1);
  const [financingRequested, setFinancingRequested] = useState(false);
  const [notes, setNotes] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  const { data: product, isLoading, error } = useQuery<Product>(
    ['product', id],
    () => apiClient.getProduct(id as string),
    { enabled: !!id }
  );

  const createOrderMutation = useMutation(
    () => apiClient.createOrder({
      product_id: id as string,
      quantity,
      financing_requested: financingRequested,
      notes: notes || undefined,
    }),
    {
      onSuccess: () => {
        setOrderSuccess(true);
        setTimeout(() => {
          router.push('/buyer/orders');
        }, 2000);
      },
    }
  );

  const handleQuantityChange = (delta: number) => {
    const newQty = quantity + delta;
    if (product) {
      const min = product.min_order_quantity || 1;
      const max = product.max_order_quantity || product.stock_quantity;
      setQuantity(Math.max(min, Math.min(max, newQty)));
    }
  };

  const handlePlaceOrder = () => {
    createOrderMutation.mutate();
  };

  if (isLoading) {
    return (
      <DashboardLayout role="BUYER">
        <div className="space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-96 bg-gray-200 rounded-xl animate-pulse" />
            </div>
            <div className="space-y-6">
              <div className="h-64 bg-gray-200 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !product) {
    return (
      <DashboardLayout role="BUYER">
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Product Not Found</h2>
          <p className="text-gray-500 mb-6">The product you're looking for doesn't exist or is no longer available.</p>
          <Link href="/buyer/products">
            <Button variant="gradient">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Browse Products
            </Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const shariahConfig = SHARIAH_CONFIG[product.shariah_category];
  const ShariahIcon = shariahConfig.icon;
  const totalPrice = Number(product.price) * quantity;
  const canOrder = product.is_available && product.stock_quantity >= quantity && product.shariah_category === ShariahCategory.HALAL;

  return (
    <DashboardLayout role="BUYER">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/buyer/products">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Products
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Hero */}
            <Card>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Product Image */}
                <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center relative">
                  {product.thumbnail_url ? (
                    <img 
                      src={product.thumbnail_url} 
                      alt={product.name}
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <Package className="w-24 h-24 text-gray-300" />
                  )}
                  
                  {/* Shariah Badge */}
                  <div className={`absolute top-4 left-4 px-3 py-1.5 rounded-lg flex items-center gap-2 ${shariahConfig.bg}`}>
                    <ShariahIcon className={`w-4 h-4 ${shariahConfig.text}`} />
                    <span className={`text-sm font-medium ${shariahConfig.text}`}>{shariahConfig.label}</span>
                  </div>
                </div>

                {/* Product Info */}
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-emerald-600 font-medium">{CATEGORY_LABELS[product.category]}</span>
                    <h1 className="text-2xl font-bold text-gray-900 mt-1">{product.name}</h1>
                  </div>

                  {/* Seller Info */}
                  {product.seller && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {product.seller.business_name || product.seller.username}
                        </p>
                        {product.seller.city && (
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {product.seller.city}, {product.seller.country}
                          </p>
                        )}
                      </div>
                      {product.seller.seller_trust_score && (
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star className="w-4 h-4 fill-current" />
                          <span className="font-medium">{Number(product.seller.seller_trust_score).toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Price */}
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <p className="text-sm text-emerald-600 mb-1">Price per {product.unit}</p>
                    <p className="text-3xl font-bold text-gray-900">
                      ETB {Number(product.price).toFixed(2)}
                    </p>
                  </div>

                  {/* Quick Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Box className="w-4 h-4 text-gray-400" />
                      <span>{product.stock_quantity} {product.unit} available</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Truck className="w-4 h-4 text-gray-400" />
                      <span>Delivers in {product.estimated_delivery_days} days</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <ShoppingCart className="w-4 h-4 text-gray-400" />
                      <span>Min. {product.min_order_quantity} {product.unit}</span>
                    </div>
                    {product.max_order_quantity && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Info className="w-4 h-4 text-gray-400" />
                        <span>Max. {product.max_order_quantity} {product.unit}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Description */}
            <Card>
              <CardHeader title="Product Description" icon={<Package className="w-5 h-5 text-white" />} />
              <p className="text-gray-700 whitespace-pre-wrap">
                {product.description || 'No description provided for this product.'}
              </p>
              
              {product.tags && product.tags.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag, i) => (
                      <span key={i} className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-lg">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* Shipping & Certification */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Shipping Info */}
              <Card>
                <CardHeader title="Shipping" icon={<Truck className="w-5 h-5 text-white" />} />
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Estimated Delivery</span>
                    <span className="font-medium text-gray-900">{product.estimated_delivery_days} days</span>
                  </div>
                  {product.weight_kg && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Weight</span>
                      <span className="font-medium text-gray-900">{product.weight_kg} kg</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Shipping Class</span>
                    <span className="font-medium text-gray-900">{product.shipping_class || 'Standard'}</span>
                  </div>
                </div>
              </Card>

              {/* Certification */}
              <Card>
                <CardHeader title="Halal Certification" icon={<Award className="w-5 h-5 text-white" />} />
                {product.halal_certification ? (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Certificate</span>
                      <span className="font-medium text-gray-900">{product.halal_certification}</span>
                    </div>
                    {product.certification_body && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Certifying Body</span>
                        <span className="font-medium text-gray-900">{product.certification_body}</span>
                      </div>
                    )}
                    {product.certification_expiry && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Valid Until</span>
                        <span className="font-medium text-gray-900">{product.certification_expiry}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <Shield className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">AI-verified Shariah compliant</p>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* Order Sidebar */}
          <div className="space-y-6">
            {/* Order Card */}
            <Card className="sticky top-6">
              <h3 className="font-semibold text-gray-900 mb-4">Place Order</h3>
              
              {/* Quantity Selector */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-2">Quantity ({product.unit})</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= (product.min_order_quantity || 1)}
                      className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        const min = product.min_order_quantity || 1;
                        const max = product.max_order_quantity || product.stock_quantity;
                        setQuantity(Math.max(min, Math.min(max, val)));
                      }}
                      className="flex-1 text-center text-xl font-bold py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      min={product.min_order_quantity || 1}
                      max={product.max_order_quantity || product.stock_quantity}
                    />
                    <button
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= (product.max_order_quantity || product.stock_quantity)}
                      className="w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Unit Price</span>
                    <span className="text-gray-900">ETB {Number(product.price).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Quantity</span>
                    <span className="text-gray-900">× {quantity}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-200 flex justify-between">
                    <span className="font-medium text-gray-900">Total</span>
                    <span className="text-xl font-bold text-emerald-600">
                      ETB {totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Financing Option */}
                <label className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl cursor-pointer border border-blue-100 hover:bg-blue-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={financingRequested}
                    onChange={(e) => setFinancingRequested(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500 mt-0.5"
                  />
                  <div>
                    <span className="font-medium text-blue-900">Request Islamic Financing</span>
                    <p className="text-sm text-blue-700 mt-0.5">
                      Apply for Murabaha financing through our partner banks
                    </p>
                  </div>
                </label>

                {/* Order Notes */}
                <div>
                  <label className="block text-sm text-gray-500 mb-2">Order Notes (Optional)</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special requests..."
                    rows={2}
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 resize-none"
                  />
                </div>

                {/* Place Order Button */}
                <Button
                  variant="gradient"
                  className="w-full"
                  onClick={() => setShowOrderModal(true)}
                  disabled={!canOrder}
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {canOrder ? 'Place Order' : 'Not Available'}
                </Button>

                {!canOrder && (
                  <p className="text-sm text-center text-red-500">
                    {product.shariah_category !== ShariahCategory.HALAL 
                      ? 'This product is not Shariah compliant'
                      : product.stock_quantity < quantity
                      ? 'Insufficient stock'
                      : 'Product not available'}
                  </p>
                )}
              </div>
            </Card>

            {/* Trust Indicators */}
            <Card>
              <h3 className="font-semibold text-gray-900 mb-4">Why Buy Here?</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Shariah Verified</p>
                    <p className="text-xs text-gray-500">All products are AI-verified for compliance</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Escrow Protection</p>
                    <p className="text-xs text-gray-500">Funds held securely until delivery</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Truck className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Tracked Delivery</p>
                    <p className="text-xs text-gray-500">Real-time updates on your order</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Order Confirmation Modal */}
        {showOrderModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full">
              {orderSuccess ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Order Placed!</h3>
                  <p className="text-gray-500 mb-4">
                    Your order has been submitted successfully. Redirecting to orders...
                  </p>
                  <div className="flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ShoppingCart className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Order</h3>
                    <p className="text-gray-500">Please review your order details</p>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Product</span>
                      <span className="font-medium text-gray-900">{product.name}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Quantity</span>
                      <span className="font-medium text-gray-900">{quantity} {product.unit}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-500">Unit Price</span>
                      <span className="font-medium text-gray-900">ETB {Number(product.price).toFixed(2)}</span>
                    </div>
                    {financingRequested && (
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-500">Financing</span>
                        <span className="font-medium text-blue-600">Murabaha Requested</span>
                      </div>
                    )}
                    <div className="flex justify-between py-3 bg-emerald-50 rounded-lg px-3">
                      <span className="font-medium text-gray-900">Total Amount</span>
                      <span className="text-xl font-bold text-emerald-600">
                        ETB {totalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => setShowOrderModal(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="gradient" 
                      className="flex-1"
                      onClick={handlePlaceOrder}
                      disabled={createOrderMutation.isLoading}
                    >
                      {createOrderMutation.isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Confirm Order
                        </>
                      )}
                    </Button>
                  </div>

                  {createOrderMutation.isError && (
                    <p className="mt-4 text-sm text-center text-red-500">
                      Failed to place order. Please try again.
                    </p>
                  )}
                </>
              )}
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

