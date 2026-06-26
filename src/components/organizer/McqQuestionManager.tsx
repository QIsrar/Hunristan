"use client";
import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import type { McqQuestion } from "@/types";

// We omit id/category_id/created_at here — those are set by the DB
export type McqQuestionDraft = Omit<McqQuestion, "id" | "category_id" | "created_at">;

const LABELS = ["A", "B", "C", "D"];

interface Props {
  questions: McqQuestionDraft[];
  onChange: (questions: McqQuestionDraft[]) => void;
}

const blankQuestion = (): McqQuestionDraft => ({
  question: "",
  options: ["", "", "", ""],
  correct_ans: "A",
  marks: 1,
  order_index: 0,
});

export default function McqQuestionManager({ questions, onChange }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  const add = () =>
    onChange([...questions, { ...blankQuestion(), order_index: questions.length }]);

  const remove = (i: number) =>
    onChange(questions.filter((_, idx) => idx !== i).map((q, idx) => ({ ...q, order_index: idx })));

  const updateQ = (i: number, patch: Partial<McqQuestionDraft>) =>
    onChange(questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));

  const updateOption = (qi: number, oi: number, val: string) => {
    const opts = [...questions[qi].options];
    opts[oi] = val;
    updateQ(qi, { options: opts });
  };

  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface/60 hover:bg-surface transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text">🧩 MCQ Questions</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent font-mono">
            {questions.length}Q · {totalMarks} marks
          </span>
        </div>
        {collapsed ? <ChevronDown size={14} className="text-muted" /> : <ChevronUp size={14} className="text-muted" />}
      </button>

      {!collapsed && (
        <div className="p-4 space-y-4">
          {questions.length === 0 && (
            <p className="text-xs text-muted text-center py-2">
              No questions yet. Add questions to build your quiz.
            </p>
          )}

          {questions.map((q, qi) => (
            <div key={qi} className="p-4 bg-bg rounded-xl border border-border/60 space-y-3">
              {/* Question header */}
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-accent bg-accent/10 rounded px-2 py-1 shrink-0 mt-0.5">
                  Q{qi + 1}
                </span>
                <textarea
                  value={q.question}
                  onChange={(e) => updateQ(qi, { question: e.target.value })}
                  rows={2}
                  className="input-glass flex-1 !text-sm resize-none"
                  placeholder="Enter question text..."
                />
                <div className="flex items-center gap-1 shrink-0">
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={q.marks}
                    onChange={(e) => updateQ(qi, { marks: Math.min(100, Math.max(1, parseInt(e.target.value) || 1)) })}
                    className="input-glass !py-1 !px-2 !text-sm w-20 text-center font-mono"
                  />
                  <span className="text-xs text-muted">pts</span>
                </div>
                <button
                  type="button"
                  onClick={() => remove(qi)}
                  className="text-red-400/60 hover:text-red-400 transition-colors shrink-0 mt-1"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 gap-2">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateQ(qi, { correct_ans: LABELS[oi] })}
                      className={`w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 border-2 transition-all ${
                        q.correct_ans === LABELS[oi]
                          ? "bg-green-500 border-green-500 text-white"
                          : "border-border text-muted hover:border-green-500/50"
                      }`}
                      title={`Set option ${LABELS[oi]} as correct answer`}
                    >
                      {LABELS[oi]}
                    </button>
                    <input
                      value={opt}
                      onChange={(e) => updateOption(qi, oi, e.target.value)}
                      className="input-glass flex-1 !py-1.5 !text-sm"
                      placeholder={`Option ${LABELS[oi]}`}
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted">
                ✓ Correct answer:{" "}
                <span className="text-green-400 font-semibold">
                  {LABELS[LABELS.indexOf(q.correct_ans)]} — {q.options[LABELS.indexOf(q.correct_ans)] || "(not entered yet)"}
                </span>
              </p>
            </div>
          ))}

          <button
            type="button"
            onClick={add}
            className="text-xs text-accent hover:underline flex items-center gap-1 pt-1"
          >
            <Plus size={11} /> Add Question
          </button>
        </div>
      )}
    </div>
  );
}
