import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  UserPlus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Users,
  Mail,
  MapPin,
  X,
} from "lucide-react";
import { useUsers } from "../hooks/useUsers";
import { useAuthStore } from "../store/authStore";
import { locationsService } from "../api/services/locations.service";
import { format } from "date-fns";
import type { User, Location } from "../types/api.types";

const ROLES = {
  MANAGER: "Manager",
  RAW_STOCK_MANAGER: "Raw Stock Manager",
  PRODUCTION_CLIENT: "Production Client",
  FINISHED_STOCK_MANAGER: "Finished Stock Manager",
  DISTRIBUTOR: "Distributor",
  TRANSPORT_PROVIDER: "Transport Provider",
};

type RoleKey = keyof typeof ROLES;

const asArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];
  const v = value as any;
  if (Array.isArray(v.data)) return v.data;
  if (Array.isArray(v.items)) return v.items;
  if (Array.isArray(v.locations)) return v.locations;
  if (v.data && Array.isArray(v.data.items)) return v.data.items;
  if (v.data && Array.isArray(v.data.locations)) return v.data.locations;
  return [];
};

export const UserManagementPage = () => {
  const { user: currentUser } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "RAW_STOCK_MANAGER",
    locationId: "",
  });

  const { data: locationsRaw, isLoading: locationsLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: () => locationsService.getLocations(),
  });

  const locations = asArray<Location>(locationsRaw);

  const {
    users,
    meta,
    isLoading,
    isError,
    createUserMutation,
    updateUserMutation,
    deleteUserMutation,
    activateUserMutation,
    deactivateUserMutation,
  } = useUsers(currentPage, 20, roleFilter !== "ALL" ? roleFilter : undefined);

  if (currentUser?.role !== "MANAGER") {
    return (
      <div className="space-y-6">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">Access denied</h2>
            <p className="text-red-300 text-sm">
              Only managers can access this page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && u.isActive) ||
        (statusFilter === "INACTIVE" && !u.isActive);

      return matchesSearch && matchesStatus;
    });
  }, [users, searchTerm, statusFilter]);

  const handleOpenModal = (user?: User) => {
    setFormError("");

    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        password: "",
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        locationId: user.locationId || "",
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        role: "RAW_STOCK_MANAGER",
        locationId: "",
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
    setFormError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const roleNeedsLocation =
      formData.role !== "MANAGER" && formData.role !== "TRANSPORT_PROVIDER";

    if (roleNeedsLocation && !formData.locationId) {
      setFormError(
        `Users with role ${ROLES[formData.role as RoleKey] || formData.role} must have a location assigned.`,
      );
      return;
    }

    if (!roleNeedsLocation && formData.locationId) {
      setFormError(
        `${formData.role} users should not have a location assigned.`,
      );
      return;
    }

    if (editingUser) {
      updateUserMutation.mutate(
        {
          id: editingUser.id,
          data: {
            firstName: formData.firstName,
            lastName: formData.lastName,
            role: formData.role,
            ...(roleNeedsLocation
              ? { locationId: formData.locationId || null }
              : {}),
          },
        },
        { onSuccess: handleCloseModal },
      );
    } else {
      if (!formData.password) {
        setFormError("Password is required for new users.");
        return;
      }

      const userData: any = {
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
      };

      if (roleNeedsLocation) {
        userData.locationId = formData.locationId || null;
      }

      createUserMutation.mutate(userData, { onSuccess: handleCloseModal });
    }
  };

  const handleDelete = (userId: string) => {
    if (window.confirm("Delete this user permanently?")) {
      deleteUserMutation.mutate(userId);
    }
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      MANAGER: "bg-red-500/20 text-red-300 border-red-500/30",
      RAW_STOCK_MANAGER:
        "bg-purple-500/20 text-purple-300 border-purple-500/30",
      PRODUCTION_CLIENT: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      FINISHED_STOCK_MANAGER: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
      DISTRIBUTOR: "bg-green-500/20 text-green-300 border-green-500/30",
      TRANSPORT_PROVIDER:
        "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
    };
    return colors[role] || "bg-gray-500/20 text-gray-300 border-gray-500/30";
  };

  const isSaving = createUserMutation.isPending || updateUserMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">
            User Management
          </h1>
          <p className="text-gray-400">Create, edit and manage system users</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/40 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white appearance-none outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Roles</option>
              {Object.entries(ROLES).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white appearance-none outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
          </div>
        ) : isError ? (
          <div className="p-6 flex items-center gap-3 text-red-300">
            <AlertCircle className="w-5 h-5" />
            Failed to load users.
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-14 h-14 text-gray-600 mx-auto mb-3" />
            <p className="text-white font-medium mb-1">No users found</p>
            <p className="text-gray-400 text-sm">
              Try changing filters or create a new user.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/10 border-b border-white/10">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                      Name
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                      Email
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                      Role
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                      Location
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                      Status
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                      Joined
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-300 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      className="border-b border-white/10 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <p className="text-white font-medium">
                          {u.firstName} {u.lastName}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-gray-300 text-sm">
                          <Mail className="w-4 h-4 text-gray-500" />
                          {u.email}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs border ${getRoleColor(u.role)}`}
                        >
                          {ROLES[u.role as RoleKey] || u.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {u.location ? (
                          <div className="flex items-center gap-2 text-sm text-gray-300">
                            <MapPin className="w-4 h-4 text-cyan-400" />
                            <span>{u.location.name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-sm">-</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 text-green-400 text-sm">
                            <CheckCircle className="w-4 h-4" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-400 text-sm">
                            <XCircle className="w-4 h-4" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-400 text-sm">
                        {format(new Date(u.createdAt), "MMM dd, yyyy")}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenModal(u)}
                            className="p-2 rounded-lg hover:bg-white/10"
                            title="Edit user"
                          >
                            <Edit2 className="w-4 h-4 text-blue-400" />
                          </button>

                          {u.isActive ? (
                            <button
                              onClick={() =>
                                deactivateUserMutation.mutate(u.id)
                              }
                              className="p-2 rounded-lg hover:bg-white/10"
                              title="Deactivate user"
                            >
                              <XCircle className="w-4 h-4 text-yellow-400" />
                            </button>
                          ) : (
                            <button
                              onClick={() => activateUserMutation.mutate(u.id)}
                              className="p-2 rounded-lg hover:bg-white/10"
                              title="Activate user"
                            >
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            </button>
                          )}

                          <button
                            onClick={() => handleDelete(u.id)}
                            className="p-2 rounded-lg hover:bg-white/10"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {meta && meta.pages > 1 && (
              <div className="border-t border-white/10 px-5 py-4 flex items-center justify-between">
                <p className="text-sm text-gray-400">
                  Page {meta.page} of {meta.pages} • {meta.total} users
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1.5 rounded-lg border border-white/10 text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setCurrentPage((p) => Math.min(meta.pages, p + 1))
                    }
                    disabled={currentPage === meta.pages}
                    className="px-3 py-1.5 rounded-lg border border-white/10 text-white hover:bg-white/10 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">
                {editingUser ? "Edit User" : "Create User"}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-white/10 rounded-lg"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              {formError && (
                <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, email: e.target.value }))
                  }
                  disabled={!!editingUser}
                  required
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white disabled:opacity-50"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm text-gray-300 mb-1">
                    Password *
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    required
                    value={formData.password}
                    onChange={(e) =>
                      setFormData((f) => ({ ...f, password: e.target.value }))
                    }
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, firstName: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData((f) => ({ ...f, lastName: e.target.value }))
                  }
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-1">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => {
                    const role = e.target.value;
                    setFormData((f) => ({
                      ...f,
                      role,
                      locationId:
                        role === "MANAGER" || role === "TRANSPORT_PROVIDER"
                          ? ""
                          : f.locationId,
                    }));
                  }}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                >
                  {Object.entries(ROLES).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              {formData.role !== "MANAGER" &&
                formData.role !== "TRANSPORT_PROVIDER" && (
                  <div>
                    <label className="block text-sm text-gray-300 mb-1">
                      Location *
                    </label>
                    {locationsLoading ? (
                      <div className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-gray-400 flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading locations...
                      </div>
                    ) : (
                      <select
                        required
                        value={formData.locationId}
                        onChange={(e) =>
                          setFormData((f) => ({
                            ...f,
                            locationId: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                      >
                        <option value="">Select a location</option>
                        {locations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name} ({location.locationType})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

              <div className="pt-2 flex gap-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 text-white disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingUser ? "Update User" : "Create User"}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-white hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
