// src/pages/Decisions.jsx

import { useState, useEffect, useMemo } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { listProjects } from "../services/projectService";
import {
  createDecision,
  listDecisions,
  updateDecision,
  deleteDecision,
} from "../services/decisionService";
import { toInputValue, toDisplay } from "../utils/dates";
import "../components/Modal.css";
import "./Decisions.css";

const STATUS_OPTIONS = [
  { value: "proposed", label: "Proposed" },
  { value: "approved", label: "Approved" },
  { value: "archived", label: "Archived" },
];

const EMPTY_FORM = {
  title: "",
  category: "",
  description: "",
  date: "",
  owner: "",
  status: "proposed",
  projectId: "",
};

function statusLabel(v) {
  return STATUS_OPTIONS.find((s) => s.value === v)?.label || v;
}

function Decisions() {
  const { user, profile } = useAuth();

  const [decisions, setDecisions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [modalMode, setModalMode] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [decData, projData] = await Promise.all([listDecisions(), listProjects()]);
      setDecisions(decData);
      setProjects(projData);
    } catch (err) {
      console.error(err);
      setError("Could not load decisions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function projectName(id) {
    if (!id) return "—";
    return projects.find((p) => p.id === id)?.name || "—";
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return decisions;
    return decisions.filter((d) =>
      [d.title, d.category, d.description, d.owner].join(" ").toLowerCase().includes(term)
    );
  }, [decisions, search]);

  function openCreate() {
    setModalMode("create");
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      owner: profile?.displayName || user?.email?.split("@")[0] || "",
    });
    setFormError("");
  }
  function openEdit(d) {
    setModalMode("edit");
    setEditingId(d.id);
    setForm({
      title: d.title || "",
      category: d.category || "",
      description: d.description || "",
      date: toInputValue(d.date),
      owner: d.owner || "",
      status: d.status || "proposed",
      projectId: d.projectId || "",
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
    if (!form.title.trim()) {
      setFormError("Decision title is required.");
      return;
    }
    setSaving(true);
    try {
      if (modalMode === "edit" && editingId) {
        await updateDecision(editingId, form);
      } else {
        await createDecision(form, user?.uid);
      }
      closeModal();
      await load();
    } catch (err) {
      console.error(err);
      setFormError("Could not save decision.");
    } finally {
      setSaving(false);
    }
  }

  function askDelete(d) {
    setDeleteTarget({ id: d.id, title: d.title });
  }
  function cancelDelete() {
    if (deleting) return;
    setDeleteTarget(null);
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDecision(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      console.error(err);
      setError("Could not delete decision.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppLayout>
      <div className="dec-head">
        <div className="page-title">Decisions</div>
        <button className="dec-new-btn" onClick={openCreate}>New Decision</button>
      </div>

      <div className="dec-controls">
        <input className="dec-search" placeholder="Search decisions…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading && <div className="dec-status">Loading decisions…</div>}
      {error && <div className="dec-status dec-error">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="dec-empty">
          {decisions.length === 0 ? "No decisions logged yet. Record your first decision." : "No decisions match your search."}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="dec-table">
          <div className="dec-row dec-row-header">
            <div className="dec-cell dec-cell-title">Decision</div>
            <div className="dec-cell dec-cell-cat">Category</div>
            <div className="dec-cell dec-cell-owner">Owner</div>
            <div className="dec-cell dec-cell-date">Date</div>
            <div className="dec-cell dec-cell-status">Status</div>
            <div className="dec-cell dec-cell-actions">Actions</div>
          </div>

          {filtered.map((d) => (
            <div className="dec-row" key={d.id}>
              <div className="dec-cell dec-cell-title">{d.title}</div>
              <div className="dec-cell dec-cell-cat">{d.category || "—"}</div>
              <div className="dec-cell dec-cell-owner">{d.owner || "—"}</div>
              <div className="dec-cell dec-cell-date">{toDisplay(d.date)}</div>
              <div className="dec-cell dec-cell-status">
                <span className={"dec-badge status-" + d.status}>{statusLabel(d.status)}</span>
              </div>
              <div className="dec-cell dec-cell-actions">
                <button className="dec-action-btn" onClick={() => openEdit(d)}>Edit</button>
                <button className="dec-action-btn dec-action-danger" onClick={() => askDelete(d)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalMode && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{modalMode === "edit" ? "Edit Decision" : "New Decision"}</div>
            {formError && <div className="form-error">{formError}</div>}

            <div className="form-field">
              <label className="form-label">Decision Title</label>
              <input className="form-input" value={form.title} onChange={(e) => field("title", e.target.value)} disabled={saving} autoFocus />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Category</label>
                <input className="form-input" value={form.category} onChange={(e) => field("category", e.target.value)} disabled={saving} placeholder="Technical, Business…" />
              </div>
              <div className="form-field">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={(e) => field("status", e.target.value)} disabled={saving}>
                  {STATUS_OPTIONS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                </select>
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Description</label>
              <textarea className="form-input form-textarea" value={form.description} onChange={(e) => field("description", e.target.value)} disabled={saving} rows={4} />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Owner</label>
                <input className="form-input" value={form.owner} onChange={(e) => field("owner", e.target.value)} disabled={saving} />
              </div>
              <div className="form-field">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={form.date} onChange={(e) => field("date", e.target.value)} disabled={saving} />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Related Project</label>
              <select className="form-input" value={form.projectId} onChange={(e) => field("projectId", e.target.value)} disabled={saving}>
                <option value="">— No project —</option>
                {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
              </select>
            </div>

            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={closeModal} disabled={saving}>Cancel</button>
              <button className="modal-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : modalMode === "edit" ? "Save Changes" : "Create Decision"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-panel modal-panel-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Delete Decision</div>
            <p className="modal-text">
              Delete <span className="modal-emphasis">{deleteTarget.title}</span>? This action cannot be undone.
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

export default Decisions;