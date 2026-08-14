// src/pages/Calendar.jsx
// Month grid aggregating dated items from across CoreForge (read-only).

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { loadCalendarEvents } from "../services/calendarService";
import "./Calendar.css";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "task", label: "Tasks" },
  { value: "meeting", label: "Meetings" },
  { value: "invoice", label: "Invoices" },
  { value: "contract", label: "Contracts" },
  { value: "deployment", label: "Deployments" },
];

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function Calendar() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        setEvents(await loadCalendarEvents());
      } catch (err) {
        console.error(err);
        setError("Could not load calendar.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredEvents = useMemo(() => {
    if (typeFilter === "all") return events;
    return events.filter((e) => e.type === typeFilter);
  }, [events, typeFilter]);

  // Build the grid of day cells for the current month.
  const cells = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstOfMonth.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const result = [];
    for (let i = 0; i < startWeekday; i++) result.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      result.push(new Date(viewYear, viewMonth, d));
    }
    return result;
  }, [viewYear, viewMonth]);

  function eventsForDay(day) {
    return filteredEvents.filter((e) => sameDay(e.date, day));
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }
  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }
  function goToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  }

  return (
    <AppLayout>
      <div className="cal-head">
        <div className="page-title">Calendar</div>
        <div className="cal-controls">
          <select className="cal-filter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            {TYPE_FILTERS.map((f) => (<option key={f.value} value={f.value}>{f.label}</option>))}
          </select>
          <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
          <button className="cal-today-btn" onClick={goToday}>Today</button>
          <button className="cal-nav-btn" onClick={nextMonth}>›</button>
        </div>
      </div>

      <div className="cal-monthlabel">{MONTHS[viewMonth]} {viewYear}</div>

      {loading && <div className="cal-status">Loading calendar…</div>}
      {error && <div className="cal-status cal-error">{error}</div>}

      {!loading && !error && (
        <div className="cal-grid">
          {WEEKDAYS.map((w) => (
            <div className="cal-weekday" key={w}>{w}</div>
          ))}

          {cells.map((day, i) => {
            if (!day) return <div className="cal-cell cal-cell-empty" key={"e" + i} />;
            const dayEvents = eventsForDay(day);
            const isToday = sameDay(day, today);
            return (
              <div className={"cal-cell" + (isToday ? " is-today" : "")} key={day.toISOString()}>
                <div className="cal-cell-date">{day.getDate()}</div>
                <div className="cal-cell-events">
                  {dayEvents.slice(0, 4).map((ev) => (
                    <div
                      key={ev.id}
                      className={"cal-event type-" + ev.type}
                      title={ev.source + ": " + ev.title}
                      onClick={() => navigate(ev.link)}
                    >
                      {ev.title}
                    </div>
                  ))}
                  {dayEvents.length > 4 && (
                    <div className="cal-event-more">+{dayEvents.length - 4} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}

export default Calendar;