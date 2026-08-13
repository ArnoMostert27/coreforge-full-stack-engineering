// src/pages/Clients.jsx

import { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import {
  createClient,
  listClients,
  updateClient,
  deleteClient,
} from "../services/clientService";
import "../components/Modal.css";
import "./Clients.css";

const STATUS_OPTIONS = [
  { value: "lead", label: "Lead" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const EMPTY_FORM = {
  companyName: "",
  primaryContact: "",
  email: "",
  phone: "",
  address: "",
  website: "",
  status: "lead",
  notes: "",
};

function statusLabel(value) {
  return STATUS_OPTIONS.find((s) => s.value === value)?.label || value;
}

function Clients() {
  const { user } = useAuth();

  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalMode, setModalMode] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadClients() {
    setLoading(true);
    setError("");
    try {
      const data = await listClients();
      setClients(data);
    } catch (err) {
      console.error(err);
      setError("Could not load clients.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClients();
  }, []);

  function openCreate() {
    setModalMode("create");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  function openEdit(c) {
    setModalMode("edit");
    setEditingId(c.id);
    setForm({
      companyName: c.companyName || "",
      primaryContact: c.primaryContact || "",
      email: c.email || "",
      phone: c.phone || "",
      address: c.address || "",
      website: c.website || "",
      status: c.status || "lead",
      notes: c.notes || "",
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

  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSave() {
    setFormError("");
    if (!form.companyName.trim()) {
      setFormError("Company name is required.");
      return;
    }
    setSaving(true);
    try {
      if (modalMode === "edit" && editingId) {
        await updateClient(editingId, form);
      } else {
        await createClient(form, user?.uid);
      }
      setModalMode(null);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadClients();
    } catch (err) {
      console.error(err);
      setFormError("Could not save client.");
    } finally {
      setSaving(false);
    }
  }

  function askDelete(c) {
    setDeleteTarget({ id: c.id, name: c.companyName });
  }
  function cancelDelete() {
    if (deleting) return;
    setDeleteTarget(null);
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteClient(deleteTarget.id);
      setDeleteTarget(null);
      await loadClients();
    } catch (err) {
      console.error(err);
      setError("Could not delete client.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppLayout>
      <div className="clients-head">
        <div className="page-title">Clients</div>
        <button className="clients-new-btn" onClick={openCreate}>
          New Client
        </button>
      </div>

      {loading && <div className="clients-status">Loading clients…</div>}
      {error && <div className="clients-status clients-error">{error}</div>}

      {!loading && !error && clients.length === 0 && (
        <div className="clients-empty">
          No clients yet. Add your first client to get started.
        </div>
      )}

      {!loading && !error && clients.length > 0 && (
        <div className="clients-table">
          <div className="clients-row clients-row-header">
            <div className="clients-cell clients-cell-name">Company</div>
            <div className="clients-cell clients-cell-contact">Contact</div>
            <div className="clients-cell clients-cell-email">Email</div>
            <div className="clients-cell clients-cell-status">Status</div>
            <div className="clients-cell clients-cell-actions">Actions</div>
          </div>

          {clients.map((c) => (
            <div className="clients-row" key={c.id}>
              <div className="clients-cell clients-cell-name">
                {c.companyName}
              </div>
              <div className="clients-cell clients-cell-contact">
                {c.primaryContact || "—"}
              </div>
              <div className="clients-cell clients-cell-email">
                {c.email || "—"}
              </div>
              <div className="clients-cell clients-cell-status">
                <span className={"clients-badge status-" + c.status}>
                  {statusLabel(c.status)}
                </span>
              </div>
              <div className="clients-cell clients-cell-actions">
                <button
                  className="clients-action-btn"
                  onClick={() => openEdit(c)}
                >
                  Edit
                </button>
                <button
                  className="clients-action-btn clients-action-danger"
                  onClick={() => askDelete(c)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalMode && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              {modalMode === "edit" ? "Edit Client" : "New Client"}
            </div>

            {formError && <div className="form-error">{formError}</div>}

            <div className="form-field">
              <label className="form-label">Company Name</label>
              <input
                className="form-input"
                value={form.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
                disabled={saving}
                autoFocus
              />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Primary Contact</label>
                <input
                  className="form-input"
                  value={form.primaryContact}
                  onChange={(e) =>
                    updateField("primaryContact", e.target.value)
                  }
                  disabled={saving}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Status</label>
                <select
                  className="form-input"
                  value={form.status}
                  onChange={(e) => updateField("status", e.target.value)}
                  disabled={saving}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Phone</label>
                <input
                  className="form-input"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Website</label>
              <input
                className="form-input"
                value={form.website}
                onChange={(e) => updateField("website", e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="form-field">
              <label className="form-label">Address</label>
              <input
                className="form-input"
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="form-field">
              <label className="form-label">Notes</label>
              <textarea
                className="form-input form-textarea"
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                disabled={saving}
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button
                className="modal-btn-secondary"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="modal-btn-primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving
                  ? "Saving…"
                  : modalMode === "edit"
                  ? "Save Changes"
                  : "Create Client"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div
            className="modal-panel modal-panel-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-title">Delete Client</div>
            <p className="modal-text">
              Are you sure you want to delete{" "}
              <span className="modal-emphasis">{deleteTarget.name}</span>? This
              action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                className="modal-btn-secondary"
                onClick={cancelDelete}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="modal-btn-danger"
                onClick={confirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default Clients;