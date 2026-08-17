// src/pages/Settings.jsx
// Company, application, appearance, and notification settings.

import { useState, useEffect } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import {
  loadSettings,
  saveSettings,
  DEFAULT_SETTINGS,
} from "../services/settingsService";
import { auditLog } from "../services/auditService";
import { CURRENCY_OPTIONS } from "../utils/money";
import "./Settings.css";

function Settings() {
  const { user, profile } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  const actor = profile?.displayName || user?.email || "unknown";

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        setSettings(await loadSettings());
      } catch (err) {
        console.error(err);
        setError("Could not load settings.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function field(f, v) {
    setSettings((prev) => ({ ...prev, [f]: v }));
    setSavedMsg("");
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSavedMsg("");
    try {
      await saveSettings(settings);
      await auditLog({
        action: "Update settings",
        module: "Settings",
        user: actor,
        details: "Application settings updated",
      });
      setSavedMsg("Settings saved.");
    } catch (err) {
      console.error(err);
      setError("Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="page-title">Settings</div>
        <div className="set-status">Loading settings…</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="set-head">
        <div className="page-title">Settings</div>
        <div className="set-head-actions">
          {savedMsg && <span className="set-saved">{savedMsg}</span>}
          <button className="set-save-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Settings"}
          </button>
        </div>
      </div>

      {error && <div className="set-status set-error">{error}</div>}

      <div className="set-grid">
        {/* Company */}
        <div className="set-panel">
          <div className="set-panel-title">Company</div>
          <div className="set-field">
            <label className="set-label">Company Name</label>
            <input className="set-input" value={settings.companyName} onChange={(e) => field("companyName", e.target.value)} />
          </div>
          <div className="set-field">
            <label className="set-label">Contact Email</label>
            <input className="set-input" type="email" value={settings.contactEmail} onChange={(e) => field("contactEmail", e.target.value)} />
          </div>
          <div className="set-field">
            <label className="set-label">Phone Number</label>
            <input className="set-input" value={settings.phone} onChange={(e) => field("phone", e.target.value)} />
          </div>
          <div className="set-field">
            <label className="set-label">Address</label>
            <input className="set-input" value={settings.address} onChange={(e) => field("address", e.target.value)} />
          </div>
        </div>

        {/* Application */}
        <div className="set-panel">
          <div className="set-panel-title">Application</div>
          <div className="set-field">
            <label className="set-label">Default Currency</label>
            <select className="set-input" value={settings.defaultCurrency} onChange={(e) => field("defaultCurrency", e.target.value)}>
              {CURRENCY_OPTIONS.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
            </select>
          </div>
          <div className="set-field">
            <label className="set-label">Date Format</label>
            <select className="set-input" value={settings.dateFormat} onChange={(e) => field("dateFormat", e.target.value)}>
              <option value="DD MMM YYYY">DD MMM YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            </select>
          </div>
          <div className="set-field">
            <label className="set-label">Time Format</label>
            <select className="set-input" value={settings.timeFormat} onChange={(e) => field("timeFormat", e.target.value)}>
              <option value="24h">24-hour</option>
              <option value="12h">12-hour</option>
            </select>
          </div>
        </div>

        {/* Appearance */}
        <div className="set-panel">
          <div className="set-panel-title">Appearance</div>
          <div className="set-field">
            <label className="set-label">Theme</label>
            <select className="set-input" value={settings.theme} onChange={(e) => field("theme", e.target.value)}>
              <option value="dark">Dark (Command Center)</option>
            </select>
            <div className="set-hint">CoreForge V1 ships with the dark engineering theme.</div>
          </div>
          <div className="set-field">
            <label className="set-label">Dashboard Density</label>
            <select className="set-input" value={settings.dashboardDensity} onChange={(e) => field("dashboardDensity", e.target.value)}>
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </div>
        </div>

        {/* Notifications */}
        <div className="set-panel">
          <div className="set-panel-title">Notifications</div>
          <label className="set-check">
            <input type="checkbox" checked={settings.notifyOverdueInvoices} onChange={(e) => field("notifyOverdueInvoices", e.target.checked)} />
            <span>Overdue invoice alerts</span>
          </label>
          <label className="set-check">
            <input type="checkbox" checked={settings.notifyUpcomingMeetings} onChange={(e) => field("notifyUpcomingMeetings", e.target.checked)} />
            <span>Upcoming meeting alerts</span>
          </label>
          <label className="set-check">
            <input type="checkbox" checked={settings.notifyTaskDue} onChange={(e) => field("notifyTaskDue", e.target.checked)} />
            <span>Task due alerts</span>
          </label>
          <label className="set-check">
            <input type="checkbox" checked={settings.notifyDeployments} onChange={(e) => field("notifyDeployments", e.target.checked)} />
            <span>Deployment alerts</span>
          </label>
        </div>
      </div>
    </AppLayout>
  );
}

export default Settings;