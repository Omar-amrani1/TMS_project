import { apiClient } from "../client";
import { endpoints } from "../endpoints";
import type {
  Product,
  CreateProductRequest,
  ApiResponse,
  PaginationMeta,
  ProductType,
} from "../../types/api.types";

export const productsService = {
  // Get all products with pagination
  getProducts: async (
    page = 1,
    limit = 20,
    type?: ProductType,
  ): Promise<{ products: Product[]; meta: PaginationMeta }> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(type && { type }),
    });

    const response = await apiClient.get<ApiResponse<Product[]>>(
      `${endpoints.products.base}?${params}`,
    );

    return {
      products: (response.data as any).data,
      meta: (response.data as any).meta!,
    };
  },

  // Get product by ID
  getProductById: async (id: string): Promise<Product> => {
    const response = await apiClient.get<ApiResponse<{ product: Product }>>(
      endpoints.products.byId(id),
    );
    return (response.data as any).data.product;
  },

  // Get raw materials only
  getRawMaterials: async (
    page = 1,
    limit = 20,
  ): Promise<{ products: Product[]; meta: PaginationMeta }> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await apiClient.get<ApiResponse<Product[]>>(
      `${endpoints.products.rawMaterials}?${params}`,
    );

    return {
      products: (response.data as any).data,
      meta: (response.data as any).meta!,
    };
  },

  // Get finished products only
  getFinishedProducts: async (
    page = 1,
    limit = 20,
  ): Promise<{ products: Product[]; meta: PaginationMeta }> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    const response = await apiClient.get<ApiResponse<Product[]>>(
      `${endpoints.products.finishedProducts}?${params}`,
    );

    return {
      products: (response.data as any).data,
      meta: (response.data as any).meta!,
    };
  },

  // Create product (Manager only)
  createProduct: async (data: CreateProductRequest): Promise<Product> => {
    const response = await apiClient.post<ApiResponse<{ product: Product }>>(
      endpoints.products.base,
      data,
    );
    return (response.data as any).data.product;
  },

  // Update product (Manager only)
  updateProduct: async (
    id: string,
    data: Partial<CreateProductRequest>,
  ): Promise<Product> => {
    const response = await apiClient.put<ApiResponse<{ product: Product }>>(
      endpoints.products.byId(id),
      data,
    );
    return (response.data as any).data.product;
  },

  // Delete product (Manager only)
  deleteProduct: async (id: string): Promise<void> => {
    await apiClient.delete(endpoints.products.byId(id));
  },
};
