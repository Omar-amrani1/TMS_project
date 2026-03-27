import { useState } from "react";
import { Link } from "react-router-dom";
import { Package, ArrowLeft, Search, LogOut } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useProducts } from "../hooks/useProducts";
import { ProductType } from "../types/api.types";
import { FocusCards } from "../components/ui/focus-cards";
import { useCartStore } from "../store/cartStore";
import { AppHeader } from "../components/layout/AppHeader";

import { toast } from "sonner";

export const ProductsPage = () => {
  const { isAuthenticated, clearAuth } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ProductType | "ALL">("ALL");

  const { products, isLoading, isError } = useProducts();
  const { addItem } = useCartStore();

  const handleLogout = () => {
    clearAuth();
  };

  // const handleAddToCart = (product: any) => {
  //   if (!isAuthenticated) {
  //     toast.error("Please sign in to add items to cart");
  //     return;
  //   }
  //   addItem(product, 1);
  //   toast.success(`${product.name} added to cart!`);
  // };

  // Filter products based on search and type
  const filteredProducts = products?.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "ALL" || product.type === typeFilter;
    return matchesSearch && matchesType;
  });

  // Convert products to card format
  const productCards = filteredProducts?.map((product) => ({
    title: product.name,
    description:
      product.description || "High-quality product for your business needs",
    badge:
      product.type === "RAW_MATERIAL" ? "Raw Material" : "Finished Product",
    badgeColor:
      product.type === "RAW_MATERIAL"
        ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
        : "bg-green-500/20 text-green-400 border border-green-500/30",
    sku: product.sku,
    unit: "unit",
    // no price field => FocusCards will not render price block
  }));

  return (
    <div className="min-h-screen bg-black">
      <AppHeader />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-900 to-black py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center text-gray-400 hover:text-cyan-400 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-5xl font-bold text-white mb-4">
            Product Catalog
          </h1>
          <p className="text-xl text-gray-400">
            Browse our selection of raw materials and finished products
          </p>
        </div>
      </section>

      {/* Filters Section */}
      <section className="bg-black border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Bar */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 backdrop-blur-sm text-white rounded-lg border border-white/10 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setTypeFilter("ALL")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    typeFilter === "ALL"
                      ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/50"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  All Products
                </button>
                <button
                  onClick={() => setTypeFilter("RAW_MATERIAL")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    typeFilter === "RAW_MATERIAL"
                      ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/50"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  Raw Materials
                </button>
                <button
                  onClick={() => setTypeFilter("FINISHED_PRODUCT")}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    typeFilter === "FINISHED_PRODUCT"
                      ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/50"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  Finished Products
                </button>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="text-gray-400 mt-4">
            {isLoading ? (
              <span>Loading products...</span>
            ) : isError ? (
              <span className="text-red-400">Error loading products</span>
            ) : (
              <span>
                Showing {filteredProducts?.length || 0} of{" "}
                {products?.length || 0} products
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12 bg-black min-h-[60vh]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading products...</p>
              </div>
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-red-400 text-lg mb-2">
                  Failed to load products
                </p>
                <p className="text-gray-400">Please try again later</p>
              </div>
            </div>
          ) : productCards && productCards.length > 0 ? (
            <FocusCards cards={productCards} />
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Package className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No products found</p>
                <p className="text-gray-500 mt-2">
                  Try adjusting your search or filters
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black border-t border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-400">
            <p>&copy; 2026 Smart TMS. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
