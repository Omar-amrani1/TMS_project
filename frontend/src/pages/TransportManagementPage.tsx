import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { transportService } from "../api/services/transport.service";
import {
  Truck,
  Plus,
  Search,
  Filter,
  Edit2,
  Package,
  MapPin,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Gauge,
  User,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import type {
  Vehicle,
  TransportJob,
  TransportProvider,
  VehicleStatus,
  TransportJobStatus,
  User as UserType,
} from "../types/api.types";
import { RouteMap } from "../components/map";

import { apiClient } from "../api/client";

type TabType = "jobs" | "vehicles" | "providers";

export const TransportManagementPage = () => {
  const [activeTab, setActiveTab] = useState<TabType>("jobs");
  const { user } = useAuthStore();

  // Build tabs based on user role
  const tabs = [
    { id: "jobs" as TabType, label: "Transport Jobs", icon: Truck },
    { id: "vehicles" as TabType, label: "Vehicles", icon: Package },
    // Only managers can see providers
    ...(user?.role === "MANAGER"
      ? [{ id: "providers" as TabType, label: "Providers", icon: User }]
      : []),
  ];

  // Reset to jobs tab if current tab is not allowed
  useEffect(() => {
    const isTabAllowed = tabs.some((tab) => tab.id === activeTab);
    if (!isTabAllowed && activeTab !== "jobs") {
      setActiveTab("jobs");
    }
  }, [user?.role, activeTab, tabs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Transport Management
          </h1>
          <p className="text-gray-400 mt-1">
            Manage transport operations, vehicles, and providers
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-all relative ${
              activeTab === tab.id
                ? "text-blue-400"
                : "text-gray-400 hover:text-gray-300"
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-600 to-cyan-600" />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === "jobs" && <TransportJobsTab />}
        {activeTab === "vehicles" && <VehiclesTab />}
        {activeTab === "providers" && user?.role === "MANAGER" && (
          <ProvidersTab />
        )}
      </div>
    </div>
  );
};

// Transport Jobs Tab
const TransportJobsTab = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TransportJobStatus | "ALL">(
    "ALL",
  );
  const [selectedJob, setSelectedJob] = useState<TransportJob | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["transportJobs"],
    queryFn: transportService.getJobs,
  });

  const updateJobStatusMutation = useMutation({
    mutationFn: ({
      jobId,
      status,
    }: {
      jobId: string;
      status: TransportJobStatus;
    }) => transportService.updateJobStatus(jobId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transportJobs"] });
      setIsStatusModalOpen(false);
      setSelectedJob(null);
    },
  });

  const filteredJobs =
    jobs?.filter((job) => {
      const matchesSearch =
        job.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.fromLocation.name
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        job.toLocation.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || job.status === statusFilter;

      return matchesSearch && matchesStatus;
    }) || [];

  const stats = [
    {
      label: "Total Jobs",
      value: jobs?.length || 0,
      icon: Truck,
      color: "blue",
    },
    {
      label: "Scheduled",
      value: jobs?.filter((j) => j.status === "SCHEDULED").length || 0,
      icon: Clock,
      color: "yellow",
    },
    {
      label: "In Progress",
      value: jobs?.filter((j) => j.status === "IN_PROGRESS").length || 0,
      icon: Package,
      color: "blue",
    },
    {
      label: "Completed",
      value: jobs?.filter((j) => j.status === "COMPLETED").length || 0,
      icon: CheckCircle2,
      color: "green",
    },
  ];

  const statusColors: Record<
    TransportJobStatus,
    { bg: string; text: string; border: string }
  > = {
    SCHEDULED: {
      bg: "bg-yellow-500/20",
      text: "text-yellow-400",
      border: "border-yellow-500/30",
    },
    IN_PROGRESS: {
      bg: "bg-blue-500/20",
      text: "text-blue-400",
      border: "border-blue-500/30",
    },
    COMPLETED: {
      bg: "bg-green-500/20",
      text: "text-green-400",
      border: "border-green-500/30",
    },
    CANCELLED: {
      bg: "bg-red-500/20",
      text: "text-red-400",
      border: "border-red-500/30",
    },
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const colors = {
            blue: "bg-blue-500/10 text-blue-400",
            yellow: "bg-yellow-500/10 text-yellow-400",
            green: "bg-green-500/10 text-green-400",
          }[stat.color];

          return (
            <div
              key={stat.label}
              className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6"
            >
              <div className={`p-3 rounded-lg ${colors} inline-block mb-4`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">
                {stat.value}
              </h3>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by job ID, provider, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as TransportJobStatus | "ALL")
            }
            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="ALL">All Status</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Jobs Table */}
      {filteredJobs.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-12 text-center">
          <Truck className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            No transport jobs found
          </h3>
          <p className="text-gray-400">
            {searchQuery || statusFilter !== "ALL"
              ? "Try adjusting your search or filters"
              : "Transport jobs will appear here once orders are created"}
          </p>
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Job ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Provider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Route
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Weight
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Distance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Cost
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Scheduled
                  </th>
                  {(user?.role === "MANAGER" ||
                    user?.role === "TRANSPORT_PROVIDER") && (
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredJobs.map((job) => (
                  <tr
                    key={job.id}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-white">
                        {job.id.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-300">
                        {job.provider.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-gray-300">
                          {job.fromLocation.name}
                        </div>
                        <div className="text-gray-600">→</div>
                        <div className="text-sm text-gray-300">
                          {job.toLocation.name}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-300">
                        {job.totalWeight} kg
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-300">
                        {job.distanceKm.toFixed(2)} km
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-white">
                        ${job.totalCost.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          statusColors[job.status].bg
                        } ${statusColors[job.status].text} border ${
                          statusColors[job.status].border
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(job.scheduledDate).toLocaleDateString()}
                    </td>
                    {(user?.role === "MANAGER" ||
                      user?.role === "TRANSPORT_PROVIDER") && (
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => {
                            setSelectedJob(job);
                            setIsStatusModalOpen(true);
                          }}
                          disabled={job.status === "COMPLETED"}
                          className="text-blue-400 hover:text-blue-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Update Status
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {isStatusModalOpen && selectedJob && (
        <UpdateJobStatusModal
          job={selectedJob}
          onClose={() => {
            setIsStatusModalOpen(false);
            setSelectedJob(null);
          }}
          onUpdate={(status) => {
            updateJobStatusMutation.mutate({ jobId: selectedJob.id, status });
          }}
          isLoading={updateJobStatusMutation.isPending}
        />
      )}
    </div>
  );
};

// Vehicles Tab
const VehiclesTab = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | "ALL">(
    "ALL",
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: vehicles, isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: transportService.getVehicles,
  });

  const createVehicleMutation = useMutation({
    mutationFn: transportService.createVehicle,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setIsAddModalOpen(false);
    },
  });

  const updateVehicleMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      transportService.updateVehicle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setSelectedVehicle(null);
    },
  });

  const filteredVehicles =
    vehicles?.filter((vehicle) => {
      const matchesSearch =
        vehicle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.licensePlate.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || vehicle.status === statusFilter;

      return matchesSearch && matchesStatus;
    }) || [];

  const stats = [
    {
      label: "Total Vehicles",
      value: vehicles?.length || 0,
      icon: Truck,
      color: "blue",
    },
    {
      label: "Available",
      value: vehicles?.filter((v) => v.status === "AVAILABLE").length || 0,
      icon: CheckCircle2,
      color: "green",
    },
    {
      label: "In Use",
      value: vehicles?.filter((v) => v.status === "IN_USE").length || 0,
      icon: Package,
      color: "blue",
    },
    {
      label: "Maintenance",
      value: vehicles?.filter((v) => v.status === "MAINTENANCE").length || 0,
      icon: AlertCircle,
      color: "yellow",
    },
  ];

  const statusColors: Record<
    VehicleStatus,
    { bg: string; text: string; border: string }
  > = {
    AVAILABLE: {
      bg: "bg-green-500/20",
      text: "text-green-400",
      border: "border-green-500/30",
    },
    IN_USE: {
      bg: "bg-blue-500/20",
      text: "text-blue-400",
      border: "border-blue-500/30",
    },
    MAINTENANCE: {
      bg: "bg-yellow-500/20",
      text: "text-yellow-400",
      border: "border-yellow-500/30",
    },
    INACTIVE: {
      bg: "bg-gray-500/20",
      text: "text-gray-400",
      border: "border-gray-500/30",
    },
  };

  const canManageVehicles =
    user?.role === "MANAGER" || user?.role === "TRANSPORT_PROVIDER";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const colors = {
            blue: "bg-blue-500/10 text-blue-400",
            yellow: "bg-yellow-500/10 text-yellow-400",
            green: "bg-green-500/10 text-green-400",
          }[stat.color];

          return (
            <div
              key={stat.label}
              className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6"
            >
              <div className={`p-3 rounded-lg ${colors} inline-block mb-4`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">
                {stat.value}
              </h3>
              <p className="text-sm text-gray-400">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or license plate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as VehicleStatus | "ALL")
            }
            className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="ALL">All Status</option>
            <option value="AVAILABLE">Available</option>
            <option value="IN_USE">In Use</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        {canManageVehicles && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium hover:from-blue-500 hover:to-cyan-500 transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Vehicle
          </button>
        )}
      </div>

      {/* Vehicles Grid */}
      {filteredVehicles.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-12 text-center">
          <Truck className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            No vehicles found
          </h3>
          <p className="text-gray-400">
            {searchQuery || statusFilter !== "ALL"
              ? "Try adjusting your search or filters"
              : "Add vehicles to start managing your fleet"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((vehicle) => (
            <div
              key={vehicle.id}
              className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:bg-white/10 hover:border-blue-500/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                {canManageVehicles && (
                  <button
                    onClick={() => setSelectedVehicle(vehicle)}
                    className="text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              <h3 className="text-lg font-semibold text-white mb-2">
                {vehicle.name}
              </h3>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Package className="w-4 h-4" />
                  <span>{vehicle.licensePlate}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Gauge className="w-4 h-4" />
                  <span>Capacity: {vehicle.capacityKg} kg</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <DollarSign className="w-4 h-4" />
                  <span>Cost: ${vehicle.costPerKm}/km</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <span
                  className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    statusColors[vehicle.status].bg
                  } ${statusColors[vehicle.status].text} border ${
                    statusColors[vehicle.status].border
                  }`}
                >
                  {vehicle.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Vehicle Modal */}
      {isAddModalOpen && (
        <VehicleFormModal
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={(data) => createVehicleMutation.mutate(data)}
          isLoading={createVehicleMutation.isPending}
        />
      )}

      {/* Edit Vehicle Modal */}
      {selectedVehicle && (
        <VehicleFormModal
          vehicle={selectedVehicle}
          onClose={() => setSelectedVehicle(null)}
          onSubmit={(data) =>
            updateVehicleMutation.mutate({ id: selectedVehicle.id, data })
          }
          isLoading={updateVehicleMutation.isPending}
        />
      )}
    </div>
  );
};

// Providers Tab
const ProvidersTab = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  const { data: providers, isLoading } = useQuery({
    queryKey: ["transportProviders"],
    queryFn: transportService.getProviders,
  });

  const createProviderMutation = useMutation({
    mutationFn: transportService.createProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transportProviders"] });
      setIsAddModalOpen(false);
    },
  });

  const filteredProviders =
    providers?.filter((provider) =>
      provider.name.toLowerCase().includes(searchQuery.toLowerCase()),
    ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Add */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search providers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
          />
        </div>

        {user?.role === "MANAGER" && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-500 hover:to-pink-500 transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Provider
          </button>
        )}
      </div>

      {/* Providers Grid */}
      {filteredProviders.length === 0 ? (
        <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-12 text-center">
          <User className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            No providers found
          </h3>
          <p className="text-gray-400">
            {searchQuery
              ? "Try adjusting your search"
              : "Add transport providers to get started"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProviders.map((provider) => (
            <div
              key={provider.id}
              className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 hover:bg-white/10 hover:border-purple-500/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    provider.isActive
                      ? "bg-green-500/20 text-green-400 border border-green-500/30"
                      : "bg-gray-500/20 text-gray-400 border border-gray-500/30"
                  }`}
                >
                  {provider.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <h3 className="text-lg font-semibold text-white mb-2">
                {provider.name}
              </h3>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <User className="w-4 h-4" />
                  <span>
                    {provider.user.firstName} {provider.user.lastName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Truck className="w-4 h-4" />
                  <span>{provider.vehicles.length} vehicles</span>
                </div>
              </div>

              <div className="text-xs text-gray-500">
                Member since {new Date(provider.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Provider Modal */}
      {isAddModalOpen && (
        <ProviderFormModal
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={(data) => createProviderMutation.mutate(data)}
          isLoading={createProviderMutation.isPending}
        />
      )}
    </div>
  );
};

// Update Job Status Modal
interface UpdateJobStatusModalProps {
  job: TransportJob;
  onClose: () => void;
  onUpdate: (status: TransportJobStatus) => void;
  isLoading: boolean;
}

const UpdateJobStatusModal = ({
  job,
  onClose,
  onUpdate,
  isLoading,
}: UpdateJobStatusModalProps) => {
  const [selectedStatus, setSelectedStatus] = useState<TransportJobStatus>(
    job.status,
  );

  const availableStatuses: TransportJobStatus[] = [
    "SCHEDULED",
    "IN_PROGRESS",
    "COMPLETED",
    "CANCELLED",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h3 className="text-xl font-semibold text-white">
            Update Job Status
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-gray-400 mb-2">Route Preview</p>
            <RouteMap
              from={job.fromLocation as any}
              to={job.toLocation as any}
              height={240}
            />
            <p className="text-sm text-gray-400 mb-2">Current Status</p>
            <p className="text-white font-medium">{job.status}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              New Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) =>
                setSelectedStatus(e.target.value as TransportJobStatus)
              }
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              {availableStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg font-medium hover:bg-white/10 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={() => onUpdate(selectedStatus)}
            disabled={isLoading || selectedStatus === job.status}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? "Updating..." : "Update Status"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Vehicle Form Modal
interface VehicleFormModalProps {
  vehicle?: Vehicle;
  onClose: () => void;
  onSubmit: (data: any) => void;
  isLoading: boolean;
}

const VehicleFormModal = ({
  vehicle,
  onClose,
  onSubmit,
  isLoading,
}: VehicleFormModalProps) => {
  const [formData, setFormData] = useState({
    providerId: vehicle?.providerId || "",
    name: vehicle?.name || "",
    licensePlate: vehicle?.licensePlate || "",
    capacityKg: vehicle?.capacityKg || 0,
    costPerKm: vehicle?.costPerKm || 0,
    status: vehicle?.status || "AVAILABLE",
  });

  const { data: providers } = useQuery({
    queryKey: ["transportProviders"],
    queryFn: transportService.getProviders,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h3 className="text-xl font-semibold text-white">
            {vehicle ? "Edit Vehicle" : "Add Vehicle"}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!vehicle && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Provider
              </label>
              <select
                value={formData.providerId}
                onChange={(e) =>
                  setFormData({ ...formData, providerId: e.target.value })
                }
                required
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="">Select Provider</option>
                {providers?.map((provider) => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Vehicle Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="e.g., Truck #1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              License Plate
            </label>
            <input
              type="text"
              value={formData.licensePlate}
              onChange={(e) =>
                setFormData({ ...formData, licensePlate: e.target.value })
              }
              required
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="e.g., ABC-1234"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Capacity (kg)
            </label>
            <input
              type="number"
              value={formData.capacityKg}
              onChange={(e) =>
                setFormData({ ...formData, capacityKg: Number(e.target.value) })
              }
              required
              min="0.01"
              step="0.01"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cost per KM ($)
            </label>
            <input
              type="number"
              value={formData.costPerKm}
              onChange={(e) =>
                setFormData({ ...formData, costPerKm: Number(e.target.value) })
              }
              required
              min="0"
              step="0.01"
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          {vehicle && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as VehicleStatus,
                  })
                }
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="AVAILABLE">Available</option>
                <option value="IN_USE">In Use</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg font-medium hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium hover:from-blue-500 hover:to-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? "Saving..." : vehicle ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Provider Form Modal
interface ProviderFormModalProps {
  onClose: () => void;
  onSubmit: (data: { name: string; userId: string }) => void;
  isLoading: boolean;
}

const ProviderFormModal = ({
  onClose,
  onSubmit,
  isLoading,
}: ProviderFormModalProps) => {
  const [formData, setFormData] = useState({
    name: "",
    userId: "",
  });

  const [users, setUsers] = useState<UserType[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fetch existing providers to check which users already have providers
  const { data: existingProviders } = useQuery({
    queryKey: ["transportProviders"],
    queryFn: transportService.getProviders,
  });

  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const response = await apiClient.get("/users");

        // Extract users from response - API returns { data: [...], meta: {...} }
        const allUsers: UserType[] = response.data?.data || [];

        // Get user IDs that already have providers
        const usersWithProviders = new Set(
          existingProviders?.map((p) => p.userId) || [],
        );

        // Filter to only TRANSPORT_PROVIDER role users who don't already have a provider
        const availableTransportUsers = allUsers.filter(
          (u: UserType) =>
            u.role === "TRANSPORT_PROVIDER" && !usersWithProviders.has(u.id),
        );

        setUsers(availableTransportUsers);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [existingProviders]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-gray-900 border border-white/10 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h3 className="text-xl font-semibold text-white">Add Provider</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Provider Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              placeholder="e.g., Fast Logistics Inc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              User (Transport Provider)
            </label>
            {loadingUsers ? (
              <div className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-gray-400">
                Loading users...
              </div>
            ) : users.length === 0 ? (
              <div className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  No available users to add a new provider. Please create a user
                  with TRANSPORT_PROVIDER role.
                </p>
              </div>
            ) : (
              <select
                value={formData.userId}
                onChange={(e) =>
                  setFormData({ ...formData, userId: e.target.value })
                }
                required
                className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="">Select User</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName} ({user.email})
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Only users with TRANSPORT_PROVIDER role without existing providers
              are shown
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg font-medium hover:bg-white/10 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || loadingUsers || users.length === 0}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? "Creating..." : "Create Provider"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
