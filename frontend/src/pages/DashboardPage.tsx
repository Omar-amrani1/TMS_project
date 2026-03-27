import { useAuthStore } from "../store/authStore";
import {
  Package,
  ShoppingCart,
  DollarSign,
  Users,
  Warehouse,
  Truck,
  Factory,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Box,
  Boxes,
  CheckCircle2,
  Clock,
  BarChart3,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ordersService } from "../api/services/orders.service";
import { reportsService } from "../api/services/reports.service";
import { stockService } from "../api/services/stock.service";
import { transportService } from "../api/services/transport.service";
import { useOrderNotifications, useOrders } from "../hooks/useOrders";
import { Link } from "react-router-dom";
import { AppHeader } from "@/components/layout/AppHeader";

type ApiList<T> = T[] | { data?: T[]; items?: T[] } | null | undefined;

const asArray = <T,>(value: ApiList<T> | unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object") {
    const v = value as { data?: unknown; items?: unknown };
    if (Array.isArray(v.data)) return v.data as T[];
    if (Array.isArray(v.items)) return v.items as T[];
  }
  return [];
};

const normalizeRole = (role: string | null | undefined): string => {
  const r = String(role ?? "")
    .trim()
    .toUpperCase();
  const aliases: Record<string, string> = {
    RAW_MATERIAL_MANAGER: "RAW_STOCK_MANAGER",
    RAW_STOCK: "RAW_STOCK_MANAGER",
    FINISHED_PRODUCT_MANAGER: "FINISHED_STOCK_MANAGER",
    FINISHED_PRODUCT_STOCK_MANAGER: "FINISHED_STOCK_MANAGER",
    TRANSPORTER: "TRANSPORT_PROVIDER",
    PRODUCTION: "PRODUCTION_CLIENT",
    PRODUCTION_MANAGER: "PRODUCTION_CLIENT",
    CLIENT: "PRODUCTION_CLIENT",
  };
  return aliases[r] ?? r;
};

type OrderRow = {
  id: string;
  orderNumber?: string;
  status: string;
  transportTotal?: number;
  createdAt: string;
  createdBy?: { firstName?: string; lastName?: string };
};

type StockRow = {
  id?: string;
  quantity?: number;
  reservedQuantity?: number;
  product?: { name?: string };
  location?: { name?: string };
};

type JobRow = {
  id: string;
  status: string;
  vehicle?: { licensePlate?: string };
};

type NotificationRow = {
  id?: string;
  orderId?: string;
  orderNumber?: string;
  fromLocation?: { name?: string };
  toLocation?: { name?: string };
};

const AssignedOrdersPanel = () => {
  const { data: notifications, isLoading } = useOrderNotifications();
  const { acceptOrder, isAccepting } = useOrders();

  const rows = asArray<NotificationRow>(notifications);

  if (isLoading) {
    return (
      <div className="bg-white/5 rounded-xl border border-white/10 p-6">
        <p className="text-sm text-gray-400">Loading assigned orders...</p>
      </div>
    );
  }

  if (!rows.length) return null;

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Assigned Orders</h3>
        <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
          {rows.length} pending
        </span>
      </div>

      <div className="space-y-3">
        {rows.slice(0, 5).map((n, idx) => {
          const id = n.id || n.orderId;
          return (
            <div
              key={id ?? idx}
              className="p-3 bg-white/5 rounded-lg border border-white/10 flex items-center justify-between gap-3"
            >
              <div>
                <p className="text-sm font-medium text-white">
                  {n.orderNumber ?? "Order"}
                </p>
                <p className="text-xs text-gray-400">
                  {n.fromLocation?.name ?? "Unknown"} →{" "}
                  {n.toLocation?.name ?? "Unknown"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {id && (
                  <Link
                    to={`/orders/${id}`}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    View
                  </Link>
                )}
                <button
                  type="button"
                  disabled={isAccepting || !id}
                  onClick={() => id && acceptOrder(id)}
                  className="text-xs px-3 py-1 rounded-md bg-green-600 hover:bg-green-500 text-white disabled:opacity-60"
                >
                  Accept
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const DashboardPage = () => {
  const { user } = useAuthStore();
  const role = normalizeRole(user?.role);

  switch (role) {
    case "MANAGER":
      return <ManagerDashboard />;
    case "RAW_STOCK_MANAGER":
      return <RawStockManagerDashboard />;
    case "PRODUCTION_CLIENT":
      return <ProductionClientDashboard />;
    case "DISTRIBUTOR":
      return <DistributorDashboard />;
    case "TRANSPORT_PROVIDER":
      return <TransportProviderDashboard />;
    case "FINISHED_STOCK_MANAGER":
      return <FinishedStockManagerDashboard />;
    default:
      return <DefaultDashboard />;
  }
};

const ManagerDashboard = () => {
  const { user } = useAuthStore();

  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: () => reportsService.getDashboardStats(),
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => ordersService.getOrders(),
  });

  const statsData = (dashboardStats ?? {}) as any;
  const orderRows = asArray<OrderRow>(orders);
  const isLoading = statsLoading || ordersLoading;

  const totalOrders = statsData?.orders?.total || 0;
  const totalCost = statsData?.orders?.costLastMonth || 0;
  const pendingOrders = statsData?.orders?.byStatus?.PENDING || 0;
  const completedOrders = statsData?.orders?.byStatus?.DELIVERED || 0;
  const costChange = statsData?.orders?.costComparison?.percentageChange ?? 0;
  const ordersChange =
    statsData?.orders?.orderComparison?.percentageChange ?? 0;

  const stats = [
    {
      label: "Total cost",
      value: `$${Number(totalCost).toFixed(2)}`,
      change: `${costChange >= 0 ? "+" : ""}${Number(costChange).toFixed(1)}%`,
      isPositive: costChange >= 0,
      icon: DollarSign,
      bgColor: "bg-green-500/10",
      textColor: "text-green-400",
    },
    {
      label: "Total Orders",
      value: String(totalOrders),
      change: `${ordersChange >= 0 ? "+" : ""}${Number(ordersChange).toFixed(1)}%`,
      isPositive: ordersChange >= 0,
      icon: ShoppingCart,
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-400",
    },
    {
      label: "Pending Orders",
      value: String(pendingOrders),
      change: pendingOrders > 0 ? "-5.0%" : "No orders",
      isPositive: pendingOrders === 0,
      icon: AlertCircle,
      bgColor: "bg-yellow-500/10",
      textColor: "text-yellow-400",
    },
    {
      label: "Completed Orders",
      value: String(completedOrders),
      change: `${ordersChange >= 0 ? "+" : ""}${Number(ordersChange).toFixed(1)}%`,
      isPositive: ordersChange >= 0,
      icon: Package,
      bgColor: "bg-purple-500/10",
      textColor: "text-purple-400",
    },
  ];

  const quickActions = [
    {
      label: "Manage Products",
      icon: Package,
      href: "/products-management",
      color: "from-blue-600 to-cyan-600",
    },
    {
      label: "Analytics",
      icon: BarChart3,
      href: "/analytics",
      color: "from-cyan-600 to-blue-600",
    },
    {
      label: "Create Request",
      icon: ShoppingCart,
      href: "/requests/new",
      color: "from-teal-600 to-cyan-600",
    },
    {
      label: "Manage Products",
      icon: Package,
      href: "/products-management",
      color: "from-blue-600 to-cyan-600",
    },
    {
      label: "Manage Orders",
      icon: ShoppingCart,
      href: "/orders-management",
      color: "from-purple-600 to-pink-600",
    },
    {
      label: "Stock Management",
      icon: Warehouse,
      href: "/stock",
      color: "from-green-600 to-emerald-600",
    },
    {
      label: "Transport",
      icon: Truck,
      href: "/transport",
      color: "from-indigo-600 to-purple-600",
    },
    {
      label: "User Management",
      icon: Users,
      href: "/users",
      color: "from-pink-600 to-rose-600",
    },
  ];

  const recentOrders = orderRows.slice(0, 5);
  const activeDeliveries = statsData?.transport?.byStatus?.IN_TRANSIT ?? 0;
  const activeBatches = statsData?.production?.byStatus?.IN_PROGRESS ?? 0;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <AppHeader />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AppHeader />
      <div>
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-400 mt-2">
          Here's what's happening with your platform today.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
              <div
                className={`flex items-center text-sm font-medium ${stat.isPositive ? "text-green-400" : "text-red-400"}`}
              >
                {stat.isPositive ? (
                  <ArrowUpRight className="w-4 h-4 mr-1" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 mr-1" />
                )}
                {stat.change}
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
            <p className="text-sm text-gray-400">{stat.label}</p>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-xl font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.href}
              className="group bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all"
            >
              <div
                className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${action.color} mb-4 group-hover:scale-110 transition-transform`}
              >
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-white">
                {action.label}
              </h3>
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Recent Orders</h2>
          <Link
            to="/orders-management"
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            View All
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="p-10 text-center text-gray-400">No orders yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody className="divide-y divide-white/10">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 text-white">
                      {order.orderNumber ?? "N/A"}
                    </td>
                    <td className="px-6 py-4 text-gray-300">
                      {order.createdBy?.firstName || "Unknown"}{" "}
                      {order.createdBy?.lastName || ""}
                    </td>
                    <td className="px-6 py-4 text-gray-300">{order.status}</td>
                    <td className="px-6 py-4 text-white">
                      ${Number(order.transportTotal || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {order.createdAt
                        ? new Date(order.createdAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/orders/${order.id}`}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Stock Overview
          </h3>
          <p className="text-gray-300">
            Raw Materials: {statsData?.stock?.rawMaterial?.available ?? 0}
          </p>
          <p className="text-gray-300">
            Finished Products:{" "}
            {statsData?.stock?.finishedProduct?.available ?? 0}
          </p>
        </div>
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Active Operations
          </h3>
          <div className="flex items-center gap-2 text-gray-300 mb-2">
            <Truck className="w-4 h-4" /> {activeDeliveries} Active Deliveries
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <Factory className="w-4 h-4" /> {activeBatches} Production Batches
          </div>
        </div>
      </div>
    </div>
  );
};

const RawStockManagerDashboard = () => {
  const { user } = useAuthStore();

  const {
    data: rawMaterialStock,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["rawMaterialStock"],
    queryFn: () => stockService.getRawMaterialStock(),
  });

  const rows = asArray<StockRow>(rawMaterialStock);
  const totalItems = rows.length;
  const totalQuantity = rows.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );
  const reservedQuantity = rows.reduce(
    (sum, item) => sum + Number(item.reservedQuantity || 0),
    0,
  );
  const availableQuantity = totalQuantity - reservedQuantity;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <AppHeader />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-8">
        <AppHeader />
        <div className="bg-white/5 rounded-xl border border-red-500/30 p-6 text-red-300">
          Failed to load raw stock dashboard data.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AppHeader />
      <div>
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-400 mt-2">
          Manage raw material inventory and stock levels.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            label: "Total Items",
            value: totalItems,
            icon: Box,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
          },
          {
            label: "Total Quantity",
            value: totalQuantity,
            icon: Boxes,
            color: "text-purple-400",
            bg: "bg-purple-500/10",
          },
          {
            label: "Reserved",
            value: reservedQuantity,
            icon: Clock,
            color: "text-yellow-400",
            bg: "bg-yellow-500/10",
          },
          {
            label: "Available",
            value: availableQuantity,
            icon: CheckCircle2,
            color: "text-green-400",
            bg: "bg-green-500/10",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white/5 rounded-xl border border-white/10 p-6"
          >
            <div className={`p-3 rounded-lg ${s.bg} inline-block mb-4`}>
              <s.icon className={`w-6 h-6 ${s.color}`} />
            </div>
            <h3 className="text-2xl font-bold text-white">{s.value}</h3>
            <p className="text-sm text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      <AssignedOrdersPanel />

      <div className="bg-white/5 rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Recent Stock Items
        </h3>
        <div className="space-y-3">
          {rows.slice(0, 5).map((item, idx) => (
            <div
              key={item.id ?? idx}
              className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
            >
              <div>
                <p className="text-sm text-white">
                  {item.product?.name ?? "Unknown Product"}
                </p>
                <p className="text-xs text-gray-400">
                  {item.location?.name ?? "Unknown Location"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-white">
                  {Number(item.quantity || 0)} units
                </p>
                <p className="text-xs text-gray-400">
                  {Number(item.reservedQuantity || 0)} reserved
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const ProductionClientDashboard = () => {
  const { user } = useAuthStore();

  const {
    data: productionStock,
    isLoading: stockLoading,
    isError: stockError,
  } = useQuery({
    queryKey: ["productionStock"],
    queryFn: () => stockService.getProductionStock(),
  });

  const {
    data: myOrders,
    isLoading: ordersLoading,
    isError: ordersError,
  } = useQuery({
    queryKey: ["orders", "production-client"],
    queryFn: () => ordersService.getOrders(),
    enabled: !!user?.id,
  });

  const isLoading = stockLoading || ordersLoading;
  const hasFatalError = stockError && ordersError;

  const stockRows = asArray<StockRow>(productionStock);
  const orderRows = asArray<OrderRow>(myOrders);

  const totalOrders = orderRows.length;
  const inProgressOrders = orderRows.filter(
    (o) => o.status === "PREPARING" || o.status === "IN_TRANSIT",
  ).length;
  const completedOrders = orderRows.filter(
    (o) => o.status === "DELIVERED",
  ).length;
  const productionStockQuantity = stockRows.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );

  if (isLoading) {
    return (
      <div className="space-y-8">
        <AppHeader />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500" />
        </div>
      </div>
    );
  }

  if (hasFatalError) {
    return (
      <div className="space-y-8">
        <AppHeader />
        <div className="bg-white/5 rounded-xl border border-red-500/30 p-6 text-red-300">
          Failed to load production dashboard data.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AppHeader />
      <div>
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-400 mt-2">
          Manage production operations and inventory.
        </p>
      </div>
      <Link
        to="/requests/new"
        className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm"
      >
        Create Request
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            label: "My Orders",
            value: totalOrders,
            icon: ShoppingCart,
            color: "text-orange-400",
            bg: "bg-orange-500/10",
          },
          {
            label: "In Progress",
            value: inProgressOrders,
            icon: Clock,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
          },
          {
            label: "Completed",
            value: completedOrders,
            icon: CheckCircle2,
            color: "text-green-400",
            bg: "bg-green-500/10",
          },
          {
            label: "Production Stock",
            value: productionStockQuantity,
            icon: Boxes,
            color: "text-purple-400",
            bg: "bg-purple-500/10",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white/5 rounded-xl border border-white/10 p-6"
          >
            <div className={`p-3 rounded-lg ${s.bg} inline-block mb-4`}>
              <s.icon className={`w-6 h-6 ${s.color}`} />
            </div>
            <h3 className="text-2xl font-bold text-white">{s.value}</h3>
            <p className="text-sm text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      <AssignedOrdersPanel />

      <div className="bg-white/5 rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Orders</h3>
        <div className="space-y-3">
          {orderRows.slice(0, 5).map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
            >
              <div>
                <p className="text-sm text-white">{o.orderNumber ?? "Order"}</p>
                <p className="text-xs text-gray-400">{o.status}</p>
              </div>
              <Link
                to={`/orders/${o.id}`}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                View
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DistributorDashboard = () => {
  const { user } = useAuthStore();

  const {
    data: finishedStock,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["finishedProductStock"],
    queryFn: () => stockService.getFinishedProductStock(),
  });

  const rows = asArray<StockRow>(finishedStock);
  const totalItems = rows.length;
  const totalQuantity = rows.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );
  const reservedQuantity = rows.reduce(
    (sum, item) => sum + Number(item.reservedQuantity || 0),
    0,
  );
  const availableQuantity = totalQuantity - reservedQuantity;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <AppHeader />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-8">
        <AppHeader />
        <div className="bg-white/5 rounded-xl border border-red-500/30 p-6 text-red-300">
          Failed to load distributor dashboard data.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AppHeader />
      <div>
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-400 mt-2">
          Manage finished product distribution.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            label: "Total Products",
            value: totalItems,
            icon: Package,
            color: "text-green-400",
            bg: "bg-green-500/10",
          },
          {
            label: "Total Stock",
            value: totalQuantity,
            icon: Boxes,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
          },
          {
            label: "Reserved",
            value: reservedQuantity,
            icon: Clock,
            color: "text-yellow-400",
            bg: "bg-yellow-500/10",
          },
          {
            label: "Available",
            value: availableQuantity,
            icon: CheckCircle2,
            color: "text-purple-400",
            bg: "bg-purple-500/10",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white/5 rounded-xl border border-white/10 p-6"
          >
            <div className={`p-3 rounded-lg ${s.bg} inline-block mb-4`}>
              <s.icon className={`w-6 h-6 ${s.color}`} />
            </div>
            <h3 className="text-2xl font-bold text-white">{s.value}</h3>
            <p className="text-sm text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white/5 rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Recent Stock Items
        </h3>
        <div className="space-y-3">
          {rows.slice(0, 5).map((item, idx) => (
            <div
              key={item.id ?? idx}
              className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
            >
              <div>
                <p className="text-sm text-white">
                  {item.product?.name ?? "Unknown Product"}
                </p>
                <p className="text-xs text-gray-400">
                  {item.location?.name ?? "Unknown Location"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-white">
                  {Number(item.quantity || 0)} units
                </p>
                <p className="text-xs text-gray-400">
                  {Number(item.reservedQuantity || 0)} reserved
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const TransportProviderDashboard = () => {
  const { user } = useAuthStore();

  const {
    data: jobs,
    isLoading: jobsLoading,
    isError: jobsError,
  } = useQuery({
    queryKey: ["transportJobs"],
    queryFn: () => transportService.getJobs(),
  });

  const {
    data: vehicles,
    isLoading: vehiclesLoading,
    isError: vehiclesError,
  } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => transportService.getVehicles(),
  });

  const isLoading = jobsLoading || vehiclesLoading;
  const isError = jobsError || vehiclesError;

  const jobRows = asArray<JobRow>(jobs);
  const vehicleRows = asArray<unknown>(vehicles);

  const totalJobs = jobRows.length;
  const activeJobs = jobRows.filter(
    (j) =>
      j.status === "SCHEDULED" ||
      j.status === "IN_PROGRESS" ||
      j.status === "IN_TRANSIT",
  ).length;
  const completedJobs = jobRows.filter(
    (j) => j.status === "COMPLETED" || j.status === "DELIVERED",
  ).length;
  const totalVehicles = vehicleRows.length;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <AppHeader />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-8">
        <AppHeader />
        <div className="bg-white/5 rounded-xl border border-red-500/30 p-6 text-red-300">
          Failed to load transport dashboard data.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AppHeader />
      <div>
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-400 mt-2">
          Manage transport operations and deliveries.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            label: "Total Jobs",
            value: totalJobs,
            icon: Truck,
            color: "text-indigo-400",
            bg: "bg-indigo-500/10",
          },
          {
            label: "Active Jobs",
            value: activeJobs,
            icon: Clock,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
          },
          {
            label: "Completed",
            value: completedJobs,
            icon: CheckCircle2,
            color: "text-green-400",
            bg: "bg-green-500/10",
          },
          {
            label: "Total Vehicles",
            value: totalVehicles,
            icon: Truck,
            color: "text-purple-400",
            bg: "bg-purple-500/10",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white/5 rounded-xl border border-white/10 p-6"
          >
            <div className={`p-3 rounded-lg ${s.bg} inline-block mb-4`}>
              <s.icon className={`w-6 h-6 ${s.color}`} />
            </div>
            <h3 className="text-2xl font-bold text-white">{s.value}</h3>
            <p className="text-sm text-gray-400">{s.label}</p>
          </div>
        ))}
      </div>

      <AssignedOrdersPanel />

      <div className="bg-white/5 rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Jobs</h3>
        <div className="space-y-3">
          {jobRows.slice(0, 5).map((job) => (
            <div
              key={job.id}
              className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10"
            >
              <div>
                <p className="text-sm text-white">Job #{job.id.slice(0, 8)}</p>
                <p className="text-xs text-gray-400">
                  {job.vehicle?.licensePlate ?? "No vehicle assigned"}
                </p>
              </div>
              <span className="text-xs px-2 py-1 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {job.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const FinishedStockManagerDashboard = () => {
  const { user } = useAuthStore();

  const {
    data: finishedStock,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["finishedProductStock", user?.locationId],
    queryFn: () => stockService.getFinishedProductStock(
      user?.locationId ? { locationId: user.locationId } : undefined
    ),
  });

  const rows = asArray<StockRow>(finishedStock);
  const totalItems = rows.length;
  const totalQuantity = rows.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );
  const reservedQuantity = rows.reduce(
    (sum, item) => sum + Number(item.reservedQuantity || 0),
    0,
  );
  const availableQuantity = totalQuantity - reservedQuantity;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <AppHeader />
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-8">
        <AppHeader />
        <div className="bg-white/5 rounded-xl border border-red-500/30 p-6 text-red-300">
          Failed to load finished stock dashboard data.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <AppHeader />
      <div>
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-400 mt-2">
          Manage finished warehouse stock and outgoing deliveries.
        </p>
        <Link
          to="/requests/new"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm mt-4"
        >
          Create Request
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          {
            label: "Total Items",
            value: totalItems,
            icon: Box,
            color: "text-green-400",
            bg: "bg-green-500/10",
          },
          {
            label: "Total Quantity",
            value: totalQuantity,
            icon: Boxes,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10",
          },
          {
            label: "Reserved",
            value: reservedQuantity,
            icon: Clock,
            color: "text-yellow-400",
            bg: "bg-yellow-500/10",
          },
          {
            label: "Available",
            value: availableQuantity,
            icon: CheckCircle2,
            color: "text-cyan-400",
            bg: "bg-cyan-500/10",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-white/5 rounded-xl border border-white/10 p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-400">{s.label}</span>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{s.value}</p>
          </div>
        ))}
      </div>

      <AssignedOrdersPanel />

      <div className="bg-white/5 rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Recent Stock Items
        </h3>
        <div className="space-y-3">
          {rows.slice(0, 5).map((item, idx) => (
            <div
              key={item.id ?? idx}
              className="p-3 bg-white/5 rounded-lg border border-white/10 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-white">
                  {item.product?.name}
                </p>
                <p className="text-xs text-gray-400">
                  {item.location?.name}
                </p>
              </div>
              <p className="text-sm font-semibold text-green-400">
                {item.quantity?.toLocaleString()} units
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DefaultDashboard = () => {
  const { user } = useAuthStore();

  return (
    <div className="space-y-8">
      <AppHeader />
      <div>
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-gray-400 mt-2">
          Unknown role:{" "}
          <span className="text-yellow-400">{String(user?.role ?? "N/A")}</span>
        </p>
      </div>

      <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-12 text-center">
        <Package className="w-24 h-24 text-gray-600 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-white mb-4">
          Dashboard Not Available
        </h2>
        <p className="text-gray-400">
          Please contact your administrator for access.
        </p>
      </div>
    </div>
  );
};
