import { useState } from "react";
import {
  Package,
  Loader2,
  AlertCircle,
  Search,
  Edit,
  Save,
  X,
  Warehouse,
  Factory,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  RefreshCw,
} from "lucide-react";
import {
  useRawMaterialStock,
  useProductionStock,
  useFinishedProductStock,
} from "../hooks/useStock";
import { useAuthStore } from "../store/authStore";
import type { UpdateStockRequest } from "../types/api.types";

type StockLevel = "RAW_MATERIAL" | "PRODUCTION" | "FINISHED_PRODUCT";

export const StockManagementPage = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<StockLevel>("RAW_MATERIAL");
  const [searchTerm, setSearchTerm] = useState("");

  // Determine which tabs the user can access
  const canAccessRawMaterial =
    user?.role === "MANAGER" || user?.role === "RAW_STOCK_MANAGER";
  const canAccessProduction =
    user?.role === "MANAGER" || user?.role === "PRODUCTION_CLIENT";
  const canAccessFinished =
    user?.role === "MANAGER" ||
    user?.role === "PRODUCTION_CLIENT" ||
    user?.role === "DISTRIBUTOR" ||
    user?.role === "FINISHED_STOCK_MANAGER";

  // Set initial tab based on user role
  useState(() => {
    if (!canAccessRawMaterial && canAccessProduction) {
      setActiveTab("PRODUCTION");
    } else if (
      !canAccessRawMaterial &&
      !canAccessProduction &&
      canAccessFinished
    ) {
      setActiveTab("FINISHED_PRODUCT");
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Stock Management</h1>
        <p className="text-gray-400">
          Monitor and manage inventory across all stock levels
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-2">
        <div className="flex gap-2">
          {canAccessRawMaterial && (
            <button
              onClick={() => setActiveTab("RAW_MATERIAL")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === "RAW_MATERIAL"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Warehouse className="w-5 h-5" />
              Raw Materials
            </button>
          )}
          {canAccessProduction && (
            <button
              onClick={() => setActiveTab("PRODUCTION")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === "PRODUCTION"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Factory className="w-5 h-5" />
              Production Stock
            </button>
          )}
          {canAccessFinished && (
            <button
              onClick={() => setActiveTab("FINISHED_PRODUCT")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                activeTab === "FINISHED_PRODUCT"
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Package className="w-5 h-5" />
              Finished Products
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by product name, SKU, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Stock Content */}
      {activeTab === "RAW_MATERIAL" && canAccessRawMaterial && (
        <RawMaterialStockTab searchTerm={searchTerm} />
      )}
      {activeTab === "PRODUCTION" && canAccessProduction && (
        <ProductionStockTab searchTerm={searchTerm} />
      )}
      {activeTab === "FINISHED_PRODUCT" && canAccessFinished && (
        <FinishedProductStockTab searchTerm={searchTerm} userLocationId={user?.locationId} />
      )}
    </div>
  );
};

// Raw Material Stock Tab
const RawMaterialStockTab = ({ searchTerm }: { searchTerm: string }) => {
  const { stock, isLoading, isError, refetch } = useRawMaterialStock();
  const [editingStock, setEditingStock] = useState<any>(null);

  const filteredStock = stock?.filter(
    (item) =>
      item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalQuantity =
    stock?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const totalAvailable =
    stock?.reduce((sum, item) => sum + item.availableQty, 0) || 0;
  const totalReserved =
    stock?.reduce((sum, item) => sum + item.reservedQty, 0) || 0;

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Total Quantity</span>
            <Package className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {totalQuantity.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">units</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Available</span>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {totalAvailable.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">units</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Reserved</span>
            <TrendingDown className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {totalReserved.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">units</p>
        </div>
      </div>

      {/* Stock Table */}
      <StockTable
        stock={filteredStock || []}
        isLoading={isLoading}
        isError={isError}
        onEdit={setEditingStock}
        onRefresh={refetch}
        stockType="RAW_MATERIAL"
      />

      {/* Edit Modal */}
      {editingStock && (
        <StockEditModal
          stock={editingStock}
          stockType="RAW_MATERIAL"
          onClose={() => setEditingStock(null)}
        />
      )}
    </>
  );
};

// Production Stock Tab
const ProductionStockTab = ({ searchTerm }: { searchTerm: string }) => {
  const { stock, isLoading, isError, refetch } = useProductionStock();
  const [editingStock, setEditingStock] = useState<any>(null);

  const filteredStock = stock?.filter(
    (item) =>
      item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalQuantity =
    stock?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const totalAvailable =
    stock?.reduce((sum, item) => sum + item.availableQty, 0) || 0;
  const totalReserved =
    stock?.reduce((sum, item) => sum + item.reservedQty, 0) || 0;

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Total Quantity</span>
            <Factory className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {totalQuantity.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">units</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Available</span>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {totalAvailable.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">units</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Reserved</span>
            <TrendingDown className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {totalReserved.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">units</p>
        </div>
      </div>

      {/* Stock Table */}
      <StockTable
        stock={filteredStock || []}
        isLoading={isLoading}
        isError={isError}
        onEdit={setEditingStock}
        onRefresh={refetch}
        stockType="PRODUCTION"
      />

      {/* Edit Modal */}
      {editingStock && (
        <StockEditModal
          stock={editingStock}
          stockType="PRODUCTION"
          onClose={() => setEditingStock(null)}
        />
      )}
    </>
  );
};

// Finished Product Stock Tab
const FinishedProductStockTab = ({ searchTerm, userLocationId }: { searchTerm: string; userLocationId?: string }) => {
  const { stock, isLoading, isError, refetch } = useFinishedProductStock(
    userLocationId ? { locationId: userLocationId } : undefined
  );
  const [editingStock, setEditingStock] = useState<any>(null);

  const filteredStock = stock?.filter(
    (item) =>
      item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalQuantity =
    stock?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const totalAvailable =
    stock?.reduce((sum, item) => sum + item.availableQty, 0) || 0;
  const totalReserved =
    stock?.reduce((sum, item) => sum + item.reservedQty, 0) || 0;

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Total Quantity</span>
            <Package className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {totalQuantity.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">units</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Available</span>
            <TrendingUp className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {totalAvailable.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">units</p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Reserved</span>
            <TrendingDown className="w-5 h-5 text-yellow-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {totalReserved.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">units</p>
        </div>
      </div>

      {/* Stock Table */}
      <StockTable
        stock={filteredStock || []}
        isLoading={isLoading}
        isError={isError}
        onEdit={setEditingStock}
        onRefresh={refetch}
        stockType="FINISHED_PRODUCT"
      />

      {/* Edit Modal */}
      {editingStock && (
        <StockEditModal
          stock={editingStock}
          stockType="FINISHED_PRODUCT"
          onClose={() => setEditingStock(null)}
        />
      )}
    </>
  );
};

// Stock Table Component
interface StockTableProps {
  stock: any[];
  isLoading: boolean;
  isError: boolean;
  onEdit: (stock: any) => void;
  onRefresh: () => void;
  stockType: StockLevel;
}

const StockTable = ({
  stock,
  isLoading,
  isError,
  onEdit,
  onRefresh,
  stockType,
}: StockTableProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
        <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-16 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">
          Failed to load stock
        </h2>
        <p className="text-gray-400 mb-4">Please try again later</p>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  if (stock.length === 0) {
    return (
      <div className="text-center py-16 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
        <Package className="w-24 h-24 text-gray-600 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-white mb-4">No stock found</h2>
        <p className="text-gray-400">Stock will appear here once available</p>
      </div>
    );
  }

  const getStockColor = (item: any) => {
    const percentage = (item.availableQty / item.quantity) * 100;
    if (percentage > 50) return "text-green-400";
    if (percentage > 20) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/5 border-b border-white/10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Total Qty
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Reserved
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Available
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                Stock Level
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {stock.map((item) => (
              <tr key={item.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-medium text-white">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-gray-400 font-mono">
                      {item.product.sku}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm text-white">{item.location.name}</p>
                    <p className="text-xs text-gray-400">
                      {item.location.locationType}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm font-medium text-white">
                    {item.quantity.toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-yellow-400">
                    {item.reservedQty.toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`text-sm font-medium ${getStockColor(item)}`}
                  >
                    {item.availableQty.toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <StockLevelBar item={item} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                  <button
                    onClick={() => onEdit(item)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/5 text-white rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <Edit className="w-3 h-3" />
                    Update
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Stock Level Bar Component
const StockLevelBar = ({ item }: { item: any }) => {
  const percentage = (item.availableQty / item.quantity) * 100;
  const getColor = () => {
    if (percentage > 50) return "bg-green-500";
    if (percentage > 20) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="w-full">
      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">{percentage.toFixed(1)}%</p>
    </div>
  );
};

// Stock Edit Modal
interface StockEditModalProps {
  stock: any;
  stockType: StockLevel;
  onClose: () => void;
}

const StockEditModal = ({ stock, stockType, onClose }: StockEditModalProps) => {
  const [operation, setOperation] = useState<"ADD" | "REMOVE" | "SET">("ADD");
  const [quantity, setQuantity] = useState<number>(0);

  const rawHook = useRawMaterialStock();
  const prodHook = useProductionStock();
  const finishedHook = useFinishedProductStock();

  const { updateStock, isUpdating } =
    stockType === "RAW_MATERIAL"
      ? rawHook
      : stockType === "PRODUCTION"
      ? prodHook
      : finishedHook;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: UpdateStockRequest = {
      quantity,
      operation,
    };

    updateStock(
      {
        productId: stock.productId,
        locationId: stock.locationId,
        data,
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  };

  const getNewQuantity = () => {
    if (operation === "ADD") return stock.quantity + quantity;
    if (operation === "REMOVE") return Math.max(0, stock.quantity - quantity);
    return quantity;
  };

  const getOperationColor = () => {
    switch (operation) {
      case "ADD":
        return "from-green-600 to-emerald-600";
      case "REMOVE":
        return "from-red-600 to-rose-600";
      case "SET":
        return "from-blue-600 to-cyan-600";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/10 rounded-2xl max-w-lg w-full">
        <div className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Update Stock</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Product Info */}
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-lg font-semibold text-white">
                  {stock.product.name}
                </p>
                <p className="text-sm text-gray-400 font-mono">
                  {stock.product.sku}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Current Stock</p>
                <p className="text-2xl font-bold text-white">
                  {stock.quantity.toLocaleString()}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Location</p>
                <p className="text-white font-medium">{stock.location.name}</p>
              </div>
              <div>
                <p className="text-gray-400">Available</p>
                <p className="text-green-400 font-medium">
                  {stock.availableQty.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Operation Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Operation
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setOperation("ADD")}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all border ${
                  operation === "ADD"
                    ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white border-green-500 shadow-lg"
                    : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"
                }`}
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
              <button
                type="button"
                onClick={() => setOperation("REMOVE")}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all border ${
                  operation === "REMOVE"
                    ? "bg-gradient-to-r from-red-600 to-rose-600 text-white border-red-500 shadow-lg"
                    : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"
                }`}
              >
                <Minus className="w-4 h-4" />
                Remove
              </button>
              <button
                type="button"
                onClick={() => setOperation("SET")}
                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all border ${
                  operation === "SET"
                    ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-blue-500 shadow-lg"
                    : "bg-white/5 text-gray-400 border-white/10 hover:bg-white/10"
                }`}
              >
                <Edit className="w-4 h-4" />
                Set
              </button>
            </div>
          </div>

          {/* Quantity Input */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Quantity
            </label>
            <input
              type="number"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
              required
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="Enter quantity"
            />
          </div>

          {/* Preview */}
          <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">New Stock Level</span>
              <span className="text-2xl font-bold text-white">
                {getNewQuantity().toLocaleString()}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-white/5 text-white rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
              disabled={isUpdating}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating || quantity <= 0}
              className={`flex items-center gap-2 px-6 py-2 bg-gradient-to-r ${getOperationColor()} text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Update Stock
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
