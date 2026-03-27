import { apiClient } from "../client";
import { endpoints } from "../endpoints";
import type {
  TransportProvider,
  Vehicle,
  TransportJob,
  CreateVehicleRequest,
  CalculateTransportCostRequest,
  TransportCostResponse,
  VehicleStatus,
  TransportJobStatus,
  ApiResponse,
} from "../../types/api.types";

const unwrapApi = <T>(response: any): T => {
  return (response?.data?.data ?? response?.data) as T;
};

export const transportService = {
  // Providers
  getProviders: async (): Promise<TransportProvider[]> => {
    const response = await apiClient.get<
      ApiResponse<{ providers: TransportProvider[] }>
    >(endpoints.transport.providers);
    return (response.data as any).data.providers;
  },

  getProviderById: async (id: string): Promise<TransportProvider> => {
    const response = await apiClient.get<
      ApiResponse<{ provider: TransportProvider }>
    >(endpoints.transport.providerById(id));
    return (response.data as any).data.provider;
  },

  createProvider: async (data: {
    name: string;
    userId: string;
  }): Promise<TransportProvider> => {
    const response = await apiClient.post<
      ApiResponse<{ provider: TransportProvider }>
    >(endpoints.transport.providers, data);
    return (response.data as any).data.provider;
  },

  // Vehicles
  getVehicles: async (params?: {
    providerId?: string;
    status?: VehicleStatus;
  }): Promise<Vehicle[]> => {
    const queryParams = new URLSearchParams();
    if (params?.providerId) queryParams.append("providerId", params.providerId);
    if (params?.status) queryParams.append("status", params.status);

    const response = await apiClient.get<ApiResponse<{ vehicles: Vehicle[] }>>(
      `${endpoints.transport.vehicles}?${queryParams}`,
    );
    return (response.data as any).data.vehicles;
  },

  getVehicleById: async (id: string): Promise<Vehicle> => {
    const response = await apiClient.get<ApiResponse<{ vehicle: Vehicle }>>(
      endpoints.transport.vehicleById(id),
    );
    return (response.data as any).data.vehicle;
  },

  createVehicle: async (data: CreateVehicleRequest): Promise<Vehicle> => {
    const response = await apiClient.post<ApiResponse<{ vehicle: Vehicle }>>(
      endpoints.transport.vehicles,
      data,
    );
    return (response.data as any).data.vehicle;
  },

  updateVehicle: async (
    id: string,
    data: Partial<CreateVehicleRequest>,
  ): Promise<Vehicle> => {
    const response = await apiClient.put<ApiResponse<{ vehicle: Vehicle }>>(
      endpoints.transport.vehicleById(id),
      data,
    );
    return (response.data as any).data.vehicle;
  },

  // Transport Jobs
  getJobs: async (params?: {
    providerId?: string;
    status?: TransportJobStatus;
  }): Promise<TransportJob[]> => {
    const queryParams = new URLSearchParams();
    if (params?.providerId) queryParams.append("providerId", params.providerId);
    if (params?.status) queryParams.append("status", params.status);

    const response = await apiClient.get<ApiResponse<{ jobs: TransportJob[] }>>(
      `${endpoints.transport.jobs}?${queryParams}`,
    );
    return (response.data as any).data.jobs;
  },

  getJobById: async (id: string): Promise<TransportJob> => {
    const response = await apiClient.get<ApiResponse<{ job: TransportJob }>>(
      endpoints.transport.jobById(id),
    );
    return (response.data as any).data.job;
  },

  updateJobStatus: async (
    id: string,
    status: TransportJobStatus,
  ): Promise<TransportJob> => {
    const response = await apiClient.put<ApiResponse<{ job: TransportJob }>>(
      endpoints.transport.updateJobStatus(id),
      { status },
    );
    return (response.data as any).data.job;
  },

  // Calculate transport cost
  calculateCost: async (
    data: CalculateTransportCostRequest,
  ): Promise<TransportCostResponse> => {
    const response = await apiClient.post<ApiResponse<TransportCostResponse>>(
      endpoints.transport.calculateCost,
      data,
    );
    return unwrapApi<TransportCostResponse>(response);
  },

  // Get active transport providers
  getTransportProviders: async (): Promise<TransportProvider[]> => {
    const response = await apiClient.get<
      ApiResponse<{ providers: TransportProvider[] }>
    >(endpoints.transport.providers);
    return (response.data as any).data.providers || [];
  },

  // FIX: do NOT use `this` inside arrow fn
  calculateTransportCost: async (
    providerId: string,
    totalWeight: number,
    distanceKm: number,
  ): Promise<TransportCostResponse> => {
    const response = await apiClient.post<ApiResponse<TransportCostResponse>>(
      endpoints.transport.calculateCost,
      { providerId, totalWeight, distanceKm },
    );
    return unwrapApi<TransportCostResponse>(response);
  },
};
