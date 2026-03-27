export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const endpoints = {
  // Auth
  auth: {
    login: "/auth/login",
    profile: "/auth/profile",
    changePassword: "/auth/change-password",
    verifyToken: "/auth/verify",
  },

  // Users
  users: {
    base: "/users",
    byId: (id: string) => `/users/${id}`,
    activate: (id: string) => `/users/${id}/activate`,
    deactivate: (id: string) => `/users/${id}/deactivate`,
  },
  //Locations
  locations: {
    base: "/locations",
    byId: (id: string) => `/locations/${id}`,
    calculateDistance: "/locations/calculate-distance",
  },

  // Products
  products: {
    base: "/products",
    byId: (id: string) => `/products/${id}`,
    rawMaterials: "/products/raw-materials",
    finishedProducts: "/products/finished-products",
  },

  //reports
  reports: {
    dashboard: "/reports/dashboard",
    orders: "/reports/orders",
    production: "/reports/production",
    stockMovements: "/reports/stock-movements",
    transportJobs: "/reports/transport-jobs",
  },

  // Stock
  stock: {
    rawMaterial: "/stock/raw-material",
    production: "/stock/production",
    finishedProduct: "/stock/finished-product",
    overview: "/stock/overview",
    availableProducts: (locationId: string) =>
      `/stock/location/${locationId}/available-products`,
    updateRawMaterial: (productId: string, locationId: string) =>
      `/stock/raw-material/${productId}/${locationId}`,
    updateProduction: (productId: string, locationId: string) =>
      `/stock/production/${productId}/${locationId}`,
    updateFinishedProduct: (productId: string, locationId: string) =>
      `/stock/finished-product/${productId}/${locationId}`,
  },

  // Orders
  orders: {
    base: "/orders",
    byId: (id: string) => `/orders/${id}`,
    updateStatus: (id: string) => `/orders/${id}/status`,
    cancel: (id: string) => `/orders/${id}/cancel`,
    notificationsMy: "/orders/notifications/my",
    accept: (id: string) => `/orders/${id}/accept`,
    rate: (id: string) => `/orders/${id}/rate`,
  },

  // Transport
  transport: {
    providers: "/transport/providers",
    providerById: (id: string) => `/transport/providers/${id}`,
    vehicles: "/transport/vehicles",
    vehicleById: (id: string) => `/transport/vehicles/${id}`,
    jobs: "/transport/jobs",
    jobById: (id: string) => `/transport/jobs/${id}`,
    updateJobStatus: (id: string) => `/transport/jobs/${id}/status`,
    calculateCost: "/transport/calculate-cost",
  },
} as const;
