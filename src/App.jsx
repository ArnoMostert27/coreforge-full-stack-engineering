// src/App.jsx
// All V1 routes. Dashboard is implemented; every other module route
// renders the shared ComingSoon view inside the app shell.

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import ComingSoon from "./components/ComingSoon";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { NAV_SECTIONS } from "./navigation";

// Every non-ready nav item becomes a protected route rendering ComingSoon.
const comingSoonRoutes = NAV_SECTIONS.flatMap((group) =>
  group.items.filter((item) => !item.ready).map((item) => item.to)
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        <Route path="/login" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

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

        {/* Anything unknown falls back to the dashboard. */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;