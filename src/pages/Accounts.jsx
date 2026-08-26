// src/pages/Accounts.jsx
// Shared account vault — platforms, logins and important links.
// Admin-only via permissions.js. Passwords are masked until revealed.

import { useState, useEffect, useMemo } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import {
  listAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from "../services/accountService";
import { auditLog } from "../services/auditService";
import "../components/Modal.css";
import "./Accounts.css";

const CATEGORY_OPTIONS = [
  { value: "social", label: "Social Media" },
  { value: "hosting", label: "Hosting / Infra" },
  { value: "dev", label: "Developer Tools" },
  { value: "email", label: "Email / Comms" },
  { value: "finance", label: "Finance / Banking" },
  { value: "domain", label: "Domains" },
  { value: "tooling", label: "Business Tools" },
  { value: "other", label: "Other" },
];

const EMPTY_FORM = {
  platform: "",
  category: "social",
  accountLabel: "",
  url: "",
  username: "",
  email: "",
  password: "",
  twoFactor: "",
  owner: "",
  links: "",
  notes: "",
};

function categoryLabel(v) {
  return CATEGORY_OPTIONS.find((c) => c.value === v)?.label || v;
}

function normalizeUrl(raw) {
  const v = (raw || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  return `https://${v}`;
}

function parseLinks(raw) {
  return (raw || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      // Supports "Label | https://url" or just "https://url"
      const parts = line.split("|");
      if (parts.length > 1) {
        return { label: parts[0].trim(), href: normalizeUrl(parts.slice(1).join("|")) };
      }
      const href = normalizeUrl(line);
      return { label: line.replace(/^https?:\/\//i, ""), href };
    });
}

function Accounts() {
  const { user, profile } = useAuth();

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [revealed, setRevealed] = useState({});
  const [copied, setCopied] = useState("");

  const [modalMode, setModalMode] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const actor = profile?.displayName || user?.email || "unknown";

  async function load() {
    setLoading(true);
    setError("");
    try {
      setAccounts(await listAccounts());
    } catch (err) {
      console.error(err);
      setError("Could not load accounts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Hide every revealed password when the tab loses focus.
  useEffect(() => {
    function hideAll() {
      if (document.hidden) setRevealed({});
    }
    document.addEventListener("visibilitychange", hideAll);
    return () => document.removeEventListener("visibilitychange", hideAll);
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return accounts.filter((a) => {
      if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
      if (!term) return true;
      return [a.platform, a.accountLabel, a.username, a.email, a.owner, a.notes, a.links]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [accounts, search, categoryFilter]);

  const grouped = useMemo(() => {
    const map = new Map();
    filtered.forEach((a) => {
      const key = a.category || "other";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(a);
    });
    return CATEGORY_OPTIONS.filter((c) => map.has(c.value)).map((c) => ({
      ...c,
      items: map.get(c.value),
    }));
  }, [filtered]);

  function toggleReveal(id) {
    setRevealed((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function copy(value, key) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(""), 1400);
    } catch (err) {
      console.error(err);
    }
  }

  function openCreate() {
    setModalMode("create");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }
  function openEdit(a) {
    setModalMode("edit");
    setEditingId(a.id);
    setForm({
      platform: a.platform || "",
      category: a.category || "other",
      accountLabel: a.accountLabel || "",
      url: a.url || "",
      username: a.username || "",
      email: a.email || "",
      password: a.password || "",
      twoFactor: a.twoFactor || "",
      owner: a.owner || "",
      links: a.links || "",
      notes: a.notes || "",
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
  function field(f, v) {
    setForm((prev) => ({ ...prev, [f]: v }));
  }

  async function handleSave() {
    setFormError("");
    if (!form.platform.trim()) {
      setFormError("Platform is required.");
      return;
    }
    setSaving(true);
    try {
      if (modalMode === "edit" && editingId) {
        await updateAccount(editingId, form);
        await auditLog({
          action: "Update account",
          module: "Accounts",
          user: actor,
          details: `Updated ${form.platform} account entry`,
        });
      } else {
        await createAccount(form, user?.uid);
        await auditLog({
          action: "Create account",
          module: "Accounts",
          user: actor,
          details: `Added ${form.platform} account entry`,
        });
      }
      closeModal();
      await load();
    } catch (err) {
      console.error(err);
      setFormError("Could not save account.");
    } finally {
      setSaving(false);
    }
  }

  function askDelete(a) {
    setDeleteTarget({ id: a.id, name: a.platform || a.accountLabel || "this entry" });
  }
  function cancelDelete() {
    if (deleting) return;
    setDeleteTarget(null);
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAccount(deleteTarget.id);
      await auditLog({
        action: "Delete account",
        module: "Accounts",
        user: actor,
        details: `Deleted account entry ${deleteTarget.name}`,
      });
      setDeleteTarget(null);
      await load();
    } catch (err) {
      console.error(err);
      setError("Could not delete account.");
    } finally {
      setDeleting(false);
    }
  }

  function renderCard(a) {
    const show = !!revealed[a.id];
    const links = parseLinks(a.links);
    return (
      <div className="acc-card" key={a.id}>
        <div className="acc-card-head">
          <div className="acc-card-titles">
            <div className="acc-platform">{a.platform}</div>
            {a.accountLabel && <div className="acc-label">{a.accountLabel}</div>}
          </div>
          <span className={"acc-tag cat-" + (a.category || "other")}>
            {categoryLabel(a.category)}
          </span>
        </div>

        {a.url && (
          <a className="acc-link acc-primary-link" href={normalizeUrl(a.url)} target="_blank" rel="noreferrer">
            {a.url.replace(/^https?:\/\//i, "")}
          </a>
        )}

        <div className="acc-fields">
          {a.username && (
            <div className="acc-field">
              <div className="acc-field-label">Username</div>
              <div className="acc-field-value">
                <span className="acc-mono">{a.username}</span>
                <button className="acc-mini-btn" onClick={() => copy(a.username, a.id + "-u")}>
                  {copied === a.id + "-u" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {a.email && (
            <div className="acc-field">
              <div className="acc-field-label">Email</div>
              <div className="acc-field-value">
                <span className="acc-mono">{a.email}</span>
                <button className="acc-mini-btn" onClick={() => copy(a.email, a.id + "-e")}>
                  {copied === a.id + "-e" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {a.password && (
            <div className="acc-field">
              <div className="acc-field-label">Password</div>
              <div className="acc-field-value">
                <span className="acc-mono acc-secret">
                  {show ? a.password : "••••••••••••"}
                </span>
                <button className="acc-mini-btn" onClick={() => toggleReveal(a.id)}>
                  {show ? "Hide" : "Show"}
                </button>
                <button className="acc-mini-btn" onClick={() => copy(a.password, a.id + "-p")}>
                  {copied === a.id + "-p" ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {a.twoFactor && (
            <div className="acc-field">
              <div className="acc-field-label">2FA</div>
              <div className="acc-field-value"><span>{a.twoFactor}</span></div>
            </div>
          )}

          {a.owner && (
            <div className="acc-field">
              <div className="acc-field-label">Owner</div>
              <div className="acc-field-value"><span>{a.owner}</span></div>
            </div>
          )}
        </div>

        {links.length > 0 && (
          <div className="acc-links">
            <div className="acc-field-label">Links</div>
            <ul className="acc-links-list">
              {links.map((l, i) => (
                <li key={i}>
                  <a className="acc-link" href={l.href} target="_blank" rel="noreferrer">{l.label}</a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {a.notes && <div className="acc-notes">{a.notes}</div>}

        <div className="acc-card-actions">
          <button className="acc-action-btn" onClick={() => openEdit(a)}>Edit</button>
          <button className="acc-action-btn acc-action-danger" onClick={() => askDelete(a)}>Delete</button>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="acc-head">
        <div className="page-title">Accounts</div>
        <div className="acc-head-actions">
          {Object.values(revealed).some(Boolean) && (
            <button className="acc-hide-btn" onClick={() => setRevealed({})}>Hide All</button>
          )}
          <button className="acc-new-btn" onClick={openCreate}>New Account</button>
        </div>
      </div>

      <div className="acc-warning">
        <strong>Sensitive.</strong> Credentials here are stored as entered and are
        visible to any CoreForge admin. Don't screen-share this page, and keep the
        Firestore rules on the <code>accounts</code> collection locked to admins.
      </div>

      <div className="acc-controls">
        <input
          className="acc-search"
          placeholder="Search platforms, usernames, owners…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="acc-filter" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="all">All Categories</option>
          {CATEGORY_OPTIONS.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
        </select>
      </div>

      {loading && <div className="acc-status">Loading accounts…</div>}
      {error && <div className="acc-status acc-error">{error}</div>}

      {!loading && !error && filtered.length === 0 && (
        <div className="acc-empty">
          {accounts.length === 0
            ? "No accounts saved yet. Add your first platform above."
            : "No accounts match the current filters."}
        </div>
      )}

      {!loading && !error && grouped.map((group) => (
        <div className="acc-group" key={group.value}>
          <div className="acc-group-title">{group.label} <span className="acc-group-count">{group.items.length}</span></div>
          <div className="acc-grid">
            {group.items.map(renderCard)}
          </div>
        </div>
      ))}

      {modalMode && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{modalMode === "edit" ? "Edit Account" : "New Account"}</div>
            {formError && <div className="form-error">{formError}</div>}

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Platform</label>
                <input className="form-input" value={form.platform} onChange={(e) => field("platform", e.target.value)} disabled={saving} autoFocus placeholder="Instagram, GitHub, Vercel…" />
              </div>
              <div className="form-field">
                <label className="form-label">Category</label>
                <select className="form-input" value={form.category} onChange={(e) => field("category", e.target.value)} disabled={saving}>
                  {CATEGORY_OPTIONS.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Account Label</label>
                <input className="form-input" value={form.accountLabel} onChange={(e) => field("accountLabel", e.target.value)} disabled={saving} placeholder="@coreforge — main" />
              </div>
              <div className="form-field">
                <label className="form-label">Login URL</label>
                <input className="form-input" value={form.url} onChange={(e) => field("url", e.target.value)} disabled={saving} placeholder="instagram.com/accounts/login" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Username</label>
                <input className="form-input" value={form.username} onChange={(e) => field("username", e.target.value)} disabled={saving} autoComplete="off" />
              </div>
              <div className="form-field">
                <label className="form-label">Email</label>
                <input className="form-input" value={form.email} onChange={(e) => field("email", e.target.value)} disabled={saving} autoComplete="off" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Password</label>
                <input className="form-input" type="text" value={form.password} onChange={(e) => field("password", e.target.value)} disabled={saving} autoComplete="off" spellCheck={false} />
              </div>
              <div className="form-field">
                <label className="form-label">2FA / Recovery</label>
                <input className="form-input" value={form.twoFactor} onChange={(e) => field("twoFactor", e.target.value)} disabled={saving} placeholder="Authenticator on Arno's phone" />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Owner</label>
              <input className="form-input" value={form.owner} onChange={(e) => field("owner", e.target.value)} disabled={saving} placeholder="Who on the team manages this" />
            </div>

            <div className="form-field">
              <label className="form-label">Important Links</label>
              <textarea
                className="form-input form-textarea"
                value={form.links}
                onChange={(e) => field("links", e.target.value)}
                disabled={saving}
                rows={4}
                placeholder={"One per line. Optional label:\nAnalytics | analytics.google.com\nbusiness.facebook.com"}
              />
              <div className="form-hint">One link per line. Use <code>Label | url</code> to name it.</div>
            </div>

            <div className="form-field">
              <label className="form-label">Notes</label>
              <textarea className="form-input form-textarea" value={form.notes} onChange={(e) => field("notes", e.target.value)} disabled={saving} rows={3} />
            </div>

            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={closeModal} disabled={saving}>Cancel</button>
              <button className="modal-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : modalMode === "edit" ? "Save Changes" : "Create Account"}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-panel modal-panel-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Delete Account Entry</div>
            <p className="modal-text">
              Delete the saved entry for <span className="modal-emphasis">{deleteTarget.name}</span>? This cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={cancelDelete} disabled={deleting}>Cancel</button>
              <button className="modal-btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default Accounts;
