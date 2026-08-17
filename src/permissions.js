// src/permissions.js
// Centralized, reusable role-based access map for CoreForge V1.
// UI-level only (per locked spec). Admin = full access.

export const ROLE_ACCESS = {
  admin: "*", // all routes
  manager: [
    "/dashboard",
    "/clients",
    "/contracts",
    "/invoices",
    "/payments",
    "/meetings",
    "/documentation",
    "/decisions",
    "/announcements",
  ],
  developer: [
    "/dashboard",
    "/projects",
    "/tasks",
    "/deployments",
    "/documentation",
  ],
};

// Does the given role have access to a route?
export function canAccess(role, route) {
  const access = ROLE_ACCESS[role];
  if (!access) return false;
  if (access === "*") return true;
  return access.includes(route);
}

// Filter a list of nav items by role (used by the navigation rail).
export function visibleForRole(role, items) {
  if (!role) return items;
  return items.filter((item) => canAccess(role, item.to));
}