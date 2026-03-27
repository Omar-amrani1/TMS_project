import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authService } from "../api/services/auth.service";
import { useAuthStore } from "../store/authStore";
import type { LoginRequest, ChangePasswordRequest } from "../types/api.types";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

export const useAuth = () => {
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginRequest) => authService.login(credentials),
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      toast.success("Login successful!");
      navigate("/dashboard");
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, "Login failed"));
    },
  });

  // Get profile query
  const profileQuery = useQuery({
    queryKey: ["auth", "profile"],
    queryFn: authService.getProfile,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: {
      firstName?: string;
      lastName?: string;
      email?: string;
    }) => authService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "profile"] });
      toast.success("Profile updated successfully");
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, "Failed to update profile"));
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: ChangePasswordRequest) =>
      authService.changePassword(data),
    onSuccess: () => {
      toast.success("Password changed successfully");
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, "Failed to change password"));
    },
  });

  // Logout
  const logout = () => {
    clearAuth();
    queryClient.clear();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return {
    user,
    isAuthenticated,
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
    profile: profileQuery.data,
    isLoadingProfile: profileQuery.isLoading,
    updateProfile: updateProfileMutation.mutate,
    updateProfileAsync: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,
    changePassword: changePasswordMutation.mutate,
    isChangingPassword: changePasswordMutation.isPending,
    logout,
  };
};
