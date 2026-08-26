// src/companyProfile.js
// Your company details as they appear on invoices and other printed documents.
//
// Fill these in — every field is optional and blank fields are simply omitted
// from the printed invoice. Nothing here is invented; empty means empty.

export const COMPANY = {
  name: "CoreForge",
  tagline: "Full Stack Software Engineering",

  email: "",
  phone: "",
  website: "",

  // One line per array entry, e.g. ["12 Example Rd", "Pretoria", "0181"]
  addressLines: [],

  registrationNumber: "",
  vatNumber: "",

  bank: {
    name: "",
    accountName: "",
    accountNumber: "",
    branchCode: "",
    swift: "",
  },

  // Shown in small print at the bottom of every invoice.
  paymentTerms: "",
  footerNote: "",
};
