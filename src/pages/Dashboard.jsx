// src/pages/Dashboard.jsx

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { loadDashboard } from "../services/dashboardService";
import { loadFinance } from "../services/financeService";
import { toDisplay } from "../utils/dates";
import { formatMoney } from "../utils/money";
import "./Dashboard.css";

function Dashboard() {
  const [data, setData] = useState(null);
  const [finance, setFinance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [ops, fin] = await Promise.all([loadDashboard(), loadFinance()]);
        setData(ops);
        setFinance(fin);
      } catch (err) {
        console.error(err);
        setError("Could not load dashboard.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <AppLayout>
      <div className="dash-head">
        <div className="page-title">Operations</div>
      </div>

      {loading && <div className="dash-status">Loading dashboard…</div>}
      {error && <div className="dash-status dash-error">{error}</div>}

      {!loading && !error && data && finance && (
        <>
          {/* ---- Operational metrics ---- */}
          <div className="dash-metrics">
            <MetricPanel
              label="Projects"
              value={data.counts.totalProjects}
              sub={`${data.counts.activeProjects} active`}
              to="/projects"
            />
            <MetricPanel
              label="Open Tasks"
              value={data.counts.openTasks}
              sub={`${data.counts.overdueTasks} overdue`}
              subTone={data.counts.overdueTasks > 0 ? "error" : "muted"}
              to="/tasks"
            />
            <MetricPanel
              label="Milestones"
              value={data.counts.openMilestones}
              sub="in progress"
              to="/milestones"
            />
            <MetricPanel
              label="Team"
              value={data.counts.teamMembers}
              sub="members"
              to="/team"
            />
          </div>

          {/* ---- Operational lists ---- */}
          <div className="dash-columns">
            <div className="dash-panel">
              <div className="dash-panel-head">
                <span className="dash-panel-title">Upcoming Tasks</span>
                <Link className="dash-panel-link" to="/tasks">
                  View all
                </Link>
              </div>
              {data.upcomingTasks.length === 0 ? (
                <div className="dash-panel-empty">No upcoming tasks.</div>
              ) : (
                <div className="dash-list">
                  {data.upcomingTasks.map((t) => (
                    <div className="dash-list-row" key={t.id}>
                      <span className="dash-list-name">{t.title}</span>
                      <span className="dash-list-meta">
                        {toDisplay(t.dueDate)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="dash-panel">
              <div className="dash-panel-head">
                <span className="dash-panel-title">Upcoming Milestones</span>
                <Link className="dash-panel-link" to="/milestones">
                  View all
                </Link>
              </div>
              {data.upcomingMilestones.length === 0 ? (
                <div className="dash-panel-empty">No upcoming milestones.</div>
              ) : (
                <div className="dash-list">
                  {data.upcomingMilestones.map((m) => (
                    <div className="dash-list-row" key={m.id}>
                      <span className="dash-list-name">{m.name}</span>
                      <span className="dash-list-meta">
                        {m.progress}% · {toDisplay(m.dueDate)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ---- Business / Finance section ---- */}
          <div className="dash-section-title">Finance</div>

          <div className="dash-metrics">
            <FinancePanel
              label="Total Revenue"
              value={formatMoney(finance.summary.totalRevenue, finance.currency)}
              to="/payments"
            />
            <FinancePanel
              label="Outstanding"
              value={formatMoney(
                finance.summary.outstandingTotal,
                finance.currency
              )}
              to="/invoices"
            />
            <FinancePanel
              label="Overdue"
              value={formatMoney(finance.summary.overdueTotal, finance.currency)}
              tone={finance.summary.overdueTotal > 0 ? "error" : "muted"}
              to="/invoices"
            />
            <FinancePanel
              label="Paid This Month"
              value={formatMoney(
                finance.summary.paidThisMonth,
                finance.currency
              )}
              to="/payments"
            />
          </div>

          <div className="dash-columns">
            <div className="dash-panel">
              <div className="dash-panel-head">
                <span className="dash-panel-title">Revenue by Client</span>
                <Link className="dash-panel-link" to="/clients">
                  View all
                </Link>
              </div>
              {finance.revenueByClient.length === 0 ? (
                <div className="dash-panel-empty">No revenue recorded.</div>
              ) : (
                <div className="dash-list">
                  {finance.revenueByClient.slice(0, 6).map((r, i) => (
                    <div className="dash-list-row" key={i}>
                      <span className="dash-list-name">{r.name}</span>
                      <span className="dash-list-meta">
                        {formatMoney(r.amount, finance.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="dash-panel">
              <div className="dash-panel-head">
                <span className="dash-panel-title">Revenue by Project</span>
                <Link className="dash-panel-link" to="/projects">
                  View all
                </Link>
              </div>
              {finance.revenueByProject.length === 0 ? (
                <div className="dash-panel-empty">No revenue recorded.</div>
              ) : (
                <div className="dash-list">
                  {finance.revenueByProject.slice(0, 6).map((r, i) => (
                    <div className="dash-list-row" key={i}>
                      <span className="dash-list-name">{r.name}</span>
                      <span className="dash-list-meta">
                        {formatMoney(r.amount, finance.currency)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="dash-columns">
            <div className="dash-panel dash-panel-full">
              <div className="dash-panel-head">
                <span className="dash-panel-title">Recent Payments</span>
                <Link className="dash-panel-link" to="/payments">
                  View all
                </Link>
              </div>
              {finance.recentPayments.length === 0 ? (
                <div className="dash-panel-empty">No payments recorded.</div>
              ) : (
                <div className="dash-list">
                  {finance.recentPayments.map((p) => (
                    <div className="dash-list-row" key={p.id}>
                      <span className="dash-list-name">
                        {p.client}
                        <span className="dash-list-sub">
                          {finance.invoiceLookup[p.invoiceId] || ""}
                        </span>
                      </span>
                      <span className="dash-list-meta">
                        {formatMoney(p.amount, p.currency)} · {toDisplay(p.date)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AppLayout>
  );
}

function MetricPanel({ label, value, sub, subTone = "muted", to }) {
  return (
    <Link className="dash-metric" to={to}>
      <div className="dash-metric-label">{label}</div>
      <div className="dash-metric-value">{String(value).padStart(2, "0")}</div>
      <div className={"dash-metric-sub tone-" + subTone}>{sub}</div>
    </Link>
  );
}

function FinancePanel({ label, value, tone = "muted", to }) {
  return (
    <Link className="dash-metric dash-metric-finance" to={to}>
      <div className="dash-metric-label">{label}</div>
      <div className={"dash-finance-value tone-" + tone}>{value}</div>
    </Link>
  );
}

export default Dashboard;