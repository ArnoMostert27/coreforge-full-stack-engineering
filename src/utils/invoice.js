// src/utils/invoice.js
// Centralized invoice math. All totals derive from line items + tax + discount.

// A line item: { description, quantity, unitPrice }
export function lineTotal(item) {
  const qty = Number(item.quantity) || 0;
  const price = Number(item.unitPrice) || 0;
  return qty * price;
}

// Given line items + tax% + discount%, compute the money breakdown.
export function calculateInvoice(lineItems, taxPercent, discountPercent) {
  const subtotal = (lineItems || []).reduce(
    (sum, item) => sum + lineTotal(item),
    0
  );

  const discountRate = (Number(discountPercent) || 0) / 100;
  const taxRate = (Number(taxPercent) || 0) / 100;

  const discountAmount = subtotal * discountRate;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = afterDiscount * taxRate;
  const total = afterDiscount + taxAmount;

  return {
    subtotal,
    discountAmount,
    taxAmount,
    total,
  };
}