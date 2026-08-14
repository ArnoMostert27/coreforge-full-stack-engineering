// src/pages/Deployments.jsx
// Engineering page hosting both Deployments and Environments (nav is locked).

import { useState, useEffect, useMemo } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { listProjects } from "../services/projectService";
import {
  createDeployment,
  listDeployments,
  updateDeployment,
  deleteDeployment,
} from "../services/deploymentService";
import {
  createEnvironment,
  listEnvironments,
  updateEnvironment,
  deleteEnvironment,
} from "../services/environmentService";
import { toInputValue, toDisplay } from "../utils/dates";
import "../components/Modal.css";
import "./Deployments.css";

const DEPLOY_STATUS = [
  { value: "pending", label: "Pending" },
  { value: "in-progress", label: "In Progress" },
  { value: "successful", label: "Successful" },
  { value: "failed", label: "Failed" },
  { value: "rolled-back", label: "Rolled Back" },
];

const ENV_OPTIONS = [
  { value: "development", label: "Development" },
  { value: "staging", label: "Staging" },
  { value: "production", label: "Production" },
];

const ENV_STATUS = [
  { value: "healthy", label: "Healthy" },
  { value: "degraded", label: "Degraded" },
  { value: "down", label: "Down" },
  { value: "deploying", label: "Deploying" },
];

const EMPTY_DEPLOY = {
  projectId: "",
  version: "",
  commitSha: "",
  environment: "development",
  deploymentDate: "",
  status: "pending",
  deployedBy: "",
  notes: "",
};

const EMPTY_ENV = {
  name: "development",
  url: "",
  branch: "",
  status: "healthy",
  lastDeployment: "",
  notes: "",
};

function deployStatusLabel(v) {
  return DEPLOY_STATUS.find((s) => s.value === v)?.label || v;
}
function envLabel(v) {
  return ENV_OPTIONS.find((e) => e.value === v)?.label || v;
}
function envStatusLabel(v) {
  return ENV_STATUS.find((s) => s.value === v)?.label || v;
}

function Deployments() {
  const { user, profile } = useAuth();

  const [deployments, setDeployments] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [envFilter, setEnvFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [depMode, setDepMode] = useState(null);
  const [depEditingId, setDepEditingId] = useState(null);
  const [depForm, setDepForm] = useState(EMPTY_DEPLOY);
  const [depSaving, setDepSaving] = useState(false);
  const [depFormError, setDepFormError] = useState("");
  const [depDelete, setDepDelete] = useState(null);
  const [depDeleting, setDepDeleting] = useState(false);

  const [envMode, setEnvMode] = useState(null);
  const [envEditingId, setEnvEditingId] = useState(null);
  const [envForm, setEnvForm] = useState(EMPTY_ENV);
  const [envSaving, setEnvSaving] = useState(false);
  const [envFormError, setEnvFormError] = useState("");
  const [envDelete, setEnvDelete] = useState(null);
  const [envDeleting, setEnvDeleting] = useState(false);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [depData, envData, projData] = await Promise.all([
        listDeployments(),
        listEnvironments(),
        listProjects(),
      ]);
      setDeployments(depData);
      setEnvironments(envData);
      setProjects(projData);
    } catch (err) {
      console.error(err);
      setError("Could not load engineering data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function projectName(id) {
    if (!id) return "—";
    return projects.find((p) => p.id === id)?.name || "—";
  }

  const defaultDeployer =
    profile?.displayName || user?.email?.split("@")[0] || "";

  const metrics = useMemo(() => {
    const total = deployments.length;
    const successful = deployments.filter((d) => d.status === "successful").length;
    const failed = deployments.filter((d) => d.status === "failed").length;
    const active = deployments.filter(
      (d) => d.status === "pending" || d.status === "in-progress"
    ).length;
    return { total, successful, failed, active };
  }, [deployments]);

  const filteredDeployments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return deployments.filter((d) => {
      if (envFilter !== "all" && d.environment !== envFilter) return false;
      if (statusFilter !== "all" && d.status !== statusFilter) return false;
      if (!term) return true;
      const proj = projects.find((p) => p.id === d.projectId)?.name || "";
      const haystack = [d.version, d.commitSha, d.deployedBy, proj]
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [deployments, search, envFilter, statusFilter, projects]);

  function depOpenCreate() {
    setDepMode("create");
    setDepEditingId(null);
    setDepForm({ ...EMPTY_DEPLOY, deployedBy: defaultDeployer });
    setDepFormError("");
  }
  function depOpenEdit(d) {
    setDepMode("edit");
    setDepEditingId(d.id);
    setDepForm({
      projectId: d.projectId || "",
      version: d.version || "",
      commitSha: d.commitSha || "",
      environment: d.environment || "development",
      deploymentDate: toInputValue(d.deploymentDate),
      status: d.status || "pending",
      deployedBy: d.deployedBy || "",
      notes: d.notes || "",
    });
    setDepFormError("");
  }
  function depClose() {
    if (depSaving) return;
    setDepMode(null);
    setDepEditingId(null);
    setDepForm(EMPTY_DEPLOY);
    setDepFormError("");
  }
  function depField(f, v) {
    setDepForm((prev) => ({ ...prev, [f]: v }));
  }
  async function depSave() {
    setDepFormError("");
    if (!depForm.version.trim()) {
      setDepFormError("Version is required.");
      return;
    }
    setDepSaving(true);
    try {
      if (depMode === "edit" && depEditingId) {
        await updateDeployment(depEditingId, depForm);
      } else {
        await createDeployment(depForm, user?.uid);
      }
      setDepMode(null);
      setDepEditingId(null);
      setDepForm(EMPTY_DEPLOY);
      await loadAll();
    } catch (err) {
      console.error(err);
      setDepFormError("Could not save deployment.");
    } finally {
      setDepSaving(false);
    }
  }
  function depAskDelete(d) {
    setDepDelete({ id: d.id, version: d.version });
  }
  function depCancelDelete() {
    if (depDeleting) return;
    setDepDelete(null);
  }
  async function depConfirmDelete() {
    if (!depDelete) return;
    setDepDeleting(true);
    try {
      await deleteDeployment(depDelete.id);
      setDepDelete(null);
      await loadAll();
    } catch (err) {
      console.error(err);
      setError("Could not delete deployment.");
    } finally {
      setDepDeleting(false);
    }
  }

  function envOpenCreate() {
    setEnvMode("create");
    setEnvEditingId(null);
    setEnvForm(EMPTY_ENV);
    setEnvFormError("");
  }
  function envOpenEdit(e) {
    setEnvMode("edit");
    setEnvEditingId(e.id);
    setEnvForm({
      name: e.name || "development",
      url: e.url || "",
      branch: e.branch || "",
      status: e.status || "healthy",
      lastDeployment: toInputValue(e.lastDeployment),
      notes: e.notes || "",
    });
    setEnvFormError("");
  }
  function envClose() {
    if (envSaving) return;
    setEnvMode(null);
    setEnvEditingId(null);
    setEnvForm(EMPTY_ENV);
    setEnvFormError("");
  }
  function envField(f, v) {
    setEnvForm((prev) => ({ ...prev, [f]: v }));
  }
  async function envSave() {
    setEnvFormError("");
    if (!envForm.url.trim() && !envForm.branch.trim()) {
      setEnvFormError("Enter at least a URL or branch.");
      return;
    }
    setEnvSaving(true);
    try {
      if (envMode === "edit" && envEditingId) {
        await updateEnvironment(envEditingId, envForm);
      } else {
        await createEnvironment(envForm, user?.uid);
      }
      setEnvMode(null);
      setEnvEditingId(null);
      setEnvForm(EMPTY_ENV);
      await loadAll();
    } catch (err) {
      console.error(err);
      setEnvFormError("Could not save environment.");
    } finally {
      setEnvSaving(false);
    }
  }
  function envAskDelete(e) {
    setEnvDelete({ id: e.id, name: envLabel(e.name) });
  }
  function envCancelDelete() {
    if (envDeleting) return;
    setEnvDelete(null);
  }
  async function envConfirmDelete() {
    if (!envDelete) return;
    setEnvDeleting(true);
    try {
      await deleteEnvironment(envDelete.id);
      setEnvDelete(null);
      await loadAll();
    } catch (err) {
      console.error(err);
      setError("Could not delete environment.");
    } finally {
      setEnvDeleting(false);
    }
  }

  return (
    <AppLayout>
      <div className="dep-head">
        <div className="page-title">Deployments</div>
      </div>

      {loading && <div className="dep-status">Loading engineering data…</div>}
      {error && <div className="dep-status dep-error">{error}</div>}

      {!loading && !error && (
        <>
          <div className="dep-metrics">
            <div className="dep-metric">
              <div className="dep-metric-label">Total</div>
              <div className="dep-metric-value">{String(metrics.total).padStart(2, "0")}</div>
            </div>
            <div className="dep-metric">
              <div className="dep-metric-label">Successful</div>
              <div className="dep-metric-value tone-ok">{String(metrics.successful).padStart(2, "0")}</div>
            </div>
            <div className="dep-metric">
              <div className="dep-metric-label">Failed</div>
              <div className="dep-metric-value tone-error">{String(metrics.failed).padStart(2, "0")}</div>
            </div>
            <div className="dep-metric">
              <div className="dep-metric-label">Active</div>
              <div className="dep-metric-value tone-warn">{String(metrics.active).padStart(2, "0")}</div>
            </div>
          </div>

          <div className="dep-controls">
            <input
              className="dep-search"
              placeholder="Search version, commit, deployer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select className="dep-filter" value={envFilter} onChange={(e) => setEnvFilter(e.target.value)}>
              <option value="all">All Environments</option>
              {ENV_OPTIONS.map((e) => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>
            <select className="dep-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              {DEPLOY_STATUS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <button className="dep-new-btn" onClick={depOpenCreate}>New Deployment</button>
          </div>

          {filteredDeployments.length === 0 ? (
            <div className="dep-empty">
              {deployments.length === 0
                ? "No deployments yet. Record your first deployment."
                : "No deployments match the current filters."}
            </div>
          ) : (
            <div className="dep-table">
              <div className="dep-row dep-row-header">
                <div className="dep-cell dep-cell-version">Version</div>
                <div className="dep-cell dep-cell-project">Project</div>
                <div className="dep-cell dep-cell-env">Environment</div>
                <div className="dep-cell dep-cell-sha">Commit</div>
                <div className="dep-cell dep-cell-date">Date</div>
                <div className="dep-cell dep-cell-status">Status</div>
                <div className="dep-cell dep-cell-actions">Actions</div>
              </div>

              {filteredDeployments.map((d) => (
                <div className="dep-row" key={d.id}>
                  <div className="dep-cell dep-cell-version">{d.version}</div>
                  <div className="dep-cell dep-cell-project">{projectName(d.projectId)}</div>
                  <div className="dep-cell dep-cell-env">
                    <span className={"dep-env-tag env-" + d.environment}>{envLabel(d.environment)}</span>
                  </div>
                  <div className="dep-cell dep-cell-sha">{d.commitSha ? d.commitSha.slice(0, 7) : "—"}</div>
                  <div className="dep-cell dep-cell-date">{toDisplay(d.deploymentDate)}</div>
                  <div className="dep-cell dep-cell-status">
                    <span className={"dep-badge status-" + d.status}>{deployStatusLabel(d.status)}</span>
                  </div>
                  <div className="dep-cell dep-cell-actions">
                    <button className="dep-action-btn" onClick={() => depOpenEdit(d)}>Edit</button>
                    <button className="dep-action-btn dep-action-danger" onClick={() => depAskDelete(d)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="dep-section">
            <div className="dep-section-head">
              <div className="dep-section-title">Environments</div>
              <button className="dep-new-btn" onClick={envOpenCreate}>New Environment</button>
            </div>

            {environments.length === 0 ? (
              <div className="dep-empty">
                No environments defined yet. Add Development, Staging, or Production.
              </div>
            ) : (
              <div className="dep-table">
                <div className="dep-row dep-row-header">
                  <div className="dep-cell dep-cell-envname">Environment</div>
                  <div className="dep-cell dep-cell-url">URL</div>
                  <div className="dep-cell dep-cell-branch">Branch</div>
                  <div className="dep-cell dep-cell-envstatus">Status</div>
                  <div className="dep-cell dep-cell-last">Last Deploy</div>
                  <div className="dep-cell dep-cell-actions">Actions</div>
                </div>

                {environments.map((e) => (
                  <div className="dep-row" key={e.id}>
                    <div className="dep-cell dep-cell-envname">
                      <span className={"dep-env-tag env-" + e.name}>{envLabel(e.name)}</span>
                    </div>
                    <div className="dep-cell dep-cell-url">
                      {e.url ? (
                        <a className="dep-url-link" href={e.url} target="_blank" rel="noreferrer">{e.url}</a>
                      ) : "—"}
                    </div>
                    <div className="dep-cell dep-cell-branch">{e.branch || "—"}</div>
                    <div className="dep-cell dep-cell-envstatus">
                      <span className={"dep-envstatus estat-" + e.status}>{envStatusLabel(e.status)}</span>
                    </div>
                    <div className="dep-cell dep-cell-last">{toDisplay(e.lastDeployment)}</div>
                    <div className="dep-cell dep-cell-actions">
                      <button className="dep-action-btn" onClick={() => envOpenEdit(e)}>Edit</button>
                      <button className="dep-action-btn dep-action-danger" onClick={() => envAskDelete(e)}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {depMode && (
        <div className="modal-overlay" onClick={depClose}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{depMode === "edit" ? "Edit Deployment" : "New Deployment"}</div>
            {depFormError && <div className="form-error">{depFormError}</div>}

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Version</label>
                <input className="form-input" value={depForm.version} onChange={(e) => depField("version", e.target.value)} disabled={depSaving} autoFocus placeholder="v1.8.4" />
              </div>
              <div className="form-field">
                <label className="form-label">Status</label>
                <select className="form-input" value={depForm.status} onChange={(e) => depField("status", e.target.value)} disabled={depSaving}>
                  {DEPLOY_STATUS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Project</label>
                <select className="form-input" value={depForm.projectId} onChange={(e) => depField("projectId", e.target.value)} disabled={depSaving}>
                  <option value="">— No project —</option>
                  {projects.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Environment</label>
                <select className="form-input" value={depForm.environment} onChange={(e) => depField("environment", e.target.value)} disabled={depSaving}>
                  {ENV_OPTIONS.map((e) => (<option key={e.value} value={e.value}>{e.label}</option>))}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Commit SHA</label>
                <input className="form-input" value={depForm.commitSha} onChange={(e) => depField("commitSha", e.target.value)} disabled={depSaving} placeholder="7f3a91c" />
              </div>
              <div className="form-field">
                <label className="form-label">Deployment Date</label>
                <input className="form-input" type="date" value={depForm.deploymentDate} onChange={(e) => depField("deploymentDate", e.target.value)} disabled={depSaving} />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Deployed By</label>
              <input className="form-input" value={depForm.deployedBy} onChange={(e) => depField("deployedBy", e.target.value)} disabled={depSaving} />
            </div>

            <div className="form-field">
              <label className="form-label">Notes</label>
              <textarea className="form-input form-textarea" value={depForm.notes} onChange={(e) => depField("notes", e.target.value)} disabled={depSaving} rows={2} />
            </div>

            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={depClose} disabled={depSaving}>Cancel</button>
              <button className="modal-btn-primary" onClick={depSave} disabled={depSaving}>
                {depSaving ? "Saving…" : depMode === "edit" ? "Save Changes" : "Create Deployment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {depDelete && (
        <div className="modal-overlay" onClick={depCancelDelete}>
          <div className="modal-panel modal-panel-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Delete Deployment</div>
            <p className="modal-text">
              Delete deployment <span className="modal-emphasis">{depDelete.version}</span>? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={depCancelDelete} disabled={depDeleting}>Cancel</button>
              <button className="modal-btn-danger" onClick={depConfirmDelete} disabled={depDeleting}>
                {depDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {envMode && (
        <div className="modal-overlay" onClick={envClose}>
          <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">{envMode === "edit" ? "Edit Environment" : "New Environment"}</div>
            {envFormError && <div className="form-error">{envFormError}</div>}

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Environment</label>
                <select className="form-input" value={envForm.name} onChange={(e) => envField("name", e.target.value)} disabled={envSaving}>
                  {ENV_OPTIONS.map((e) => (<option key={e.value} value={e.value}>{e.label}</option>))}
                </select>
              </div>
              <div className="form-field">
                <label className="form-label">Status</label>
                <select className="form-input" value={envForm.status} onChange={(e) => envField("status", e.target.value)} disabled={envSaving}>
                  {ENV_STATUS.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
                </select>
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">URL</label>
              <input className="form-input" value={envForm.url} onChange={(e) => envField("url", e.target.value)} disabled={envSaving} placeholder="https://staging.example.com" />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label className="form-label">Branch</label>
                <input className="form-input" value={envForm.branch} onChange={(e) => envField("branch", e.target.value)} disabled={envSaving} placeholder="main" />
              </div>
              <div className="form-field">
                <label className="form-label">Last Deployment</label>
                <input className="form-input" type="date" value={envForm.lastDeployment} onChange={(e) => envField("lastDeployment", e.target.value)} disabled={envSaving} />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label">Notes</label>
              <textarea className="form-input form-textarea" value={envForm.notes} onChange={(e) => envField("notes", e.target.value)} disabled={envSaving} rows={2} />
            </div>

            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={envClose} disabled={envSaving}>Cancel</button>
              <button className="modal-btn-primary" onClick={envSave} disabled={envSaving}>
                {envSaving ? "Saving…" : envMode === "edit" ? "Save Changes" : "Create Environment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {envDelete && (
        <div className="modal-overlay" onClick={envCancelDelete}>
          <div className="modal-panel modal-panel-sm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">Delete Environment</div>
            <p className="modal-text">
              Delete the <span className="modal-emphasis">{envDelete.name}</span> environment? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="modal-btn-secondary" onClick={envCancelDelete} disabled={envDeleting}>Cancel</button>
              <button className="modal-btn-danger" onClick={envConfirmDelete} disabled={envDeleting}>
                {envDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default Deployments;