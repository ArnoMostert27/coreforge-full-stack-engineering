// src/pages/Team.jsx

import { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { listUsers } from "../services/userService";
import "./Team.css";

function initials(name, email) {
  const source = (name || email || "?").trim();
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function Team() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await listUsers();
        setMembers(data);
      } catch (err) {
        console.error(err);
        setError("Could not load team.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <AppLayout>
      <div className="team-head">
        <div className="page-title">Team</div>
        <span className="team-count">
          {members.length} {members.length === 1 ? "member" : "members"}
        </span>
      </div>

      {loading && <div className="team-status">Loading team…</div>}
      {error && <div className="team-status team-error">{error}</div>}

      {!loading && !error && members.length === 0 && (
        <div className="team-empty">No team members found.</div>
      )}

      {!loading && !error && members.length > 0 && (
        <div className="team-grid">
          {members.map((m) => {
            const isMe = user?.uid === m.id;
            return (
              <div className="team-card" key={m.id}>
                <div className="team-avatar">
                  {initials(m.displayName, m.email)}
                </div>
                <div className="team-info">
                  <div className="team-name">
                    {m.displayName || m.email?.split("@")[0] || "Unknown"}
                    {isMe && <span className="team-you">You</span>}
                  </div>
                  <div className="team-email">{m.email}</div>
                </div>
                {m.role && <span className="team-role">{m.role}</span>}
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}

export default Team;