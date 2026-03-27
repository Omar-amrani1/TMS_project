import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { reportsService } from "../api/services/reports.service";
import { transportService } from "../api/services/transport.service";
import {
  AlertCircle,
  Loader2,
  Search,
  Filter,
  BarChart3,
  Truck,
  Clock3,
  ShieldCheck,
  DollarSign,
  Star,
} from "lucide-react";

type Provider = { id: string; name: string };

const asArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];
  const v = value as any;
  if (Array.isArray(v.data)) return v.data;
  if (Array.isArray(v.providers)) return v.providers;
  if (v.data && Array.isArray(v.data.providers)) return v.data.providers;
  if (v.data && Array.isArray(v.data.items)) return v.data.items;
  return [];
};

export const ManagerAnalyticsPage = () => {
  const { user } = useAuthStore();
  const isManager = user?.role === "MANAGER";

  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [providerId, setProviderId] = useState("");

  const { data: providersRaw } = useQuery({
    queryKey: ["transportProviders"],
    queryFn: () => transportService.getTransportProviders(),
    enabled: isManager,
  });
  const providers = asArray<Provider>(providersRaw);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["manager-transport-analytics", startDate, endDate, providerId],
    queryFn: () =>
      reportsService.getTransportJobAnalytics({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        providerId: providerId || undefined,
      }),
    enabled: isManager,
  });

  const summary = data?.summary ?? {
    totalJobs: 0,
    ratedJobs: 0,
    totalCost: 0,
    onTimePercentage: 0,
    damageFreePercentage: 0,
  };

  const records = useMemo(() => {
    const rows = data?.records ?? [];
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();

    return rows.filter((r) => {
      const provider = r.provider?.name?.toLowerCase() || "";
      const orderNo = r.orderNumber?.toLowerCase() || "";
      const type = r.type?.toLowerCase() || "";
      const status = r.status?.toLowerCase() || "";
      return (
        provider.includes(q) ||
        orderNo.includes(q) ||
        type.includes(q) ||
        status.includes(q)
      );
    });
  }, [data?.records, searchQuery]);

  if (!isManager) {
    return (
      <div className="space-y-6">
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-red-500/30 p-6 text-red-300">
          Access denied. Manager role required.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Job Analytics</h1>
          <p className="text-gray-400">
            Transport performance across orders and deliveries
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all"
        >
          {isFetching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Refreshing...
            </>
          ) : (
            <>
              <BarChart3 className="w-4 h-4" />
              Refresh Analytics
            </>
          )}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={providerId}
              onChange={(e) => setProviderId(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none appearance-none"
            >
              <option value="">All Providers</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard
          label="Total Jobs"
          value={summary.totalJobs}
          icon={Truck}
          color="text-blue-400"
        />
        <StatCard
          label="Rated Jobs"
          value={summary.ratedJobs}
          icon={Star}
          color="text-yellow-400"
        />
        <StatCard
          label="Total Cost"
          value={`$${Number(summary.totalCost).toFixed(2)}`}
          icon={DollarSign}
          color="text-green-400"
        />
        <StatCard
          label="On-Time %"
          value={`${Number(summary.onTimePercentage).toFixed(1)}%`}
          icon={Clock3}
          color="text-orange-400"
        />
        <StatCard
          label="Damage-Free %"
          value={`${Number(summary.damageFreePercentage).toFixed(1)}%`}
          icon={ShieldCheck}
          color="text-cyan-400"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
          <Loader2 className="w-12 h-12 text-cyan-400 animate-spin" />
        </div>
      ) : isError ? (
        <div className="text-center py-16 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            Failed to load analytics
          </h2>
          <p className="text-gray-400">
            {(error as any)?.message || "Please try again later"}
          </p>
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-16 bg-white/5 backdrop-blur-xl rounded-xl border border-white/10">
          <BarChart3 className="w-20 h-20 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">
            No records found
          </h2>
          <p className="text-gray-400">Try adjusting filters or date range</p>
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 text-white font-semibold">
            Records ({records.length})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  {[
                    "Order #",
                    "Type",
                    "Status",
                    "Provider",
                    "Cost",
                    "On Time",
                    "Damage Free",
                    "Created",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-sm text-white">
                      {r.orderNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {r.type}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {r.status}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {r.provider?.name ?? "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-white">
                      ${Number(r.transportTotal || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {r.ratingOnTime == null
                        ? "-"
                        : r.ratingOnTime
                          ? "Yes"
                          : "No"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {r.ratingDamageFree == null
                        ? "-"
                        : r.ratingDamageFree
                          ? "Yes"
                          : "No"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleDateString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: any;
  color: string;
}) => (
  <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-gray-400">{label}</span>
      <Icon className={`w-5 h-5 ${color}`} />
    </div>
    <p className="text-2xl font-bold text-white">{value}</p>
  </div>
);
