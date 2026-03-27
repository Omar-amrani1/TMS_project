export const UserRole = {
  MANAGER: "MANAGER",
  RAW_STOCK_MANAGER: "RAW_STOCK_MANAGER",
  PRODUCTION_CLIENT: "PRODUCTION_CLIENT",
  DISTRIBUTOR: "DISTRIBUTOR",
  TRANSPORT_PROVIDER: "TRANSPORT_PROVIDER",
  FINISHED_STOCK_MANAGER: "FINISHED_STOCK_MANAGER",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const ProductType = {
  RAW_MATERIAL: "RAW_MATERIAL",
  FINISHED_PRODUCT: "FINISHED_PRODUCT",
} as const;

export type ProductType = (typeof ProductType)[keyof typeof ProductType];

export const OrderType = {
  RAW_MATERIAL_ORDER: "RAW_MATERIAL_ORDER",
  FINISHED_PRODUCT_ORDER: "FINISHED_PRODUCT_ORDER",
  DELIVERY: "DELIVERY",
} as const;

export type OrderType = (typeof OrderType)[keyof typeof OrderType];

export const OrderStatus = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  PREPARING: "PREPARING",
  IN_TRANSIT: "IN_TRANSIT",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export const VehicleStatus = {
  AVAILABLE: "AVAILABLE",
  IN_USE: "IN_USE",
  MAINTENANCE: "MAINTENANCE",
  INACTIVE: "INACTIVE",
} as const;

export type VehicleStatus = (typeof VehicleStatus)[keyof typeof VehicleStatus];

export const TransportJobStatus = {
  SCHEDULED: "SCHEDULED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type TransportJobStatus =
  (typeof TransportJobStatus)[keyof typeof TransportJobStatus];

export const ProductionBatchStatus = {
  PLANNED: "PLANNED",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export type ProductionBatchStatus =
  (typeof ProductionBatchStatus)[keyof typeof ProductionBatchStatus];

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  locationId?: string;
  location?: Location;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  locationId?: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  role?: string;
  locationId?: string;
  isActive?: boolean;
}

export interface UsersListResponse {
  data: User[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface Location {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  locationType: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLocationRequest {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  locationType: string;
  userId?: string;
}

export interface DistanceCalculation {
  from: {
    id: string;
    name: string;
    coordinates: { latitude: number; longitude: number };
  };
  to: {
    id: string;
    name: string;
    coordinates: { latitude: number; longitude: number };
  };
  distanceKm: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku: string;
  type: ProductType;
  unitWeight: number;
  unitPrice?: number;
  subtotal?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  sku: string;
  type: ProductType;
  unitWeight: number;
  unitPrice: number;
}

export interface RawMaterialStock {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  reservedQty: number;
  availableQty: number;
  lastUpdated: string;
  createdAt: string;
  product: Product;
  location: Location;
}

export interface ProductionStock {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  reservedQty: number;
  availableQty: number;
  lastUpdated: string;
  createdAt: string;
  product: Product;
  location: Location;
}

export interface FinishedProductStock {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  reservedQty: number;
  availableQty: number;
  lastUpdated: string;
  createdAt: string;
  product: Product;
  location: Location;
}

export interface UpdateStockRequest {
  quantity: number;
  operation: "ADD" | "REMOVE" | "SET";
}

export interface StockOverview {
  rawMaterialStock: RawMaterialStock[];
  productionStock: ProductionStock[];
  finishedProductStock: FinishedProductStock[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice?: number;
  subtotal?: number;
  createdAt: string;
  product: Product;
}

export interface Order {
  id: string;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  createdById: string;
  confirmingUserId: string;
  destinationUserId?: string | null;
  ratedByUserId?: string | null;
  fromLocationId: string;
  toLocationId: string;
  transportTotal: number;
  distanceKm: number;
  ratingOnTime?: boolean | null;
  ratingDamageFree?: boolean | null;
  ratedAt?: string | null;
  orderDate: string;
  deliveryDate?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: User;
  confirmingUser?: User;
  destinationUser?: User | null;
  ratedByUser?: User | null;
  fromLocation: Location;
  toLocation: Location;
  items: OrderItem[];
  transportJob?: TransportJob;
  transportProvider?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    companyName?: string | null;
    userId?: string;
  } | null;
}

export interface CreateOrderRequest {
  type: OrderType;
  fromLocationId: string;
  toLocationId?: string;
  confirmingUserId: string;
  destinationUserId?: string;
  transportProviderId: string;
  items: {
    productId: string;
    quantity: number;
  }[];
}
export interface RateOrderRequest {
  onTime: boolean;
  damageFree: boolean;
}
export interface OrderNotification {
  id: string;
  orderNumber: string;
  type: OrderType;
  status: OrderStatus;
  createdAt: string;
  createdBy: Pick<User, "id" | "firstName" | "lastName" | "email" | "role">;
  fromLocation: Location;
  toLocation: Location;
  items: OrderItem[];
  transportProvider?: {
    id: string;
    name: string;
    userId: string;
  } | null;
  message: string;
}

export interface UpdateOrderStatusRequest {
  status: OrderStatus;
}

export interface TransportProvider {
  id: string;
  name: string;
  userId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user: User;
  vehicles: Vehicle[];
}

export interface Vehicle {
  id: string;
  providerId: string;
  name: string;
  licensePlate: string;
  capacityKg: number;
  costPerKm: number;
  status: VehicleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleAllocation {
  id: string;
  jobId: string;
  vehicleId: string;
  cost: number;
  createdAt: string;
  vehicle: Vehicle;
}

export interface TransportJob {
  id: string;
  orderId: string;
  providerId: string;
  fromLocationId: string;
  toLocationId: string;
  distanceKm: number;
  totalWeight: number;
  totalCost: number;
  status: TransportJobStatus;
  scheduledDate: string;
  completedDate?: string;
  createdAt: string;
  updatedAt: string;
  provider: TransportProvider;
  fromLocation: Location;
  toLocation: Location;
  allocations: VehicleAllocation[];
}

export interface CalculateTransportCostRequest {
  providerId: string;
  totalWeight: number;
  distanceKm: number;
}

export interface TransportCostResponse {
  allocations: { vehicleId: string; cost: number }[];
  totalCost: number;
}

export interface CreateVehicleRequest {
  providerId: string;
  name: string;
  licensePlate: string;
  capacityKg: number;
  costPerKm: number;
}

export interface RecipeInput {
  id: string;
  recipeId: string;
  productId: string;
  quantity: number;
  createdAt: string;
  product: Product;
}

export interface RecipeOutput {
  id: string;
  recipeId: string;
  productId: string;
  quantity: number;
  createdAt: string;
  product: Product;
}

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  inputs: RecipeInput[];
  outputs: RecipeOutput[];
}

export interface CreateRecipeRequest {
  name: string;
  description?: string;
  inputs: {
    productId: string;
    quantity: number;
  }[];
  outputs: {
    productId: string;
    quantity: number;
  }[];
}

export interface ProductionInput {
  id: string;
  batchId: string;
  productId: string;
  quantityUsed: number;
  createdAt: string;
  product: Product;
}

export interface ProductionOutput {
  id: string;
  batchId: string;
  productId: string;
  quantityProduced: number;
  createdAt: string;
  product: Product;
}

export interface ProductionBatch {
  id: string;
  batchNumber: string;
  recipeId: string;
  producedById: string;
  locationId: string;
  status: ProductionBatchStatus;
  multiplier: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  recipe: Recipe;
  producedBy: User;
  inputs: ProductionInput[];
  outputs: ProductionOutput[];
}

export interface CreateProductionBatchRequest {
  recipeId: string;
  locationId: string;
  multiplier: number;
}

export interface DashboardStats {
  orders: {
    total: number;
    byStatus: Record<OrderStatus, number>;
    byType: Record<OrderType, number>;
    totalRevenue: number;
  };
  stock: {
    rawMaterial: { total: number; reserved: number; available: number };
    production: { total: number; reserved: number; available: number };
    finishedProduct: { total: number; reserved: number; available: number };
  };
  production: {
    totalBatches: number;
    byStatus: Record<ProductionBatchStatus, number>;
  };
  transport: {
    totalJobs: number;
    byStatus: Record<TransportJobStatus, number>;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiError {
  success: false;
  message: string;
  statusCode: number;
  errors?: string[];
}
