// src/App.jsx
// All V1 routes. Dashboard and Projects are implemented; every other
// module route renders the shared ComingSoon view inside the app shell.

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import ComingSoon from "./components/ComingSoon";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import { NAV_SECTIONS } from "./navigation";

// Implemented modules get real components; everything else is ComingSoon.
const IMPLEMENTED = {
  "/dashboard": Dashboard,
  "/projects": Projects,
};

// Every nav route that isn't implemented renders ComingSoon.
const comingSoonRoutes = NAV_SECTIONS.flatMap((group) =>
  group.items
    .map((item) => item.to)
    .filter((to) => !IMPLEMENTED[to])
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

        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Projects />
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

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;