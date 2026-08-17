// src/pages/Security.jsx
// Security & Audit log viewer.

import { useState, useEffect, useMemo } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { listAuditLogs, auditLog } from "../services/auditService";
import { toDisplay } from "../utils/dates";
import "../components/Modal.css";
import "./Security.css";

function timeOf(ts) {
  if (!ts || typeof ts.toDate !== "function") return "";
  const d = ts.toDate();
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function Security() {
  const { user, profile } = useAuth();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState("all");

  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ action: "", module: "", details: "" });
  const [saving, setSaving] = useState(false);

  const actor = profile?.displayName || user?.email || "unknown";

  async function load() {
    setLoading(true);
    setError("");
    try {
      setLogs(await listAuditLogs());
    } catch (err) {
      console.error(err);
      setError("Could not load audit logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const modules = useMemo(() => {
    const set = new Set(logs.map((l) => l.module).filter(Boolean));
    return Array.from(set).sort();
  }, [logs]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (moduleFilter !== "all" && l.module !== moduleFilter) return false;
      if (!term) return true;
      return [l.action, l.module, l.user, l.details]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [logs, search, moduleFilter]);

  async function handleAdd() {
    if (!addForm.action.trim()) return;
    setSaving(true);
    try {
      await auditLog({
        action: addForm.action,
        module: addForm.module || "Manual",
        user: actor,
        details: addForm.details,
      });
      setShowAdd(false);
      setAddForm({ action: "", module: "", details: "" });
      await load();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppLayout>
      <div className="sec-head">
        <div className="page-title">Security & Audit</div>
        <button className="sec-new-btn" onClick={() => setShowAdd(true)}>Log Activity</button>
      </div>

      <div className="sec-controls">
        <input className="sec-search" placeholder="Search audit log…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="sec-filter" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
          <option value="all">All Modules</option>
          {modules.map((m) => (<option key={m} value={m}>{m}</option>))}
        </select>
      </div>

      {loading && <div className="sec-status">Loading audit log…</div>}
      {error && <div className="sec-status sec-error">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="sec-empty">
          {logs.length === 0 ? "No audit activity recorded yet." : "No entries match your search."}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="sec-table">
          <div className="sec-row sec-row-header">
            <div className="sec-cell sec-cell-action">Action</div>
            <div className="sec-cell sec-cell-module">Module</div>
            <div className="sec-cell sec-cell-user">User</div>
            <div className="sec-cell sec-cell-details">Details</div>
            <div className="sec-cell sec-cell-date">Date</div>
          </div>

          {filtered.map((l) => (
            <div className="sec-row" key={l.id}>
              <div className="sec-cell sec-cell-action">{l.action}</div>
              <div className="sec-cell sec-cell-module">
                <span className="sec-module-tag">{l.module}</span>
              </div>
              <div className="sec-cell sec-cell-user">{l.user}</div>
              <div className="sec-cell sec-cell-details">{l.details || "—"}</div>
              <div className="sec-cell sec-cell-date">
                {toDisplay(l.timestamp)} {timeOf(l.timestamp)}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <div className="modal-overlay" onClick={() => !saving && setShowAdd(false)}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Log Activity</div>
            <div className="form-field">
              <label className="form-label">Action</label>
              <input className="form-input" value={addForm.action} onChange={(e) => setAddForm((f) => ({ ...f, action: e.target.value }))} disabled={saving} autoFocus />
            </div>
            <div className="form-field">
              <label className="form-label">Module</label>
              <input className="form-input" value={addForm.module} onChange={(e) => setAddForm((f) => ({ ...f, module: e.target.value }))} disabled={saving} placeholder="e.g. Projects" />
            </div>
            <div className="form-field">
              <label className="form-label">Details</label>
              <textarea className="form-input form-textarea" value={addForm.details} onChange={(e) => setAddForm((f) => ({ ...f, details: e.target.value }))} disabled={saving} rows={2} />
            </div>
            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={() => setShowAdd(false)} disabled={saving}>Cancel</button>
              <button className="modal-btn-primary" onClick={handleAdd} disabled={saving}>{saving ? "Saving…" : "Log Activity"}</button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default Security;