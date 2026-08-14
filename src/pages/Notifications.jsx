// src/pages/Notifications.jsx
// Derived notification feed. Not in the locked nav — reached via /notifications.

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import {
  loadNotifications,
  dismissNotification,
} from "../services/notificationService";
import { toDisplay } from "../utils/dates";
import "./Notifications.css";

function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showRead, setShowRead] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setNotifs(await loadNotifications(user?.uid));
    } catch (err) {
      console.error(err);
      setError("Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleDismiss(notifId) {
    setNotifs((prev) =>
      prev.map((n) => (n.id === notifId ? { ...n, read: true } : n))
    );
    try {
      await dismissNotification(user?.uid, notifId);
    } catch (err) {
      console.error(err);
    }
  }

  const visible = notifs.filter((n) => (showRead ? true : !n.read));
  const unreadCount = notifs.filter((n) => !n.read).length;

  return (
    <AppLayout>
      <div className="ntf-head">
        <div className="page-title">Notifications</div>
        <div className="ntf-controls">
          <span className="ntf-count">{unreadCount} unread</span>
          <button className="ntf-toggle" onClick={() => setShowRead((s) => !s)}>
            {showRead ? "Hide dismissed" : "Show dismissed"}
          </button>
        </div>
      </div>

      {loading && <div className="ntf-status">Loading notifications…</div>}
      {error && <div className="ntf-status ntf-error">{error}</div>}

      {!loading && !error && visible.length === 0 && (
        <div className="ntf-empty">You're all caught up. No notifications.</div>
      )}

      {!loading && !error && visible.length > 0 && (
        <div className="ntf-list">
          {visible.map((n) => (
            <div className={"ntf-card type-" + n.type + (n.read ? " is-read" : "")} key={n.id}>
              <div className="ntf-card-main" onClick={() => navigate(n.link)}>
                <div className="ntf-card-top">
                  <span className="ntf-card-title">{n.title}</span>
                  {n.urgent && !n.read && <span className="ntf-urgent">Urgent</span>}
                </div>
                <div className="ntf-card-msg">{n.message}</div>
                {n.date && <div className="ntf-card-date">{toDisplay(n.date)}</div>}
              </div>
              {!n.read && (
                <button className="ntf-dismiss" onClick={() => handleDismiss(n.id)} title="Dismiss">
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

export default Notifications;