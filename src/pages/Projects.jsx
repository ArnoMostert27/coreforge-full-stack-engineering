// src/pages/Projects.jsx

import { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import {
  createProject,
  listProjects,
  updateProject,
  deleteProject,
} from "../services/projectService";
import "../components/Modal.css";
import "./Projects.css";

const STATUS_OPTIONS = ["active", "on hold", "completed"];

const EMPTY_FORM = { name: "", description: "", status: "active" };

function Projects() {
  const { user } = useAuth();

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

  async function loadProjects() {
    setLoading(true);
    setError("");
    try {
      const data = await listProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
      setError("Could not load projects.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  function openCreate() {
    setModalMode("create");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  function openEdit(project) {
    setModalMode("edit");
    setEditingId(project.id);
    setForm({
      name: project.name || "",
      description: project.description || "",
      status: project.status || "active",
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
      setFormError("Project name is required.");
      return;
    }

    setSaving(true);
    try {
      if (modalMode === "edit" && editingId) {
        await updateProject(editingId, form);
      } else {
        await createProject(form, user?.uid);
      }
      setModalMode(null);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadProjects();
    } catch (err) {
      console.error(err);
      setFormError("Could not save project.");
    } finally {
      setSaving(false);
    }
  }

  function askDelete(project) {
    setDeleteTarget({ id: project.id, name: project.name });
  }

  function cancelDelete() {
    if (deleting) return;
    setDeleteTarget(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProject(deleteTarget.id);
      setDeleteTarget(null);
      await loadProjects();
    } catch (err) {
      console.error(err);
      setError("Could not delete project.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppLayout>
      <div className="projects-head">
        <div className="page-title">Projects</div>
        <button className="projects-new-btn" onClick={openCreate}>
          New Project
        </button>
      </div>

      {loading && <div className="projects-status">Loading projects…</div>}

      {error && <div className="projects-status projects-error">{error}</div>}

      {!loading && !error && projects.length === 0 && (
        <div className="projects-empty">
          No projects yet. Create your first project to get started.
        </div>
      )}

      {!loading && !error && projects.length > 0 && (
        <div className="projects-table">
          <div className="projects-row projects-row-header">
            <div className="projects-cell projects-cell-name">Name</div>
            <div className="projects-cell projects-cell-status">Status</div>
            <div className="projects-cell projects-cell-desc">Description</div>
            <div className="projects-cell projects-cell-actions">Actions</div>
          </div>

          {projects.map((p) => (
            <div className="projects-row" key={p.id}>
              <div className="projects-cell projects-cell-name">{p.name}</div>
              <div className="projects-cell projects-cell-status">
                <span
                  className={
                    "projects-badge status-" + p.status.replace(/\s/g, "-")
                  }
                >
                  {p.status}
                </span>
              </div>
              <div className="projects-cell projects-cell-desc">
                {p.description || "—"}
              </div>
              <div className="projects-cell projects-cell-actions">
                <button
                  className="projects-action-btn"
                  onClick={() => openEdit(p)}
                >
                  Edit
                </button>
                <button
                  className="projects-action-btn projects-action-danger"
                  onClick={() => askDelete(p)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- Create / Edit modal ---- */}
      {modalMode && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              {modalMode === "edit" ? "Edit Project" : "New Project"}
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
              <label className="form-label">Status</label>
              <select
                className="form-input"
                value={form.status}
                onChange={(e) => updateField("status", e.target.value)}
                disabled={saving}
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
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
                  : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---- Delete confirmation ---- */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div
            className="modal-panel modal-panel-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-title">Delete Project</div>
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

export default Projects;