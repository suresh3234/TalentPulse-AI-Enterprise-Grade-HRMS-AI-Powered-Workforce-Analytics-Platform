import React, { useState } from "react";
import Card from "../../components/Card";
import { Award, CheckCircle2, UserCheck, AlertTriangle } from "lucide-react";

export default function CandidateComparison({ candidates = [], jobSkills = [] }) {
  const [selectedIds, setSelectedIds] = useState([]);

  const toggleCandidateSelection = (id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((item) => item !== id);
      }
      if (prev.length >= 3) {
        toast.error("You can compare up to 3 candidates side-by-side.");
        return prev;
      }
      return [...prev, id];
    });
  };

  const comparedCandidates = candidates.filter((c) => selectedIds.includes(c.applicationId || c._id));

  return (
    <div className="space-y-6">
      {/* Candidate Selector header */}
      <Card className="bg-slate-900/40 border-slate-900 p-5 rounded-[24px]">
        <h3 className="text-sm font-bold text-white mb-3">Select Candidates to Compare (Up to 3)</h3>
        <div className="flex flex-wrap gap-2.5">
          {candidates.map((c) => {
            const dbId = c.applicationId || c._id;
            const isSelected = selectedIds.includes(dbId);
            return (
              <button
                key={dbId}
                type="button"
                onClick={() => toggleCandidateSelection(dbId)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                  isSelected
                    ? "bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/20"
                    : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-850"
                }`}
              >
                {c.candidateName} ({c.matchPercentage}%)
              </button>
            );
          })}
          {candidates.length === 0 && (
            <p className="text-xs text-slate-500 italic">No candidates available to compare.</p>
          )}
        </div>
      </Card>

      {comparedCandidates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {comparedCandidates.map((c) => {
            const scores = c.scores || {};
            const missing = c.missingSkills || [];
            const overlapping = c.overlappingSkills || [];

            return (
              <Card key={c.applicationId || c._id} className="bg-slate-900/60 border-slate-800 p-5 rounded-[28px] space-y-4">
                <div className="border-b border-slate-800 pb-3">
                  <span className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">ATS Grade: {c.aiGrade || "B"}</span>
                  <h4 className="text-base font-bold text-white mt-1 leading-tight">{c.candidateName}</h4>
                  <p className="text-xs text-slate-500 mt-1">{c.experience} Years Exp | {c.currentCompany || "Independent"}</p>
                </div>

                {/* Score breakdown metrics */}
                <div className="space-y-2.5">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">Scorecard Summary</span>
                  
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Match Percentage:</span>
                    <span className="font-bold text-white">{c.matchPercentage}%</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Communication Fit:</span>
                    <span className="font-semibold text-emerald-400">{c.compositeScore ? `${Math.round(c.compositeScore * 10)}/100` : "80/100"}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Visual Attention:</span>
                    <span className="font-semibold text-white">{c.metrics?.attentionScore || "92"}%</span>
                  </div>
                </div>

                {/* Overlapping skills list */}
                <div className="space-y-1.5 pt-2 border-t border-slate-850">
                  <span className="text-[9px] uppercase font-bold text-emerald-500 tracking-wider block">Matched Capabilities</span>
                  <div className="flex flex-wrap gap-1">
                    {overlapping.map((sk) => (
                      <span key={sk} className="bg-emerald-950/40 border border-emerald-900 text-emerald-400 text-[10px] px-2 py-0.5 rounded-md font-medium">
                        {sk}
                      </span>
                    ))}
                    {overlapping.length === 0 && (
                      <span className="text-xs text-slate-500 italic">None detected</span>
                    )}
                  </div>
                </div>

                {/* Skill Gaps list */}
                <div className="space-y-1.5 pt-2 border-t border-slate-850">
                  <span className="text-[9px] uppercase font-bold text-amber-500 tracking-wider block">Skill Gaps (Missing)</span>
                  <div className="flex flex-wrap gap-1">
                    {missing.map((sk) => (
                      <span key={sk} className="bg-amber-950/40 border border-amber-900 text-amber-400 text-[10px] px-2 py-0.5 rounded-md font-medium">
                        {sk}
                      </span>
                    ))}
                    {missing.length === 0 && (
                      <span className="text-xs text-slate-500 italic">No gaps</span>
                    )}
                  </div>
                </div>

                {/* AI hiring advice */}
                <div className="bg-indigo-950/20 border border-indigo-900/30 p-3 rounded-2xl text-[11px] leading-relaxed text-indigo-300">
                  <strong>Advice:</strong> {c.hiringSuggestion}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="border border-slate-900 bg-slate-950/40 rounded-3xl p-12 text-center text-slate-500 text-xs italic">
          Toggle candidate checkboxes above to render side-by-side metrics.
        </div>
      )}
    </div>
  );
}
