// src/components/InvoiceDocument.jsx
// Print-ready invoice document. Rendered inside a modal on screen and isolated
// by InvoiceDocument.css when the browser prints, so "Save as PDF" produces
// exactly what is shown here.

import { COMPANY } from "../companyProfile";
import { toDisplay } from "../utils/dates";
import { formatMoney } from "../utils/money";
import { calculateInvoice, lineTotal } from "../utils/invoice";
import "./InvoiceDocument.css";

function has(v) {
  return v !== undefined && v !== null && String(v).trim() !== "";
}

function InvoiceDocument({ invoice, client, project, contract, onClose }) {
  if (!invoice) return null;

  const currency = invoice.currency || "ZAR";
  const lines =
    invoice.lineItems && invoice.lineItems.length > 0 ? invoice.lineItems : [];
  const totals = calculateInvoice(
    lines,
    invoice.taxPercent,
    invoice.discountPercent
  );

  const bank = COMPANY.bank || {};
  const showBank =
    has(bank.name) ||
    has(bank.accountName) ||
    has(bank.accountNumber) ||
    has(bank.branchCode) ||
    has(bank.swift);

  const clientAddress = has(client?.address)
    ? String(client.address).split("\n").filter((l) => l.trim())
    : [];

  return (
    <div className="inv-doc-overlay" onClick={onClose}>
      <div className="inv-doc-shell" onClick={(e) => e.stopPropagation()}>
        <div className="inv-doc-bar inv-doc-noprint">
          <div className="inv-doc-bar-title">
            Invoice {invoice.invoiceNumber} — print preview
          </div>
          <div className="inv-doc-bar-actions">
            <button className="inv-doc-btn" onClick={onClose}>
              Close
            </button>
            <button
              className="inv-doc-btn inv-doc-btn-primary"
              onClick={() => window.print()}
            >
              Download PDF
            </button>
          </div>
        </div>

        <div className="inv-doc-hint inv-doc-noprint">
          In the print dialog choose <strong>Destination → Save as PDF</strong>.
        </div>

        <div className="inv-doc-scroll">
          <div className="inv-doc" id="invoice-document">
            {/* ---- Header ---- */}
            <div className="doc-head">
              <div className="doc-brand">
                <div className="doc-brand-name">{COMPANY.name}</div>
                {has(COMPANY.tagline) && (
                  <div className="doc-brand-tag">{COMPANY.tagline}</div>
                )}
                <div className="doc-brand-meta">
                  {has(COMPANY.email) && <div>{COMPANY.email}</div>}
                  {has(COMPANY.phone) && <div>{COMPANY.phone}</div>}
                  {has(COMPANY.website) && <div>{COMPANY.website}</div>}
                  {(COMPANY.addressLines || []).map((l, i) => (
                    <div key={i}>{l}</div>
                  ))}
                  {has(COMPANY.registrationNumber) && (
                    <div>Reg. No. {COMPANY.registrationNumber}</div>
                  )}
                  {has(COMPANY.vatNumber) && <div>VAT No. {COMPANY.vatNumber}</div>}
                </div>
              </div>

              <div className="doc-title-block">
                <div className="doc-title">Invoice</div>
                <div className="doc-number">{invoice.invoiceNumber}</div>
                <table className="doc-meta-table">
                  <tbody>
                    <tr>
                      <td>Issue Date</td>
                      <td>{toDisplay(invoice.issueDate) || "—"}</td>
                    </tr>
                    <tr>
                      <td>Due Date</td>
                      <td>{toDisplay(invoice.dueDate) || "—"}</td>
                    </tr>
                    <tr>
                      <td>Currency</td>
                      <td>{currency}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* ---- Bill to ---- */}
            <div className="doc-parties">
              <div className="doc-party">
                <div className="doc-party-label">Bill To</div>
                <div className="doc-party-name">
                  {client?.companyName || "—"}
                </div>
                <div className="doc-party-meta">
                  {has(client?.primaryContact) && <div>{client.primaryContact}</div>}
                  {has(client?.email) && <div>{client.email}</div>}
                  {has(client?.phone) && <div>{client.phone}</div>}
                  {clientAddress.map((l, i) => (
                    <div key={i}>{l}</div>
                  ))}
                </div>
              </div>

              {(has(project?.name) || has(contract?.contractNumber)) && (
                <div className="doc-party">
                  <div className="doc-party-label">Reference</div>
                  <div className="doc-party-meta">
                    {has(project?.name) && <div>Project: {project.name}</div>}
                    {has(contract?.contractNumber) && (
                      <div>Contract: {contract.contractNumber}</div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ---- Line items ---- */}
            <table className="doc-lines">
              <thead>
                <tr>
                  <th className="col-desc">Description</th>
                  <th className="col-qty">Qty</th>
                  <th className="col-price">Unit Price</th>
                  <th className="col-total">Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 && (
                  <tr>
                    <td className="col-desc doc-muted" colSpan={4}>
                      No line items on this invoice.
                    </td>
                  </tr>
                )}
                {lines.map((li, i) => (
                  <tr key={i}>
                    <td className="col-desc">{li.description || "—"}</td>
                    <td className="col-qty">{Number(li.quantity) || 0}</td>
                    <td className="col-price">
                      {formatMoney(li.unitPrice, currency)}
                    </td>
                    <td className="col-total">
                      {formatMoney(lineTotal(li), currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ---- Totals ---- */}
            <div className="doc-totals-wrap">
              <table className="doc-totals">
                <tbody>
                  <tr>
                    <td>Subtotal</td>
                    <td>{formatMoney(totals.subtotal, currency)}</td>
                  </tr>
                  {Number(invoice.discountPercent) > 0 && (
                    <tr>
                      <td>Discount ({Number(invoice.discountPercent)}%)</td>
                      <td>−{formatMoney(totals.discountAmount, currency)}</td>
                    </tr>
                  )}
                  {Number(invoice.taxPercent) > 0 && (
                    <tr>
                      <td>Tax ({Number(invoice.taxPercent)}%)</td>
                      <td>{formatMoney(totals.taxAmount, currency)}</td>
                    </tr>
                  )}
                  <tr className="doc-grand">
                    <td>Total Due</td>
                    <td>{formatMoney(totals.total, currency)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ---- Notes / banking ---- */}
            {(has(invoice.notes) || showBank || has(COMPANY.paymentTerms)) && (
              <div className="doc-blocks">
                {(showBank || has(COMPANY.paymentTerms)) && (
                  <div className="doc-block">
                    <div className="doc-block-label">Payment Details</div>
                    <div className="doc-block-body">
                      {has(bank.name) && <div>Bank: {bank.name}</div>}
                      {has(bank.accountName) && <div>Account Name: {bank.accountName}</div>}
                      {has(bank.accountNumber) && <div>Account Number: {bank.accountNumber}</div>}
                      {has(bank.branchCode) && <div>Branch Code: {bank.branchCode}</div>}
                      {has(bank.swift) && <div>SWIFT: {bank.swift}</div>}
                      <div>Reference: {invoice.invoiceNumber}</div>
                      {has(COMPANY.paymentTerms) && (
                        <div className="doc-terms">{COMPANY.paymentTerms}</div>
                      )}
                    </div>
                  </div>
                )}

                {has(invoice.notes) && (
                  <div className="doc-block">
                    <div className="doc-block-label">Notes</div>
                    <div className="doc-block-body doc-prewrap">{invoice.notes}</div>
                  </div>
                )}
              </div>
            )}

            {has(COMPANY.footerNote) && (
              <div className="doc-footer">{COMPANY.footerNote}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvoiceDocument;
