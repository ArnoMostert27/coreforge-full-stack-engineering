// src/pages/Kanban.jsx

import { useState, useEffect, useMemo } from "react";
import AppLayout from "../components/AppLayout";
import { listTasks, updateTaskStatus } from "../services/taskService";
import { listProjects } from "../services/projectService";
import { listUsers } from "../services/userService";
import { toDisplay } from "../utils/dates";
import "./Kanban.css";

const COLUMNS = [
  { key: "backlog", label: "Backlog" },
  { key: "todo", label: "To Do" },
  { key: "in-progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
];

function memberName(u) {
  return u?.displayName || u?.email || "";
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Kanban() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dragId, setDragId] = useState(null);
  const [overColumn, setOverColumn] = useState(null);

  const [assigneeFilter, setAssigneeFilter] = useState("all");

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
      setError("Could not load board.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function projectName(projectId) {
    if (!projectId) return null;
    return projects.find((p) => p.id === projectId)?.name || null;
  }

  function assigneeLabel(task) {
    if (!task.assigneeId && !task.assigneeName) return null;
    const found = members.find((m) => m.id === task.assigneeId);
    if (found) return memberName(found);
    return task.assigneeName || "Unknown member";
  }

  const visibleTasks = useMemo(() => {
    if (assigneeFilter === "all") return tasks;
    if (assigneeFilter === "unassigned") return tasks.filter((t) => !t.assigneeId);
    return tasks.filter((t) => t.assigneeId === assigneeFilter);
  }, [tasks, assigneeFilter]);

  function handleDragStart(taskId) {
    setDragId(taskId);
  }
  function handleDragEnd() {
    setDragId(null);
    setOverColumn(null);
  }
  function handleDragOver(e, columnKey) {
    e.preventDefault();
    if (overColumn !== columnKey) setOverColumn(columnKey);
  }

  async function handleDrop(e, columnKey) {
    e.preventDefault();
    const taskId = dragId;
    setOverColumn(null);
    setDragId(null);
    if (!taskId) return;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === columnKey) return;

    // Optimistic move.
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: columnKey } : t))
    );

    try {
      // Pass the full task so recurrence can regenerate on completion.
      await updateTaskStatus(task, columnKey);
      // If it became done and was recurring, a new task now exists — reload.
      if (columnKey === "done" && task.recurrence && task.recurrence !== "none") {
        await loadAll();
      }
    } catch (err) {
      console.error(err);
      setError("Could not move task. Refreshing…");
      await loadAll();
    }
  }

  return (
    <AppLayout>
      <div className="kanban-head">
        <div className="page-title">Kanban</div>
      </div>

      {!loading && !error && (
        <div className="kanban-controls">
          <label className="kanban-filter-label">Assignee</label>
          <select
            className="kanban-filter"
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
        </div>
      )}

      {loading && <div className="kanban-status">Loading board…</div>}
      {error && <div className="kanban-status kanban-error">{error}</div>}

      {!loading && !error && (
        <div className="kanban-board">
          {COLUMNS.map((col) => {
            const columnTasks = visibleTasks.filter((t) => t.status === col.key);
            return (
              <div
                key={col.key}
                className={
                  "kanban-column" + (overColumn === col.key ? " is-over" : "")
                }
                onDragOver={(e) => handleDragOver(e, col.key)}
                onDrop={(e) => handleDrop(e, col.key)}
              >
                <div className="kanban-column-head">
                  <span className="kanban-column-title">{col.label}</span>
                  <span className="kanban-column-count">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="kanban-column-body">
                  {columnTasks.length === 0 && (
                    <div className="kanban-column-empty">—</div>
                  )}

                  {columnTasks.map((t) => {
                    const who = assigneeLabel(t);
                    return (
                      <div
                        key={t.id}
                        className={
                          "kanban-card" + (dragId === t.id ? " is-dragging" : "")
                        }
                        draggable
                        onDragStart={() => handleDragStart(t.id)}
                        onDragEnd={handleDragEnd}
                      >
                        <div className="kanban-card-top">
                          <div className="kanban-card-title">{t.title}</div>
                          {who && (
                            <span className="kanban-avatar" title={who}>
                              {initials(who)}
                            </span>
                          )}
                        </div>

                        <div className="kanban-card-meta">
                          {projectName(t.projectId) && (
                            <span className="kanban-card-project">
                              {projectName(t.projectId)}
                            </span>
                          )}
                          <span
                            className={
                              "kanban-card-priority priority-" + t.priority
                            }
                          >
                            {t.priority}
                          </span>
                        </div>

                        {t.dueDate && (
                          <div className="kanban-card-due">
                            {toDisplay(t.dueDate)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}

export default Kanban;
