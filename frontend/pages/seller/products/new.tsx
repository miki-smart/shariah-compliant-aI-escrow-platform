/**
 * Create New Product Page - Sellers can add new products
 * Includes automatic Shariah compliance validation
 */
import { useState } from 'react';
import { useRouter } from 'next/router';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { apiClient } from '@/lib/api-client';
import { ProductCategory, ProductCreate } from '@/types';
import { ArrowLeft, Package, Shield, Info, AlertTriangle, CheckCircle } from 'lucide-react';
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

export default function NewProductPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  
  // Form state
  const [formData, setFormData] = useState<ProductCreate>({
    name: '',
    description: '',
    category: ProductCategory.OTHER,
    price: 0,
    currency: 'ETB',
    stock_quantity: 0,
    unit: 'unit',
    min_order_quantity: 1,
    estimated_delivery_days: 7,
  });

  const selectedCategory = CATEGORY_OPTIONS.find(c => c.value === formData.category);

  const handleChange = (field: keyof ProductCreate, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const product = await apiClient.createProduct(formData);
      
      if (product.is_haram) {
        setError('Product was rejected due to Shariah non-compliance. Please review the product details.');
      } else if (product.requires_shariah_review) {
        setSuccess('Product created and pending Shariah review. You will be notified once approved.');
      } else {
        setSuccess('Product created successfully and is now active!');
      }
      
      // Redirect after delay
      setTimeout(() => {
        router.push('/seller/products');
      }, 2000);
      
    } catch (err: any) {
      // Handle Pydantic validation errors (array of error objects)
      const detail = err?.response?.data?.detail;
      if (Array.isArray(detail)) {
        // Extract messages from validation errors
        const messages = detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ');
        setError(messages || 'Validation failed. Please check your input.');
      } else if (typeof detail === 'string') {
        setError(detail);
      } else if (detail && typeof detail === 'object') {
        setError(detail.msg || detail.message || 'Failed to create product. Please try again.');
      } else {
        setError('Failed to create product. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => setStep(prev => Math.min(prev + 1, 3));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  return (
    <DashboardLayout role="SELLER">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/seller/products">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Add New Product</h1>
            <p className="text-gray-500">Create a Shariah-compliant product listing</p>
          </div>
        </div>

        {/* Shariah Notice */}
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-emerald-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-emerald-900">Shariah Compliance Notice</h3>
              <p className="text-sm text-emerald-700 mt-1">
                All products undergo automatic Shariah compliance validation. Products containing 
                haram elements (alcohol, pork, gambling-related items, etc.) will be automatically 
                rejected. Food and cosmetics products require halal certification.
              </p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                step >= s 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {s}
              </div>
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
                  subtitle="Enter the basic details of your product"
                  icon={<Package className="w-5 h-5 text-white" />}
                />
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
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
                      value={formData.category}
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
                      placeholder="Product SKU"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.tags?.join(', ') || ''}
                      onChange={(e) => handleChange('tags', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      placeholder="halal, organic, premium"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="button" variant="gradient" onClick={nextStep}>
                    Next: Pricing & Stock
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Pricing & Stock */}
            {step === 2 && (
              <div className="space-y-6">
                <CardHeader 
                  title="Pricing & Inventory" 
                  subtitle="Set your pricing and stock levels"
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price *
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
                        className="w-full pl-8 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                        placeholder="0.00"
                        min={0}
                        step={0.01}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Currency
                    </label>
                    <div className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-gray-900 font-medium">
                      ETB (Ethiopian Birr)
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Quantity
                    </label>
                    <input
                      type="number"
                      value={formData.stock_quantity}
                      onChange={(e) => handleChange('stock_quantity', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      placeholder="0"
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unit
                    </label>
                    <select
                      value={formData.unit || 'unit'}
                      onChange={(e) => handleChange('unit', e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    >
                      <option value="unit">Unit</option>
                      <option value="kg">Kilogram (kg)</option>
                      <option value="lb">Pound (lb)</option>
                      <option value="piece">Piece</option>
                      <option value="box">Box</option>
                      <option value="case">Case</option>
                      <option value="pallet">Pallet</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Order Quantity
                    </label>
                    <input
                      type="number"
                      value={formData.min_order_quantity}
                      onChange={(e) => handleChange('min_order_quantity', parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      placeholder="1"
                      min={1}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Order Quantity (Optional)
                    </label>
                    <input
                      type="number"
                      value={formData.max_order_quantity || ''}
                      onChange={(e) => handleChange('max_order_quantity', e.target.value ? parseInt(e.target.value) : undefined)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      placeholder="No limit"
                      min={1}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      value={formData.weight_kg || ''}
                      onChange={(e) => handleChange('weight_kg', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      placeholder="0.0"
                      min={0}
                      step={0.01}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Delivery (days)
                    </label>
                    <input
                      type="number"
                      value={formData.estimated_delivery_days}
                      onChange={(e) => handleChange('estimated_delivery_days', parseInt(e.target.value) || 7)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      placeholder="7"
                      min={1}
                    />
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    Back
                  </Button>
                  <Button type="button" variant="gradient" onClick={nextStep}>
                    Next: Certification
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Certification */}
            {step === 3 && (
              <div className="space-y-6">
                <CardHeader 
                  title="Halal Certification" 
                  subtitle="Provide certification details if applicable"
                  icon={<Shield className="w-5 h-5 text-white" />}
                />

                {selectedCategory?.requiresCert && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <Info className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-amber-800 font-medium">Certification Required</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Products in the {selectedCategory.label} category typically require halal certification 
                        for full approval. Without certification, your product may be pending review.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Halal Certification Number
                    </label>
                    <input
                      type="text"
                      value={formData.halal_certification || ''}
                      onChange={(e) => handleChange('halal_certification', e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      placeholder="e.g., HALAL-MY-2024-12345"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Certification Body
                    </label>
                    <input
                      type="text"
                      value={formData.certification_body || ''}
                      onChange={(e) => handleChange('certification_body', e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                      placeholder="e.g., JAKIM, IFANCA, ISWA"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Certification Expiry Date
                    </label>
                    <input
                      type="date"
                      value={formData.certification_expiry || ''}
                      onChange={(e) => handleChange('certification_expiry', e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <h4 className="font-medium text-gray-900">Product Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-500">Name:</span>
                    <span className="text-gray-900">{formData.name || '-'}</span>
                    <span className="text-gray-500">Category:</span>
                    <span className="text-gray-900">{selectedCategory?.label || '-'}</span>
                    <span className="text-gray-500">Price:</span>
                    <span className="text-gray-900">ETB {formData.price}</span>
                    <span className="text-gray-500">Stock:</span>
                    <span className="text-gray-900">{formData.stock_quantity} {formData.unit}</span>
                    <span className="text-gray-500">Certification:</span>
                    <span className="text-gray-900">{formData.halal_certification || 'None provided'}</span>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="outline" onClick={prevStep}>
                    Back
                  </Button>
                  <Button type="submit" variant="gradient" isLoading={isLoading}>
                    Create Product
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </form>
      </div>
    </DashboardLayout>
  );
}

