// src/pages/Meetings.jsx

import { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import {
  createMeeting,
  listMeetings,
  updateMeeting,
  deleteMeeting,
} from "../services/meetingService";
import { toInputValue, toDisplay } from "../utils/dates";
import "../components/Modal.css";
import "./Meetings.css";

const TYPE_OPTIONS = [
  { value: "internal", label: "Internal" },
  { value: "client", label: "Client" },
  { value: "planning", label: "Planning" },
  { value: "review", label: "Review" },
];

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const EMPTY_FORM = {
  title: "",
  date: "",
  time: "",
  duration: "",
  participants: "",
  type: "internal",
  agenda: "",
  notes: "",
  actionItems: "",
  status: "scheduled",
};

function typeLabel(v) {
  return TYPE_OPTIONS.find((t) => t.value === v)?.label || v;
}
function statusLabel(v) {
  return STATUS_OPTIONS.find((s) => s.value === v)?.label || v;
}

function Meetings() {
  const { user } = useAuth();

  const [meetings, setMeetings] = useState([]);
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
      setMeetings(await listMeetings());
    } catch (err) {
      console.error(err);
      setError("Could not load meetings.");
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
    setForm(EMPTY_FORM);
    setFormError("");
  }
  function openEdit(m) {
    setModalMode("edit");
    setEditingId(m.id);
    setForm({
      title: m.title || "",
      date: toInputValue(m.date),
      time: m.time || "",
      duration: m.duration || "",
      participants: m.participants || "",
      type: m.type || "internal",
      agenda: m.agenda || "",
      notes: m.notes || "",
      actionItems: m.actionItems || "",
      status: m.status || "scheduled",
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
      setFormError("Meeting title is required.");
      return;
    }
    setSaving(true);
    try {
      if (modalMode === "edit" && editingId) {
        await updateMeeting(editingId, form);
      } else {
        await createMeeting(form, user?.uid);
      }
      closeModal();
      await load();
    } catch (err) {
      console.error(err);
      setFormError("Could not save meeting.");
    } finally {
      setSaving(false);
    }
  }

  function askDelete(m) {
    setDeleteTarget({ id: m.id, title: m.title });
  }
  function cancelDelete() {
    if (deleting) return;
    setDeleteTarget(null);
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteMeeting(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      console.error(err);
      setError("Could not delete meeting.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppLayout>
      <div className="mt-head">
        <div className="page-title">Meetings</div>
        <button className="mt-new-btn" onClick={openCreate}>New Meeting</button>
      </div>

      {loading && <div className="mt-status">Loading meetings…</div>}
      {error && <div className="mt-status mt-error">{error}</div>}

      {!loading && !error && meetings.length === 0 && (
        <div className="mt-empty">No meetings yet. Schedule your first meeting.</div>
      )}

      {!loading && !error && meetings.length > 0 && (
        <div className="mt-table">
          <div className="mt-row mt-row-header">
            <div className="mt-cell mt-cell-title">Title</div>
            <div className="mt-cell mt-cell-type">Type</div>
            <div className="mt-cell mt-cell-date">Date</div>
            <div className="mt-cell mt-cell-time">Time</div>
            <div className="mt-cell mt-cell-status">Status</div>
            <div className="mt-cell mt-cell-actions">Actions</div>
          </div>

          {meetings.map((m) => (
            <div className="mt-row" key={m.id}>
              <div className="mt-cell mt-cell-title">{m.title}</div>
              <div className="mt-cell mt-cell-type">
                <span className={"mt-type type-" + m.type}>{typeLabel(m.type)}</span>
              </div>
              <div className="mt-cell mt-cell-date">{toDisplay(m.date)}</div>
              <div className="mt-cell mt-cell-time">{m.time || "—"}</div>
              <div className="mt-cell mt-cell-status">
                <span className={"mt-badge status-" + m.status}>{statusLabel(m.status)}</span>
              </div>
              <div className="mt-cell mt-cell-actions">
                <button className="mt-action-btn" onClick={() => openEdit(m)}>Edit</button>
                <button className="mt-action-btn mt-action-danger" onClick={() => askDelete(m)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalMode && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{modalMode === "edit" ? "Edit Meeting" : "New Meeting"}</div>
            {formError && <div className="form-error">{formError}</div>}

            <div className="form-field">
              <label className="form-label">Title</label>
              <input className="form-input" value={form.title} onChange={(e) => field("title", e.target.value)} disabled={saving} autoFocus />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={form.date} onChange={(e) => field("date", e.target.value)} disabled={saving} />
              </div>
              <div className="form-field">
                <label className="form-label">Time</label>
                <input className="form-input" type="time" value={form.time} onChange={(e) => field("time", e.target.value)} disabled={saving} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Duration</label>
                <input className="form-input" value={form.duration} onChange={(e) => field("duration", e.target.value)} disabled={saving} placeholder="1h" />
              </div>
              <div className="form-field">
                <label className="form-label">Type</label>
                <select className="form-input" value={form.type} onChange={(e) => field("type", e.target.value)} disabled={saving}>
                  {TYPE_OPTIONS.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Participants</label>
                <input className="form-input" value={form.participants} onChange={(e) => field("participants", e.target.value)} disabled={saving} placeholder="Comma-separated" />
              </div>
              <div className="form-field">
                <label className="form-label">Status</label>
                <select className="form-input" value={form.status} onChange={(e) => field("status", e.target.value)} disabled={saving}>
                  {STATUS_OPTIONS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                </select>
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Agenda</label>
              <textarea className="form-input form-textarea" value={form.agenda} onChange={(e) => field("agenda", e.target.value)} disabled={saving} rows={2} />
            </div>

            <div className="form-field">
              <label className="form-label">Notes</label>
              <textarea className="form-input form-textarea" value={form.notes} onChange={(e) => field("notes", e.target.value)} disabled={saving} rows={2} />
            </div>

            <div className="form-field">
              <label className="form-label">Action Items</label>
              <textarea className="form-input form-textarea" value={form.actionItems} onChange={(e) => field("actionItems", e.target.value)} disabled={saving} rows={2} />
            </div>

            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={closeModal} disabled={saving}>Cancel</button>
              <button className="modal-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : modalMode === "edit" ? "Save Changes" : "Create Meeting"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-panel modal-panel-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Delete Meeting</div>
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

export default Meetings;