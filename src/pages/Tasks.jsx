// src/pages/Tasks.jsx

import { useState, useEffect, useMemo } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { listProjects } from "../services/projectService";
import { listUsers } from "../services/userService";
import {
  createTask,
  listTasks,
  updateTask,
  deleteTask,
} from "../services/taskService";
import { toInputValue, toDisplay } from "../utils/dates";
import "../components/Modal.css";
import "./Tasks.css";

const STATUS_OPTIONS = [
  { value: "backlog", label: "Backlog" },
  { value: "todo", label: "To Do" },
  { value: "in-progress", label: "In Progress" },
  { value: "review", label: "Review" },
  { value: "done", label: "Done" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

const RECURRENCE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const EMPTY_FORM = {
  title: "",
  description: "",
  projectId: "",
  status: "todo",
  priority: "medium",
  dueDate: "",
  recurrence: "none",
  assigneeId: "",
  assigneeName: "",
};

function statusLabel(value) {
  return STATUS_OPTIONS.find((s) => s.value === value)?.label || value;
}
function priorityLabel(value) {
  return PRIORITY_OPTIONS.find((p) => p.value === value)?.label || value;
}
function recurrenceLabel(value) {
  return RECURRENCE_OPTIONS.find((r) => r.value === value)?.label || "None";
}

// A member's display name, falling back to their email.
function memberName(u) {
  return u?.displayName || u?.email || "";
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Tasks() {
  const { user } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [assigneeFilter, setAssigneeFilter] = useState("all");

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
      const [taskData, projectData, memberData] = await Promise.all([
        listTasks(),
        listProjects(),
        listUsers(),
      ]);
      setTasks(taskData);
      setProjects(projectData);
      setMembers(memberData);
    } catch (err) {
      console.error(err);
      setError("Could not load tasks.");
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

  // Prefer the live user record; fall back to the name stored on the task so a
  // deleted member doesn't erase the history of who owned it.
  function assigneeLabel(task) {
    if (!task.assigneeId && !task.assigneeName) return null;
    const found = members.find((m) => m.id === task.assigneeId);
    if (found) return memberName(found);
    return task.assigneeName || "Unknown member";
  }

  const filtered = useMemo(() => {
    if (assigneeFilter === "all") return tasks;
    if (assigneeFilter === "unassigned") return tasks.filter((t) => !t.assigneeId);
    return tasks.filter((t) => t.assigneeId === assigneeFilter);
  }, [tasks, assigneeFilter]);

  function openCreate() {
    setModalMode("create");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  function openEdit(task) {
    setModalMode("edit");
    setEditingId(task.id);
    setForm({
      title: task.title || "",
      description: task.description || "",
      projectId: task.projectId || "",
      status: task.status || "todo",
      priority: task.priority || "medium",
      dueDate: toInputValue(task.dueDate),
      recurrence: task.recurrence || "none",
      assigneeId: task.assigneeId || "",
      assigneeName: task.assigneeName || "",
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

  // Keep assigneeId and assigneeName in step whenever the select changes.
  function selectAssignee(id) {
    const found = members.find((m) => m.id === id);
    setForm((f) => ({
      ...f,
      assigneeId: id,
      assigneeName: found ? memberName(found) : "",
    }));
  }

  async function handleSave() {
    setFormError("");
    if (!form.title.trim()) {
      setFormError("Task title is required.");
      return;
    }
    setSaving(true);
    try {
      if (modalMode === "edit" && editingId) {
        await updateTask(editingId, form);
      } else {
        await createTask(form, user?.uid);
      }
      setModalMode(null);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadAll();
    } catch (err) {
      console.error(err);
      setFormError("Could not save task.");
    } finally {
      setSaving(false);
    }
  }

  function askDelete(task) {
    setDeleteTarget({ id: task.id, title: task.title });
  }
  function cancelDelete() {
    if (deleting) return;
    setDeleteTarget(null);
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTask(deleteTarget.id);
      setDeleteTarget(null);
      await loadAll();
    } catch (err) {
      console.error(err);
      setError("Could not delete task.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppLayout>
      <div className="tasks-head">
        <div className="page-title">Tasks</div>
        <button className="tasks-new-btn" onClick={openCreate}>
          New Task
        </button>
      </div>

      {!loading && !error && tasks.length > 0 && (
        <div className="tasks-controls">
          <label className="tasks-filter-label">Assignee</label>
          <select
            className="tasks-filter"
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
          >
            <option value="all">Everyone</option>
            <option value="unassigned">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {memberName(m)}
              </option>
            ))}
          </select>
          <span className="tasks-filter-count">
            {filtered.length} of {tasks.length}
          </span>
        </div>
      )}

      {loading && <div className="tasks-status">Loading tasks…</div>}
      {error && <div className="tasks-status tasks-error">{error}</div>}

      {!loading && !error && tasks.length === 0 && (
        <div className="tasks-empty">
          No tasks yet. Create your first task to get started.
        </div>
      )}

      {!loading && !error && tasks.length > 0 && filtered.length === 0 && (
        <div className="tasks-empty">No tasks match this assignee.</div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="tasks-table">
          <div className="tasks-row tasks-row-header">
            <div className="tasks-cell tasks-cell-title">Title</div>
            <div className="tasks-cell tasks-cell-assignee">Assignee</div>
            <div className="tasks-cell tasks-cell-project">Project</div>
            <div className="tasks-cell tasks-cell-status">Status</div>
            <div className="tasks-cell tasks-cell-priority">Priority</div>
            <div className="tasks-cell tasks-cell-due">Due</div>
            <div className="tasks-cell tasks-cell-recur">Recurs</div>
            <div className="tasks-cell tasks-cell-actions">Actions</div>
          </div>

          {filtered.map((t) => {
            const who = assigneeLabel(t);
            return (
              <div className="tasks-row" key={t.id}>
                <div className="tasks-cell tasks-cell-title">{t.title}</div>
                <div className="tasks-cell tasks-cell-assignee">
                  {who ? (
                    <span className="tasks-assignee" title={who}>
                      <span className="tasks-avatar">{initials(who)}</span>
                      <span className="tasks-assignee-name">{who}</span>
                    </span>
                  ) : (
                    <span className="tasks-unassigned">Unassigned</span>
                  )}
                </div>
                <div className="tasks-cell tasks-cell-project">
                  {projectName(t.projectId)}
                </div>
                <div className="tasks-cell tasks-cell-status">
                  <span className={"tasks-badge status-" + t.status}>
                    {statusLabel(t.status)}
                  </span>
                </div>
                <div className="tasks-cell tasks-cell-priority">
                  <span className={"tasks-priority priority-" + t.priority}>
                    {priorityLabel(t.priority)}
                  </span>
                </div>
                <div className="tasks-cell tasks-cell-due">
                  {toDisplay(t.dueDate)}
                </div>
                <div className="tasks-cell tasks-cell-recur">
                  {t.recurrence && t.recurrence !== "none" ? (
                    <span className="tasks-recur-badge">
                      {recurrenceLabel(t.recurrence)}
                    </span>
                  ) : (
                    "—"
                  )}
                </div>
                <div className="tasks-cell tasks-cell-actions">
                  <button className="tasks-action-btn" onClick={() => openEdit(t)}>
                    Edit
                  </button>
                  <button
                    className="tasks-action-btn tasks-action-danger"
                    onClick={() => askDelete(t)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalMode && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">
              {modalMode === "edit" ? "Edit Task" : "New Task"}
            </div>

            {formError && <div className="form-error">{formError}</div>}

            <div className="form-field">
              <label className="form-label">Title</label>
              <input
                className="form-input"
                value={form.title}
                onChange={(e) => updateField("title", e.target.value)}
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

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Assign To</label>
                <select
                  className="form-input"
                  value={form.assigneeId}
                  onChange={(e) => selectAssignee(e.target.value)}
                  disabled={saving}
                >
                  <option value="">— Unassigned —</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {memberName(m)}
                    </option>
                  ))}
                </select>
                {members.length === 0 && (
                  <div className="form-hint">
                    No team members found. Add user records in Administration first.
                  </div>
                )}
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

              <div className="form-field">
                <label className="form-label">Priority</label>
                <select
                  className="form-input"
                  value={form.priority}
                  onChange={(e) => updateField("priority", e.target.value)}
                  disabled={saving}
                >
                  {PRIORITY_OPTIONS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
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
                <label className="form-label">Recurrence</label>
                <select
                  className="form-input"
                  value={form.recurrence}
                  onChange={(e) => updateField("recurrence", e.target.value)}
                  disabled={saving}
                >
                  {RECURRENCE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
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
                  : "Create Task"}
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
            <div className="modal-title">Delete Task</div>
            <p className="modal-text">
              Are you sure you want to delete{" "}
              <span className="modal-emphasis">{deleteTarget.title}</span>? This
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

export default Tasks;
