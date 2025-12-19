/**
 * Edit Product Page - Sellers can update their existing products
 */
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api-client';
import { ProductCategory, ProductUpdate, Product } from '@/types';
import { ArrowLeft, Package, Shield, Info, AlertTriangle, CheckCircle, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';

const CATEGORY_OPTIONS = [
  { value: ProductCategory.FOOD_BEVERAGE, label: 'Food & Beverage', requiresCert: true },
  { value: ProductCategory.ELECTRONICS, label: 'Electronics', requiresCert: false },
  { value: ProductCategory.CLOTHING_TEXTILE, label: 'Clothing & Textile', requiresCert: false },
  { value: ProductCategory.AGRICULTURE, label: 'Agriculture', requiresCert: true },
  { value: ProductCategory.MANUFACTURING, label: 'Manufacturing', requiresCert: false },
  { value: ProductCategory.RAW_MATERIALS, label: 'Raw Materials', requiresCert: false },
  { value: ProductCategory.SERVICES, label: 'Services', requiresCert: false },
  { value: ProductCategory.COSMETICS, label: 'Cosmetics', requiresCert: true },
  { value: ProductCategory.PHARMACEUTICALS, label: 'Pharmaceuticals', requiresCert: true },
  { value: ProductCategory.OTHER, label: 'Other', requiresCert: false },
];

export default function EditProductPage() {
  const router = useRouter();
  const { id } = router.query;
  const queryClient = useQueryClient();
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [hasChanges, setHasChanges] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<ProductUpdate>({});

  // Fetch existing product
  const { data: product, isLoading: isLoadingProduct, error: fetchError } = useQuery<Product>(
    ['product', id],
    () => apiClient.getProduct(id as string),
    { 
      enabled: !!id,
      onSuccess: (data) => {
        // Pre-fill form with existing data
        setFormData({
          name: data.name,
          description: data.description || '',
          sku: data.sku || '',
          category: data.category,
          subcategory: data.subcategory || '',
          price: Number(data.price),
          currency: data.currency,
          min_order_quantity: data.min_order_quantity,
          max_order_quantity: data.max_order_quantity,
          stock_quantity: data.stock_quantity,
          unit: data.unit,
          images: data.images,
          thumbnail_url: data.thumbnail_url || '',
          weight_kg: data.weight_kg,
          dimensions: data.dimensions,
          shipping_class: data.shipping_class || '',
          estimated_delivery_days: data.estimated_delivery_days,
          halal_certification: data.halal_certification || '',
          certification_expiry: data.certification_expiry || '',
          certification_body: data.certification_body || '',
          tags: data.tags,
          attributes: data.attributes,
          is_active: data.is_active,
        });
      }
    }
  );

  // Update mutation
  const updateMutation = useMutation(
    (data: ProductUpdate) => apiClient.updateProduct(id as string, data),
    {
      onSuccess: (updatedProduct) => {
        setSuccess('Product updated successfully!');
        setHasChanges(false);
        // Update cache
        queryClient.setQueryData(['product', id], updatedProduct);
        queryClient.invalidateQueries(['my-products']);
        queryClient.invalidateQueries(['seller-products']);
        
        // Redirect after delay
        setTimeout(() => {
          router.push(`/seller/products/${id}`);
        }, 1500);
      },
      onError: (err: any) => {
        const detail = err?.response?.data?.detail;
        if (Array.isArray(detail)) {
          const messages = detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ');
          setError(messages || 'Validation failed. Please check your input.');
        } else if (typeof detail === 'string') {
          setError(detail);
        } else if (detail && typeof detail === 'object') {
          setError(detail.msg || detail.message || 'Failed to update product. Please try again.');
        } else {
          setError('Failed to update product. Please try again.');
        }
      }
    }
  );

  const selectedCategory = CATEGORY_OPTIONS.find(c => c.value === formData.category);

  const handleChange = (field: keyof ProductUpdate, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    updateMutation.mutate(formData);
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 3));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  if (isLoadingProduct) {
    return (
      <DashboardLayout role="SELLER">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <div className="h-10 w-20 bg-gray-200 rounded-lg animate-pulse" />
            <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
          </div>
          <div className="h-96 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      </DashboardLayout>
    );
  }

  if (fetchError || !product) {
    return (
      <DashboardLayout role="SELLER">
        <div className="max-w-3xl mx-auto text-center py-12">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Product Not Found</h2>
          <p className="text-gray-500 mb-6">The product you're trying to edit doesn't exist.</p>
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

  return (
    <DashboardLayout role="SELLER">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href={`/seller/products/${id}`}>
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
              <p className="text-gray-500">Update "{product.name}"</p>
            </div>
          </div>
          {hasChanges && (
            <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
              Unsaved changes
            </span>
          )}
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <button
                onClick={() => setStep(s)}
                className={`w-8 h-8 rounded-full flex items-center justify-center font-medium transition-colors ${
                  step >= s 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-gray-200 text-gray-500 hover:bg-gray-300'
                }`}
              >
                {s}
              </button>
              <span className={`ml-2 text-sm ${step >= s ? 'text-gray-900' : 'text-gray-400'}`}>
                {s === 1 && 'Basic Info'}
                {s === 2 && 'Pricing & Stock'}
                {s === 3 && 'Certification'}
              </span>
              {s < 3 && <div className={`w-20 h-1 mx-4 rounded ${step > s ? 'bg-emerald-500' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
            <p className="text-emerald-700">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Card>
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-6">
                <CardHeader 
                  title="Basic Information" 
                  subtitle="Update the basic details of your product"
                  icon={<Package className="w-5 h-5 text-white" />}
                />
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      placeholder="Enter product name"
                      required
                      minLength={3}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => handleChange('description', e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      placeholder="Describe your product in detail"
                      rows={4}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      value={formData.category || ProductCategory.OTHER}
                      onChange={(e) => handleChange('category', e.target.value as ProductCategory)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      required
                    >
                      {CATEGORY_OPTIONS.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label} {cat.requiresCert && '(Certification Required)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SKU (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.sku || ''}
                      onChange={(e) => handleChange('sku', e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      placeholder="e.g., PROD-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Thumbnail URL (Optional)
                    </label>
                    <input
                      type="url"
                      value={formData.thumbnail_url || ''}
                      onChange={(e) => handleChange('thumbnail_url', e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="button" variant="gradient" onClick={nextStep}>
                    Next Step
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Pricing & Stock */}
            {step === 2 && (
              <div className="space-y-6">
                <CardHeader 
                  title="Pricing & Inventory" 
                  subtitle="Set the pricing and stock information"
                  icon={<Package className="w-5 h-5 text-white" />}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price *
                    </label>
                    <div className="flex gap-2">
                      <span className="px-3 py-3 bg-gray-100 border border-gray-300 rounded-xl text-gray-900 font-medium">
                        ETB
                      </span>
                      <input
                        type="number"
                        value={formData.price || ''}
                        onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                        className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                        placeholder="0.00"
                        min="0.01"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Quantity *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={formData.stock_quantity ?? ''}
                        onChange={(e) => handleChange('stock_quantity', parseInt(e.target.value) || 0)}
                        className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                        placeholder="0"
                        min="0"
                        required
                      />
                      <input
                        type="text"
                        value={formData.unit || 'unit'}
                        onChange={(e) => handleChange('unit', e.target.value)}
                        className="w-24 px-3 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                        placeholder="unit"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Min Order Quantity
                    </label>
                    <input
                      type="number"
                      value={formData.min_order_quantity || 1}
                      onChange={(e) => handleChange('min_order_quantity', parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Order Quantity (Optional)
                    </label>
                    <input
                      type="number"
                      value={formData.max_order_quantity || ''}
                      onChange={(e) => handleChange('max_order_quantity', parseInt(e.target.value) || undefined)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      placeholder="No limit"
                      min="1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      value={formData.weight_kg || ''}
                      onChange={(e) => handleChange('weight_kg', parseFloat(e.target.value) || undefined)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      placeholder="0.0"
                      min="0"
                      step="0.1"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Est. Delivery (days)
                    </label>
                    <input
                      type="number"
                      value={formData.estimated_delivery_days || 7}
                      onChange={(e) => handleChange('estimated_delivery_days', parseInt(e.target.value) || 7)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      min="1"
                    />
                  </div>
                </div>

                {/* Active Toggle */}
                <div className="pt-4 border-t border-gray-200">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_active ?? true}
                      onChange={(e) => handleChange('is_active', e.target.checked)}
                      className="w-5 h-5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="font-medium text-gray-900">Product Active</span>
                      <p className="text-sm text-gray-500">Active products are visible to buyers</p>
                    </div>
                  </label>
                </div>

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    Previous
                  </Button>
                  <Button type="button" variant="gradient" onClick={nextStep}>
                    Next Step
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Certification */}
            {step === 3 && (
              <div className="space-y-6">
                <CardHeader 
                  title="Halal Certification" 
                  subtitle="Update certification details for Shariah compliance"
                  icon={<Shield className="w-5 h-5 text-white" />}
                />

                {selectedCategory?.requiresCert && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <Info className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800">Certification Required</p>
                      <p className="text-sm text-amber-700">
                        {selectedCategory.label} products require halal certification for Shariah compliance.
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Halal Certificate Number
                    </label>
                    <input
                      type="text"
                      value={formData.halal_certification || ''}
                      onChange={(e) => handleChange('halal_certification', e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      placeholder="e.g., HALAL-2024-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Certifying Body
                    </label>
                    <input
                      type="text"
                      value={formData.certification_body || ''}
                      onChange={(e) => handleChange('certification_body', e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      placeholder="e.g., Islamic Food Council"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Certificate Expiry Date
                    </label>
                    <input
                      type="date"
                      value={formData.certification_expiry || ''}
                      onChange={(e) => handleChange('certification_expiry', e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Current Shariah Status */}
                <div className="pt-4 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">Current Shariah Status</h4>
                  <div className={`p-4 rounded-xl ${
                    product.shariah_category === 'halal' ? 'bg-emerald-50 border border-emerald-200' :
                    product.shariah_category === 'haram' ? 'bg-red-50 border border-red-200' :
                    'bg-amber-50 border border-amber-200'
                  }`}>
                    <div className="flex items-center gap-3">
                      {product.shariah_category === 'halal' ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      ) : product.shariah_category === 'haram' ? (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      ) : (
                        <Info className="w-5 h-5 text-amber-600" />
                      )}
                      <div>
                        <p className={`font-medium ${
                          product.shariah_category === 'halal' ? 'text-emerald-700' :
                          product.shariah_category === 'haram' ? 'text-red-700' :
                          'text-amber-700'
                        }`}>
                          {product.shariah_category === 'halal' ? 'Halal Certified' :
                           product.shariah_category === 'haram' ? 'Non-Compliant' :
                           'Pending Review'}
                        </p>
                        {product.shariah_notes && (
                          <p className="text-sm opacity-75 mt-1">{product.shariah_notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    Previous
                  </Button>
                  <Button 
                    type="submit" 
                    variant="gradient"
                    disabled={updateMutation.isLoading || !hasChanges}
                  >
                    {updateMutation.isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </form>

        {/* Quick Save Button (floating) */}
        {hasChanges && step !== 3 && (
          <div className="fixed bottom-6 right-6 z-50">
            <Button 
              variant="gradient" 
              onClick={handleSubmit}
              disabled={updateMutation.isLoading}
              className="shadow-lg"
            >
              {updateMutation.isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

