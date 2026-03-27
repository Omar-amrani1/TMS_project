import { useState } from "react";
import {
  Package,
  Loader2,
  AlertCircle,
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  Eye,
  X,
  Save,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productsService } from "../api/services/products.service";
import { ProductType, CreateProductRequest } from "../types/api.types";
import { toast } from "sonner";

export const ProductManagementPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<ProductType | "ALL">("ALL");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(
    null,
  );

  // Fetch products
  const {
    data: productsData,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["products", 1, 100],
    queryFn: () => productsService.getProducts(1, 100),
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: (data: CreateProductRequest) =>
      productsService.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product created successfully");
      setIsCreateModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to create product");
    },
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<CreateProductRequest>;
    }) => productsService.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product updated successfully");
      setEditingProduct(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update product");
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => productsService.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted successfully");
      setDeletingProductId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete product");
      setDeletingProductId(null);
    },
  });

  const products = productsData?.products || [];

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === "ALL" || product.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const handleDelete = (productId: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this product? This action cannot be undone.",
      )
    ) {
      setDeletingProductId(productId);
      deleteProductMutation.mutate(productId);
    }
  };

  const getTypeColor = (type: ProductType) => {
    return type === ProductType.RAW_MATERIAL
      ? "bg-purple-500/20 text-purple-400 border-purple-500/30"
      : "bg-green-500/20 text-green-400 border-green-500/30";
  };

  const getTypeLabel = (type: ProductType) => {
    return type === ProductType.RAW_MATERIAL
      ? "Raw Material"
      : "Finished Product";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Product Management
          </h1>
          <p className="text-gray-400">
            Manage raw materials and finished products
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) =>
                setTypeFilter(e.target.value as ProductType | "ALL")
              }
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none"
            >
              <option value="ALL">All Types</option>
              <option value={ProductType.RAW_MATERIAL}>Raw Materials</option>
              <option value={ProductType.FINISHED_PRODUCT}>
                Finished Products
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Total Products</span>
            <Package className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {products.length || 0}
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Raw Materials</span>
            <Package className="w-5 h-5 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {products.filter((p) => p.type === ProductType.RAW_MATERIAL)
              .length || 0}
          </p>
        </div>
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">Finished Products</span>
            <Package className="w-5 h-5 text-green-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {products.filter((p) => p.type === ProductType.FINISHED_PRODUCT)
              .length || 0}
          </p>
        </div>
      </div>

      {/* Products Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
        </div>
      ) : isError ? (
        <div className="text-center py-16 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            Failed to load products
          </h2>
          <p className="text-gray-400">Please try again later</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
          <Package className="w-24 h-24 text-gray-600 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">
            No products found
          </h2>
          <p className="text-gray-400 mb-6">
            {searchTerm || typeFilter !== "ALL"
              ? "Try adjusting your filters"
              : "Get started by adding your first product"}
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add First Product
          </button>
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    SKU
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Weight
                  </th>

                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {product.name}
                        </p>
                        {product.description && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-300">
                        {product.sku}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getTypeColor(
                          product.type,
                        )}`}
                      >
                        {getTypeLabel(product.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {product.unitWeight.toFixed(2)} kg
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${
                          product.isActive
                            ? "bg-green-500/20 text-green-400 border-green-500/30"
                            : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                        }`}
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingProduct(product)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400"
                          title="Edit Product"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete Product"
                          disabled={
                            deleteProductMutation.isPending &&
                            deletingProductId === product.id
                          }
                        >
                          {deleteProductMutation.isPending &&
                          deletingProductId === product.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(isCreateModalOpen || editingProduct) && (
        <ProductFormModal
          product={editingProduct}
          isOpen={isCreateModalOpen || !!editingProduct}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingProduct(null);
          }}
          onSubmit={(data) => {
            if (editingProduct) {
              updateProductMutation.mutate({ id: editingProduct.id, data });
            } else {
              createProductMutation.mutate(data);
            }
          }}
          isSubmitting={
            createProductMutation.isPending || updateProductMutation.isPending
          }
        />
      )}
    </div>
  );
};

// Product Form Modal Component (too lazy to make a separate file creating and editing are similar)
interface ProductFormModalProps {
  product?: any;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateProductRequest) => void;
  isSubmitting: boolean;
}

const ProductFormModal = ({
  product,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: ProductFormModalProps) => {
  const [formData, setFormData] = useState<CreateProductRequest>({
    name: product?.name || "",
    description: product?.description || "",
    sku: product?.sku || "",
    type: product?.type || ProductType.RAW_MATERIAL,
    unitWeight: product?.unitWeight || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gray-900 border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            {product ? "Edit Product" : "Create New Product"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Product Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              placeholder="Enter product name"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
              placeholder="Enter product description"
            />
          </div>

          {/* SKU and Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                SKU *
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) =>
                  setFormData({ ...formData, sku: e.target.value })
                }
                required
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="e.g., RM-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Product Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    type: e.target.value as ProductType,
                  })
                }
                required
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              >
                <option value={ProductType.RAW_MATERIAL}>Raw Material</option>
                <option value={ProductType.FINISHED_PRODUCT}>
                  Finished Product
                </option>
              </select>
            </div>
          </div>

          {/* Unit Weight and Price */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Unit Weight (kg) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.unitWeight}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    unitWeight: parseFloat(e.target.value) || 0,
                  })
                }
                required
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-white/5 text-white rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {product ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {product ? "Update Product" : "Create Product"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
