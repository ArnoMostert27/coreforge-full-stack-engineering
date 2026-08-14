// src/services/searchService.js
// Read-only global search across CoreForge collections.

import { listProjects } from "./projectService";
import { listTasks } from "./taskService";
import { listClients } from "./clientService";
import { listContracts } from "./contractService";
import { listInvoices } from "./invoiceService";
import { listPayments } from "./paymentService";
import { listDeployments } from "./deploymentService";
import { listMeetings } from "./meetingService";
import { listDocs } from "./documentationService";
import { listDecisions } from "./decisionService";

function match(term, ...fields) {
  const haystack = fields.filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(term);
}

// Returns grouped results: [{ type, label, link, items: [{ id, title, subtitle }] }]
export async function globalSearch(rawTerm) {
  const term = (rawTerm || "").trim().toLowerCase();
  if (!term) return [];

  const [
    projects, tasks, clients, contracts, invoices,
    payments, deployments, meetings, docs, decisions,
  ] = await Promise.all([
    listProjects(), listTasks(), listClients(), listContracts(), listInvoices(),
    listPayments(), listDeployments(), listMeetings(), listDocs(), listDecisions(),
  ]);

  const groups = [];

  const projHits = projects
    .filter((p) => match(term, p.name, p.description, p.status))
    .map((p) => ({ id: p.id, title: p.name, subtitle: p.status }));
  if (projHits.length) groups.push({ type: "projects", label: "Projects", link: "/projects", items: projHits });

  const taskHits = tasks
    .filter((t) => match(term, t.title, t.description, t.status, t.priority))
    .map((t) => ({ id: t.id, title: t.title, subtitle: t.status }));
  if (taskHits.length) groups.push({ type: "tasks", label: "Tasks", link: "/tasks", items: taskHits });

  const clientHits = clients
    .filter((c) => match(term, c.companyName, c.primaryContact, c.email))
    .map((c) => ({ id: c.id, title: c.companyName, subtitle: c.primaryContact }));
  if (clientHits.length) groups.push({ type: "clients", label: "Clients", link: "/clients", items: clientHits });

  const contractHits = contracts
    .filter((c) => match(term, c.contractNumber, c.notes, c.status))
    .map((c) => ({ id: c.id, title: c.contractNumber, subtitle: c.status }));
  if (contractHits.length) groups.push({ type: "contracts", label: "Contracts", link: "/contracts", items: contractHits });

  const invoiceHits = invoices
    .filter((i) => match(term, i.invoiceNumber, i.notes, i.status))
    .map((i) => ({ id: i.id, title: i.invoiceNumber, subtitle: i.status }));
  if (invoiceHits.length) groups.push({ type: "invoices", label: "Invoices", link: "/invoices", items: invoiceHits });

  const paymentHits = payments
    .filter((p) => match(term, p.reference, p.method, p.notes))
    .map((p) => ({ id: p.id, title: p.reference || "Payment", subtitle: p.method }));
  if (paymentHits.length) groups.push({ type: "payments", label: "Payments", link: "/payments", items: paymentHits });

  const deployHits = deployments
    .filter((d) => match(term, d.version, d.commitSha, d.deployedBy, d.status))
    .map((d) => ({ id: d.id, title: d.version, subtitle: d.environment }));
  if (deployHits.length) groups.push({ type: "deployments", label: "Deployments", link: "/deployments", items: deployHits });

  const meetingHits = meetings
    .filter((m) => match(term, m.title, m.agenda, m.participants))
    .map((m) => ({ id: m.id, title: m.title, subtitle: m.type }));
  if (meetingHits.length) groups.push({ type: "meetings", label: "Meetings", link: "/meetings", items: meetingHits });

  const docHits = docs
    .filter((d) => match(term, d.title, d.content, d.tags))
    .map((d) => ({ id: d.id, title: d.title, subtitle: d.category }));
  if (docHits.length) groups.push({ type: "documentation", label: "Documentation", link: "/documentation", items: docHits });

  const decisionHits = decisions
    .filter((d) => match(term, d.title, d.description, d.category, d.owner))
    .map((d) => ({ id: d.id, title: d.title, subtitle: d.status }));
  if (decisionHits.length) groups.push({ type: "decisions", label: "Decisions", link: "/decisions", items: decisionHits });

  return groups;
}