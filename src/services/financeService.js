// src/services/financeService.js
// Financial aggregation for the Dashboard's Business section.
// Payments are the source of truth for revenue; invoices define what's owed.

import { listInvoices } from "./invoiceService";
import { listPayments } from "./paymentService";
import { listClients } from "./clientService";
import { listProjects } from "./projectService";
import { toDate } from "../utils/dates";
import { amountPaidForInvoice, outstanding } from "../utils/payment";

function isSameMonth(date, ref) {
  return (
    date.getFullYear() === ref.getFullYear() &&
    date.getMonth() === ref.getMonth()
  );
}

function isOverdue(invoice) {
  const due = toDate(invoice.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return (
    due &&
    due < today &&
    invoice.status !== "paid" &&
    invoice.status !== "cancelled"
  );
}

export async function loadFinance() {
  const [invoices, payments, clients, projects] = await Promise.all([
    listInvoices(),
    listPayments(),
    listClients(),
    listProjects(),
  ]);

  const now = new Date();

  // ---- Total revenue = sum of all recorded payments ----
  const totalRevenue = payments.reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );

  // ---- Paid this month ----
  const paidThisMonth = payments.reduce((sum, p) => {
    const d = toDate(p.paymentDate);
    if (d && isSameMonth(d, now)) return sum + (Number(p.amount) || 0);
    return sum;
  }, 0);

  // ---- Outstanding + overdue (per invoice, from payments) ----
  let outstandingTotal = 0;
  let overdueTotal = 0;

  invoices.forEach((inv) => {
    if (inv.status === "cancelled") return;
    const paid = amountPaidForInvoice(payments, inv.id);
    const out = outstanding(inv.total, paid);
    outstandingTotal += out;
    if (isOverdue(inv)) overdueTotal += out;
  });

  // ---- Revenue by client (from payments) ----
  const clientMap = {};
  clients.forEach((c) => (clientMap[c.id] = c.companyName));

  const byClientObj = {};
  payments.forEach((p) => {
    const key = p.clientId || "unassigned";
    byClientObj[key] = (byClientObj[key] || 0) + (Number(p.amount) || 0);
  });
  const revenueByClient = Object.entries(byClientObj)
    .map(([clientId, amount]) => ({
      name: clientMap[clientId] || "Unassigned",
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  // ---- Revenue by project (payment → invoice → project) ----
  const invoiceProject = {};
  invoices.forEach((inv) => (invoiceProject[inv.id] = inv.projectId || null));
  const projectMap = {};
  projects.forEach((p) => (projectMap[p.id] = p.name));

  const byProjectObj = {};
  payments.forEach((p) => {
    const projectId = p.invoiceId ? invoiceProject[p.invoiceId] : null;
    const key = projectId || "unassigned";
    byProjectObj[key] = (byProjectObj[key] || 0) + (Number(p.amount) || 0);
  });
  const revenueByProject = Object.entries(byProjectObj)
    .map(([projectId, amount]) => ({
      name: projectMap[projectId] || "Unassigned",
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  // ---- Recent payments (latest 6) ----
  const recentPayments = payments.slice(0, 6).map((p) => ({
    id: p.id,
    amount: p.amount,
    currency: p.currency,
    date: p.paymentDate,
    client: clientMap[p.clientId] || "—",
    invoiceId: p.invoiceId,
  }));

  // Currency for display — use the first invoice's, default ZAR.
  const currency = invoices[0]?.currency || "ZAR";

  return {
    currency,
    summary: {
      totalRevenue,
      outstandingTotal,
      overdueTotal,
      paidThisMonth,
    },
    revenueByClient,
    revenueByProject,
    recentPayments,
    invoiceLookup: invoices.reduce((m, i) => {
      m[i.id] = i.invoiceNumber;
      return m;
    }, {}),
  };
}