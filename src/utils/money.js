// src/utils/money.js
// Centralized currency formatting for CoreForge business modules.

const SYMBOLS = {
  ZAR: "R",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export const CURRENCY_OPTIONS = [
  { value: "ZAR", label: "ZAR (R)" },
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
];

// Format a number as a currency string, e.g. formatMoney(50000, "ZAR") => "R50,000.00".
export function formatMoney(amount, currency = "ZAR") {
  const symbol = SYMBOLS[currency] || "";
  const value = Number(amount) || 0;
  const formatted = value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}