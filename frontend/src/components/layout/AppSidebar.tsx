import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { getRoleDisplayName } from "../../lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "../ui/sidebar";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Warehouse,
  Truck,
  Map,
  Factory,
  LogOut,
  Users,
  BarChart3,
} from "lucide-react";

export function AppSidebar() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    clearAuth();
    navigate("/login");
  };

  const navItems = [
    {
      label: "Dashboard",
      icon: LayoutDashboard,
      path: "/dashboard",
      roles: [
        "MANAGER",
        "RAW_STOCK_MANAGER",
        "PRODUCTION_CLIENT",
        "DISTRIBUTOR",
        "TRANSPORT_PROVIDER",
        "FINISHED_STOCK_MANAGER",
      ],
    },
    {
      label: "Orders",
      icon: ShoppingCart,
      path: "/orders-management",
      roles: ["MANAGER"],
    },
    {
      label: "Products",
      icon: Package,
      path: "/products-management",
      roles: ["MANAGER"],
    },
    {
      label: "Stock",
      icon: Warehouse,
      path: "/stock",
      roles: ["MANAGER", "RAW_STOCK_MANAGER", "PRODUCTION_CLIENT", "FINISHED_STOCK_MANAGER"],
    },

    {
      label: "Transport",
      icon: Truck,
      path: "/transport",
      roles: ["MANAGER", "TRANSPORT_PROVIDER"],
    },
    {
      label: "Locations",
      icon: Map,
      path: "/locations",
      roles: ["MANAGER"],
    },
    {
      label: "Users",
      icon: Users,
      path: "/users",
      roles: ["MANAGER"],
    },
    {
      label: "Job Analytics",
      icon: BarChart3,
      path: "/analytics",
      roles: ["MANAGER"],
    },
  ];

  const filteredNavItems = navItems.filter((item) =>
    item.roles.includes(user?.role || ""),
  );

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-sidebar-foreground">
            Smart TMS
          </h1>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => {
                const isActive =
                  location.pathname === item.path ||
                  location.pathname.startsWith(item.path + "/");

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={
                        isActive
                          ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:from-blue-700 hover:to-cyan-700"
                          : ""
                      }
                    >
                      <Link to={item.path}>
                        <item.icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex-shrink-0">
              <span className="text-sm font-bold text-white">
                {user?.firstName[0]}
                {user?.lastName[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {user?.role && getRoleDisplayName(user.role)}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-sm font-medium text-red-400 rounded-lg hover:bg-red-500/10 hover:text-red-300 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
