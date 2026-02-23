// src/components/PHQ9Survey.jsx
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import api from "../api/axios.jsx";
import { useToast } from "./Toast";
import { XMarkIcon, ExclamationTriangleIcon, ClipboardDocumentCheckIcon } from "@heroicons/react/24/outline";

const questions = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
  "Trouble concentrating on things, such as reading the newspaper or watching television",
  "Moving or speaking so slowly that other people could have noticed, or the opposite — being so fidgety or restless that you have been moving around a lot more than usual",
  "Thoughts that you would be better off dead, or of hurting yourself in some way",
];

const options = [
  { label: "Not at all", value: 0 },
  { label: "Several days", value: 1 },
  { label: "More than half", value: 2 },
  { label: "Nearly every day", value: 3 },
];

function getResult(score) {
  if (score <= 4) return { label: "Minimal", color: "text-green-600", bar: "bg-green-500", pct: (score / 27) * 100 };
  if (score <= 9) return { label: "Mild", color: "text-lime-600", bar: "bg-lime-500", pct: (score / 27) * 100 };
  if (score <= 14) return { label: "Moderate", color: "text-amber-600", bar: "bg-amber-500", pct: (score / 27) * 100 };
  if (score <= 19) return { label: "Moderately Severe", color: "text-orange-600", bar: "bg-orange-500", pct: (score / 27) * 100 };
  return { label: "Severe", color: "text-red-600", bar: "bg-red-500", pct: (score / 27) * 100 };
}

export default function PHQ9Survey({ onClose }) {
  const { auth } = useAuth();
  const toast = useToast();
  const [answers, setAnswers] = useState(Array(9).fill(null));
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const answeredCount = answers.filter((a) => a !== null).length;
  const progressPct = Math.round((answeredCount / 9) * 100);

  const handleAnswerChange = (qIndex, value) => {
    const next = [...answers];
    next[qIndex] = value;
    setAnswers(next);
  };

  const handleSubmit = async () => {
    if (answers.includes(null)) {
      toast("Please answer all 9 questions before submitting.", "info");
      return;
    }

    const score = answers.reduce((t, v) => t + v, 0);
    const { label: interpretation } = getResult(score);

    if (!auth?.token) {
      toast("You must be logged in to submit.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(
        "/survey/phq9",
        { answers, score, interpretation },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      setResult({ score, interpretation });
      toast("Survey saved!", "success");
    } catch (err) {
      console.error("Error submitting survey:", err);
      toast("Failed to save your survey. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resultMeta = result ? getResult(result.score) : null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && !isSubmitting && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-800">PHQ-9 Wellness Survey</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-40"
            aria-label="Close"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          {!result ? (
            <>
              {/* Intro + progress */}
              <p className="text-slate-500 text-sm mb-4">
                Over the <strong className="text-slate-700">last 2 weeks</strong>, how often have you been bothered by any of the following?
              </p>

              {/* Progress bar */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>{answeredCount} of 9 answered</span>
                  <span>{progressPct}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>

              {/* Q9 sensitive warning */}
              {answers[8] !== null && answers[8] > 0 && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">
                    You've indicated you may have had thoughts of self-harm. Please consider
                    reaching out to a mental health professional or a crisis helpline if you need support.
                  </p>
                </div>
              )}

              {/* Questions */}
              <div className="space-y-5">
                {questions.map((q, qIndex) => {
                  const isAnswered = answers[qIndex] !== null;
                  return (
                    <div
                      key={qIndex}
                      className={`rounded-xl border p-4 transition-colors ${isAnswered ? "border-indigo-200 bg-indigo-50/40" : "border-slate-200 bg-slate-50"
                        }`}
                    >
                      <p className="text-sm font-medium text-slate-800 mb-3">
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold mr-2 flex-shrink-0">
                          {qIndex + 1}
                        </span>
                        {q}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {options.map((opt) => {
                          const selected = answers[qIndex] === opt.value;
                          return (
                            <label
                              key={opt.value}
                              className={`flex flex-col items-center text-center px-2 py-2.5 rounded-lg border cursor-pointer text-xs font-medium transition-all select-none ${selected
                                  ? "border-indigo-500 bg-indigo-600 text-white shadow-sm"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50"
                                }`}
                            >
                              <input
                                type="radio"
                                name={`q-${qIndex}`}
                                value={opt.value}
                                checked={selected}
                                onChange={() => handleAnswerChange(qIndex, opt.value)}
                                className="sr-only"
                              />
                              <span className="text-base mb-0.5">
                                {opt.value === 0 ? "🙂" : opt.value === 1 ? "😐" : opt.value === 2 ? "😕" : "😞"}
                              </span>
                              {opt.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Result screen */
            <div className="py-4">
              <div className="text-center mb-8">
                <p className="text-sm text-slate-500 mb-1 uppercase tracking-wider font-medium">Your Score</p>
                <p className={`text-6xl font-bold mb-1 ${resultMeta.color}`}>{result.score}</p>
                <p className="text-slate-400 text-sm">out of 27</p>
              </div>

              {/* Score bar */}
              <div className="mb-6">
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${resultMeta.bar}`}
                    style={{ width: `${resultMeta.pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Minimal (0–4)</span>
                  <span>Mild (5–9)</span>
                  <span>Moderate (10–14)</span>
                  <span>Severe (20–27)</span>
                </div>
              </div>

              <div className={`text-center text-xl font-semibold mb-6 ${resultMeta.color}`}>
                {result.interpretation} Depression
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-600 leading-relaxed">
                Your results have been saved. This is a screening tool, not a medical diagnosis.
                If you're concerned about your score, please talk to a healthcare professional.
              </div>

              {result.score >= 10 && (
                <div className="mt-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    A score of <strong>{result.score}</strong> suggests you may benefit from professional support.
                    Consider speaking with a doctor or counsellor.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          {!result ? (
            <>
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || answeredCount < 9}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Saving…
                  </>
                ) : (
                  `Submit${answeredCount < 9 ? ` (${answeredCount}/9)` : ""}`
                )}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-colors shadow-sm"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}