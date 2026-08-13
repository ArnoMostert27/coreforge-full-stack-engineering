// src/pages/Contracts.jsx

import { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { listClients } from "../services/clientService";
import { listProjects } from "../services/projectService";
import {
  createContract,
  listContracts,
  updateContract,
  deleteContract,
} from "../services/contractService";
import { toInputValue, toDisplay } from "../utils/dates";
import { formatMoney, CURRENCY_OPTIONS } from "../utils/money";
import "../components/Modal.css";
import "./Contracts.css";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

const EMPTY_FORM = {
  contractNumber: "",
  clientId: "",
  projectId: "",
  startDate: "",
  endDate: "",
  renewalDate: "",
  value: "",
  currency: "ZAR",
  status: "draft",
  notes: "",
};

function statusLabel(value) {
  return STATUS_OPTIONS.find((s) => s.value === value)?.label || value;
}

function Contracts() {
  const { user } = useAuth();

  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalMode, setModalMode] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [contractData, clientData, projectData] = await Promise.all([
        listContracts(),
        listClients(),
        listProjects(),
      ]);
      setContracts(contractData);
      setClients(clientData);
      setProjects(projectData);
    } catch (err) {
      console.error(err);
      setError("Could not load contracts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function clientName(id) {
    if (!id) return "—";
    return clients.find((c) => c.id === id)?.companyName || "—";
  }
  function projectName(id) {
    if (!id) return "—";
    return projects.find((p) => p.id === id)?.name || "—";
  }

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
      contractNumber: c.contractNumber || "",
      clientId: c.clientId || "",
      projectId: c.projectId || "",
      startDate: toInputValue(c.startDate),
      endDate: toInputValue(c.endDate),
      renewalDate: toInputValue(c.renewalDate),
      value: c.value ?? "",
      currency: c.currency || "ZAR",
      status: c.status || "draft",
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
    if (!form.contractNumber.trim()) {
      setFormError("Contract number is required.");
      return;
    }
    setSaving(true);
    try {
      if (modalMode === "edit" && editingId) {
        await updateContract(editingId, form);
      } else {
        await createContract(form, user?.uid);
      }
      setModalMode(null);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadAll();
    } catch (err) {
      console.error(err);
      setFormError("Could not save contract.");
    } finally {
      setSaving(false);
    }
  }

  function askDelete(c) {
    setDeleteTarget({ id: c.id, number: c.contractNumber });
  }
  function cancelDelete() {
    if (deleting) return;
    setDeleteTarget(null);
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteContract(deleteTarget.id);
      setDeleteTarget(null);
      await loadAll();
    } catch (err) {
      console.error(err);
      setError("Could not delete contract.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppLayout>
      <div className="ct-head">
        <div className="page-title">Contracts</div>
        <button className="ct-new-btn" onClick={openCreate}>
          New Contract
        </button>
      </div>

      {loading && <div className="ct-status">Loading contracts…</div>}
      {error && <div className="ct-status ct-error">{error}</div>}

      {!loading && !error && contracts.length === 0 && (
        <div className="ct-empty">
          No contracts yet. Create your first contract to get started.
        </div>
      )}

      {!loading && !error && contracts.length > 0 && (
        <div className="ct-table">
          <div className="ct-row ct-row-header">
            <div className="ct-cell ct-cell-num">Number</div>
            <div className="ct-cell ct-cell-client">Client</div>
            <div className="ct-cell ct-cell-value">Value</div>
            <div className="ct-cell ct-cell-end">End Date</div>
            <div className="ct-cell ct-cell-status">Status</div>
            <div className="ct-cell ct-cell-actions">Actions</div>
          </div>

          {contracts.map((c) => (
            <div className="ct-row" key={c.id}>
              <div className="ct-cell ct-cell-num">{c.contractNumber}</div>
              <div className="ct-cell ct-cell-client">
                {clientName(c.clientId)}
              </div>
              <div className="ct-cell ct-cell-value">
                {formatMoney(c.value, c.currency)}
              </div>
              <div className="ct-cell ct-cell-end">{toDisplay(c.endDate)}</div>
              <div className="ct-cell ct-cell-status">
                <span className={"ct-badge status-" + c.status}>
                  {statusLabel(c.status)}
                </span>
              </div>
              <div className="ct-cell ct-cell-actions">
                <button className="ct-action-btn" onClick={() => openEdit(c)}>
                  Edit
                </button>
                <button
                  className="ct-action-btn ct-action-danger"
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
              {modalMode === "edit" ? "Edit Contract" : "New Contract"}
            </div>

            {formError && <div className="form-error">{formError}</div>}

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Contract Number</label>
                <input
                  className="form-input"
                  value={form.contractNumber}
                  onChange={(e) =>
                    updateField("contractNumber", e.target.value)
                  }
                  disabled={saving}
                  autoFocus
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
                <label className="form-label">Client</label>
                <select
                  className="form-input"
                  value={form.clientId}
                  onChange={(e) => updateField("clientId", e.target.value)}
                  disabled={saving}
                >
                  <option value="">— No client —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Project</label>
                <select
                  className="form-input"
                  value={form.projectId}
                  onChange={(e) => updateField("projectId", e.target.value)}
                  disabled={saving}
                >
                  <option value="">— No project —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Value</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.value}
                  onChange={(e) => updateField("value", e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Currency</label>
                <select
                  className="form-input"
                  value={form.currency}
                  onChange={(e) => updateField("currency", e.target.value)}
                  disabled={saving}
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Start Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => updateField("startDate", e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="form-field">
                <label className="form-label">End Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => updateField("endDate", e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Renewal Date</label>
              <input
                className="form-input"
                type="date"
                value={form.renewalDate}
                onChange={(e) => updateField("renewalDate", e.target.value)}
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
                  : "Create Contract"}
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
            <div className="modal-title">Delete Contract</div>
            <p className="modal-text">
              Are you sure you want to delete{" "}
              <span className="modal-emphasis">{deleteTarget.number}</span>?
              This action cannot be undone.
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

export default Contracts;