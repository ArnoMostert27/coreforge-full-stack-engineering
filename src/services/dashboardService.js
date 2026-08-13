// src/services/dashboardService.js
// Aggregates data from existing modules for the operational dashboard.
// Reads only from collections that currently exist (Phase 2 scope).

import { listProjects } from "./projectService";
import { listTasks } from "./taskService";
import { listMilestones } from "./milestoneService";
import { listUsers } from "./userService";
import { toDate } from "../utils/dates";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function loadDashboard() {
  const [projects, tasks, milestones, users] = await Promise.all([
    listProjects(),
    listTasks(),
    listMilestones(),
    listUsers(),
  ]);

  const today = startOfToday();

  // ---- Projects ----
  const activeProjects = projects.filter((p) => p.status === "active").length;

  // ---- Tasks ----
  const openStatuses = ["backlog", "todo", "in-progress", "review"];
  const openTasks = tasks.filter((t) => openStatuses.includes(t.status));

  const overdueTasks = openTasks.filter((t) => {
    const due = toDate(t.dueDate);
    return due && due < today;
  });

  // Upcoming: due today or later, not done, sorted by soonest.
  const upcomingTasks = openTasks
    .map((t) => ({ ...t, _due: toDate(t.dueDate) }))
    .filter((t) => t._due && t._due >= today)
    .sort((a, b) => a._due - b._due)
    .slice(0, 5);

  // ---- Milestones ----
  const openMilestones = milestones.filter((m) => m.status !== "complete");
  const upcomingMilestones = openMilestones
    .map((m) => ({ ...m, _due: toDate(m.dueDate) }))
    .filter((m) => m._due)
    .sort((a, b) => a._due - b._due)
    .slice(0, 4);

  return {
    counts: {
      totalProjects: projects.length,
      activeProjects,
      openTasks: openTasks.length,
      overdueTasks: overdueTasks.length,
      openMilestones: openMilestones.length,
      teamMembers: users.length,
    },
    upcomingTasks,
    upcomingMilestones,
    projects,
  };
}