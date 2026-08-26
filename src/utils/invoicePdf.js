// src/utils/invoicePdf.js
// Builds a real, downloadable PDF of an invoice using jsPDF.
//
// The PDF is drawn as vector text — selectable, searchable and sharp at any
// zoom. It mirrors the layout of components/InvoiceDocument.jsx; if you change
// the on-screen invoice design, change it here too.
//
// Requires: npm install jspdf

import { jsPDF } from "jspdf";
import { COMPANY } from "../companyProfile";
import { toDisplay } from "./dates";
import { formatMoney } from "./money";
import { calculateInvoice, lineTotal } from "./invoice";

// A4 in points.
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const M = 42; // page margin
const RIGHT = PAGE_W - M;
const BOTTOM = PAGE_H - M;

// Column right-edges / left-edge for the line item table.
const COL_DESC_X = M;
const COL_DESC_W = 250;
const COL_QTY_R = M + 300;
const COL_PRICE_R = M + 400;
const COL_AMOUNT_R = RIGHT;

const INK = [26, 29, 33];
const MUTED = [107, 114, 128];
const BODY = [55, 65, 81];
const ACCENT = [209, 83, 26];
const RULE = [229, 231, 235];

function has(v) {
  return v !== undefined && v !== null && String(v).trim() !== "";
}

// toLocaleString can emit non-breaking / narrow-no-break spaces as the
// thousands separator depending on locale; jsPDF's standard fonts don't map
// those, so normalize to a plain space before drawing.
function money(amount, currency) {
  return String(formatMoney(amount, currency)).replace(/[   ]/g, " ");
}

function safeFilename(raw) {
  const base = String(raw || "invoice").trim().replace(/[^a-z0-9._-]+/gi, "-");
  const trimmed = base.replace(/^-+|-+$/g, "");
  return (trimmed || "invoice") + ".pdf";
}

export function buildInvoicePdf({ invoice, client, project, contract }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const currency = invoice.currency || "ZAR";
  const lines =
    invoice.lineItems && invoice.lineItems.length > 0 ? invoice.lineItems : [];
  const totals = calculateInvoice(
    lines,
    invoice.taxPercent,
    invoice.discountPercent
  );
  const bank = COMPANY.bank || {};

  let y = M;

  function setFont(size, style, color) {
    doc.setFont("helvetica", style || "normal");
    doc.setFontSize(size);
    const c = color || INK;
    doc.setTextColor(c[0], c[1], c[2]);
  }

  function rule(atY, color, width) {
    const c = color || RULE;
    doc.setDrawColor(c[0], c[1], c[2]);
    doc.setLineWidth(width || 0.7);
    doc.line(M, atY, RIGHT, atY);
  }

  // Start a new page when `needed` points won't fit.
  function ensure(needed) {
    if (y + needed <= BOTTOM) return false;
    doc.addPage();
    y = M;
    return true;
  }

  // ---------- Header ----------
  const headerTop = y;

  setFont(20, "bold", INK);
  doc.text(COMPANY.name || "", M, y + 4);
  let leftY = y + 18;

  if (has(COMPANY.tagline)) {
    setFont(7.5, "bold", ACCENT);
    doc.text(String(COMPANY.tagline).toUpperCase(), M, leftY);
    leftY += 14;
  } else {
    leftY += 4;
  }

  setFont(8.5, "normal", BODY);
  const companyMeta = [];
  if (has(COMPANY.email)) companyMeta.push(COMPANY.email);
  if (has(COMPANY.phone)) companyMeta.push(COMPANY.phone);
  if (has(COMPANY.website)) companyMeta.push(COMPANY.website);
  (COMPANY.addressLines || []).forEach((l) => {
    if (has(l)) companyMeta.push(l);
  });
  if (has(COMPANY.registrationNumber))
    companyMeta.push("Reg. No. " + COMPANY.registrationNumber);
  if (has(COMPANY.vatNumber)) companyMeta.push("VAT No. " + COMPANY.vatNumber);

  companyMeta.forEach((l) => {
    doc.text(String(l), M, leftY);
    leftY += 11;
  });

  // Right-hand title block.
  let rightY = headerTop + 4;
  setFont(20, "bold", ACCENT);
  doc.text("INVOICE", RIGHT, rightY, { align: "right" });
  rightY += 16;

  setFont(11, "bold", INK);
  doc.text(String(invoice.invoiceNumber || ""), RIGHT, rightY, { align: "right" });
  rightY += 16;

  const metaRows = [
    ["Issue Date", toDisplay(invoice.issueDate)],
    ["Due Date", toDisplay(invoice.dueDate)],
    ["Currency", currency],
  ];
  metaRows.forEach(([label, value]) => {
    setFont(8.5, "normal", MUTED);
    doc.text(label, RIGHT - 110, rightY, { align: "left" });
    setFont(8.5, "bold", INK);
    doc.text(String(value), RIGHT, rightY, { align: "right" });
    rightY += 12;
  });

  y = Math.max(leftY, rightY) + 8;
  rule(y, INK, 1.4);
  y += 22;

  // ---------- Bill To ----------
  const partyTop = y;

  setFont(7.5, "bold", MUTED);
  doc.text("BILL TO", M, y);
  let billY = y + 14;

  setFont(11.5, "bold", INK);
  doc.text(String(client?.companyName || "—"), M, billY);
  billY += 13;

  setFont(8.5, "normal", BODY);
  const clientMeta = [];
  if (has(client?.primaryContact)) clientMeta.push(client.primaryContact);
  if (has(client?.email)) clientMeta.push(client.email);
  if (has(client?.phone)) clientMeta.push(client.phone);
  if (has(client?.address)) {
    String(client.address)
      .split("\n")
      .filter((l) => l.trim())
      .forEach((l) => clientMeta.push(l.trim()));
  }
  clientMeta.forEach((l) => {
    doc.text(String(l), M, billY);
    billY += 11;
  });

  // Reference block on the right, when there is one.
  let refY = partyTop;
  if (has(project?.name) || has(contract?.contractNumber)) {
    setFont(7.5, "bold", MUTED);
    doc.text("REFERENCE", M + 280, refY);
    refY += 14;
    setFont(8.5, "normal", BODY);
    if (has(project?.name)) {
      doc.text("Project: " + project.name, M + 280, refY);
      refY += 11;
    }
    if (has(contract?.contractNumber)) {
      doc.text("Contract: " + contract.contractNumber, M + 280, refY);
      refY += 11;
    }
  }

  y = Math.max(billY, refY) + 16;

  // ---------- Line items ----------
  function drawTableHeader() {
    setFont(7.5, "bold", MUTED);
    doc.text("DESCRIPTION", COL_DESC_X, y);
    doc.text("QTY", COL_QTY_R, y, { align: "right" });
    doc.text("UNIT PRICE", COL_PRICE_R, y, { align: "right" });
    doc.text("AMOUNT", COL_AMOUNT_R, y, { align: "right" });
    y += 6;
    rule(y, INK, 1);
    y += 14;
  }

  ensure(70);
  drawTableHeader();

  if (lines.length === 0) {
    setFont(9.5, "italic", MUTED);
    doc.text("No line items on this invoice.", COL_DESC_X, y);
    y += 18;
  }

  lines.forEach((li) => {
    setFont(9.5, "normal", INK);
    const wrapped = doc.splitTextToSize(
      String(li.description || "—"),
      COL_DESC_W
    );
    const rowH = Math.max(wrapped.length * 12, 12) + 10;

    if (ensure(rowH + 10)) drawTableHeader();

    setFont(9.5, "normal", INK);
    doc.text(wrapped, COL_DESC_X, y);
    doc.text(String(Number(li.quantity) || 0), COL_QTY_R, y, { align: "right" });
    doc.text(money(li.unitPrice, currency), COL_PRICE_R, y, {
      align: "right",
    });
    setFont(9.5, "bold", INK);
    doc.text(money(lineTotal(li), currency), COL_AMOUNT_R, y, {
      align: "right",
    });

    y += rowH - 6;
    rule(y, RULE, 0.6);
    y += 14;
  });

  // ---------- Totals ----------
  ensure(90);
  y += 6;

  const totalRows = [["Subtotal", money(totals.subtotal, currency)]];
  if (Number(invoice.discountPercent) > 0) {
    totalRows.push([
      `Discount (${Number(invoice.discountPercent)}%)`,
      "-" + money(totals.discountAmount, currency),
    ]);
  }
  if (Number(invoice.taxPercent) > 0) {
    totalRows.push([
      `Tax (${Number(invoice.taxPercent)}%)`,
      money(totals.taxAmount, currency),
    ]);
  }

  totalRows.forEach(([label, value]) => {
    setFont(9.5, "normal", BODY);
    doc.text(label, RIGHT - 200, y, { align: "left" });
    setFont(9.5, "normal", INK);
    doc.text(value, RIGHT, y, { align: "right" });
    y += 14;
  });

  y += 2;
  doc.setDrawColor(INK[0], INK[1], INK[2]);
  doc.setLineWidth(1.4);
  doc.line(RIGHT - 210, y, RIGHT, y);
  y += 16;

  setFont(13, "bold", INK);
  doc.text("Total Due", RIGHT - 200, y, { align: "left" });
  doc.text(money(totals.total, currency), RIGHT, y, { align: "right" });
  y += 26;

  // ---------- Payment details / notes ----------
  const paymentLines = [];
  if (has(bank.name)) paymentLines.push("Bank: " + bank.name);
  if (has(bank.accountName)) paymentLines.push("Account Name: " + bank.accountName);
  if (has(bank.accountNumber))
    paymentLines.push("Account Number: " + bank.accountNumber);
  if (has(bank.branchCode)) paymentLines.push("Branch Code: " + bank.branchCode);
  if (has(bank.swift)) paymentLines.push("SWIFT: " + bank.swift);
  if (paymentLines.length > 0 || has(COMPANY.paymentTerms)) {
    paymentLines.push("Reference: " + (invoice.invoiceNumber || ""));
  }

  const showPayment = paymentLines.length > 0;
  const showNotes = has(invoice.notes);

  if (showPayment || showNotes) {
    ensure(90);
    rule(y, RULE, 0.6);
    y += 16;
    const blockTop = y;
    let leftBlockY = y;
    let rightBlockY = y;

    if (showPayment) {
      setFont(7.5, "bold", MUTED);
      doc.text("PAYMENT DETAILS", M, leftBlockY);
      leftBlockY += 13;
      setFont(8.5, "normal", BODY);
      paymentLines.forEach((l) => {
        doc.text(l, M, leftBlockY);
        leftBlockY += 11;
      });
      if (has(COMPANY.paymentTerms)) {
        setFont(8.5, "italic", MUTED);
        const terms = doc.splitTextToSize(String(COMPANY.paymentTerms), 230);
        doc.text(terms, M, leftBlockY + 4);
        leftBlockY += terms.length * 11 + 4;
      }
    }

    if (showNotes) {
      const notesX = showPayment ? M + 270 : M;
      rightBlockY = blockTop;
      setFont(7.5, "bold", MUTED);
      doc.text("NOTES", notesX, rightBlockY);
      rightBlockY += 13;
      setFont(8.5, "normal", BODY);
      const notes = doc.splitTextToSize(String(invoice.notes), 230);
      doc.text(notes, notesX, rightBlockY);
      rightBlockY += notes.length * 11;
    }

    y = Math.max(leftBlockY, rightBlockY) + 14;
  }

  if (has(COMPANY.footerNote)) {
    ensure(40);
    rule(y, RULE, 0.6);
    y += 14;
    setFont(8, "normal", MUTED);
    const footer = doc.splitTextToSize(String(COMPANY.footerNote), RIGHT - M);
    doc.text(footer, PAGE_W / 2, y, { align: "center" });
  }

  // ---------- Page numbers (only when there is more than one) ----------
  const pageCount = doc.getNumberOfPages();
  if (pageCount > 1) {
    for (let p = 1; p <= pageCount; p += 1) {
      doc.setPage(p);
      setFont(8, "normal", MUTED);
      doc.text(
        `${invoice.invoiceNumber || "Invoice"} — page ${p} of ${pageCount}`,
        PAGE_W / 2,
        PAGE_H - 22,
        { align: "center" }
      );
    }
  }

  return doc;
}

// Build and save the PDF straight to the user's downloads.
export function downloadInvoicePdf(args) {
  const doc = buildInvoicePdf(args);
  doc.save(safeFilename(args.invoice?.invoiceNumber));
}
