// src/pages/Announcements.jsx

import { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import {
  createAnnouncement,
  listAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
} from "../services/announcementService";
import { toInputValue, toDisplay } from "../utils/dates";
import "../components/Modal.css";
import "./Announcements.css";

const CATEGORY_OPTIONS = [
  { value: "company", label: "Company" },
  { value: "development", label: "Development" },
  { value: "operations", label: "Operations" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

const EMPTY_FORM = {
  title: "",
  message: "",
  category: "company",
  priority: "medium",
  publishDate: "",
  expirationDate: "",
  author: "",
  status: "draft",
};

function categoryLabel(v) {
  return CATEGORY_OPTIONS.find((c) => c.value === v)?.label || v;
}
function priorityLabel(v) {
  return PRIORITY_OPTIONS.find((p) => p.value === v)?.label || v;
}
function statusLabel(v) {
  return STATUS_OPTIONS.find((s) => s.value === v)?.label || v;
}

function Announcements() {
  const { user, profile } = useAuth();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
      setAnnouncements(await listAnnouncements());
    } catch (err) {
      console.error(err);
      setError("Could not load announcements.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setModalMode("create");
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      author: profile?.displayName || user?.email?.split("@")[0] || "",
    });
    setFormError("");
  }
  function openEdit(a) {
    setModalMode("edit");
    setEditingId(a.id);
    setForm({
      title: a.title || "",
      message: a.message || "",
      category: a.category || "company",
      priority: a.priority || "medium",
      publishDate: toInputValue(a.publishDate),
      expirationDate: toInputValue(a.expirationDate),
      author: a.author || "",
      status: a.status || "draft",
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
      setFormError("Title is required.");
      return;
    }
    setSaving(true);
    try {
      if (modalMode === "edit" && editingId) {
        await updateAnnouncement(editingId, form);
      } else {
        await createAnnouncement(form, user?.uid);
      }
      closeModal();
      await load();
    } catch (err) {
      console.error(err);
      setFormError("Could not save announcement.");
    } finally {
      setSaving(false);
    }
  }

  function askDelete(a) {
    setDeleteTarget({ id: a.id, title: a.title });
  }
  function cancelDelete() {
    if (deleting) return;
    setDeleteTarget(null);
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAnnouncement(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      console.error(err);
      setError("Could not delete announcement.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppLayout>
      <div className="an-head">
        <div className="page-title">Announcements</div>
        <button className="an-new-btn" onClick={openCreate}>New Announcement</button>
      </div>

      {loading && <div className="an-status">Loading announcements…</div>}
      {error && <div className="an-status an-error">{error}</div>}

      {!loading && !error && announcements.length === 0 && (
        <div className="an-empty">No announcements yet. Post your first announcement.</div>
      )}

      {!loading && !error && announcements.length > 0 && (
        <div className="an-list">
          {announcements.map((a) => (
            <div className={"an-card priority-" + a.priority} key={a.id}>
              <div className="an-card-head">
                <div className="an-card-title-wrap">
                  <span className={"an-priority pri-" + a.priority}>{priorityLabel(a.priority)}</span>
                  <span className="an-card-title">{a.title}</span>
                </div>
                <span className={"an-badge status-" + a.status}>{statusLabel(a.status)}</span>
              </div>
              <div className="an-card-message">{a.message}</div>
              <div className="an-card-foot">
                <div className="an-card-meta">
                  <span className="an-cat">{categoryLabel(a.category)}</span>
                  <span>{a.author || "—"}</span>
                  {a.publishDate && <span>Publish {toDisplay(a.publishDate)}</span>}
                  {a.expirationDate && <span>Expires {toDisplay(a.expirationDate)}</span>}
                </div>
                <div className="an-card-actions">
                  <button className="an-action-btn" onClick={() => openEdit(a)}>Edit</button>
                  <button className="an-action-btn an-action-danger" onClick={() => askDelete(a)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalMode && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{modalMode === "edit" ? "Edit Announcement" : "New Announcement"}</div>
            {formError && <div className="form-error">{formError}</div>}

            <div className="form-field">
              <label className="form-label">Title</label>
              <input className="form-input" value={form.title} onChange={(e) => field("title", e.target.value)} disabled={saving} autoFocus />
            </div>

            <div className="form-field">
              <label className="form-label">Message</label>
              <textarea className="form-input form-textarea" value={form.message} onChange={(e) => field("message", e.target.value)} disabled={saving} rows={4} />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Category</label>
                <select className="form-input" value={form.category} onChange={(e) => field("category", e.target.value)} disabled={saving}>
                  {CATEGORY_OPTIONS.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Priority</label>
                <select className="form-input" value={form.priority} onChange={(e) => field("priority", e.target.value)} disabled={saving}>
                  {PRIORITY_OPTIONS.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Publish Date</label>
                <input className="form-input" type="date" value={form.publishDate} onChange={(e) => field("publishDate", e.target.value)} disabled={saving} />
              </div>
              <div className="form-field">
                <label className="form-label">Expiration Date</label>
                <input className="form-input" type="date" value={form.expirationDate} onChange={(e) => field("expirationDate", e.target.value)} disabled={saving} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Author</label>
                <input className="form-input" value={form.author} onChange={(e) => field("author", e.target.value)} disabled={saving} />
              </div>
              <div className="form-field">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={(e) => field("status", e.target.value)} disabled={saving}>
                  {STATUS_OPTIONS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                </select>
              </div>
            </div>

            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={closeModal} disabled={saving}>Cancel</button>
              <button className="modal-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : modalMode === "edit" ? "Save Changes" : "Create Announcement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-panel modal-panel-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Delete Announcement</div>
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

export default Announcements;