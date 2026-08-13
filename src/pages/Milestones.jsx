// src/pages/Milestones.jsx

import { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { listProjects } from "../services/projectService";
import {
  createMilestone,
  listMilestones,
  updateMilestone,
  deleteMilestone,
} from "../services/milestoneService";
import "../components/Modal.css";
import "./Milestones.css";

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in-progress", label: "In Progress" },
  { value: "complete", label: "Complete" },
];

const EMPTY_FORM = {
  name: "",
  description: "",
  projectId: "",
  dueDate: "",
  status: "open",
  progress: 0,
};

function statusLabel(value) {
  return STATUS_OPTIONS.find((s) => s.value === value)?.label || value;
}

function Milestones() {
  const { user } = useAuth();

  const [milestones, setMilestones] = useState([]);
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
      const [msData, projectData] = await Promise.all([
        listMilestones(),
        listProjects(),
      ]);
      setMilestones(msData);
      setProjects(projectData);
    } catch (err) {
      console.error(err);
      setError("Could not load milestones.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function projectName(projectId) {
    if (!projectId) return "—";
    return projects.find((p) => p.id === projectId)?.name || "—";
  }

  function openCreate() {
    setModalMode("create");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  function openEdit(m) {
    setModalMode("edit");
    setEditingId(m.id);
    setForm({
      name: m.name || "",
      description: m.description || "",
      projectId: m.projectId || "",
      dueDate: m.dueDate || "",
      status: m.status || "open",
      progress: m.progress ?? 0,
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
    if (!form.name.trim()) {
      setFormError("Milestone name is required.");
      return;
    }
    setSaving(true);
    try {
      if (modalMode === "edit" && editingId) {
        await updateMilestone(editingId, form);
      } else {
        await createMilestone(form, user?.uid);
      }
      setModalMode(null);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadAll();
    } catch (err) {
      console.error(err);
      setFormError("Could not save milestone.");
    } finally {
      setSaving(false);
    }
  }

  function askDelete(m) {
    setDeleteTarget({ id: m.id, name: m.name });
  }

  function cancelDelete() {
    if (deleting) return;
    setDeleteTarget(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMilestone(deleteTarget.id);
      setDeleteTarget(null);
      await loadAll();
    } catch (err) {
      console.error(err);
      setError("Could not delete milestone.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppLayout>
      <div className="ms-head">
        <div className="page-title">Milestones</div>
        <button className="ms-new-btn" onClick={openCreate}>
          New Milestone
        </button>
      </div>

      {loading && <div className="ms-status">Loading milestones…</div>}
      {error && <div className="ms-status ms-error">{error}</div>}

      {!loading && !error && milestones.length === 0 && (
        <div className="ms-empty">
          No milestones yet. Create your first milestone to get started.
        </div>
      )}

      {!loading && !error && milestones.length > 0 && (
        <div className="ms-grid">
          {milestones.map((m) => (
            <div className="ms-card" key={m.id}>
              <div className="ms-card-top">
                <div className="ms-card-name">{m.name}</div>
                <span className={"ms-badge status-" + m.status}>
                  {statusLabel(m.status)}
                </span>
              </div>

              {m.description && (
                <div className="ms-card-desc">{m.description}</div>
              )}

              <div className="ms-card-meta">
                <span className="ms-card-project">{projectName(m.projectId)}</span>
                {m.dueDate && <span className="ms-card-due">{m.dueDate}</span>}
              </div>

              <div className="ms-progress">
                <div className="ms-progress-bar">
                  <div
                    className="ms-progress-fill"
                    style={{ width: `${Math.min(100, Math.max(0, m.progress))}%` }}
                  />
                </div>
                <span className="ms-progress-val">{m.progress}%</span>
              </div>

              <div className="ms-card-actions">
                <button className="ms-action-btn" onClick={() => openEdit(m)}>
                  Edit
                </button>
                <button
                  className="ms-action-btn ms-action-danger"
                  onClick={() => askDelete(m)}
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
              {modalMode === "edit" ? "Edit Milestone" : "New Milestone"}
            </div>

            {formError && <div className="form-error">{formError}</div>}

            <div className="form-field">
              <label className="form-label">Name</label>
              <input
                className="form-input"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                disabled={saving}
                autoFocus
              />
            </div>

            <div className="form-field">
              <label className="form-label">Description</label>
              <textarea
                className="form-input form-textarea"
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                disabled={saving}
                rows={3}
              />
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

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Due Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => updateField("dueDate", e.target.value)}
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

            <div className="form-field">
              <label className="form-label">Progress ({form.progress}%)</label>
              <input
                className="ms-range"
                type="range"
                min="0"
                max="100"
                step="5"
                value={form.progress}
                onChange={(e) => updateField("progress", e.target.value)}
                disabled={saving}
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
                  : "Create Milestone"}
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
            <div className="modal-title">Delete Milestone</div>
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

export default Milestones;