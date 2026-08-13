// src/components/AppLayout.jsx
// Persistent application shell: collapsible navigation rail + top bar + content.

import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { PanelLeftClose, PanelLeftOpen, LogOut } from "lucide-react";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { NAV_SECTIONS } from "../navigation";
import "./AppLayout.css";

function AppLayout({ children }) {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login", { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className={"shell" + (collapsed ? " is-collapsed" : "")}>
      <aside className="shell-rail">
        <div className="shell-rail-head">
          <span className="shell-rail-brand">CF</span>
          <button
            className="shell-rail-toggle"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? (
              <PanelLeftOpen size={16} strokeWidth={1.75} />
            ) : (
              <PanelLeftClose size={16} strokeWidth={1.75} />
            )}
          </button>
        </div>

        <nav className="shell-nav">
          {NAV_SECTIONS.map((group) => (
            <div className="shell-nav-group" key={group.section}>
              <div className="shell-nav-section">{group.section}</div>

              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      "shell-nav-item" + (isActive ? " is-active" : "")
                    }
                    title={item.label}
                  >
                    <span className="shell-nav-icon">
                      <Icon size={18} strokeWidth={1.75} />
                    </span>
                    <span className="shell-nav-label">{item.label}</span>
                    {!item.ready && (
                      <span className="shell-nav-dot" title="Coming soon" />
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <div className="shell-main">
        <header className="shell-topbar">
          <div className="shell-topbar-title">CoreForge</div>

          <div className="shell-topbar-user">
            <span className="shell-user-email">{user?.email}</span>
            {profile?.role && (
              <span className="shell-user-role">{profile.role}</span>
            )}
            <button className="shell-logout" onClick={handleLogout}>
              <LogOut size={14} strokeWidth={1.75} />
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        <main className="shell-content">{children}</main>
      </div>
    </div>
  );
}

export default AppLayout;