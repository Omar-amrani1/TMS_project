import { apiClient } from "../client";
import { endpoints } from "../endpoints";
import type {
  LoginRequest,
  LoginResponse,
  User,
  ChangePasswordRequest,
  ApiResponse,
} from "../../types/api.types";

type UpdateProfileRequest = {
  firstName?: string;
  lastName?: string;
  email?: string;
};

export const authService = {
  // Login
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<ApiResponse<LoginResponse>>(
      endpoints.auth.login,
      credentials,
    );
    const loginResponse = response.data as ApiResponse<LoginResponse>;
    return loginResponse.data as LoginResponse;
  },

  // Get current user profile
  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<{ user: User }>>(
      endpoints.auth.profile,
    );
    return (response.data as any).data.user;
  },

  // Verify token
  verifyToken: async (): Promise<User> => {
    const response = await apiClient.get<ApiResponse<{ user: User }>>(
      endpoints.auth.verifyToken,
    );
    return (response.data as any).data.user;
  },

  // Update profile
  updateProfile: async (data: UpdateProfileRequest): Promise<User> => {
    const response = await apiClient.put<ApiResponse<{ user: User }>>(
      endpoints.auth.profile,
      data,
    );
    return (response.data as any).data.user;
  },

  // Change password
  changePassword: async (data: ChangePasswordRequest): Promise<void> => {
    await apiClient.post(endpoints.auth.changePassword, data);
  },
};
