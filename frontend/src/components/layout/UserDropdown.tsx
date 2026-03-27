import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
  Package,
  ShoppingCart,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";

export const UserDropdown = () => {
  const { user, clearAuth } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    clearAuth();
    setIsOpen(false);
  };

  if (!user) return null;

  // Get user initials
  const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

  // Format role for display
  const roleDisplay = user.role
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-3 py-2 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
      >
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center text-white font-semibold text-sm">
          {initials}
        </div>

        {/* User Info - Hidden on mobile */}
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-white leading-none mb-1">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-gray-400 leading-none">{roleDisplay}</p>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-900 backdrop-blur-xl rounded-lg border border-white/10 shadow-2xl shadow-black/50 overflow-hidden z-50">
          {/* User Info Header */}
          <div className="px-4 py-3 bg-white/5 border-b border-white/10">
            <p className="text-sm font-semibold text-white">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs text-gray-400">{user.email}</p>
            <div className="mt-2">
              <span className="inline-block px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                {roleDisplay}
              </span>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <User className="w-4 h-4" />
              <span className="text-sm">My Profile</span>
            </Link>

            <Link
              to="/orders"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Package className="w-4 h-4" />
              <span className="text-sm">My Orders</span>
            </Link>

            <Link
              to="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-4 py-2 text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span className="text-sm">Dashboard</span>
            </Link>
          </div>

          {/* Logout */}
          <div className="border-t border-white/10 py-2">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors w-full"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">Log Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
