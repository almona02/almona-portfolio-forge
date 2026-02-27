import React from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { Database } from '@/types/database'

type Product = Database['public']['Tables']['products']['Row']

export type ProductEditValues = {
  price: number | null
  stock_quantity: number
  is_active: boolean
}

interface ProductEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  product: Product | null
  onSubmit: (values: ProductEditValues) => Promise<void> | void
}

export const ProductEditDialog: React.FC<ProductEditDialogProps> = ({ open, onOpenChange, product, onSubmit }) => {
  const [price, setPrice] = React.useState<number | ''>('')
  const [stock, setStock] = React.useState<number | ''>('')
  const [active, setActive] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (product) {
      setPrice(product.price ?? '')
      setStock(product.stock_quantity)
      setActive(!!product.is_active)
    } else {
      setPrice('')
      setStock('')
      setActive(false)
    }
  }, [product])

  const handleSubmit = async () => {
    if (!product) return
    // Basic validation
    const parsedPrice = price === '' ? null : Number(price)
    const parsedStock = typeof stock === 'string' ? Number(stock) : stock
    if (parsedStock == null || Number.isNaN(parsedStock) || parsedStock < 0) return
    if (parsedPrice !== null && (Number.isNaN(parsedPrice) || parsedPrice < 0)) return

    try {
      setSaving(true)
      await onSubmit({ price: parsedPrice, stock_quantity: Math.floor(parsedStock), is_active: active })
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Product</DialogTitle>
          <DialogDescription>Update price, stock level, and active state.</DialogDescription>
        </DialogHeader>

        {product && (
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="sku" className="typography-label">SKU</Label>
              <Input id="sku" value={product.sku} disabled />
            </div>
            <div>
              <Label htmlFor="name" className="typography-label">Name</Label>
              <Input id="name" value={product.name_en} disabled />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price" className="typography-label">Price (EGP)</Label>
                <Input
                  id="price"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min={0}
                  value={price === '' ? '' : String(price)}
                  onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
              <div>
                <Label htmlFor="stock" className="typography-label">Stock Quantity</Label>
                <Input
                  id="stock"
                  type="number"
                  inputMode="numeric"
                  step="1"
                  min={0}
                  value={stock === '' ? '' : String(stock)}
                  onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">Whether the product is visible for customers.</p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={() => void handleSubmit()} disabled={saving || !product}>Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ProductEditDialog
