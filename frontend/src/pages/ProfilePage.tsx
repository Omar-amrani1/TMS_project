import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  User,
  Mail,
  Briefcase,
  Calendar,
  Shield,
  ArrowLeft,
  Key,
  Loader2,
  Edit3,
  X,
} from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { AppHeader } from "../components/layout/AppHeader";
import { useQuery } from "@tanstack/react-query";
import { ordersService } from "../api/services/orders.service";
import { useAuth } from "../hooks/useAuth";

type OrderLike = {
  id: string;
  transportTotal?: number;
};

const asArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (!value || typeof value !== "object") return [];
  const v = value as any;
  if (Array.isArray(v.data)) return v.data;
  if (Array.isArray(v.items)) return v.items;
  if (Array.isArray(v.orders)) return v.orders;
  if (v.data && Array.isArray(v.data.items)) return v.data.items;
  if (v.data && Array.isArray(v.data.orders)) return v.data.orders;
  return [];
};

export const ProfilePage = () => {
  const {
    user: storeUser,
    profile,
    updateProfile,
    isUpdatingProfile,
    changePassword,
    isChangingPassword,
  } = useAuth();

  const user = profile ?? storeUser;

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (user) {
      setEditForm({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
      });
    }
  }, [user]);

  const { data: ordersRaw, isLoading: ordersLoading } = useQuery({
    queryKey: ["user-orders", user?.id],
    queryFn: () => ordersService.getOrders({ userId: user?.id }),
    enabled: !!user?.id,
  });

  const orders = asArray<OrderLike>(ordersRaw);

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <User className="w-24 h-24 text-gray-600 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">
            Please log in to view your profile
          </h2>
          <Link
            to="/login"
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-200 font-medium inline-block"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const initials =
    `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();

  const roleDisplay = user.role
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");

  const formatDate = (dateString: string | undefined, formatStr: string) => {
    if (!dateString) return "N/A";
    try {
      const date = parseISO(dateString);
      return isValid(date) ? format(date, formatStr) : "N/A";
    } catch {
      return "N/A";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "MANAGER":
        return "from-purple-600 to-pink-600";
      case "RAW_STOCK_MANAGER":
        return "from-yellow-600 to-orange-600";
      case "PRODUCTION_CLIENT":
        return "from-green-600 to-emerald-600";
      case "DISTRIBUTOR":
        return "from-blue-600 to-cyan-600";
      case "TRANSPORT_PROVIDER":
        return "from-red-600 to-rose-600";
      default:
        return "from-gray-600 to-gray-700";
    }
  };

  const totalOrdersValue = orders.reduce(
    (sum, order) => sum + Number(order.transportTotal || 0),
    0,
  );

  const handleSaveProfile = () => {
    setLocalError("");
    const payload = {
      firstName: editForm.firstName.trim(),
      lastName: editForm.lastName.trim(),
      email: editForm.email.trim(),
    };

    if (!payload.firstName || !payload.lastName || !payload.email) {
      setLocalError("First name, last name, and email are required.");
      return;
    }

    updateProfile(payload, {
      onSuccess: () => {
        setIsEditOpen(false);
      },
      onError: (error: any) => {
        setLocalError(
          error?.response?.data?.message ||
            error?.message ||
            "Failed to update profile",
        );
      },
    });
  };

  const handleChangePassword = () => {
    setLocalError("");

    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setLocalError("Current and new password are required.");
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setLocalError("New password must be at least 6 characters.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setLocalError("New password and confirm password do not match.");
      return;
    }

    changePassword(
      {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      },
      {
        onSuccess: () => {
          setIsPasswordOpen(false);
          setPasswordForm({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          });
        },
        onError: (error: any) => {
          setLocalError(
            error?.response?.data?.message ||
              error?.message ||
              "Failed to change password",
          );
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-black">
      <AppHeader />

      <section className="bg-gradient-to-b from-gray-900 to-black py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-gray-400 hover:text-cyan-400 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>

          <div className="flex items-center gap-6 mb-8">
            <div
              className={`w-24 h-24 rounded-full bg-gradient-to-br ${getRoleColor(
                user.role,
              )} flex items-center justify-center text-white font-bold text-3xl shadow-lg`}
            >
              {initials}
            </div>

            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {user.firstName} {user.lastName}
              </h1>
              <p className="text-xl text-gray-400">{user.email}</p>
              <div className="mt-3">
                <span
                  className={`inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${getRoleColor(
                    user.role,
                  )} text-white rounded-lg font-medium shadow-lg`}
                >
                  <Shield className="w-4 h-4" />
                  {roleDisplay}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {localError && (
            <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm">
              {localError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3 mb-6">
                  <User className="w-6 h-6 text-cyan-400" />
                  Account Information
                </h2>

                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
                    <User className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-400 mb-1">Full Name</p>
                      <p className="text-white font-medium">
                        {user.firstName} {user.lastName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
                    <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-400 mb-1">
                        Email Address
                      </p>
                      <p className="text-white font-medium">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
                    <Briefcase className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-400 mb-1">Role</p>
                      <p className="text-white font-medium">{roleDisplay}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
                    <Shield className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-400 mb-1">
                        Account Status
                      </p>
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            user.isActive !== false
                              ? "bg-green-400"
                              : "bg-red-400"
                          }`}
                        />
                        <p className="text-white font-medium">
                          {user.isActive !== false ? "Active" : "Inactive"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {user.createdAt && (
                    <div className="flex items-start gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
                      <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-400 mb-1">
                          Member Since
                        </p>
                        <p className="text-white font-medium">
                          {formatDate(user.createdAt, "MMMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <Shield className="w-6 h-6 text-cyan-400" />
                  Role Permissions
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getRolePermissions(user.role).map((permission, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10"
                    >
                      <div className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span className="text-gray-300 text-sm">
                        {permission}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                <h2 className="text-xl font-bold text-white mb-4">
                  Quick Actions
                </h2>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setLocalError("");
                      setIsPasswordOpen(true);
                    }}
                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all duration-200 font-medium flex items-center justify-center gap-2"
                  >
                    <Key className="w-4 h-4" />
                    Change Password
                  </button>

                  <button
                    onClick={() => {
                      setLocalError("");
                      setIsEditOpen(true);
                    }}
                    className="w-full px-4 py-3 bg-white/5 text-white rounded-lg border border-white/10 hover:bg-white/10 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Profile
                  </button>

                  <Link
                    to="/dashboard"
                    className="w-full px-4 py-3 bg-white/5 text-white rounded-lg border border-white/10 hover:bg-white/10 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Package className="w-4 h-4" />
                    Go to Dashboard
                  </Link>

                  <Link
                    to="/products"
                    className="w-full px-4 py-3 bg-white/5 text-white rounded-lg border border-white/10 hover:bg-white/10 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <Package className="w-4 h-4" />
                    Browse Products
                  </Link>
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                <h2 className="text-xl font-bold text-white mb-4">
                  Account Stats
                </h2>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Total Orders</p>
                    {ordersLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                        <span className="text-gray-400 text-sm">
                          Loading...
                        </span>
                      </div>
                    ) : (
                      <div>
                        <p className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                          {orders.length}
                        </p>
                        {totalOrdersValue > 0 && (
                          <p className="text-xs text-gray-400 mt-1">
                            ${totalOrdersValue.toFixed(2)} total value
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-400 mb-1">Active Since</p>
                    <p className="text-lg font-semibold text-white">
                      {user.createdAt
                        ? formatDate(user.createdAt, "MMM yyyy")
                        : "Recently"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-400 mb-1">
                      Security Tip
                    </p>
                    <p className="text-xs text-blue-300">
                      Keep your account secure by using a strong password and
                      changing it regularly.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {isEditOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-bold">Edit Profile</h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="First Name"
                value={editForm.firstName}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, firstName: e.target.value }))
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              />
              <input
                type="text"
                placeholder="Last Name"
                value={editForm.lastName}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, lastName: e.target.value }))
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              />
              <input
                type="email"
                placeholder="Email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((s) => ({ ...s, email: e.target.value }))
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              />

              <button
                onClick={handleSaveProfile}
                disabled={isUpdatingProfile}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isUpdatingProfile && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {isPasswordOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-gray-900 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white text-lg font-bold">Change Password</h3>
              <button
                onClick={() => setIsPasswordOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="password"
                placeholder="Current Password"
                value={passwordForm.currentPassword}
                onChange={(e) =>
                  setPasswordForm((s) => ({
                    ...s,
                    currentPassword: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              />
              <input
                type="password"
                placeholder="New Password"
                value={passwordForm.newPassword}
                onChange={(e) =>
                  setPasswordForm((s) => ({
                    ...s,
                    newPassword: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              />
              <input
                type="password"
                placeholder="Confirm New Password"
                value={passwordForm.confirmPassword}
                onChange={(e) =>
                  setPasswordForm((s) => ({
                    ...s,
                    confirmPassword: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
              />

              <button
                onClick={handleChangePassword}
                disabled={isChangingPassword}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isChangingPassword && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Update Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function getRolePermissions(role: string): string[] {
  switch (role) {
    case "MANAGER":
      return [
        "Full system access",
        "View all orders",
        "Manage users",
        "Create locations",
        "View analytics",
        "Manage products",
      ];
    case "RAW_STOCK_MANAGER":
      return [
        "Manage raw material stock",
        "Update inventory levels",
        "View stock reports",
        "Receive shipments",
      ];
    case "PRODUCTION_CLIENT":
      return [
        "Order raw materials",
        "Create production batches",
        "View production status",
        "Manage recipes",
      ];
    case "DISTRIBUTOR":
      return [
        "Order finished products",
        "Track deliveries",
        "View product catalog",
        "Manage orders",
      ];
    case "TRANSPORT_PROVIDER":
      return [
        "Manage vehicles",
        "View transport jobs",
        "Update job status",
        "Track deliveries",
      ];
    default:
      return ["View profile", "Basic access"];
  }
}
