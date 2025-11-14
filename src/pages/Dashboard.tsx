import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Header } from "../components/Header";
import { Sidebar } from "../components/Sidebar";

// Import custom icons
import { useAuth } from "@/context/AuthContext";
import { useEnv } from "@/context/EnvContext";
import { cn } from "@/lib/utils";
// import EventTable from "@/components/eventsTable/EventTable";
import Analytics from "@/components/analytics-dashboard/Analytics";
import SitesPage from "@/components/SiteConfiguration/SitesPage";
// import { SummaryPage } from "@/components/Summary/Summary";
import ManageConsumer from "@/components/manageConsumer/ManageConsumer";
import EventTablePage from "@/components/newEventTable/EventTablePage";
import MyProfile from "@/components/Profile/MyProfile";
import Settings from "@/components/settings/Settings";
import ConfigurationHistory from "@/components/SiteConfiguration/components/ConfigurationHistory/ConfigurationHistory";
import HawkVisionDashboard from "@/components/summaryDashboard/HawkVisionDashboard";
import Support from "@/components/Support/pages/Support";
import EventDetailsPage from "@/components/URLevent/EventDetailsPage";
import NotFoundPage from "./NotFoundPage";
import { TermsAndConditions } from "./TermsAndConditions";

export function Dashboard() {
  const { user } = useAuth();
  const { env } = useEnv();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return <Navigate to="/login" />;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-gray-100">
      <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <div
          className={cn(
            "relative flex flex-1 flex-col overflow-x-hidden overflow-y-auto bg-gray-100 p-2",
            // Environment-aware gradient background
            "before:pointer-events-none before:absolute before:inset-0 before:opacity-60",
            env === "virtual"
              ? "before:bg-gradient-to-br before:from-indigo-50/80 before:via-indigo-100/60 before:to-purple-50/70"
              : "before:bg-gradient-to-br before:from-teal-50/80 before:via-gray-50/60 before:to-blue-50/70",
          )}
        >
          {/* Content with higher z-index to appear above gradient */}
          <div className="relative z-10 ml-20">
            <Routes>
              <Route index element={<Navigate to="home" replace />} />
              <Route path="home" element={<HawkVisionDashboard />} />
              <Route path="configure/*" element={<SitesPage />} />
              <Route path="report/*" element={<EventTablePage />} />
              <Route path="analysis/*" element={<Analytics />} />
              <Route path="manage-consumer/*" element={<ManageConsumer />} />
              <Route path="support/*" element={<Support />} />
              <Route path="profile" element={<Settings />} />
              <Route path="terms-and-conditions" element={<TermsAndConditions />} />
              <Route path="*" element={<NotFoundPage />} />
              <Route path="config/history" element={<ConfigurationHistory />} />
              {/* <Route path="summary" element={<SummaryPage />} /> */}
              <Route path="settings" element={<MyProfile />} />
              <Route path="*" element={<NotFoundPage />} />
              <Route path="events/:eventId" element={<EventDetailsPage />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}
