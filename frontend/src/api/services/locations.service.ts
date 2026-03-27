// First, update locations.service.ts to add update and delete methods

import { apiClient } from "../client";
import { endpoints } from "../endpoints";
import type {
  Location,
  CreateLocationRequest,
  DistanceCalculation,
  ApiResponse,
} from "../../types/api.types";

export const locationsService = {
  // Get all locations
  getLocations: async (): Promise<Location[]> => {
    const response = await apiClient.get<
      ApiResponse<{ locations: Location[] }>
    >(endpoints.locations.base);
    return (response.data as any).data.locations;
  },

  // Get location by ID
  getLocationById: async (id: string): Promise<Location> => {
    const response = await apiClient.get<ApiResponse<{ location: Location }>>(
      endpoints.locations.byId(id),
    );
    return (response.data as any).data.location;
  },

  // Create location
  createLocation: async (data: CreateLocationRequest): Promise<Location> => {
    const response = await apiClient.post<ApiResponse<{ location: Location }>>(
      endpoints.locations.base,
      data,
    );
    return (response.data as any).data.location;
  },

  // Update location
  updateLocation: async (
    id: string,
    data: Partial<CreateLocationRequest>,
  ): Promise<Location> => {
    const response = await apiClient.put<ApiResponse<{ location: Location }>>(
      endpoints.locations.byId(id),
      data,
    );
    return (response.data as any).data.location;
  },

  // Delete location
  deleteLocation: async (id: string): Promise<void> => {
    await apiClient.delete(endpoints.locations.byId(id));
  },

  // Calculate distance
  calculateDistance: async (fromLocationId: string, toLocationId: string) => {
    const response = await apiClient.get(
      endpoints.locations.calculateDistance,
      {
        params: { fromLocationId, toLocationId },
      },
    );

    const payload = (response as any)?.data?.data ?? (response as any)?.data;

    return {
      distanceKm:
        Number(
          payload?.distanceKm ??
            payload?.distance?.distanceKm ??
            payload?.distance ??
            0,
        ) || 0,
    };
  },
};
