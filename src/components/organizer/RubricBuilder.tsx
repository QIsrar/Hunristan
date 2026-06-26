"use client";
import { useState } from "react";
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from "lucide-react";
import type { RubricCriterion } from "@/types";

interface Props {
  criteria: RubricCriterion[];
  onChange: (criteria: RubricCriterion[]) => void;
}

const PRESETS = [
  { name: "Creativity",      weight: 25, description: "Originality, innovation and creative thinking" },
  { name: "Technical Depth", weight: 25, description: "Complexity, correctness and technical quality" },
  { name: "Presentation",    weight: 25, description: "Clarity, structure and visual appeal" },
  { name: "Impact",          weight: 25, description: "Relevance, usefulness and real-world value" },
];

export default function RubricBuilder({ criteria, onChange }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [showPresets, setShowPresets] = useState(false);

  const totalWeight = criteria.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  const weightOk = totalWeight === 100;
  const remaining = 100 - totalWeight;

  const addCriterion = () =>
    onChange([
      ...criteria,
      { name: "", weight: Math.max(0, remaining), description: "" },
    ]);

  const loadPresets = () => {
    onChange(PRESETS.map(p => ({ ...p })));
    setShowPresets(false);
  };

  const update = (i: number, patch: Partial<RubricCriterion>) =>
    onChange(criteria.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const remove = (i: number) =>
    onChange(criteria.filter((_, idx) => idx !== i));

  const autoBalance = () => {
    if (criteria.length === 0) return;
    const base = Math.floor(100 / criteria.length);
    const rem  = 100 - base * criteria.length;
    onChange(criteria.map((c, i) => ({ ...c, weight: base + (i === 0 ? rem : 0) })));
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface/60 hover:bg-surface transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-text">📊 Rubric Criteria</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-medium ${
            weightOk ? "bg-green-500/15 text-green-400" : totalWeight > 100 ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"
          }`}>
            {totalWeight}/100
          </span>
          {criteria.length > 0 && (
            <span className="text-xs text-muted">{criteria.length} criterion{criteria.length !== 1 ? "a" : ""}</span>
          )}
        </div>
        {collapsed ? <ChevronDown size={14} className="text-muted" /> : <ChevronUp size={14} className="text-muted" />}
      </button>

      {!collapsed && (
        <div className="p-4 space-y-3">
          {/* Empty state */}
          {criteria.length === 0 && (
            <div className="text-center py-4 space-y-3">
              <p className="text-xs text-muted">
                No criteria yet — AI will use a generic rubric.<br />
                Add criteria for precise, transparent scoring.
              </p>
              <button
                type="button"
                onClick={() => setShowPresets(v => !v)}
                className="text-xs text-accent hover:underline"
              >
                ✨ Load 4 standard criteria (25% each)
              </button>
              {showPresets && (
                <div className="glass rounded-xl p-3 space-y-2 text-left mt-2">
                  {PRESETS.map(p => (
                    <div key={p.name} className="flex items-center justify-between text-xs">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-muted">{p.description}</span>
                      <span className="font-mono text-accent ml-2">{p.weight}%</span>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={loadPresets}
                    className="w-full mt-2 py-1.5 bg-accent/10 hover:bg-accent/20 text-accent text-xs rounded-lg transition-colors"
                  >
                    Apply these criteria
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Criteria list */}
          {criteria.map((c, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-bg overflow-hidden">
              {/* Top row: grip | name input | weight | delete */}
              <div className="flex items-center gap-2 px-3 py-2.5">
                <GripVertical size={14} className="text-muted/30 shrink-0 cursor-grab" />

                {/* Name */}
                <input
                  value={c.name}
                  onChange={e => update(i, { name: e.target.value })}
                  className="input-glass !py-1.5 !text-sm flex-1 min-w-0"
                  placeholder={`Criterion ${i + 1} (e.g. Creativity)`}
                />

                {/* Weight pill */}
                <div className="flex items-center gap-1.5 shrink-0 bg-surface border border-border rounded-lg px-2 py-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={c.weight}
                    onChange={e => update(i, { weight: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
                    className="w-10 bg-transparent text-center text-sm font-mono font-bold text-accent outline-none"
                  />
                  <span className="text-xs text-muted font-medium">%</span>
                </div>

                {/* Delete */}
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400/50 hover:text-red-400 transition-all shrink-0"
                  title="Remove"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Description row */}
              <div className="px-3 pb-2.5">
                <input
                  value={c.description}
                  onChange={e => update(i, { description: e.target.value })}
                  className="input-glass !py-1.5 !text-xs w-full text-muted"
                  placeholder="Brief description shown to participants (optional)"
                />
              </div>
            </div>
          ))}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={addCriterion}
                className="text-xs text-accent hover:underline flex items-center gap-1"
              >
                <Plus size={11} /> Add Criterion
              </button>
              {criteria.length >= 2 && !weightOk && (
                <button
                  type="button"
                  onClick={autoBalance}
                  className="text-xs text-muted hover:text-text underline flex items-center gap-1"
                >
                  Auto-balance
                </button>
              )}
            </div>

            {/* Status badge */}
            {criteria.length > 0 && (
              <div className={`flex items-center gap-1.5 text-xs ${weightOk ? "text-green-400" : totalWeight > 100 ? "text-red-400" : "text-amber-400"}`}>
                {weightOk
                  ? <><CheckCircle2 size={12} /> Weights balanced</>
                  : totalWeight > 100
                    ? <><AlertCircle size={12} /> Over by {totalWeight - 100}%</>
                    : <><AlertCircle size={12} /> {remaining}% unassigned</>}
              </div>
            )}
          </div>

          {/* Visual weight breakdown bar */}
          {criteria.length > 0 && (
            <div className="flex rounded-full overflow-hidden h-1.5 mt-1 gap-px">
              {criteria.map((c, i) => {
                const colors = ["bg-accent", "bg-accent2", "bg-accent3", "bg-green-400", "bg-pink-400", "bg-orange-400"];
                return (
                  <div
                    key={i}
                    style={{ width: `${c.weight}%` }}
                    className={`${colors[i % colors.length]} transition-all duration-300`}
                    title={`${c.name || `Criterion ${i + 1}`}: ${c.weight}%`}
                  />
                );
              })}
              {!weightOk && (
                <div style={{ width: `${Math.max(0, remaining)}%` }} className="bg-border/40" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
