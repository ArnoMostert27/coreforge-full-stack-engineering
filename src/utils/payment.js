// src/utils/payment.js
// Centralized payment math. Payments are the authoritative financial source.

// Sum all payment amounts for a given invoice id.
export function amountPaidForInvoice(payments, invoiceId) {
  return (payments || [])
    .filter((p) => p.invoiceId === invoiceId)
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

// Outstanding = total - paid, never negative.
export function outstanding(invoiceTotal, paid) {
  const value = (Number(invoiceTotal) || 0) - (Number(paid) || 0);
  return value < 0 ? 0 : value;
}

// Determine the settled status for an invoice given paid vs total.
// Does not touch cancelled/draft — only moves between sent/partially-paid/paid.
export function settledStatus(currentStatus, invoiceTotal, paid) {
  if (currentStatus === "cancelled") return "cancelled";

  const total = Number(invoiceTotal) || 0;
  const amount = Number(paid) || 0;

  if (amount <= 0) {
    // Nothing paid: keep draft as draft, otherwise treat as sent.
    return currentStatus === "draft" ? "draft" : "sent";
  }
  if (amount >= total && total > 0) return "paid";
  return "partially-paid";
}