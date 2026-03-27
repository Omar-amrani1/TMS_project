import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersService } from "../api/services/orders.service";
import type {
  CreateOrderRequest,
  OrderStatus,
  OrderType,
  RateOrderRequest,
} from "../types/api.types";
import { toast } from "sonner";

const getErrorMessage = (error: any, fallback: string) =>
  error?.response?.data?.message || error?.message || fallback;

export const useOrders = (params?: {
  userId?: string;
  status?: OrderStatus;
  type?: OrderType;
}) => {
  const queryClient = useQueryClient();

  const ordersQuery = useQuery({
    queryKey: ["orders", params],
    queryFn: () => ordersService.getOrders(params),
    staleTime: 1 * 60 * 1000,
  });

  const createOrderMutation = useMutation({
    mutationFn: (data: CreateOrderRequest) => ordersService.createOrder(data),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["order-notifications"] });
      toast.success(`Order ${order.orderNumber} created successfully`);
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, "Failed to create order"));
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      ordersService.updateOrderStatus(id, status),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", order.id] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      toast.success("Order status updated successfully");
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, "Failed to update order status"));
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: (id: string) => ordersService.cancelOrder(id),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", order.id] });
      queryClient.invalidateQueries({ queryKey: ["stock"] });
      queryClient.invalidateQueries({ queryKey: ["order-notifications"] });
      toast.success("Order cancelled successfully");
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, "Failed to cancel order"));
    },
  });

  const acceptOrderMutation = useMutation({
    mutationFn: (id: string) => ordersService.acceptOrder(id),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", order.id] });
      queryClient.invalidateQueries({ queryKey: ["order-notifications"] });
      toast.success("Order accepted successfully");
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, "Failed to accept order"));
    },
  });

  const rateOrderMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: RateOrderRequest }) =>
      ordersService.rateOrder(id, payload),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", order.id] });
      toast.success("Order rated successfully");
    },
    onError: (error: any) => {
      toast.error(getErrorMessage(error, "Failed to rate order"));
    },
  });

  return {
    orders: ordersQuery.data,
    isLoading: ordersQuery.isLoading,
    isError: ordersQuery.isError,
    error: ordersQuery.error,
    refetch: ordersQuery.refetch,

    createOrder: createOrderMutation.mutate,
    createOrderAsync: createOrderMutation.mutateAsync,
    isCreating: createOrderMutation.isPending,

    updateOrderStatus: updateOrderStatusMutation.mutate,
    isUpdatingStatus: updateOrderStatusMutation.isPending,

    cancelOrder: cancelOrderMutation.mutate,
    isCancelling: cancelOrderMutation.isPending,

    acceptOrder: acceptOrderMutation.mutate,
    acceptOrderAsync: acceptOrderMutation.mutateAsync,
    isAccepting: acceptOrderMutation.isPending,

    rateOrder: rateOrderMutation.mutate,
    rateOrderAsync: rateOrderMutation.mutateAsync,
    isRating: rateOrderMutation.isPending,
  };
};

export const useOrder = (id: string) => {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => ordersService.getOrderById(id),
    enabled: !!id,
  });
};

export const useOrderNotifications = () => {
  return useQuery({
    queryKey: ["order-notifications"],
    queryFn: () => ordersService.getMyNotifications(),
    staleTime: 30 * 1000,
  });
};
