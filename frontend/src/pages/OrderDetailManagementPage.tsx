import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
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
  Edit,
  XCircle,
  Save,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ordersService } from "../api/services/orders.service";
import { OrderStatus } from "../types/api.types";
import { format } from "date-fns";
import { useOrders } from "../hooks/useOrders";
import { RouteMap } from "../components/map";

export const OrderDetailManagementPage = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus | "">("");

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

  const { updateOrderStatus, isUpdatingStatus, cancelOrder, isCancelling } =
    useOrders();

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case OrderStatus.CONFIRMED:
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case OrderStatus.PREPARING:
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      case OrderStatus.IN_TRANSIT:
        return "bg-cyan-500/20 text-cyan-400 border-cyan-500/30";
      case OrderStatus.DELIVERED:
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case OrderStatus.CANCELLED:
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING:
        return <Clock className="w-5 h-5" />;
      case OrderStatus.CONFIRMED:
        return <CheckCircle className="w-5 h-5" />;
      case OrderStatus.PREPARING:
        return <Package className="w-5 h-5" />;
      case OrderStatus.IN_TRANSIT:
        return <Truck className="w-5 h-5" />;
      case OrderStatus.DELIVERED:
        return <CheckCircle className="w-5 h-5" />;
      case OrderStatus.CANCELLED:
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const handleStartEditStatus = () => {
    if (order) {
      setNewStatus(order.status);
      setIsEditingStatus(true);
    }
  };

  const handleSaveStatus = () => {
    if (orderId && newStatus && newStatus !== order?.status) {
      updateOrderStatus(
        { id: orderId, status: newStatus as OrderStatus },
        {
          onSuccess: () => {
            setIsEditingStatus(false);
            refetch();
          },
        },
      );
    } else {
      setIsEditingStatus(false);
    }
  };

  const handleCancelOrder = () => {
    if (
      orderId &&
      window.confirm(
        "Are you sure you want to cancel this order? This action cannot be undone.",
      )
    ) {
      cancelOrder(orderId, {
        onSuccess: () => {
          refetch();
        },
      });
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
            to="/orders-management"
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-200 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const canEdit =
    order.status !== OrderStatus.CANCELLED &&
    order.status !== OrderStatus.DELIVERED;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/orders-management"
          className="inline-flex items-center text-gray-400 hover:text-cyan-400 transition-colors mb-6 group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Order Management
        </Link>

        <div className="flex items-start justify-between mb-6">
          <div className="flex items-start gap-6">
            <div
              className={`w-20 h-20 ${
                order.status === OrderStatus.DELIVERED
                  ? "bg-gradient-to-br from-green-600 to-emerald-600"
                  : order.status === OrderStatus.CANCELLED
                    ? "bg-gradient-to-br from-red-600 to-rose-600"
                    : "bg-gradient-to-br from-blue-600 to-cyan-600"
              } rounded-2xl flex items-center justify-center shadow-lg`}
            >
              {getStatusIcon(order.status)}
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

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            {canEdit && !isEditingStatus && (
              <button
                onClick={handleStartEditStatus}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 text-white rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit Status
              </button>
            )}
            {canEdit && (
              <button
                onClick={handleCancelOrder}
                disabled={isCancelling}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg border border-red-500/30 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCancelling ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Cancel Order
              </button>
            )}
          </div>
        </div>

        {/* Status Display/Edit */}
        <div className="flex items-center gap-4">
          {isEditingStatus ? (
            <div className="flex items-center gap-3 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4">
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                disabled={isUpdatingStatus}
              >
                <option value={OrderStatus.PENDING}>Pending</option>
                <option value={OrderStatus.CONFIRMED}>Confirmed</option>
                <option value={OrderStatus.PREPARING}>Preparing</option>
                <option value={OrderStatus.IN_TRANSIT}>In Transit</option>
                <option value={OrderStatus.DELIVERED}>Delivered</option>
              </select>
              <button
                onClick={handleSaveStatus}
                disabled={isUpdatingStatus}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdatingStatus ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save
              </button>
              <button
                onClick={() => setIsEditingStatus(false)}
                disabled={isUpdatingStatus}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <span
                className={`px-4 py-2 rounded-full text-sm font-medium border flex items-center gap-2 ${getStatusColor(
                  order.status,
                )}`}
              >
                {getStatusIcon(order.status)}
                {order.status}
              </span>
              <span className="text-gray-400">
                Type: {order.type.replace("_", " ")}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <Package className="w-6 h-6 text-cyan-400" />
              Order Items
            </h2>
            <div className="space-y-4">
              {order.items.map((item) => (
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
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                      $0.00
                    </p>
                    <p className="text-sm text-gray-400">
                      {(item.product.unitWeight * item.quantity).toFixed(2)} kg
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Locations */}
          <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <MapPin className="w-6 h-6 text-cyan-400" />
              Delivery Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* From Location */}
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

              {/* To Location */}
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

            {/* Distance */}
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

          {/* Transport Details */}
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

                {/* Vehicle Allocations */}
                {order.transportJob.allocations.length > 0 && (
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <h3 className="text-lg font-semibold text-white mb-3">
                      Allocated Vehicles
                    </h3>
                    <div className="space-y-2">
                      {order.transportJob.allocations.map((allocation) => (
                        <div
                          key={allocation.id}
                          className="flex items-center justify-between bg-white/5 rounded-lg p-3 border border-white/10"
                        >
                          <div>
                            <p className="text-white font-medium">
                              {allocation.vehicle.name}
                            </p>
                            <p className="text-sm text-gray-400">
                              {allocation.vehicle.licensePlate} •{" "}
                              {allocation.vehicle.capacityKg} kg capacity
                            </p>
                          </div>
                          <span className="text-cyan-400 font-semibold">
                            ${allocation.cost.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
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
                  {order.type.replace("_", " ")}
                </span>
              </div>

              <div className="border-t border-white/10 pt-4 space-y-3">
                <div className="flex justify-between text-gray-300">
                  <span>Transport Cost</span>
                  <span>${order.transportTotal.toFixed(2)}</span>
                </div>
                <div className="border-t border-white/10 pt-4">
                  <div className="flex justify-between text-2xl font-bold text-white">
                    <span>Total Cost</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                      ${order.transportTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Creator Info */}
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
            </div>

            <div className="space-y-3">
              <Link
                to="/orders-management"
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-200 font-medium block text-center"
              >
                Back to Order Management
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
