// src/pages/Payments.jsx

import { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { listClients } from "../services/clientService";
import { listInvoices } from "../services/invoiceService";
import {
  listPayments,
  createPayment,
  deletePayment,
} from "../services/paymentService";
import { toInputValue, toDisplay } from "../utils/dates";
import { formatMoney } from "../utils/money";
import { amountPaidForInvoice, outstanding } from "../utils/payment";
import "../components/Modal.css";
import "./Payments.css";

const METHOD_OPTIONS = [
  "EFT",
  "Card",
  "Cash",
  "PayPal",
  "Other",
];

const EMPTY_FORM = {
  invoiceId: "",
  amount: "",
  paymentDate: "",
  method: "EFT",
  reference: "",
  notes: "",
};

function Payments() {
  const { user } = useAuth();

  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [payData, invData, clientData] = await Promise.all([
        listPayments(),
        listInvoices(),
        listClients(),
      ]);
      setPayments(payData);
      setInvoices(invData);
      setClients(clientData);
    } catch (err) {
      console.error(err);
      setError("Could not load payments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function invoiceById(id) {
    return invoices.find((i) => i.id === id) || null;
  }
  function clientName(id) {
    if (!id) return "—";
    return clients.find((c) => c.id === id)?.companyName || "—";
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormError("");
    setShowModal(true);
  }
  function closeModal() {
    if (saving) return;
    setShowModal(false);
    setForm(EMPTY_FORM);
    setFormError("");
  }
  function updateField(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // When an invoice is chosen, prefill amount with its outstanding balance.
  function selectInvoice(invoiceId) {
    const inv = invoiceById(invoiceId);
    let suggested = "";
    if (inv) {
      const paid = amountPaidForInvoice(payments, invoiceId);
      suggested = outstanding(inv.total, paid);
    }
    setForm((f) => ({
      ...f,
      invoiceId,
      amount: suggested !== "" ? String(suggested) : f.amount,
    }));
  }

  async function handleSave() {
    setFormError("");
    if (!form.invoiceId) {
      setFormError("Select an invoice.");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      setFormError("Enter a payment amount greater than zero.");
      return;
    }

    const inv = invoiceById(form.invoiceId);
    setSaving(true);
    try {
      await createPayment(
        {
          invoiceId: form.invoiceId,
          clientId: inv?.clientId || null,
          amount: form.amount,
          currency: inv?.currency || "ZAR",
          paymentDate: form.paymentDate,
          method: form.method,
          reference: form.reference,
          notes: form.notes,
        },
        user?.uid
      );
      setShowModal(false);
      setForm(EMPTY_FORM);
      await loadAll();
    } catch (err) {
      console.error(err);
      setFormError("Could not record payment.");
    } finally {
      setSaving(false);
    }
  }

  function askDelete(p) {
    setDeleteTarget(p);
  }
  function cancelDelete() {
    if (deleting) return;
    setDeleteTarget(null);
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePayment(deleteTarget.id);
      setDeleteTarget(null);
      await loadAll();
    } catch (err) {
      console.error(err);
      setError("Could not delete payment.");
    } finally {
      setDeleting(false);
    }
  }

  // For the selected invoice in the modal, show live paid/outstanding.
  const selectedInvoice = invoiceById(form.invoiceId);
  const selectedPaid = selectedInvoice
    ? amountPaidForInvoice(payments, selectedInvoice.id)
    : 0;
  const selectedOutstanding = selectedInvoice
    ? outstanding(selectedInvoice.total, selectedPaid)
    : 0;

  return (
    <AppLayout>
      <div className="pay-head">
        <div className="page-title">Payments</div>
        <button className="pay-new-btn" onClick={openCreate}>
          Record Payment
        </button>
      </div>

      {loading && <div className="pay-status">Loading payments…</div>}
      {error && <div className="pay-status pay-error">{error}</div>}

      {!loading && !error && payments.length === 0 && (
        <div className="pay-empty">
          No payments recorded yet. Record a payment against an invoice to get
          started.
        </div>
      )}

      {!loading && !error && payments.length > 0 && (
        <div className="pay-table">
          <div className="pay-row pay-row-header">
            <div className="pay-cell pay-cell-invoice">Invoice</div>
            <div className="pay-cell pay-cell-client">Client</div>
            <div className="pay-cell pay-cell-amount">Amount</div>
            <div className="pay-cell pay-cell-method">Method</div>
            <div className="pay-cell pay-cell-date">Date</div>
            <div className="pay-cell pay-cell-actions">Actions</div>
          </div>

          {payments.map((p) => {
            const inv = invoiceById(p.invoiceId);
            return (
              <div className="pay-row" key={p.id}>
                <div className="pay-cell pay-cell-invoice">
                  {inv?.invoiceNumber || "—"}
                </div>
                <div className="pay-cell pay-cell-client">
                  {clientName(p.clientId)}
                </div>
                <div className="pay-cell pay-cell-amount">
                  {formatMoney(p.amount, p.currency)}
                </div>
                <div className="pay-cell pay-cell-method">
                  {p.method || "—"}
                </div>
                <div className="pay-cell pay-cell-date">
                  {toDisplay(p.paymentDate)}
                </div>
                <div className="pay-cell pay-cell-actions">
                  <button
                    className="pay-action-btn pay-action-danger"
                    onClick={() => askDelete(p)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Invoice settlement overview ---- */}
      {!loading && !error && invoices.length > 0 && (
        <div className="pay-overview">
          <div className="pay-overview-title">Invoice Settlement</div>
          <div className="pay-otable">
            <div className="pay-orow pay-orow-header">
              <div className="pay-ocell pay-ocell-num">Invoice</div>
              <div className="pay-ocell pay-ocell-total">Total</div>
              <div className="pay-ocell pay-ocell-paid">Paid</div>
              <div className="pay-ocell pay-ocell-out">Outstanding</div>
              <div className="pay-ocell pay-ocell-status">Status</div>
            </div>

            {invoices.map((inv) => {
              const paid = amountPaidForInvoice(payments, inv.id);
              const out = outstanding(inv.total, paid);
              return (
                <div className="pay-orow" key={inv.id}>
                  <div className="pay-ocell pay-ocell-num">
                    {inv.invoiceNumber}
                  </div>
                  <div className="pay-ocell pay-ocell-total">
                    {formatMoney(inv.total, inv.currency)}
                  </div>
                  <div className="pay-ocell pay-ocell-paid">
                    {formatMoney(paid, inv.currency)}
                  </div>
                  <div className="pay-ocell pay-ocell-out">
                    {formatMoney(out, inv.currency)}
                  </div>
                  <div className="pay-ocell pay-ocell-status">
                    <span className={"pay-badge status-" + inv.status}>
                      {inv.status.replace("-", " ")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Record Payment</div>

            {formError && <div className="form-error">{formError}</div>}

            <div className="form-field">
              <label className="form-label">Invoice</label>
              <select
                className="form-input"
                value={form.invoiceId}
                onChange={(e) => selectInvoice(e.target.value)}
                disabled={saving}
                autoFocus
              >
                <option value="">— Select invoice —</option>
                {invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNumber} · {formatMoney(inv.total, inv.currency)}
                  </option>
                ))}
              </select>
            </div>

            {selectedInvoice && (
              <div className="pay-selected">
                <div className="pay-selected-row">
                  <span>Total</span>
                  <span>
                    {formatMoney(selectedInvoice.total, selectedInvoice.currency)}
                  </span>
                </div>
                <div className="pay-selected-row">
                  <span>Already paid</span>
                  <span>
                    {formatMoney(selectedPaid, selectedInvoice.currency)}
                  </span>
                </div>
                <div className="pay-selected-row pay-selected-out">
                  <span>Outstanding</span>
                  <span>
                    {formatMoney(selectedOutstanding, selectedInvoice.currency)}
                  </span>
                </div>
              </div>
            )}

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Amount</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => updateField("amount", e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Method</label>
                <select
                  className="form-input"
                  value={form.method}
                  onChange={(e) => updateField("method", e.target.value)}
                  disabled={saving}
                >
                  {METHOD_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Payment Date</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) => updateField("paymentDate", e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Reference</label>
                <input
                  className="form-input"
                  value={form.reference}
                  onChange={(e) => updateField("reference", e.target.value)}
                  disabled={saving}
                />
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
                {saving ? "Recording…" : "Record Payment"}
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
            <div className="modal-title">Delete Payment</div>
            <p className="modal-text">
              Delete this payment of{" "}
              <span className="modal-emphasis">
                {formatMoney(deleteTarget.amount, deleteTarget.currency)}
              </span>
              ? The linked invoice status will be recalculated.
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

export default Payments;