'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { getTenantSlugFromClient } from '@/lib/tenant';
import { cn } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface InventoryItem {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  currentStock: number;
  reorderLevel: number;
  unit: string;
  supplierId: string;
  supplierName: string;
}

interface InventoryCategory {
  id: string;
  name: string;
  itemCount: number;
}

interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
}

const tabs = [
  { key: 'items', label: 'Items' },
  { key: 'categories', label: 'Categories' },
  { key: 'suppliers', label: 'Suppliers' },
];

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="card animate-pulse">
          <div className="mb-2 h-4 w-36 rounded bg-stone-200" />
          <div className="h-3 w-48 rounded bg-stone-200" />
        </div>
      ))}
    </div>
  );
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState('items');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Stock modal
  const [stockItem, setStockItem] = useState<InventoryItem | null>(null);
  const [stockAction, setStockAction] = useState<'in' | 'out'>('in');
  const [stockQuantity, setStockQuantity] = useState('');
  const [stockReason, setStockReason] = useState('');
  const [stockLoading, setStockLoading] = useState(false);

  // Add item modal
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    categoryId: '',
    reorderLevel: '',
    unit: 'pcs',
    supplierId: '',
  });
  const [addItemLoading, setAddItemLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const tenantSlug = getTenantSlugFromClient();
      if (activeTab === 'items') {
        const data = await api.get<InventoryItem[]>('/admin/inventory', { tenantSlug });
        setItems(data);
      } else if (activeTab === 'categories') {
        const data = await api.get<InventoryCategory[]>('/admin/inventory/categories', { tenantSlug });
        setCategories(data);
      } else {
        const data = await api.get<Supplier[]>('/admin/inventory/suppliers', { tenantSlug });
        setSuppliers(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch categories and suppliers for add item form
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const tenantSlug = getTenantSlugFromClient();
        const [cats, supps] = await Promise.all([
          api.get<InventoryCategory[]>('/admin/inventory/categories', { tenantSlug }),
          api.get<Supplier[]>('/admin/inventory/suppliers', { tenantSlug }),
        ]);
        setCategories(cats);
        setSuppliers(supps);
      } catch {
        // silent
      }
    };
    fetchMeta();
  }, []);

  const handleStockUpdate = async () => {
    if (!stockItem || !stockQuantity) return;
    setStockLoading(true);
    try {
      const tenantSlug = getTenantSlugFromClient();
      await api.post(
        `/admin/inventory/${stockItem.id}/stock`,
        {
          action: stockAction,
          quantity: Number(stockQuantity),
          reason: stockReason,
        },
        { tenantSlug },
      );
      setStockItem(null);
      setStockQuantity('');
      setStockReason('');
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stock');
    } finally {
      setStockLoading(false);
    }
  };

  const handleAddItem = async () => {
    setAddItemLoading(true);
    try {
      const tenantSlug = getTenantSlugFromClient();
      await api.post(
        '/admin/inventory',
        {
          name: newItem.name,
          categoryId: newItem.categoryId,
          reorderLevel: Number(newItem.reorderLevel),
          unit: newItem.unit,
          supplierId: newItem.supplierId || undefined,
        },
        { tenantSlug },
      );
      setShowAddItem(false);
      setNewItem({ name: '', categoryId: '', reorderLevel: '', unit: 'pcs', supplierId: '' });
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add item');
    } finally {
      setAddItemLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-stone-900 md:text-2xl">Inventory</h1>
        {activeTab === 'items' && (
          <Button size="sm" onClick={() => setShowAddItem(true)}>
            + Add Item
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-stone-200 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors min-h-[44px] border-b-2 -mb-px',
              activeTab === tab.key
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-stone-500 hover:text-stone-700',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 ring-1 ring-inset ring-red-200">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-medium underline">Dismiss</button>
        </div>
      )}

      {/* Items tab */}
      {activeTab === 'items' && (
        loading ? (
          <ListSkeleton />
        ) : items.length === 0 ? (
          <div className="card py-12 text-center">
            <p className="text-sm font-medium text-stone-900">No inventory items</p>
            <p className="mt-1 text-sm text-stone-500">Add your first inventory item to start tracking stock.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const isLowStock = item.currentStock <= item.reorderLevel;
              return (
                <div
                  key={item.id}
                  className={cn('card', isLowStock && 'ring-2 ring-red-200')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-medium text-stone-900">{item.name}</p>
                        {isLowStock && (
                          <span className="badge-red">Low Stock</span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm text-stone-500">
                        {item.categoryName}
                        {item.supplierName && <> &middot; {item.supplierName}</>}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        'text-lg font-bold',
                        isLowStock ? 'text-red-600' : 'text-stone-900',
                      )}>
                        {item.currentStock}
                      </p>
                      <p className="text-xs text-stone-400">{item.unit}</p>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-stone-400">
                      Reorder level: {item.reorderLevel} {item.unit}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setStockItem(item); setStockAction('in'); }}
                        className="rounded-lg bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100 min-h-[36px]"
                      >
                        Stock In
                      </button>
                      <button
                        onClick={() => { setStockItem(item); setStockAction('out'); }}
                        className="rounded-lg bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-200 min-h-[36px]"
                      >
                        Stock Out
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Categories tab */}
      {activeTab === 'categories' && (
        loading ? (
          <ListSkeleton />
        ) : categories.length === 0 ? (
          <div className="card py-12 text-center">
            <p className="text-sm font-medium text-stone-900">No categories defined</p>
            <p className="mt-1 text-sm text-stone-500">Categories help organize your inventory items.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map((cat) => (
              <div key={cat.id} className="card">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-stone-900">{cat.name}</p>
                  <span className="text-sm text-stone-400">{cat.itemCount} item(s)</span>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Suppliers tab */}
      {activeTab === 'suppliers' && (
        loading ? (
          <ListSkeleton />
        ) : suppliers.length === 0 ? (
          <div className="card py-12 text-center">
            <p className="text-sm font-medium text-stone-900">No suppliers added</p>
            <p className="mt-1 text-sm text-stone-500">Add supplier information for your inventory items.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {suppliers.map((supplier) => (
              <div key={supplier.id} className="card">
                <p className="font-medium text-stone-900">{supplier.name}</p>
                <p className="mt-0.5 text-sm text-stone-500">
                  {supplier.contactPerson && <>{supplier.contactPerson} &middot; </>}
                  {supplier.phone}
                </p>
                {supplier.email && (
                  <p className="mt-0.5 text-xs text-stone-400">{supplier.email}</p>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* Stock In/Out modal */}
      {stockItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setStockItem(null)} />
          <div className="relative z-10 w-full max-w-sm rounded-t-xl bg-white p-6 shadow-xl sm:rounded-xl">
            <h3 className="text-lg font-semibold text-stone-900">
              {stockAction === 'in' ? 'Stock In' : 'Stock Out'} - {stockItem.name}
            </h3>
            <p className="mb-4 text-sm text-stone-500">
              Current stock: {stockItem.currentStock} {stockItem.unit}
            </p>
            <div className="space-y-3">
              <Input
                label="Quantity"
                type="number"
                required
                value={stockQuantity}
                onChange={(e) => setStockQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
              <Input
                label="Reason"
                value={stockReason}
                onChange={(e) => setStockReason(e.target.value)}
                placeholder="Reason for stock change (optional)"
              />
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="secondary" onClick={() => setStockItem(null)} className="flex-1">
                Cancel
              </Button>
              <Button
                loading={stockLoading}
                onClick={handleStockUpdate}
                disabled={!stockQuantity || Number(stockQuantity) <= 0}
                className="flex-1"
              >
                {stockAction === 'in' ? 'Stock In' : 'Stock Out'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add item modal */}
      {showAddItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowAddItem(false)} />
          <div className="relative z-10 w-full max-w-md rounded-t-xl bg-white p-6 shadow-xl sm:rounded-xl">
            <h3 className="mb-4 text-lg font-semibold text-stone-900">Add Inventory Item</h3>
            <div className="space-y-3">
              <Input
                label="Item Name"
                required
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                placeholder="e.g. Bath Towels"
              />
              <div className="w-full">
                <label className="mb-1.5 block text-sm font-medium text-stone-700">
                  Category <span className="ml-0.5 text-red-500">*</span>
                </label>
                <select
                  value={newItem.categoryId}
                  onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}
                  className="input-field min-h-[44px]"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <Input
                label="Reorder Level"
                type="number"
                required
                value={newItem.reorderLevel}
                onChange={(e) => setNewItem({ ...newItem, reorderLevel: e.target.value })}
                placeholder="10"
              />
              <Input
                label="Unit"
                value={newItem.unit}
                onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                placeholder="pcs, kg, liters, etc."
              />
              <div className="w-full">
                <label className="mb-1.5 block text-sm font-medium text-stone-700">Supplier</label>
                <select
                  value={newItem.supplierId}
                  onChange={(e) => setNewItem({ ...newItem, supplierId: e.target.value })}
                  className="input-field min-h-[44px]"
                >
                  <option value="">None</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="secondary" onClick={() => setShowAddItem(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                loading={addItemLoading}
                onClick={handleAddItem}
                disabled={!newItem.name || !newItem.categoryId || !newItem.reorderLevel}
                className="flex-1"
              >
                Add Item
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
