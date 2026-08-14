// src/services/calendarService.js
// Read-only aggregation of dated items across CoreForge into calendar events.

import { listTasks } from "./taskService";
import { listProjects } from "./projectService";
import { listContracts } from "./contractService";
import { listInvoices } from "./invoiceService";
import { listMeetings } from "./meetingService";
import { listDeployments } from "./deploymentService";
import { toDate } from "../utils/dates";

// Returns a flat list of events: { id, title, date (JS Date), type, source, link }
export async function loadCalendarEvents() {
  const [tasks, projects, contracts, invoices, meetings, deployments] =
    await Promise.all([
      listTasks(),
      listProjects(),
      listContracts(),
      listInvoices(),
      listMeetings(),
      listDeployments(),
    ]);

  const events = [];

  tasks.forEach((t) => {
    const d = toDate(t.dueDate);
    if (d) {
      events.push({
        id: "task-" + t.id,
        title: t.title,
        date: d,
        type: "task",
        source: "Task due",
        link: "/tasks",
      });
    }
  });

  contracts.forEach((c) => {
    const end = toDate(c.endDate);
    if (end) {
      events.push({
        id: "contract-end-" + c.id,
        title: (c.contractNumber || "Contract") + " ends",
        date: end,
        type: "contract",
        source: "Contract end",
        link: "/contracts",
      });
    }
    const renew = toDate(c.renewalDate);
    if (renew) {
      events.push({
        id: "contract-renew-" + c.id,
        title: (c.contractNumber || "Contract") + " renewal",
        date: renew,
        type: "contract",
        source: "Contract renewal",
        link: "/contracts",
      });
    }
  });

  invoices.forEach((inv) => {
    const due = toDate(inv.dueDate);
    if (due) {
      events.push({
        id: "invoice-" + inv.id,
        title: (inv.invoiceNumber || "Invoice") + " due",
        date: due,
        type: "invoice",
        source: "Invoice due",
        link: "/invoices",
      });
    }
  });

  meetings.forEach((m) => {
    const d = toDate(m.date);
    if (d) {
      events.push({
        id: "meeting-" + m.id,
        title: m.title,
        date: d,
        type: "meeting",
        source: "Meeting",
        link: "/meetings",
      });
    }
  });

  deployments.forEach((dep) => {
    const d = toDate(dep.deploymentDate);
    if (d) {
      events.push({
        id: "deploy-" + dep.id,
        title: (dep.version || "Deployment") + " deploy",
        date: d,
        type: "deployment",
        source: "Deployment",
        link: "/deployments",
      });
    }
  });

  // Sort chronologically.
  events.sort((a, b) => a.date - b.date);
  return events;
}