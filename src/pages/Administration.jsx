// src/pages/Administration.jsx
// User Management + Roles overview.

import { useState, useEffect, useMemo } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import {
  listAllUsers,
  createUserRecord,
  updateUserRecord,
  deleteUserRecord,
} from "../services/adminUserService";
import { auditLog } from "../services/auditService";
import { ROLE_ACCESS } from "../permissions";
import { toDisplay } from "../utils/dates";
import "../components/Modal.css";
import "./Administration.css";

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "developer", label: "Developer" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "suspended", label: "Suspended" },
];

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  role: "developer",
  status: "active",
  notes: "",
};

function roleLabel(v) {
  return ROLE_OPTIONS.find((r) => r.value === v)?.label || v;
}
function statusLabel(v) {
  return STATUS_OPTIONS.find((s) => s.value === v)?.label || v;
}
function roleAccessSummary(role) {
  const access = ROLE_ACCESS[role];
  if (access === "*") return "Full access to all modules";
  if (!access) return "—";
  return `${access.length} modules`;
}

function Administration() {
  const { user, profile } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [modalMode, setModalMode] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const actor = profile?.displayName || user?.email || "unknown";

  async function load() {
    setLoading(true);
    setError("");
    try {
      setUsers(await listAllUsers());
    } catch (err) {
      console.error(err);
      setError("Could not load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const metrics = useMemo(() => {
    return {
      total: users.length,
      admins: users.filter((u) => u.role === "admin").length,
      managers: users.filter((u) => u.role === "manager").length,
      developers: users.filter((u) => u.role === "developer").length,
    };
  }, [users]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (statusFilter !== "all" && u.status !== statusFilter) return false;
      if (!term) return true;
      return [u.displayName, u.firstName, u.lastName, u.email]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [users, search, roleFilter, statusFilter]);

  function openCreate() {
    setModalMode("create");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }
  function openEdit(u) {
    setModalMode("edit");
    setEditingId(u.id);
    setForm({
      firstName: u.firstName || (u.displayName ? u.displayName.split(" ")[0] : ""),
      lastName: u.lastName || (u.displayName ? u.displayName.split(" ").slice(1).join(" ") : ""),
      email: u.email || "",
      role: u.role || "developer",
      status: u.status || "active",
      notes: u.notes || "",
    });
    setFormError("");
  }
  function closeModal() {
    if (saving) return;
    setModalMode(null);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }
  function field(f, v) {
    setForm((prev) => ({ ...prev, [f]: v }));
  }

  async function handleSave() {
    setFormError("");
    if (!form.email.trim()) {
      setFormError("Email is required.");
      return;
    }
    setSaving(true);
    try {
      if (modalMode === "edit" && editingId) {
        await updateUserRecord(editingId, form);
        await auditLog({
          action: "Update user",
          module: "Administration",
          user: actor,
          details: `Updated ${form.email} (${form.role}/${form.status})`,
        });
      } else {
        await createUserRecord(form, user?.uid);
        await auditLog({
          action: "Create user",
          module: "Administration",
          user: actor,
          details: `Created record for ${form.email} (${form.role})`,
        });
      }
      closeModal();
      await load();
    } catch (err) {
      console.error(err);
      setFormError("Could not save user.");
    } finally {
      setSaving(false);
    }
  }

  function askDelete(u) {
    setDeleteTarget({ id: u.id, name: u.displayName || u.email });
  }
  function cancelDelete() {
    if (deleting) return;
    setDeleteTarget(null);
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUserRecord(deleteTarget.id);
      await auditLog({
        action: "Delete user",
        module: "Administration",
        user: actor,
        details: `Deleted user record ${deleteTarget.name}`,
      });
      setDeleteTarget(null);
      await load();
    } catch (err) {
      console.error(err);
      setError("Could not delete user.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppLayout>
      <div className="adm-head">
        <div className="page-title">Administration</div>
        <button className="adm-new-btn" onClick={openCreate}>New User</button>
      </div>

      <div className="adm-note">
        User records manage roles and access. Sign-in accounts are created in the
        Firebase console.
      </div>

      {!loading && !error && (
        <div className="adm-metrics">
          <div className="adm-metric"><div className="adm-metric-label">Total Users</div><div className="adm-metric-value">{String(metrics.total).padStart(2, "0")}</div></div>
          <div className="adm-metric"><div className="adm-metric-label">Admins</div><div className="adm-metric-value tone-accent">{String(metrics.admins).padStart(2, "0")}</div></div>
          <div className="adm-metric"><div className="adm-metric-label">Managers</div><div className="adm-metric-value tone-info">{String(metrics.managers).padStart(2, "0")}</div></div>
          <div className="adm-metric"><div className="adm-metric-label">Developers</div><div className="adm-metric-value tone-ok">{String(metrics.developers).padStart(2, "0")}</div></div>
        </div>
      )}

      <div className="adm-controls">
        <input className="adm-search" placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="adm-filter" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">All Roles</option>
          {ROLE_OPTIONS.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
        </select>
        <select className="adm-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
        </select>
      </div>

      {loading && <div className="adm-status">Loading users…</div>}
      {error && <div className="adm-status adm-error">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="adm-empty">
          {users.length === 0 ? "No users yet." : "No users match the current filters."}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="adm-table">
          <div className="adm-row adm-row-header">
            <div className="adm-cell adm-cell-name">Name</div>
            <div className="adm-cell adm-cell-email">Email</div>
            <div className="adm-cell adm-cell-role">Role</div>
            <div className="adm-cell adm-cell-access">Access</div>
            <div className="adm-cell adm-cell-status">Status</div>
            <div className="adm-cell adm-cell-actions">Actions</div>
          </div>

          {filtered.map((u) => (
            <div className="adm-row" key={u.id}>
              <div className="adm-cell adm-cell-name">{u.displayName || "—"}</div>
              <div className="adm-cell adm-cell-email">{u.email}</div>
              <div className="adm-cell adm-cell-role">
                <span className={"adm-role role-" + u.role}>{roleLabel(u.role)}</span>
              </div>
              <div className="adm-cell adm-cell-access">{roleAccessSummary(u.role)}</div>
              <div className="adm-cell adm-cell-status">
                <span className={"adm-badge status-" + u.status}>{statusLabel(u.status)}</span>
              </div>
              <div className="adm-cell adm-cell-actions">
                <button className="adm-action-btn" onClick={() => openEdit(u)}>Edit</button>
                <button className="adm-action-btn adm-action-danger" onClick={() => askDelete(u)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- Role reference ---- */}
      <div className="adm-roles">
        <div className="adm-roles-title">Role Access Reference</div>
        <div className="adm-roles-grid">
          {ROLE_OPTIONS.map((r) => {
            const access = ROLE_ACCESS[r.value];
            return (
              <div className="adm-role-card" key={r.value}>
                <div className={"adm-role role-" + r.value}>{r.label}</div>
                <div className="adm-role-desc">
                  {access === "*"
                    ? "Full access to every module in CoreForge."
                    : access.map((a) => a.replace("/", "")).join(", ")}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modalMode && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{modalMode === "edit" ? "Edit User" : "New User"}</div>
            {formError && <div className="form-error">{formError}</div>}

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">First Name</label>
                <input className="form-input" value={form.firstName} onChange={(e) => field("firstName", e.target.value)} disabled={saving} autoFocus />
              </div>
              <div className="form-field">
                <label className="form-label">Last Name</label>
                <input className="form-input" value={form.lastName} onChange={(e) => field("lastName", e.target.value)} disabled={saving} />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={(e) => field("email", e.target.value)} disabled={saving} />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Role</label>
                <select className="form-input" value={form.role} onChange={(e) => field("role", e.target.value)} disabled={saving}>
                  {ROLE_OPTIONS.map((r) => (<option key={r.value} value={r.value}>{r.label}</option>))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={(e) => field("status", e.target.value)} disabled={saving}>
                  {STATUS_OPTIONS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                </select>
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Notes</label>
              <textarea className="form-input form-textarea" value={form.notes} onChange={(e) => field("notes", e.target.value)} disabled={saving} rows={2} />
            </div>

            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={closeModal} disabled={saving}>Cancel</button>
              <button className="modal-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : modalMode === "edit" ? "Save Changes" : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-panel modal-panel-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Delete User</div>
            <p className="modal-text">
              Delete the record for <span className="modal-emphasis">{deleteTarget.name}</span>? This removes their CoreForge role/profile. This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={cancelDelete} disabled={deleting}>Cancel</button>
              <button className="modal-btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default Administration;