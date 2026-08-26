// src/pages/Invoices.jsx

import { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import InvoiceDocument from "../components/InvoiceDocument";
import { useAuth } from "../context/AuthContext";
import { listClients } from "../services/clientService";
import { listProjects } from "../services/projectService";
import { listContracts } from "../services/contractService";
import {
  createInvoice,
  listInvoices,
  updateInvoice,
  deleteInvoice,
} from "../services/invoiceService";
import { toInputValue, toDisplay, toDate } from "../utils/dates";
import { formatMoney, CURRENCY_OPTIONS } from "../utils/money";
import { calculateInvoice, lineTotal } from "../utils/invoice";
import "../components/Modal.css";
import "./Invoices.css";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "partially-paid", label: "Partially Paid" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];

const EMPTY_LINE = { description: "", quantity: 1, unitPrice: 0 };

const EMPTY_FORM = {
  invoiceNumber: "",
  clientId: "",
  projectId: "",
  contractId: "",
  issueDate: "",
  dueDate: "",
  lineItems: [{ ...EMPTY_LINE }],
  taxPercent: 0,
  discountPercent: 0,
  currency: "ZAR",
  status: "draft",
  notes: "",
};

function statusLabel(value) {
  return STATUS_OPTIONS.find((s) => s.value === value)?.label || value;
}

// Derived display status: overdue if past due and not paid/cancelled.
function displayStatus(inv) {
  const due = toDate(inv.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (
    due &&
    due < today &&
    inv.status !== "paid" &&
    inv.status !== "cancelled"
  ) {
    return { key: "overdue", label: "Overdue" };
  }
  return { key: inv.status, label: statusLabel(inv.status) };
}

function Invoices() {
  const { user } = useAuth();

  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalMode, setModalMode] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Invoice currently open in the print/PDF preview.
  const [pdfTarget, setPdfTarget] = useState(null);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [invData, clientData, projectData, contractData] =
        await Promise.all([
          listInvoices(),
          listClients(),
          listProjects(),
          listContracts(),
        ]);
      setInvoices(invData);
      setClients(clientData);
      setProjects(projectData);
      setContracts(contractData);
    } catch (err) {
      console.error(err);
      setError("Could not load invoices.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function clientName(id) {
    if (!id) return "—";
    return clients.find((c) => c.id === id)?.companyName || "—";
  }

  function clientById(id) {
    return clients.find((c) => c.id === id) || null;
  }
  function projectById(id) {
    return projects.find((p) => p.id === id) || null;
  }
  function contractById(id) {
    return contracts.find((c) => c.id === id) || null;
  }

  function openCreate() {
    setModalMode("create");
    setEditingId(null);
    setForm({ ...EMPTY_FORM, lineItems: [{ ...EMPTY_LINE }] });
    setFormError("");
  }

  function openEdit(inv) {
    setModalMode("edit");
    setEditingId(inv.id);
    setForm({
      invoiceNumber: inv.invoiceNumber || "",
      clientId: inv.clientId || "",
      projectId: inv.projectId || "",
      contractId: inv.contractId || "",
      issueDate: toInputValue(inv.issueDate),
      dueDate: toInputValue(inv.dueDate),
      lineItems:
        inv.lineItems && inv.lineItems.length > 0
          ? inv.lineItems.map((li) => ({ ...li }))
          : [{ ...EMPTY_LINE }],
      taxPercent: inv.taxPercent ?? 0,
      discountPercent: inv.discountPercent ?? 0,
      currency: inv.currency || "ZAR",
      status: inv.status || "draft",
      notes: inv.notes || "",
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

  function updateLine(index, field, value) {
    setForm((f) => {
      const lineItems = f.lineItems.map((li, i) =>
        i === index ? { ...li, [field]: value } : li
      );
      return { ...f, lineItems };
    });
  }

  function addLine() {
    setForm((f) => ({ ...f, lineItems: [...f.lineItems, { ...EMPTY_LINE }] }));
  }

  function removeLine(index) {
    setForm((f) => {
      if (f.lineItems.length === 1) return f;
      return { ...f, lineItems: f.lineItems.filter((_, i) => i !== index) };
    });
  }

  const liveTotals = calculateInvoice(
    form.lineItems,
    form.taxPercent,
    form.discountPercent
  );

  async function handleSave() {
    setFormError("");
    if (!form.invoiceNumber.trim()) {
      setFormError("Invoice number is required.");
      return;
    }
    setSaving(true);
    try {
      const snapshot = { ...form, lineItems: form.lineItems.map((li) => ({ ...li })) };
      const wasCreate = !(modalMode === "edit" && editingId);

      if (wasCreate) {
        await createInvoice(form, user?.uid);
      } else {
        await updateInvoice(editingId, form);
      }
      setModalMode(null);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadAll();

      // A freshly created invoice opens straight into the PDF preview.
      if (wasCreate) setPdfTarget(snapshot);
    } catch (err) {
      console.error(err);
      setFormError("Could not save invoice.");
    } finally {
      setSaving(false);
    }
  }

  function askDelete(inv) {
    setDeleteTarget({ id: inv.id, number: inv.invoiceNumber });
  }
  function cancelDelete() {
    if (deleting) return;
    setDeleteTarget(null);
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteInvoice(deleteTarget.id);
      setDeleteTarget(null);
      await loadAll();
    } catch (err) {
      console.error(err);
      setError("Could not delete invoice.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AppLayout>
      <div className="inv-head">
        <div className="page-title">Invoices</div>
        <button className="inv-new-btn" onClick={openCreate}>
          New Invoice
        </button>
      </div>

      {loading && <div className="inv-status">Loading invoices…</div>}
      {error && <div className="inv-status inv-error">{error}</div>}

      {!loading && !error && invoices.length === 0 && (
        <div className="inv-empty">
          No invoices yet. Create your first invoice to get started.
        </div>
      )}

      {!loading && !error && invoices.length > 0 && (
        <div className="inv-table">
          <div className="inv-row inv-row-header">
            <div className="inv-cell inv-cell-num">Number</div>
            <div className="inv-cell inv-cell-client">Client</div>
            <div className="inv-cell inv-cell-total">Total</div>
            <div className="inv-cell inv-cell-due">Due</div>
            <div className="inv-cell inv-cell-status">Status</div>
            <div className="inv-cell inv-cell-actions">Actions</div>
          </div>

          {invoices.map((inv) => {
            const ds = displayStatus(inv);
            return (
              <div className="inv-row" key={inv.id}>
                <div className="inv-cell inv-cell-num">
                  {inv.invoiceNumber}
                </div>
                <div className="inv-cell inv-cell-client">
                  {clientName(inv.clientId)}
                </div>
                <div className="inv-cell inv-cell-total">
                  {formatMoney(inv.total, inv.currency)}
                </div>
                <div className="inv-cell inv-cell-due">
                  {toDisplay(inv.dueDate)}
                </div>
                <div className="inv-cell inv-cell-status">
                  <span className={"inv-badge status-" + ds.key}>
                    {ds.label}
                  </span>
                </div>
                <div className="inv-cell inv-cell-actions">
                  <button
                    className="inv-action-btn"
                    onClick={() => setPdfTarget(inv)}
                    title="Open print / PDF preview"
                  >
                    PDF
                  </button>
                  <button
                    className="inv-action-btn"
                    onClick={() => openEdit(inv)}
                  >
                    Edit
                  </button>
                  <button
                    className="inv-action-btn inv-action-danger"
                    onClick={() => askDelete(inv)}
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
          <div
            className="modal-panel inv-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-title">
              {modalMode === "edit" ? "Edit Invoice" : "New Invoice"}
            </div>

            {formError && <div className="form-error">{formError}</div>}

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Invoice Number</label>
                <input
                  className="form-input"
                  value={form.invoiceNumber}
                  onChange={(e) =>
                    updateField("invoiceNumber", e.target.value)
                  }
                  disabled={saving}
                  autoFocus
                />
              </div>
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
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Client</label>
                <select
                  className="form-input"
                  value={form.clientId}
                  onChange={(e) => updateField("clientId", e.target.value)}
                  disabled={saving}
                >
                  <option value="">— No client —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
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
                <label className="form-label">Contract</label>
                <select
                  className="form-input"
                  value={form.contractId}
                  onChange={(e) => updateField("contractId", e.target.value)}
                  disabled={saving}
                >
                  <option value="">— No contract —</option>
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.contractNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Currency</label>
                <select
                  className="form-input"
                  value={form.currency}
                  onChange={(e) => updateField("currency", e.target.value)}
                  disabled={saving}
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Issue Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.issueDate}
                  onChange={(e) => updateField("issueDate", e.target.value)}
                  disabled={saving}
                />
              </div>
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
            </div>

            {/* ---- Line items ---- */}
            <div className="inv-lines">
              <div className="inv-lines-head">
                <span className="form-label">Line Items</span>
                <button
                  type="button"
                  className="inv-add-line"
                  onClick={addLine}
                  disabled={saving}
                >
                  + Add Line
                </button>
              </div>

              <div className="inv-line inv-line-header">
                <span className="inv-line-desc">Description</span>
                <span className="inv-line-qty">Qty</span>
                <span className="inv-line-price">Unit Price</span>
                <span className="inv-line-total">Total</span>
                <span className="inv-line-remove" />
              </div>

              {form.lineItems.map((li, i) => (
                <div className="inv-line" key={i}>
                  <input
                    className="form-input inv-line-desc"
                    value={li.description}
                    onChange={(e) =>
                      updateLine(i, "description", e.target.value)
                    }
                    disabled={saving}
                    placeholder="Description"
                  />
                  <input
                    className="form-input inv-line-qty"
                    type="number"
                    min="0"
                    step="1"
                    value={li.quantity}
                    onChange={(e) => updateLine(i, "quantity", e.target.value)}
                    disabled={saving}
                  />
                  <input
                    className="form-input inv-line-price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={li.unitPrice}
                    onChange={(e) => updateLine(i, "unitPrice", e.target.value)}
                    disabled={saving}
                  />
                  <span className="inv-line-total">
                    {formatMoney(lineTotal(li), form.currency)}
                  </span>
                  <button
                    type="button"
                    className="inv-line-remove"
                    onClick={() => removeLine(i)}
                    disabled={saving || form.lineItems.length === 1}
                    title="Remove line"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Discount (%)</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.discountPercent}
                  onChange={(e) =>
                    updateField("discountPercent", e.target.value)
                  }
                  disabled={saving}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Tax (%)</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.taxPercent}
                  onChange={(e) => updateField("taxPercent", e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            {/* ---- Live totals ---- */}
            <div className="inv-totals">
              <div className="inv-totals-row">
                <span>Subtotal</span>
                <span>{formatMoney(liveTotals.subtotal, form.currency)}</span>
              </div>
              <div className="inv-totals-row">
                <span>Discount</span>
                <span>
                  −{formatMoney(liveTotals.discountAmount, form.currency)}
                </span>
              </div>
              <div className="inv-totals-row">
                <span>Tax</span>
                <span>{formatMoney(liveTotals.taxAmount, form.currency)}</span>
              </div>
              <div className="inv-totals-row inv-totals-grand">
                <span>Total</span>
                <span>{formatMoney(liveTotals.total, form.currency)}</span>
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Notes</label>
              <textarea
                className="form-input form-textarea"
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                disabled={saving}
                rows={2}
              />
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
                  : "Create Invoice"}
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
            <div className="modal-title">Delete Invoice</div>
            <p className="modal-text">
              Are you sure you want to delete{" "}
              <span className="modal-emphasis">{deleteTarget.number}</span>?
              This action cannot be undone.
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

      {pdfTarget && (
        <InvoiceDocument
          invoice={pdfTarget}
          client={clientById(pdfTarget.clientId)}
          project={projectById(pdfTarget.projectId)}
          contract={contractById(pdfTarget.contractId)}
          onClose={() => setPdfTarget(null)}
        />
      )}
    </AppLayout>
  );
}

export default Invoices;