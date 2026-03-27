import { apiClient } from "../client";
import { endpoints } from "../endpoints";
import type {
  Order,
  CreateOrderRequest,
  OrderStatus,
  OrderType,
  ApiResponse,
  OrderNotification,
  RateOrderRequest,
} from "../../types/api.types";

const toQuery = (params?: Record<string, string | undefined>) => {
  const query = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v) query.append(k, v);
  });
  const qs = query.toString();
  return qs ? `?${qs}` : "";
};

export const ordersService = {
  getOrders: async (params?: {
    userId?: string;
    status?: OrderStatus;
    type?: OrderType;
  }): Promise<Order[]> => {
    const response = await apiClient.get<ApiResponse<{ orders: Order[] }>>(
      `${endpoints.orders.base}${toQuery({
        userId: params?.userId,
        status: params?.status,
        type: params?.type,
      })}`,
    );
    return response.data.data.orders;
  },

  getOrderById: async (id: string): Promise<Order> => {
    const response = await apiClient.get<ApiResponse<{ order: Order }>>(
      endpoints.orders.byId(id),
    );
    return response.data.data.order;
  },

  createOrder: async (data: CreateOrderRequest): Promise<Order> => {
    const response = await apiClient.post<ApiResponse<{ order: Order }>>(
      endpoints.orders.base,
      data,
    );
    return response.data.data.order;
  },

  updateOrderStatus: async (
    id: string,
    status: OrderStatus,
  ): Promise<Order> => {
    const response = await apiClient.put<ApiResponse<{ order: Order }>>(
      endpoints.orders.updateStatus(id),
      { status },
    );
    return response.data.data.order;
  },

  cancelOrder: async (id: string): Promise<Order> => {
    const response = await apiClient.post<ApiResponse<{ order: Order }>>(
      endpoints.orders.cancel(id),
    );
    return response.data.data.order;
  },

  getMyNotifications: async (): Promise<OrderNotification[]> => {
    const response = await apiClient.get<
      ApiResponse<{ total: number; notifications: OrderNotification[] }>
    >(endpoints.orders.notificationsMy);
    return response.data.data.notifications;
  },

  acceptOrder: async (id: string): Promise<Order> => {
    const response = await apiClient.post<ApiResponse<{ order: Order }>>(
      endpoints.orders.accept(id),
    );
    return response.data.data.order;
  },

  rateOrder: async (id: string, payload: RateOrderRequest): Promise<Order> => {
    const response = await apiClient.post<ApiResponse<{ order: Order }>>(
      endpoints.orders.rate(id),
      payload,
    );
    return response.data.data.order;
  },
};
