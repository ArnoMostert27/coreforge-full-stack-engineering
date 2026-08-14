// src/pages/Documentation.jsx

import { useState, useEffect, useMemo } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import {
  createDoc,
  listDocs,
  updateDocument,
  deleteDocument,
} from "../services/documentationService";
import { toDisplay } from "../utils/dates";
import "../components/Modal.css";
import "./Documentation.css";

const CATEGORY_OPTIONS = [
  { value: "development", label: "Development" },
  { value: "business", label: "Business" },
  { value: "operations", label: "Operations" },
  { value: "processes", label: "Processes" },
];

const EMPTY_FORM = {
  title: "",
  category: "development",
  content: "",
  author: "",
  tags: "",
};

function categoryLabel(v) {
  return CATEGORY_OPTIONS.find((c) => c.value === v)?.label || v;
}

function Documentation() {
  const { user, profile } = useAuth();

  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");

  const [modalMode, setModalMode] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [viewDoc, setViewDoc] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setDocs(await listDocs());
    } catch (err) {
      console.error(err);
      setError("Could not load documentation.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return docs.filter((d) => {
      if (catFilter !== "all" && d.category !== catFilter) return false;
      if (!term) return true;
      return [d.title, d.content, d.tags, d.author]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [docs, search, catFilter]);

  function openCreate() {
    setModalMode("create");
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      author: profile?.displayName || user?.email?.split("@")[0] || "",
    });
    setFormError("");
  }
  function openEdit(d) {
    setModalMode("edit");
    setEditingId(d.id);
    setForm({
      title: d.title || "",
      category: d.category || "development",
      content: d.content || "",
      author: d.author || "",
      tags: d.tags || "",
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
        await updateDocument(editingId, form);
      } else {
        await createDoc(form, user?.uid);
      }
      closeModal();
      await load();
    } catch (err) {
      console.error(err);
      setFormError("Could not save document.");
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
      await deleteDocument(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      console.error(err);
      setError("Could not delete document.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppLayout>
      <div className="doc-head">
        <div className="page-title">Documentation</div>
        <button className="doc-new-btn" onClick={openCreate}>New Document</button>
      </div>

      <div className="doc-controls">
        <input className="doc-search" placeholder="Search documentation…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="doc-filter" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {CATEGORY_OPTIONS.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
        </select>
      </div>

      {loading && <div className="doc-status">Loading documentation…</div>}
      {error && <div className="doc-status doc-error">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="doc-empty">
          {docs.length === 0 ? "No documents yet. Create your first document." : "No documents match your search."}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="doc-grid">
          {filtered.map((d) => (
            <div className="doc-card" key={d.id}>
              <div className="doc-card-top">
                <span className={"doc-cat cat-" + d.category}>{categoryLabel(d.category)}</span>
                <span className="doc-card-updated">{toDisplay(d.updatedAt)}</span>
              </div>
              <div className="doc-card-title" onClick={() => setViewDoc(d)}>{d.title}</div>
              <div className="doc-card-preview">{d.content ? d.content.slice(0, 120) : "—"}</div>
              {d.tags && <div className="doc-card-tags">{d.tags}</div>}
              <div className="doc-card-foot">
                <span className="doc-card-author">{d.author || "—"}</span>
                <div className="doc-card-actions">
                  <button className="doc-action-btn" onClick={() => setViewDoc(d)}>View</button>
                  <button className="doc-action-btn" onClick={() => openEdit(d)}>Edit</button>
                  <button className="doc-action-btn doc-action-danger" onClick={() => askDelete(d)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewDoc && (
        <div className="modal-overlay" onClick={() => setViewDoc(null)}>
          <div className="modal-panel doc-view-panel" onClick={(e) => e.stopPropagation()}>
            <div className="doc-view-cat">{categoryLabel(viewDoc.category)}</div>
            <div className="modal-title">{viewDoc.title}</div>
            <div className="doc-view-meta">
              {viewDoc.author || "—"} · Updated {toDisplay(viewDoc.updatedAt)}
            </div>
            <div className="doc-view-content">{viewDoc.content || "No content."}</div>
            {viewDoc.tags && <div className="doc-view-tags">Tags: {viewDoc.tags}</div>}
            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={() => setViewDoc(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {modalMode && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-panel doc-edit-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{modalMode === "edit" ? "Edit Document" : "New Document"}</div>
            {formError && <div className="form-error">{formError}</div>}

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Title</label>
                <input className="form-input" value={form.title} onChange={(e) => field("title", e.target.value)} disabled={saving} autoFocus />
              </div>
              <div className="form-field">
                <label className="form-label">Category</label>
                <select className="form-input" value={form.category} onChange={(e) => field("category", e.target.value)} disabled={saving}>
                  {CATEGORY_OPTIONS.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
                </select>
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Content</label>
              <textarea className="form-input form-textarea" value={form.content} onChange={(e) => field("content", e.target.value)} disabled={saving} rows={8} />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Author</label>
                <input className="form-input" value={form.author} onChange={(e) => field("author", e.target.value)} disabled={saving} />
              </div>
              <div className="form-field">
                <label className="form-label">Tags</label>
                <input className="form-input" value={form.tags} onChange={(e) => field("tags", e.target.value)} disabled={saving} placeholder="Comma-separated" />
              </div>
            </div>

            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={closeModal} disabled={saving}>Cancel</button>
              <button className="modal-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : modalMode === "edit" ? "Save Changes" : "Create Document"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-panel modal-panel-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Delete Document</div>
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

export default Documentation;