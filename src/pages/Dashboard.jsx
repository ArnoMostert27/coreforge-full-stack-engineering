// src/pages/Dashboard.jsx

import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-topbar">
        <div className="dashboard-brand">
          <span className="dashboard-brand-mark">CF</span>
          <span className="dashboard-brand-name">CoreForge</span>
        </div>

        <div className="dashboard-user">
          <span className="dashboard-user-email">{user?.email}</span>
          <button className="dashboard-logout" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </header>

      <main className="dashboard-body">
        <div className="dashboard-title">Dashboard</div>
        <p className="dashboard-placeholder">
          Operational command center — built in Phase 2.
        </p>
      </main>
    </div>
  );
}

export default Dashboard;