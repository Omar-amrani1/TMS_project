import { apiClient } from "../client";
import { endpoints } from "../endpoints";
import type { ApiResponse } from "../../types/api.types";

export interface DashboardStats {
  orders: {
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    costLastMonth: number;
    costComparison: {
      current: number;
      previous: number;
      percentageChange: number;
    };
    orderComparison: {
      current: number;
      previous: number;
      percentageChange: number;
    };
  };
  stock: {
    rawMaterial: {
      total: number;
      reserved: number;
      available: number;
      items: number;
    };
    production: {
      total: number;
      reserved: number;
      available: number;
      items: number;
    };
    finishedProduct: {
      total: number;
      reserved: number;
      available: number;
      items: number;
    };
  };
  payments: {
    total: number;
    byStatus: Record<string, number>;
    totalAmount: number;
    completedAmount: number;
  };
  transport: {
    totalJobs: number;
    byStatus: Record<string, number>;
    totalVehicles: number;
    availableVehicles: number;
  };
}
export interface TransportJobAnalytics {
  summary: {
    totalJobs: number;
    ratedJobs: number;
    totalCost: number;
    onTimePercentage: number;
    damageFreePercentage: number;
  };
  records: Array<{
    id: string;
    orderNumber: string;
    type: string;
    status: string;
    transportTotal: number;
    createdAt: string;
    deliveryDate: string | null;
    ratingOnTime: boolean | null;
    ratingDamageFree: boolean | null;
    ratedAt: string | null;
    provider: { id: string; name: string } | null;
    createdBy?: { firstName?: string; lastName?: string; role?: string };
    destinationUser?: {
      firstName?: string;
      lastName?: string;
      role?: string;
    } | null;
  }>;
}
export interface TransportJobsReport {
  totals: {
    jobs: number;
    distanceKm: number;
    revenue: number;
  };
  byStatus: Record<string, number>;
  jobs: unknown[];
}

const toQuery = (params?: Record<string, string | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v) query.append(k, v);
  });
  const qs = query.toString();
  return qs ? `?${qs}` : "";
};

export const reportsService = {
  // Get dashboard stats (Manager only)
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<ApiResponse<DashboardStats>>(
      endpoints.reports.dashboard,
    );
    return (response.data as any).data;
  },

  // Get order analytics
  getOrderAnalytics: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<any> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);

    const response = await apiClient.get<ApiResponse<any>>(
      `${endpoints.reports.orders}?${queryParams}`,
    );
    return (response.data as any).data;
  },

  // Get production analytics
  getProductionAnalytics: async (params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<any> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append("startDate", params.startDate);
    if (params?.endDate) queryParams.append("endDate", params.endDate);

    const response = await apiClient.get<ApiResponse<any>>(
      `${endpoints.reports.production}?${queryParams}`,
    );
    return (response.data as any).data;
  },

  // Get stock movement report
  getStockMovementReport: async (locationId?: string): Promise<any> => {
    const queryParams = new URLSearchParams();
    if (locationId) queryParams.append("locationId", locationId);

    const response = await apiClient.get<ApiResponse<any>>(
      `${endpoints.reports.stockMovements}?${queryParams}`,
    );
    return (response.data as any).data;
  },
  getTransportJobsReport: async (params?: {
    startDate?: string;
    endDate?: string;
    providerId?: string;
  }): Promise<TransportJobsReport> => {
    const response = await apiClient.get<ApiResponse<TransportJobsReport>>(
      `${endpoints.reports.transportJobs}${toQuery(params)}`,
    );
    return response.data.data;
  },
  getTransportJobAnalytics: async (params?: {
    startDate?: string;
    endDate?: string;
    providerId?: string;
  }): Promise<TransportJobAnalytics> => {
    const response = await apiClient.get<ApiResponse<TransportJobAnalytics>>(
      `${endpoints.reports.transportJobs}${toQuery(params)}`,
    );
    return (response.data as any).data;
  },
};
