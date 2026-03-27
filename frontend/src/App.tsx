import { Routes, Route, Navigate } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { ProductsPage } from "./pages/ProductsPage";
import { MainLayout } from "./components/layout/MainLayout";
import { OrderDetailsPage } from "./pages/OrderDetailsPage";
import { OrdersPage } from "./pages/OrdersPage";
import { OrderCreationPage } from "./pages/OrderCreationPage";
import { ProfilePage } from "./pages/ProfilePage";
import { DashboardPage } from "./pages/DashboardPage";
import { OrderManagementPage } from "./pages/OrderManagementPage";
import { OrderDetailManagementPage } from "./pages/OrderDetailManagementPage";
import { ProductManagementPage } from "./pages/ProductManagementPage";
import { StockManagementPage } from "./pages/StockManagementPage";
import { TransportManagementPage } from "./pages/TransportManagementPage";
import { LocationsManagementPage } from "./pages/LocationsManagementPage";
import { UserManagementPage } from "./pages/UserManagementpage";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { useAuthStore } from "./store/authStore";
import { ManagerAnalyticsPage } from "./pages/ManagerAnalyticsPage";

import { useEffect } from "react";

function App() {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/products" element={<ProductsPage />} />
      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        }
      />

      {/* Protected standalone routes */}
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders/create"
        element={
          <ProtectedRoute>
            <OrderCreationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/requests/new"
        element={
          <ProtectedRoute>
            <OrderCreationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders/:orderId"
        element={
          <ProtectedRoute>
            <OrderDetailsPage />
          </ProtectedRoute>
        }
      />

      {/* Public order listing (keep if intended) */}
      <Route path="/orders" element={<OrdersPage />} />

      {/* Protected Routes with Sidebar */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/orders-management" element={<OrderManagementPage />} />
        <Route
          path="/orders-management/:orderId"
          element={<OrderDetailManagementPage />}
        />
        <Route
          path="/orders-management/:orderId/edit"
          element={<OrderDetailManagementPage />}
        />
        <Route
          path="/products-management"
          element={<ProductManagementPage />}
        />
        <Route path="/stock" element={<StockManagementPage />} />
        <Route path="/transport" element={<TransportManagementPage />} />
        <Route path="/locations" element={<LocationsManagementPage />} />
        <Route path="/users" element={<UserManagementPage />} />
        <Route path="/analytics" element={<ManagerAnalyticsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
