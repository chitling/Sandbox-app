import { Routes, Route, Navigate, useLocation } from "react-router";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/layout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { PropertiesPage } from "@/pages/properties/PropertiesPage";
import { PropertyFormPage } from "@/pages/properties/PropertyFormPage";
import { PropertyDetailPage } from "@/pages/properties/PropertyDetailPage";
import { AssetsPage } from "@/pages/assets/AssetsPage";
import { AssetFormPage } from "@/pages/assets/AssetFormPage";
import { AssetDetailPage } from "@/pages/assets/AssetDetailPage";
import { ServiceRecordsPage } from "@/pages/service-records/ServiceRecordsPage";
import { ServiceRecordFormPage } from "@/pages/service-records/ServiceRecordFormPage";
import { ServiceRecordDetailPage } from "@/pages/service-records/ServiceRecordDetailPage";
import { MaintenancePage } from "@/pages/maintenance/MaintenancePage";
import { MaintenanceFormPage } from "@/pages/maintenance/MaintenanceFormPage";
import { MaintenanceDetailPage } from "@/pages/maintenance/MaintenanceDetailPage";
import { ContractorsPage } from "@/pages/contractors/ContractorsPage";
import { ContractorFormPage } from "@/pages/contractors/ContractorFormPage";
import { ContractorDetailPage } from "@/pages/contractors/ContractorDetailPage";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />

      {/* Protected routes with layout */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                {/* Dashboard */}
                <Route index element={<DashboardPage />} />

                {/* Properties */}
                <Route path="properties" element={<PropertiesPage />} />
                <Route path="properties/new" element={<PropertyFormPage />} />
                <Route path="properties/:id" element={<PropertyDetailPage />} />
                <Route path="properties/:id/edit" element={<PropertyFormPage />} />

                {/* Assets */}
                <Route path="assets" element={<AssetsPage />} />
                <Route path="assets/new" element={<AssetFormPage />} />
                <Route path="assets/:id" element={<AssetDetailPage />} />
                <Route path="assets/:id/edit" element={<AssetFormPage />} />

                {/* Service Records */}
                <Route path="service-records" element={<ServiceRecordsPage />} />
                <Route path="service-records/new" element={<ServiceRecordFormPage />} />
                <Route path="service-records/:id" element={<ServiceRecordDetailPage />} />
                <Route path="service-records/:id/edit" element={<ServiceRecordFormPage />} />

                {/* Maintenance */}
                <Route path="maintenance" element={<MaintenancePage />} />
                <Route path="maintenance/new" element={<MaintenanceFormPage />} />
                <Route path="maintenance/:id" element={<MaintenanceDetailPage />} />
                <Route path="maintenance/:id/edit" element={<MaintenanceFormPage />} />

                {/* Contractors */}
                <Route path="contractors" element={<ContractorsPage />} />
                <Route path="contractors/new" element={<ContractorFormPage />} />
                <Route path="contractors/:id" element={<ContractorDetailPage />} />
                <Route path="contractors/:id/edit" element={<ContractorFormPage />} />

                {/* Catch-all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;
