// src/components/ComingSoon.jsx
// Shared placeholder rendered for every module that isn't built yet.
// The label comes from the matched navigation item.

import { useLocation } from "react-router-dom";
import { Construction } from "lucide-react";
import { NAV_SECTIONS } from "../navigation";
import "./ComingSoon.css";

function findLabel(pathname) {
  for (const group of NAV_SECTIONS) {
    for (const item of group.items) {
      if (item.to === pathname) {
        return { label: item.label, section: group.section };
      }
    }
  }
  return { label: "Module", section: "" };
}

function ComingSoon() {
  const location = useLocation();
  const { label, section } = findLabel(location.pathname);

  return (
    <div className="coming-soon">
      <div className="coming-soon-panel">
        <div className="coming-soon-icon">
          <Construction size={28} strokeWidth={1.5} />
        </div>

        {section && <div className="coming-soon-section">{section}</div>}
        <div className="coming-soon-title">{label}</div>
        <div className="coming-soon-status">Coming Soon</div>
        <p className="coming-soon-text">
          This module is part of CoreForge V1 and will be implemented in a
          later phase.
        </p>
      </div>
    </div>
  );
}

export default ComingSoon;