"use client";
import { useState } from "react";
import { Plus, Trash2, GripVertical, Code2, FileText, Image,
  FileUp, CheckSquare, Link, ChevronDown, ChevronUp, Layers, AlertCircle, RefreshCw
} from "lucide-react";
import type { CategoryType, RubricCriterion } from "@/types";
import RubricBuilder from "./RubricBuilder";
import McqQuestionManager, { type McqQuestionDraft } from "./McqQuestionManager";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

export interface CategoryDraft {
  name: string;
  type: CategoryType;
  description: string;
  rubric_json: RubricCriterion[];
  max_score: number;
  time_limit: string;         // "" means no limit
  max_submissions: number;    // how many times participant can submit (default: 1)
  allow_resubmit: boolean;    // can they update after first submit
  order_index: number;
  mcq_questions: McqQuestionDraft[];
}

// ────────────────────────────────────────────────────────────
// Category type metadata
// ────────────────────────────────────────────────────────────

const CATEGORY_TYPES: {
  value: CategoryType;
  label: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}[] = [
  {
    value: "CODE",
    label: "Speed Programming / Debugging",
    icon: <Code2 size={15} />,
    description: "Code editor submission — graded by our custom Hunr AI judge",
    color: "text-cyan-400",
  },
  {
    value: "TEXT",
    label: "Project Idea / Essay",
    icon: <FileText size={15} />,
    description: "Rich text submission — graded by Gemini text AI",
    color: "text-violet-400",
  },
  {
    value: "IMAGE",
    label: "Poster / Graphic Design",
    icon: <Image size={15} />,
    description: "Image upload (JPG/PNG/PDF) — graded by Gemini Vision AI",
    color: "text-pink-400",
  },
  {
    value: "FILE",
    label: "Presentation / Report",
    icon: <FileUp size={15} />,
    description: "PDF/PPTX upload — Gemini reads and grades the content",
    color: "text-amber-400",
  },
  {
    value: "MCQ",
    label: "Quiz / MCQ",
    icon: <CheckSquare size={15} />,
    description: "Multiple-choice quiz — auto-graded, no AI needed",
    color: "text-green-400",
  },
  {
    value: "URL",
    label: "App / Web Dev (GitHub)",
    icon: <Link size={15} />,
    description: "GitHub repo or live link — Gemini reads README and code",
    color: "text-orange-400",
  },
];

const blankCategory = (order: number): CategoryDraft => ({
  name: "",
  type: "TEXT",
  description: "",
  rubric_json: [],
  max_score: 100,
  time_limit: "",
  max_submissions: 1,
  allow_resubmit: true,
  order_index: order,
  mcq_questions: [],
});

// ────────────────────────────────────────────────────────────
// Single category card
// ────────────────────────────────────────────────────────────

function CategoryCard({
  cat,
  index,
  total,
  onChange,
  onRemove,
}: {
  cat: CategoryDraft;
  index: number;
  total: number;
  onChange: (patch: Partial<CategoryDraft>) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(true);
  const meta = CATEGORY_TYPES.find((t) => t.value === cat.type)!;

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface/20">
      {/* Card header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-surface/50">
        <GripVertical size={14} className="text-muted/40 shrink-0 cursor-grab" />
        <span className={`shrink-0 ${meta.color}`}>{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text truncate">
            {cat.name || `Category ${index + 1}`}
          </p>
          <p className="text-xs text-muted truncate">{meta.label}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {total > 1 && (
            <button
              type="button"
              onClick={onRemove}
              className="text-red-400/50 hover:text-red-400 transition-colors"
            >
              <Trash2 size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-muted hover:text-text transition-colors"
          >
            {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Card body */}
      {open && (
        <div className="p-4 space-y-4">
          {/* Name + Type row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted mb-1.5 block">Category Name *</label>
              <input
                value={cat.name}
                onChange={(e) => onChange({ name: e.target.value })}
                className="input-glass"
                placeholder='e.g. "Speed Programming"'
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1.5 block">Submission Type *</label>
              <select
                value={cat.type}
                onChange={(e) => onChange({ type: e.target.value as CategoryType, mcq_questions: [] })}
                className="input-glass"
              >
                {CATEGORY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted mt-1">{meta.description}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-muted mb-1.5 block">Instructions for Participants (optional)</label>
            <textarea
              value={cat.description}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={2}
              className="input-glass resize-none text-sm"
              placeholder="What should they submit? Any constraints or format requirements?"
            />
          </div>

          {/* Score + Time limit row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted mb-1.5 block">Max Score</label>
              <input
                type="number" min={1}
                value={cat.max_score}
                onChange={(e) => onChange({ max_score: Math.max(1, +e.target.value) })}
                className="input-glass"
              />
            </div>
            <div>
              <label className="text-xs text-muted mb-1.5 flex items-center gap-1.5">
                Time Limit (minutes)
                {cat.type === "MCQ" && (
                  <span className="text-red-400 text-xs font-medium flex items-center gap-0.5">
                    <AlertCircle size={10} /> Required for MCQ
                  </span>
                )}
              </label>
              <input
                type="number" min={1}
                value={cat.time_limit}
                onChange={(e) => onChange({ time_limit: e.target.value })}
                className={`input-glass ${cat.type === "MCQ" && !cat.time_limit ? "border-red-500/50" : ""}`}
                placeholder={cat.type === "MCQ" ? "e.g. 30 (required)" : "Leave blank = event deadline"}
              />
              {cat.type === "MCQ" && !cat.time_limit && (
                <p className="text-xs text-red-400 mt-1">⚠ MCQ must have a time limit to prevent answer lookup</p>
              )}
            </div>
          </div>

          {/* Submission Rules */}
          <div className="grid grid-cols-2 gap-4 p-3 bg-surface/40 rounded-xl border border-border/50">
            <div>
              <label className="text-xs text-muted mb-1.5 flex items-center gap-1.5">
                <RefreshCw size={11} /> Max Attempts
              </label>
              <input
                type="number" min={1} max={10}
                value={cat.max_submissions}
                disabled={cat.type === "MCQ"}
                onChange={(e) => onChange({ max_submissions: Math.max(1, Math.min(10, +e.target.value)) })}
                className="input-glass disabled:opacity-50"
              />
              <p className="text-xs text-muted/60 mt-1">
                {cat.type === "MCQ" ? "MCQ: always 1 attempt" : "How many times can they submit?"}
              </p>
            </div>
            <div className="flex flex-col justify-center">
              <label className="text-xs text-muted mb-2 block">Allow Re-submission</label>
              <button
                type="button"
                disabled={cat.type === "MCQ"}
                onClick={() => onChange({ allow_resubmit: !cat.allow_resubmit })}
                className={`flex items-center gap-2 text-sm transition-all disabled:opacity-50 ${
                  cat.allow_resubmit ? "text-green-400" : "text-muted"
                }`}
              >
                <div className={`w-10 h-5 rounded-full transition-all relative ${
                  cat.allow_resubmit ? "bg-green-500/30" : "bg-border"
                }`}>
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                    cat.allow_resubmit ? "left-5 bg-green-400" : "left-0.5 bg-muted"
                  }`} />
                </div>
                {cat.allow_resubmit ? "Allowed" : "Locked"}
              </button>
              <p className="text-xs text-muted/60 mt-1">
                {cat.type === "MCQ" ? "MCQ: always locked after first submit" : "Can they update before deadline?"}
              </p>
            </div>
          </div>

          {/* Rubric — not shown for MCQ */}
          {cat.type !== "MCQ" && (
            <RubricBuilder
              criteria={cat.rubric_json}
              onChange={(rubric_json) => onChange({ rubric_json })}
            />
          )}

          {/* MCQ question manager */}
          {cat.type === "MCQ" && (
            <McqQuestionManager
              questions={cat.mcq_questions}
              onChange={(mcq_questions) => onChange({ mcq_questions })}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Main CategoryBuilder
// ────────────────────────────────────────────────────────────

interface Props {
  categories: CategoryDraft[];
  onChange: (categories: CategoryDraft[]) => void;
}

export default function CategoryBuilder({ categories, onChange }: Props) {
  const add = () => onChange([...categories, blankCategory(categories.length)]);

  const update = (i: number, patch: Partial<CategoryDraft>) =>
    onChange(categories.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const remove = (i: number) =>
    onChange(
      categories
        .filter((_, idx) => idx !== i)
        .map((c, idx) => ({ ...c, order_index: idx }))
    );

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-accent" />
          <h3 className="font-semibold text-text">Competition Categories</h3>
          <span className="text-xs text-muted bg-surface px-2 py-0.5 rounded-full">
            {categories.length} track{categories.length !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          type="button"
          onClick={add}
          className="btn-secondary !py-2 !px-3 text-xs flex items-center gap-1.5"
        >
          <Plus size={13} /> Add Category
        </button>
      </div>

      {/* Empty state */}
      {categories.length === 0 && (
        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
          <Layers size={28} className="text-muted/40 mx-auto mb-3" />
          <p className="text-sm text-muted">No categories yet</p>
          <p className="text-xs text-muted/60 mt-1 mb-4">
            Add tracks like "Speed Programming", "Poster Making", or "Quiz"
          </p>
          <button
            type="button"
            onClick={add}
            className="btn-primary !py-2 !px-4 text-sm"
          >
            <Plus size={13} className="inline mr-1" /> Add First Category
          </button>
        </div>
      )}

      {/* Category cards */}
      <div className="space-y-3">
        {categories.map((cat, i) => (
          <CategoryCard
            key={i}
            cat={cat}
            index={i}
            total={categories.length}
            onChange={(patch) => update(i, patch)}
            onRemove={() => remove(i)}
          />
        ))}
      </div>

      {/* Quick add type buttons */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {CATEGORY_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() =>
                onChange([
                  ...categories,
                  {
                    ...blankCategory(categories.length),
                    type: t.value,
                  },
                ])
              }
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full glass border border-border hover:border-accent/50 transition-all ${t.color}`}
            >
              {t.icon}
              <span className="text-muted">{t.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
