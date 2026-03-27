import { Link, useParams } from "react-router-dom";
import {
  Package,
  MapPin,
  Truck,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  ArrowLeft,
  User,
  Navigation,
  Loader2,
  Star,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ordersService } from "../api/services/orders.service";
import type { OrderStatus } from "../types/api.types";
import { format } from "date-fns";
import { useState } from "react";
import { useOrders } from "../hooks/useOrders";
import { RouteMap } from "../components/map";

import { useAuthStore } from "../store/authStore";

const formatMoney = (value: number) => `$${value.toFixed(2)}`;

export const OrderDetailsPage = () => {
  const params = useParams<{ orderId?: string; id?: string }>();
  const orderId = params.orderId ?? params.id;
  const { user } = useAuthStore();
  const { rateOrderAsync, isRating } = useOrders();

  const [onTime, setOnTime] = useState<boolean | null>(null);
  const [damageFree, setDamageFree] = useState<boolean | null>(null);

  const {
    data: order,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => ordersService.getOrderById(orderId!),
    enabled: !!orderId,
  });

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "CONFIRMED":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "PREPARING":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case "IN_TRANSIT":
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
      case "DELIVERED":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "CANCELLED":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case "PENDING":
        return <Clock className="w-5 h-5" />;
      case "CONFIRMED":
        return <CheckCircle className="w-5 h-5" />;
      case "PREPARING":
        return <Package className="w-5 h-5" />;
      case "IN_TRANSIT":
        return <Truck className="w-5 h-5" />;
      case "DELIVERED":
        return <CheckCircle className="w-5 h-5" />;
      case "CANCELLED":
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-12 max-w-md">
          <AlertCircle className="w-24 h-24 text-red-400 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">
            Order Not Found
          </h2>
          <p className="text-gray-400 mb-6">
            The order you're looking for doesn't exist or you don't have access
            to it.
          </p>
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-200 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const getItemPricing = (item: (typeof order.items)[number]) => {
    const i = item as unknown as {
      unitPrice?: number;
      subtotal?: number;
      total?: number;
      price?: number;
      product?: { price?: number; unitPrice?: number };
    };

    const unitPrice =
      i.unitPrice ??
      i.price ??
      i.product?.price ??
      i.product?.unitPrice ??
      null;

    const subtotal =
      i.subtotal ??
      i.total ??
      (typeof unitPrice === "number" ? unitPrice * item.quantity : null);

    return { unitPrice, subtotal };
  };

  const itemsSubtotal = order.items.reduce((sum, item) => {
    const { subtotal } = getItemPricing(item);
    return sum + (typeof subtotal === "number" ? subtotal : 0);
  }, 0);

  const hasItemPricing = order.items.some((item) => {
    const { subtotal } = getItemPricing(item);
    return typeof subtotal === "number";
  });

  const isDelivered = order.status === "DELIVERED";
  const alreadyRated = !!order.ratedAt;

  const canRateByRole =
    (order.type === "DELIVERY" && order.destinationUserId === user?.id) ||
    (order.type !== "DELIVERY" && order.createdById === user?.id);

  const canRate = isDelivered && !alreadyRated && canRateByRole;

  const submitRating = async () => {
    if (!orderId || onTime === null || damageFree === null) return;

    await rateOrderAsync({
      id: orderId,
      payload: { onTime, damageFree },
    });

    await refetch();
  };

  const grandTotal =
    (hasItemPricing ? itemsSubtotal : 0) + order.transportTotal;

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link
          to="/orders"
          className="inline-flex items-center text-gray-400 hover:text-cyan-400 transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Orders
        </Link>

        <div className="flex items-start gap-6 mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Order #{order.orderNumber}
            </h1>
            <p className="text-gray-400">
              Placed on {format(new Date(order.orderDate), "PPP 'at' p")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span
            className={`px-4 py-2 rounded-full text-sm font-medium border flex items-center gap-2 ${getStatusColor(order.status)}`}
          >
            {getStatusIcon(order.status)}
            {order.status}
          </span>
          <span className="text-gray-400">
            Type: {order.type.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Package className="w-6 h-6 text-cyan-400" />
              Order Items
            </h2>
            <div className="space-y-4">
              {order.items.map((item) => {
                const pricing = getItemPricing(item);
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 pb-4 border-b border-white/10 last:border-0"
                  >
                    <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/20">
                      <Package className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white text-lg mb-1">
                        {item.product.name}
                      </h3>
                      <p className="text-sm text-gray-400 mb-2">
                        SKU: {item.product.sku}
                      </p>
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        <span className="text-gray-400">
                          Quantity: {item.quantity} units
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            item.product.type === "RAW_MATERIAL"
                              ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                              : "bg-green-500/20 text-green-400 border border-green-500/30"
                          }`}
                        >
                          {item.product.type === "RAW_MATERIAL"
                            ? "Raw Material"
                            : "Finished Product"}
                        </span>
                        {typeof pricing.unitPrice === "number" && (
                          <span className="text-xs text-gray-400">
                            Unit: {formatMoney(pricing.unitPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {typeof pricing.subtotal === "number" ? (
                        <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                          {formatMoney(pricing.subtotal)}
                        </p>
                      ) : (
                        <p className="text-xl font-bold text-gray-300">N/A</p>
                      )}
                      <p className="text-sm text-gray-400">
                        {(item.product.unitWeight * item.quantity).toFixed(2)}{" "}
                        kg
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <MapPin className="w-6 h-6 text-cyan-400" />
              Delivery Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-2 text-gray-400 mb-3">
                  <Navigation className="w-4 h-4" />
                  <span className="text-sm font-medium">From</span>
                </div>
                <h3 className="font-semibold text-white text-lg mb-2">
                  {order.fromLocation.name}
                </h3>
                <p className="text-sm text-gray-400 mb-1">
                  {order.fromLocation.address}
                </p>
                <span className="inline-block px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs mt-2 border border-blue-500/30">
                  {order.fromLocation.locationType}
                </span>
              </div>

              <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                <div className="flex items-center gap-2 text-gray-400 mb-3">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm font-medium">To</span>
                </div>
                <h3 className="font-semibold text-white text-lg mb-2">
                  {order.toLocation.name}
                </h3>
                <p className="text-sm text-gray-400 mb-1">
                  {order.toLocation.address}
                </p>
                <span className="inline-block px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs mt-2 border border-cyan-500/30">
                  {order.toLocation.locationType}
                </span>
              </div>
            </div>

            <div className="mt-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300 font-medium">
                  Total Distance
                </span>
                <span className="text-cyan-400 font-bold text-lg">
                  {order.distanceKm.toFixed(2)} km
                </span>
              </div>
            </div>
            <div className="mt-4">
              <RouteMap
                from={order.fromLocation as any}
                to={order.toLocation as any}
                height={280}
              />
            </div>
          </div>

          {order.transportJob && (
            <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                <Truck className="w-6 h-6 text-cyan-400" />
                Transport Details
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10">
                  <span className="text-gray-400">Provider</span>
                  <span className="text-white font-medium">
                    {order.transportJob.provider.name}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10">
                  <span className="text-gray-400">Status</span>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium border ${
                      order.transportJob.status === "COMPLETED"
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : order.transportJob.status === "IN_PROGRESS"
                          ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                          : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                    }`}
                  >
                    {order.transportJob.status}
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10">
                  <span className="text-gray-400">Total Weight</span>
                  <span className="text-white font-medium">
                    {order.transportJob.totalWeight.toFixed(2)} kg
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10">
                  <span className="text-gray-400">Scheduled Date</span>
                  <span className="text-white font-medium">
                    {format(new Date(order.transportJob.scheduledDate), "PPP")}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-1">
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6 sticky top-24">
            <h2 className="text-2xl font-bold text-white mb-6">
              Order Summary
            </h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between text-gray-300 bg-white/5 rounded-lg p-3 border border-white/10">
                <span>Order Number</span>
                <span className="font-mono text-white">
                  {order.orderNumber}
                </span>
              </div>

              <div className="flex justify-between text-gray-300 bg-white/5 rounded-lg p-3 border border-white/10">
                <span>Order Type</span>
                <span className="text-white">
                  {order.type.replace(/_/g, " ")}
                </span>
              </div>

              <div className="border-t border-white/10 pt-4 space-y-3">
                <div className="flex justify-between text-gray-300">
                  <span>Items Subtotal</span>
                  <span>
                    {hasItemPricing ? formatMoney(itemsSubtotal) : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Transport Cost</span>
                  <span>{formatMoney(order.transportTotal)}</span>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <div className="flex justify-between text-2xl font-bold text-white">
                    <span>Total Cost</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                      {formatMoney(grandTotal)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 bg-white/5 rounded-lg p-3 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-400">Ordered By</span>
                </div>
                <p className="text-white font-medium">
                  {order.createdBy.firstName} {order.createdBy.lastName}
                </p>
                <p className="text-sm text-gray-400">{order.createdBy.email}</p>
              </div>

              {order.deliveryDate && (
                <div className="border-t border-white/10 pt-4 bg-white/5 rounded-lg p-3 border border-white/10">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-400">Delivery Date</span>
                  </div>
                  <p className="text-white font-medium">
                    {format(new Date(order.deliveryDate), "PPP")}
                  </p>
                </div>
              )}

              {isDelivered && alreadyRated && (
                <div className="border-t border-white/10 pt-4 bg-white/5 rounded-lg p-3 border border-green-500/30">
                  <div className="flex items-center gap-2 text-green-400 mb-2">
                    <Star className="w-4 h-4" />
                    <span className="text-sm font-medium">Delivery Rated</span>
                  </div>
                  <p className="text-sm text-gray-300">
                    On-time: {order.ratingOnTime ? "Yes" : "No"}
                  </p>
                  <p className="text-sm text-gray-300">
                    Damage-free: {order.ratingDamageFree ? "Yes" : "No"}
                  </p>
                </div>
              )}

              {canRate && (
                <div className="border-t border-white/10 pt-4 bg-white/5 rounded-lg p-4 border border-yellow-500/30">
                  <div className="flex items-center gap-2 text-yellow-400 mb-3">
                    <Star className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Rate this delivery
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-300 mb-2">
                        Delivered on time?
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setOnTime(true)}
                          className={`px-3 py-1 rounded text-xs border ${
                            onTime === true
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : "bg-white/5 text-gray-300 border-white/10"
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setOnTime(false)}
                          className={`px-3 py-1 rounded text-xs border ${
                            onTime === false
                              ? "bg-red-500/20 text-red-400 border-red-500/30"
                              : "bg-white/5 text-gray-300 border-white/10"
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-gray-300 mb-2">
                        Arrived damage-free?
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setDamageFree(true)}
                          className={`px-3 py-1 rounded text-xs border ${
                            damageFree === true
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : "bg-white/5 text-gray-300 border-white/10"
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setDamageFree(false)}
                          className={`px-3 py-1 rounded text-xs border ${
                            damageFree === false
                              ? "bg-red-500/20 text-red-400 border-red-500/30"
                              : "bg-white/5 text-gray-300 border-white/10"
                          }`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={
                        isRating || onTime === null || damageFree === null
                      }
                      onClick={submitRating}
                      className="w-full px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium disabled:opacity-60"
                    >
                      {isRating ? "Submitting..." : "Submit Rating"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Link
                to="/orders"
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-200 font-medium block text-center"
              >
                Back to Orders
              </Link>
              <Link
                to="/products"
                className="w-full px-6 py-3 bg-white/5 text-white rounded-lg border border-white/10 hover:bg-white/10 transition-colors font-medium block text-center"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
