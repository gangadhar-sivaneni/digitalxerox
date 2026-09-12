import type { ReactNode } from "react";
import { HashRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { RequireStudent, RequireStaff, RequireAdmin } from "../guards/RequireRole";
import { AuthProvider } from "../../features/auth/AuthContext";
import { LandingPage } from "../../features/landing/LandingPage";
import { LoginPage } from "../../features/auth/LoginPage";
import { StudentShell } from "../../features/student/StudentShell";
import { DashboardPage } from "../../features/student/DashboardPage";
import { TrackPage } from "../../features/student/TrackPage";
import { HistoryPage } from "../../features/student/HistoryPage";
import { NotificationsPage } from "../../features/student/NotificationsPage";
import { ProfilePage } from "../../features/student/ProfilePage";
import { OrderFlowProvider } from "../../features/order/OrderFlowContext";
import { UploadPage } from "../../features/order/UploadPage";
import { ConfigurePage } from "../../features/order/ConfigurePage";
import { StationeryPage } from "../../features/order/StationeryPage";
import { ReviewPage } from "../../features/order/ReviewPage";
import { PaymentPage } from "../../features/order/PaymentPage";
import { SuccessPage } from "../../features/order/SuccessPage";
import { StaffShell } from "../../features/staff/StaffShell";
import { QueuePage } from "../../features/staff/QueuePage";
import { StaffOrderDetailPage } from "../../features/staff/StaffOrderDetailPage";
import { CompletedPage } from "../../features/staff/CompletedPage";
import { AdminShell } from "../../features/admin/AdminShell";
import { OverviewPage } from "../../features/admin/OverviewPage";
import { PricingPage } from "../../features/admin/PricingPage";
import { ProductsPage } from "../../features/admin/ProductsPage";
import { StaffPage } from "../../features/admin/StaffPage";
import { AuditPage } from "../../features/admin/AuditPage";
import { useAuth } from "../../features/auth/AuthContext";

/** Redirects authenticated visitors away from public pages to their role home. */
function PublicOnly({ children }: { children: ReactNode }) {
  const { authenticated, loading, homePath } = useAuth();
  if (loading) return null;
  if (authenticated) return <Navigate to={homePath} replace />;
  return <>{children}</>;
}

function StudentFlow() {
  return <Outlet />;
}

export function AppRouter() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<PublicOnly><LandingPage /></PublicOnly>} />
          <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />

          {/* Student */}
          <Route path="/student" element={<RequireStudent><StudentShell /></RequireStudent>}>
            <Route index element={<DashboardPage />} />
            <Route element={<RequireStudent><OrderFlowProvider><StudentFlow /></OrderFlowProvider></RequireStudent>}>
              <Route path="order" element={<UploadPage />} />
              <Route path="order/configure" element={<ConfigurePage />} />
              <Route path="order/stationery" element={<StationeryPage />} />
              <Route path="order/review" element={<ReviewPage />} />
              <Route path="order/pay" element={<PaymentPage />} />
              <Route path="order/success" element={<SuccessPage />} />
            </Route>
            <Route path="track" element={<TrackPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Staff */}
          <Route path="/staff" element={<RequireStaff><StaffShell /></RequireStaff>}>
            <Route index element={<QueuePage />} />
            <Route path="orders/:id" element={<StaffOrderDetailPage />} />
            <Route path="completed" element={<CompletedPage />} />
          </Route>

          {/* Admin */}
          <Route path="/admin" element={<RequireAdmin><AdminShell /></RequireAdmin>}>
            <Route index element={<OverviewPage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="audits" element={<AuditPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}