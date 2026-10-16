import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Plus,
  ArrowDownToLine,
  AlertTriangle,
  Search,
  Filter,
  Building,
  Store,
  Layers,
  Eye,
  Check,
  X,
  ShieldAlert
} from 'lucide-react';
import { useErp } from '../../context/ErpContext';
import type { Product, LocationType, DamageLog } from '../../types/erp';

export const InventoryTab: React.FC = () => {
  const {
    products,
    addProduct,
    updateProduct,
    recordStockIn,
    recordDamage,
    damageLogs,
    isOwnerMode
  } = useErp();

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyLowStock, setOnlyLowStock] = useState<boolean>(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [showStockInModal, setShowStockInModal] = useState<boolean>(false);
  const [showDamageModal, setShowDamageModal] = useState<boolean>(false);
  const [selectedProductForAction, setSelectedProductForAction] = useState<Product | null>(null);

  // Add Product Form State
  const [newProd, setNewProd] = useState<Omit<Product, 'id'>>({
    sku: '',
    name: '',
    category: 'Floor Tiles',
    sizeLabel: '2x2 ft (600x600 mm)',
    unitType: 'Tile_Box',
    sqftPerBox: 16,
    piecesPerBox: 4,
    batchShadeNo: 'A1',
    location: 'Main Godown',
    stockBoxes: 100,
    minStockAlert: 25,
    sellingPrice: 50,
    pricingUnit: 'per_sqft',
    purchasePrice: 35,
    gstPercent: 18,
    hsnCode: '69072100',
    description: '',
  });

  // Stock In Form State
  const [stockInQty, setStockInQty] = useState<number>(50);
  const [stockInPurchasePrice, setStockInPurchasePrice] = useState<number>(0);
  const [stockInLocation, setStockInLocation] = useState<LocationType>('Main Godown');

  // Damage Form State
  const [damageQty, setDamageQty] = useState<number>(2);
  const [damageReason, setDamageReason] = useState<DamageLog['reason']>('Breakage during unloading');
  const [damageReportedBy, setDamageReportedBy] = useState<string>('Godown Staff');

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      if (selectedLocation !== 'ALL' && p.location !== selectedLocation) return false;
      if (onlyLowStock && p.stockBoxes > p.minStockAlert) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.sizeLabel.toLowerCase().includes(q) ||
        p.batchShadeNo.toLowerCase().includes(q) ||
        p.hsnCode.includes(q)
      );
    });
  }, [products, selectedCategory, selectedLocation, onlyLowStock, searchQuery]);

  // Inventory summary metrics
  const totalStockBoxes = products.reduce((acc, p) => acc + (p.unitType === 'Stone_Slab' ? 0 : p.stockBoxes), 0);
  const totalSlabSqft = products.filter(p => p.unitType === 'Stone_Slab').reduce((acc, p) => acc + p.stockBoxes, 0);
  const lowStockCount = products.filter(p => p.stockBoxes <= p.minStockAlert).length;

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProd.name.trim() || !newProd.sku.trim()) return;
    addProduct(newProd);
    setShowAddModal(false);
    // Reset form
    setNewProd({
      sku: '',
      name: '',
      category: 'Floor Tiles',
      sizeLabel: '2x2 ft',
      unitType: 'Tile_Box',
      sqftPerBox: 16,
      piecesPerBox: 4,
      batchShadeNo: 'B-01',
      location: 'Main Godown',
      stockBoxes: 100,
      minStockAlert: 20,
      sellingPrice: 50,
      pricingUnit: 'per_sqft',
      purchasePrice: 35,
      gstPercent: 18,
      hsnCode: '69072100',
    });
  };

  const handleStockInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForAction || stockInQty <= 0) return;
    recordStockIn(
      selectedProductForAction.id,
      stockInQty,
      isOwnerMode && stockInPurchasePrice > 0 ? stockInPurchasePrice : undefined,
      stockInLocation
    );
    setShowStockInModal(false);
    setSelectedProductForAction(null);
  };

  const handleDamageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForAction || damageQty <= 0) return;
    const estLoss = damageQty * (selectedProductForAction.purchasePrice || selectedProductForAction.sellingPrice * 0.7);
    recordDamage({
      productId: selectedProductForAction.id,
      productName: selectedProductForAction.name,
      batchShadeNo: selectedProductForAction.batchShadeNo,
      location: selectedProductForAction.location,
      boxesDamaged: damageQty,
      reason: damageReason,
      reportedBy: damageReportedBy,
      estimatedLoss: Math.round(estLoss),
    });
    setShowDamageModal(false);
    setSelectedProductForAction(null);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Top Header & Metrics */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
            Showroom &amp; Godown Inventory
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Real-time box counts, shade/batch segregation, and breakage management
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#141414] hover:bg-neutral-800 rounded-lg transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-[#C5A059]" />
            <span>+ Add New Product</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
            Total Tile Stock
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900 mt-1">
            {totalStockBoxes} <span className="text-xs font-normal text-neutral-500">Boxes</span>
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Across Showroom &amp; Godown</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
            Marble &amp; Granite Slabs
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900 mt-1">
            {totalSlabSqft} <span className="text-xs font-normal text-neutral-500">Sq.Ft</span>
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Makrana, Galaxy, Katni</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
            Low Stock Alerts
          </div>
          <div className={`text-2xl font-bold font-mono mt-1 ${lowStockCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {lowStockCount} <span className="text-xs font-normal text-neutral-500">Items</span>
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Below re-order threshold</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs">
          <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
            Logged Breakages
          </div>
          <div className="text-2xl font-bold font-mono text-red-600 mt-1">
            {damageLogs.reduce((acc, d) => acc + d.boxesDamaged, 0)} <span className="text-xs font-normal text-neutral-500">Boxes</span>
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Deducted from stock records</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search by product name, SKU, size (e.g. 2x2, 2x4), shade/batch, or HSN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs py-2 pl-9 pr-3 bg-neutral-50 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-[#C5A059]"
            />
          </div>

          {/* Segmented Location Filter */}
          <div className="flex items-center p-1 bg-neutral-100 rounded-lg text-xs shrink-0">
            <button
              onClick={() => setSelectedLocation('ALL')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                selectedLocation === 'ALL' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600'
              }`}
            >
              All Locations
            </button>
            <button
              onClick={() => setSelectedLocation('Showroom Display')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                selectedLocation === 'Showroom Display' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600'
              }`}
            >
              Showroom
            </button>
            <button
              onClick={() => setSelectedLocation('Main Godown')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                selectedLocation === 'Main Godown' ? 'bg-white text-neutral-900 shadow-xs' : 'text-neutral-600'
              }`}
            >
              Main Godown
            </button>
          </div>
        </div>

        {/* Category Pills & Low Stock Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {['ALL', 'Floor Tiles', 'Wall Tiles', 'Outdoor / Parking', 'Marble & Granite', 'Chemicals & Allied'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#141414] text-white font-medium'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
              >
                {cat === 'ALL' ? 'All Categories' : cat}
              </button>
            ))}
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-neutral-600 select-none">
            <input
              type="checkbox"
              checked={onlyLowStock}
              onChange={(e) => setOnlyLowStock(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-[#C5A059] focus:ring-[#C5A059]"
            />
            <span>Show Only Low Stock</span>
          </label>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-xl shadow-xs border border-neutral-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-neutral-50 text-neutral-600 font-semibold border-b border-neutral-200">
                <th className="py-3 px-4">Item &amp; SKU</th>
                <th className="py-3 px-3">Category &amp; Size</th>
                <th className="py-3 px-3">Shade / Batch</th>
                <th className="py-3 px-3">Location</th>
                <th className="py-3 px-3 text-center">Packaging</th>
                <th className="py-3 px-3 text-right">Available Stock</th>
                <th className="py-3 px-3 text-right">Selling Rate</th>
                {isOwnerMode && (
                  <th className="py-3 px-3 text-right text-amber-700 bg-amber-50/50">
                    Purchase Cost
                  </th>
                )}
                <th className="py-3 px-4 text-right">Quick Stock Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredProducts.map((p) => {
                const isLow = p.stockBoxes <= p.minStockAlert;
                return (
                  <tr key={p.id} className="hover:bg-neutral-50/70 transition-colors">
                    {/* Item & SKU */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-neutral-900">{p.name}</div>
                      <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                        SKU: {p.sku} · HSN: {p.hsnCode}
                      </div>
                    </td>

                    {/* Category & Size */}
                    <td className="py-3 px-3">
                      <span className="text-neutral-800 font-medium block">{p.category}</span>
                      <span className="text-[10px] text-neutral-500 font-mono">{p.sizeLabel}</span>
                    </td>

                    {/* Shade / Batch */}
                    <td className="py-3 px-3">
                      <span className="font-mono text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded text-[11px]">
                        {p.batchShadeNo}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded ${
                        p.location === 'Showroom Display'
                          ? 'bg-blue-50 text-blue-800'
                          : 'bg-neutral-100 text-neutral-700'
                      }`}>
                        {p.location === 'Showroom Display' ? <Store className="w-3 h-3" /> : <Building className="w-3 h-3" />}
                        {p.location}
                      </span>
                    </td>

                    {/* Packaging */}
                    <td className="py-3 px-3 text-center text-neutral-600 text-[11px]">
                      {p.unitType === 'Tile_Box' && (
                        <span>{p.sqftPerBox} sqft/box ({p.piecesPerBox} pcs)</span>
                      )}
                      {p.unitType === 'Stone_Slab' && <span>Gang-saw Slab</span>}
                      {p.unitType === 'Standard_Piece' && <span>Standard Pack</span>}
                    </td>

                    {/* Stock */}
                    <td className="py-3 px-3 text-right">
                      <div className={`font-mono font-bold text-sm ${isLow ? 'text-amber-600' : 'text-emerald-700'}`}>
                        {p.stockBoxes} {p.unitType === 'Stone_Slab' ? 'sqft' : 'boxes'}
                      </div>
                      {isLow && (
                        <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1 rounded">
                          Low Stock (Min: {p.minStockAlert})
                        </span>
                      )}
                    </td>

                    {/* Selling Rate */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-neutral-900">
                      ₹{p.sellingPrice}/{p.pricingUnit === 'per_sqft' ? 'sqft' : 'box'}
                    </td>

                    {/* Purchase Cost (Owner Mode Only) */}
                    {isOwnerMode && (
                      <td className="py-3 px-3 text-right font-mono text-amber-900 font-semibold bg-amber-50/30">
                        ₹{p.purchasePrice}
                        <span className="block text-[9px] text-neutral-500">
                          Margin: {Math.round(((p.sellingPrice - p.purchasePrice) / p.sellingPrice) * 100)}%
                        </span>
                      </td>
                    )}

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedProductForAction(p);
                            setStockInPurchasePrice(p.purchasePrice);
                            setStockInLocation(p.location);
                            setShowStockInModal(true);
                          }}
                          className="px-2 py-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded transition-colors whitespace-nowrap"
                          title="Stock In / Purchase Inward Entry"
                        >
                          + Stock In
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProductForAction(p);
                            setShowDamageModal(true);
                          }}
                          className="px-2 py-1 text-[11px] font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors whitespace-nowrap"
                          title="Record Broken / Chipped Tiles"
                        >
                          Damage
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Breakage & Damage Audit Trail */}
      {damageLogs.length > 0 && (
        <div className="bg-white rounded-xl shadow-xs border border-neutral-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <h3 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                Recent Breakage &amp; Damage Audit Trail
              </h3>
            </div>
            <span className="text-xs text-neutral-500">{damageLogs.length} incidents logged</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-500">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Product &amp; Shade</th>
                  <th className="py-2 px-3">Location</th>
                  <th className="py-2 px-3 text-center">Boxes Damaged</th>
                  <th className="py-2 px-3">Reason</th>
                  <th className="py-2 px-3">Reported By</th>
                  {isOwnerMode && <th className="py-2 px-3 text-right">Est. Loss</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {damageLogs.map((log) => (
                  <tr key={log.id} className="text-neutral-700">
                    <td className="py-2 px-3 font-mono text-[11px]">{log.date}</td>
                    <td className="py-2 px-3 font-medium text-neutral-900">
                      {log.productName} <span className="text-neutral-400 font-mono text-[10px]">({log.batchShadeNo})</span>
                    </td>
                    <td className="py-2 px-3">{log.location}</td>
                    <td className="py-2 px-3 text-center font-mono font-bold text-red-600">
                      {log.boxesDamaged}
                    </td>
                    <td className="py-2 px-3 text-neutral-600">{log.reason}</td>
                    <td className="py-2 px-3 text-neutral-500">{log.reportedBy}</td>
                    {isOwnerMode && (
                      <td className="py-2 px-3 text-right font-mono text-red-700">
                        ₹{log.estimatedLoss.toLocaleString('en-IN')}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock In Modal */}
      {showStockInModal && selectedProductForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="bg-[#141414] text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Stock Inward / Purchase Entry</h3>
                <p className="text-xs text-neutral-400">{selectedProductForAction.name}</p>
              </div>
              <button onClick={() => setShowStockInModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStockInSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Quantity to Add ({selectedProductForAction.unitType === 'Stone_Slab' ? 'Sq.Ft' : 'Boxes'})
                </label>
                <input
                  type="number"
                  min="1"
                  value={stockInQty}
                  onChange={(e) => setStockInQty(parseInt(e.target.value) || 0)}
                  className="w-full py-2 px-3 border border-neutral-300 rounded-lg font-mono text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Receiving Location
                </label>
                <select
                  value={stockInLocation}
                  onChange={(e) => setStockInLocation(e.target.value as LocationType)}
                  className="w-full py-2 px-3 bg-neutral-50 border border-neutral-300 rounded-lg text-xs"
                >
                  <option value="Main Godown">Main Godown</option>
                  <option value="Showroom Display">Showroom Display</option>
                </select>
              </div>

              {isOwnerMode && (
                <div>
                  <label className="block text-xs font-semibold text-amber-900 mb-1">
                    Update Purchase Cost (₹ / Unit)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={stockInPurchasePrice}
                    onChange={(e) => setStockInPurchasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full py-2 px-3 border border-amber-300 rounded-lg font-mono text-xs bg-amber-50/50"
                  />
                </div>
              )}

              <div className="p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 text-neutral-600">
                Current Stock: <strong className="font-mono">{selectedProductForAction.stockBoxes}</strong> → New Stock: <strong className="font-mono text-emerald-700">{selectedProductForAction.stockBoxes + stockInQty}</strong>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStockInModal(false)}
                  className="flex-1 py-2 text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg font-semibold"
                >
                  Confirm Inward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Damage Modal */}
      {showDamageModal && selectedProductForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden">
            <div className="bg-red-950 text-white px-5 py-3.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-red-100">Log Breakage / Damage</h3>
                <p className="text-xs text-red-300">{selectedProductForAction.name}</p>
              </div>
              <button onClick={() => setShowDamageModal(false)} className="text-red-300 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDamageSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Damaged Boxes to Deduct
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedProductForAction.stockBoxes}
                  value={damageQty}
                  onChange={(e) => setDamageQty(parseInt(e.target.value) || 0)}
                  className="w-full py-2 px-3 border border-neutral-300 rounded-lg font-mono text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Reason for Breakage
                </label>
                <select
                  value={damageReason}
                  onChange={(e) => setDamageReason(e.target.value as DamageLog['reason'])}
                  className="w-full py-2 px-3 bg-neutral-50 border border-neutral-300 rounded-lg text-xs"
                >
                  <option value="Breakage during unloading">Breakage during unloading</option>
                  <option value="Transit vibration">Transit vibration</option>
                  <option value="Corner chipped">Corner chipped</option>
                  <option value="Customer return damaged">Customer return damaged</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Reported By (Staff / Driver Name)
                </label>
                <input
                  type="text"
                  value={damageReportedBy}
                  onChange={(e) => setDamageReportedBy(e.target.value)}
                  className="w-full py-2 px-3 border border-neutral-300 rounded-lg text-xs"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDamageModal(false)}
                  className="flex-1 py-2 text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg font-semibold"
                >
                  Deduct &amp; Log Damage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-neutral-200 overflow-hidden my-8">
            <div className="bg-[#141414] text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Add New Showroom Product</h3>
                <p className="text-xs text-neutral-400">Configure size, packaging units, rates, and stock</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">SKU / Item Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FLR-2X2-STATUARIO"
                    value={newProd.sku}
                    onChange={(e) => setNewProd({ ...newProd, sku: e.target.value })}
                    className="w-full py-2 px-3 border border-neutral-300 rounded-lg font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Category *</label>
                  <select
                    value={newProd.category}
                    onChange={(e) => setNewProd({ ...newProd, category: e.target.value as Product['category'] })}
                    className="w-full py-2 px-3 bg-neutral-50 border border-neutral-300 rounded-lg"
                  >
                    <option value="Floor Tiles">Floor Tiles</option>
                    <option value="Wall Tiles">Wall Tiles</option>
                    <option value="Outdoor / Parking">Outdoor / Parking</option>
                    <option value="Marble & Granite">Marble & Granite</option>
                    <option value="Chemicals & Allied">Chemicals & Allied</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-neutral-700 mb-1">Product Title &amp; Finish *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2x4 GVT Glossy Armani Brown Vitrified Tile"
                  value={newProd.name}
                  onChange={(e) => setNewProd({ ...newProd, name: e.target.value })}
                  className="w-full py-2 px-3 border border-neutral-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Size Label *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2x2 ft / 600x600 mm"
                    value={newProd.sizeLabel}
                    onChange={(e) => setNewProd({ ...newProd, sizeLabel: e.target.value })}
                    className="w-full py-2 px-3 border border-neutral-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Batch / Shade No</label>
                  <input
                    type="text"
                    placeholder="e.g. SH-901"
                    value={newProd.batchShadeNo}
                    onChange={(e) => setNewProd({ ...newProd, batchShadeNo: e.target.value })}
                    className="w-full py-2 px-3 border border-neutral-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Unit Type</label>
                  <select
                    value={newProd.unitType}
                    onChange={(e) => setNewProd({ ...newProd, unitType: e.target.value as Product['unitType'] })}
                    className="w-full py-2 px-3 bg-neutral-50 border border-neutral-300 rounded-lg"
                  >
                    <option value="Tile_Box">Tile Box</option>
                    <option value="Stone_Slab">Stone Slab</option>
                    <option value="Standard_Piece">Standard Bag / Piece</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-neutral-50 p-3 rounded-lg border border-neutral-200">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Sq.Ft Per Box</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newProd.sqftPerBox}
                    onChange={(e) => setNewProd({ ...newProd, sqftPerBox: parseFloat(e.target.value) || 16 })}
                    className="w-full py-1.5 px-2.5 bg-white border border-neutral-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Pieces Per Box</label>
                  <input
                    type="number"
                    value={newProd.piecesPerBox}
                    onChange={(e) => setNewProd({ ...newProd, piecesPerBox: parseInt(e.target.value) || 4 })}
                    className="w-full py-1.5 px-2.5 bg-white border border-neutral-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={newProd.hsnCode}
                    onChange={(e) => setNewProd({ ...newProd, hsnCode: e.target.value })}
                    className="w-full py-1.5 px-2.5 bg-white border border-neutral-300 rounded font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Selling Rate (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newProd.sellingPrice}
                    onChange={(e) => setNewProd({ ...newProd, sellingPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full py-2 px-3 border border-neutral-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Pricing Unit</label>
                  <select
                    value={newProd.pricingUnit}
                    onChange={(e) => setNewProd({ ...newProd, pricingUnit: e.target.value as Product['pricingUnit'] })}
                    className="w-full py-2 px-3 bg-neutral-50 border border-neutral-300 rounded-lg"
                  >
                    <option value="per_sqft">Per Sq.Ft</option>
                    <option value="per_box">Per Box</option>
                    <option value="per_piece">Per Piece/Bag</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Purchase Cost (₹)</label>
                  <input
                    type="number"
                    value={newProd.purchasePrice}
                    onChange={(e) => setNewProd({ ...newProd, purchasePrice: parseFloat(e.target.value) || 0 })}
                    className="w-full py-2 px-3 border border-neutral-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Opening Stock</label>
                  <input
                    type="number"
                    value={newProd.stockBoxes}
                    onChange={(e) => setNewProd({ ...newProd, stockBoxes: parseInt(e.target.value) || 0 })}
                    className="w-full py-2 px-3 border border-neutral-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Min Stock Alert</label>
                  <input
                    type="number"
                    value={newProd.minStockAlert}
                    onChange={(e) => setNewProd({ ...newProd, minStockAlert: parseInt(e.target.value) || 10 })}
                    className="w-full py-2 px-3 border border-neutral-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-neutral-700 mb-1">Location</label>
                  <select
                    value={newProd.location}
                    onChange={(e) => setNewProd({ ...newProd, location: e.target.value as LocationType })}
                    className="w-full py-2 px-3 bg-neutral-50 border border-neutral-300 rounded-lg"
                  >
                    <option value="Main Godown">Main Godown</option>
                    <option value="Showroom Display">Showroom Display</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-neutral-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-white bg-[#C5A059] hover:bg-[#B08D44] rounded-lg font-semibold"
                >
                  Save Product to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
