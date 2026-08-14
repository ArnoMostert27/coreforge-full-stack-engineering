// src/App.jsx
// Implemented through Phase 5. Calendar, Search, Notifications are routed
// but intentionally not in the locked nav (reached by URL / in-app links).

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import ComingSoon from "./components/ComingSoon";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import Tasks from "./pages/Tasks";
import Kanban from "./pages/Kanban";
import Milestones from "./pages/Milestones";
import Team from "./pages/Team";
import Clients from "./pages/Clients";
import Contracts from "./pages/Contracts";
import Invoices from "./pages/Invoices";
import Payments from "./pages/Payments";
import Deployments from "./pages/Deployments";
import Meetings from "./pages/Meetings";
import Documentation from "./pages/Documentation";
import Decisions from "./pages/Decisions";
import Announcements from "./pages/Announcements";
import Calendar from "./pages/Calendar";
import Search from "./pages/Search";
import Notifications from "./pages/Notifications";
import { NAV_SECTIONS } from "./navigation";

const IMPLEMENTED = {
  "/dashboard": Dashboard,
  "/projects": Projects,
  "/tasks": Tasks,
  "/kanban": Kanban,
  "/milestones": Milestones,
  "/team": Team,
  "/clients": Clients,
  "/contracts": Contracts,
  "/invoices": Invoices,
  "/payments": Payments,
  "/deployments": Deployments,
  "/meetings": Meetings,
  "/documentation": Documentation,
  "/decisions": Decisions,
  "/announcements": Announcements,
};

const comingSoonRoutes = NAV_SECTIONS.flatMap((group) =>
  group.items.map((item) => item.to).filter((to) => !IMPLEMENTED[to])
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />

        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
        <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
        <Route path="/kanban" element={<ProtectedRoute><Kanban /></ProtectedRoute>} />
        <Route path="/milestones" element={<ProtectedRoute><Milestones /></ProtectedRoute>} />
        <Route path="/team" element={<ProtectedRoute><Team /></ProtectedRoute>} />
        <Route path="/clients" element={<ProtectedRoute><Clients /></ProtectedRoute>} />
        <Route path="/contracts" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
        <Route path="/deployments" element={<ProtectedRoute><Deployments /></ProtectedRoute>} />
        <Route path="/meetings" element={<ProtectedRoute><Meetings /></ProtectedRoute>} />
        <Route path="/documentation" element={<ProtectedRoute><Documentation /></ProtectedRoute>} />
        <Route path="/decisions" element={<ProtectedRoute><Decisions /></ProtectedRoute>} />
        <Route path="/announcements" element={<ProtectedRoute><Announcements /></ProtectedRoute>} />

        {/* Aggregators — routed but not in the locked nav. */}
        <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

        {comingSoonRoutes.map((path) => (
          <Route
            key={path}
            path={path}
            element={
              <ProtectedRoute>
                <AppLayout>
                  <ComingSoon />
                </AppLayout>
              </ProtectedRoute>
            }
          />
        ))}

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;