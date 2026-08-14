// src/services/notificationService.js
// Derived, read-only notification feed computed from existing CoreForge data.
// No schedulers/Cloud Functions. Dismissed state persists in notificationReads.

import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import { listTasks } from "./taskService";
import { listInvoices } from "./invoiceService";
import { listMeetings } from "./meetingService";
import { listDeployments } from "./deploymentService";
import { listAnnouncements } from "./announcementService";
import { toDate } from "../utils/dates";

const readsRef = collection(db, "notificationReads");

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysBetween(a, b) {
  return Math.round((a - b) / (1000 * 60 * 60 * 24));
}

// Build the derived notifications for the current user, marking dismissed ones.
export async function loadNotifications(uid) {
  const [tasks, invoices, meetings, deployments, announcements, readsSnap] =
    await Promise.all([
      listTasks(),
      listInvoices(),
      listMeetings(),
      listDeployments(),
      listAnnouncements(),
      uid
        ? getDocs(query(readsRef, where("uid", "==", uid)))
        : Promise.resolve({ docs: [] }),
    ]);

  const dismissed = new Set(readsSnap.docs.map((d) => d.data().notifId));
  const today = startOfToday();
  const notifs = [];

  // Task due (due within 3 days or overdue, not done).
  tasks.forEach((t) => {
    if (t.status === "done") return;
    const due = toDate(t.dueDate);
    if (!due) return;
    const diff = daysBetween(due, today);
    if (diff <= 3) {
      notifs.push({
        id: "taskdue-" + t.id,
        type: "task",
        title: diff < 0 ? "Task overdue" : "Task due soon",
        message: t.title,
        date: due,
        link: "/tasks",
        urgent: diff < 0,
      });
    }
  });

  // Invoice overdue (past due, not paid/cancelled).
  invoices.forEach((inv) => {
    const due = toDate(inv.dueDate);
    if (!due) return;
    if (due < today && inv.status !== "paid" && inv.status !== "cancelled") {
      notifs.push({
        id: "invoiceover-" + inv.id,
        type: "invoice",
        title: "Invoice overdue",
        message: (inv.invoiceNumber || "Invoice") + " is past due",
        date: due,
        link: "/invoices",
        urgent: true,
      });
    }
  });

  // Upcoming meeting (today or within 2 days, scheduled).
  meetings.forEach((m) => {
    if (m.status !== "scheduled") return;
    const d = toDate(m.date);
    if (!d) return;
    const diff = daysBetween(d, today);
    if (diff >= 0 && diff <= 2) {
      notifs.push({
        id: "meeting-" + m.id,
        type: "meeting",
        title: "Upcoming meeting",
        message: m.title,
        date: d,
        link: "/meetings",
        urgent: false,
      });
    }
  });

  // Deployment completed (successful).
  deployments.forEach((dep) => {
    if (dep.status === "successful") {
      notifs.push({
        id: "deploy-" + dep.id,
        type: "deployment",
        title: "Deployment successful",
        message: (dep.version || "Deployment") + " → " + (dep.environment || ""),
        date: toDate(dep.deploymentDate),
        link: "/deployments",
        urgent: false,
      });
    }
  });

  // Announcement published.
  announcements.forEach((a) => {
    if (a.status === "published") {
      notifs.push({
        id: "announce-" + a.id,
        type: "announcement",
        title: "Announcement",
        message: a.title,
        date: toDate(a.publishDate),
        link: "/announcements",
        urgent: a.priority === "critical",
      });
    }
  });

  // Sort: urgent first, then most recent date.
  notifs.sort((a, b) => {
    if (a.urgent !== b.urgent) return a.urgent ? -1 : 1;
    const da = a.date ? a.date.getTime() : 0;
    const db2 = b.date ? b.date.getTime() : 0;
    return db2 - da;
  });

  return notifs.map((n) => ({ ...n, read: dismissed.has(n.id) }));
}

// Persist a dismissal for this user.
export async function dismissNotification(uid, notifId) {
  if (!uid) return;
  await addDoc(readsRef, {
    uid,
    notifId,
    createdAt: serverTimestamp(),
  });
}