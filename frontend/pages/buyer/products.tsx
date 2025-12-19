/**
 * Buyer Products - Browse and order products
 */
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProductCard } from '@/components/products/ProductCard';
import { useQuery } from 'react-query';
import { apiClient } from '@/lib/api-client';
import { Product } from '@/types';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function BuyerProducts() {
  const [category, setCategory] = useState<string | undefined>();
  
  const { data: products, isLoading } = useQuery<Product[]>(
    ['products', category],
    () => apiClient.getProducts({ category, limit: 50 })
  );

  const categories = Array.from(new Set(products?.map((p) => p.category) || []));

  return (
    <DashboardLayout role="BUYER">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Browse Products</h1>
          <p className="text-gray-600 mt-2">Find Shariah-compliant products for your business</p>
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <Card padding="sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-700">Filter by category:</span>
              <Button
                variant={!category ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setCategory(undefined)}
              >
                All
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={category === cat ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </Card>
        )}

        {/* Products Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading products...</div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p>No products available</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}



