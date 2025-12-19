/**
 * ProductCard - Product display card with Shariah badge
 */
import { Product } from '@/types';
import { Card } from '@/components/ui/Card';
import { ShariahBadge } from '@/components/ui/ShariahBadge';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { ShoppingCart } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  showActions?: boolean;
  onOrder?: () => void;
}

export function ProductCard({ product, showActions = true, onOrder }: ProductCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{product.name}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
        </div>
        <ShariahBadge status={product.halal_status} />
      </div>
      
      <div className="flex items-center justify-between mt-4">
        <div>
          <div className="text-2xl font-bold text-gray-900">{formatCurrency(product.price)}</div>
          <div className="text-xs text-gray-500 mt-1">{product.category}</div>
        </div>
        {showActions && (
          <Link href={`/products/${product.id}`}>
            <Button>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Order
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
}



