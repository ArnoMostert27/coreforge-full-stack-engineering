// src/pages/Search.jsx
// Global search across CoreForge. Not in the locked nav — reached via /search.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { globalSearch } from "../services/searchService";
import "./Search.css";

function Search() {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [groups, setGroups] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");

  async function runSearch() {
    if (!term.trim()) return;
    setSearching(true);
    setError("");
    try {
      const results = await globalSearch(term);
      setGroups(results);
      setSearched(true);
    } catch (err) {
      console.error(err);
      setError("Search failed.");
    } finally {
      setSearching(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") runSearch();
  }

  const totalHits = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <AppLayout>
      <div className="srch-head">
        <div className="page-title">Search</div>
      </div>

      <div className="srch-bar">
        <input
          className="srch-input"
          placeholder="Search across all of CoreForge…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <button className="srch-btn" onClick={runSearch} disabled={searching}>
          {searching ? "Searching…" : "Search"}
        </button>
      </div>

      {error && <div className="srch-status srch-error">{error}</div>}

      {searched && !searching && !error && (
        <div className="srch-count">
          {totalHits} {totalHits === 1 ? "result" : "results"} for “{term}”
        </div>
      )}

      {searched && !searching && !error && groups.length === 0 && (
        <div className="srch-empty">No results found.</div>
      )}

      {groups.map((g) => (
        <div className="srch-group" key={g.type}>
          <div className="srch-group-head">
            <span className="srch-group-label">{g.label}</span>
            <span className="srch-group-count">{g.items.length}</span>
          </div>
          <div className="srch-results">
            {g.items.map((item) => (
              <div className="srch-result" key={item.id} onClick={() => navigate(g.link)}>
                <span className="srch-result-title">{item.title}</span>
                {item.subtitle && <span className="srch-result-sub">{item.subtitle}</span>}
              </div>
            ))}
          </div>
        </div>
      ))}
    </AppLayout>
  );
}

export default Search;