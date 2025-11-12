import { useEffect, useState } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";

export default function Report() {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await api.get("/dashboard/weekly-report");
            setReport(res.data);
        } catch (err) {
            console.error("Failed to load report:", err);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchReport();
    }, []);

    if (loading)
        return (
            <Layout>
                <div className="flex justify-center items-center min-h-[200px] text-gray-600">
                    Loading weekly report...
                </div>
            </Layout>
        );

    if (!report) return <p>No report found.</p>;

    const s = report.summary_14 || {};

    return (
        <Layout>
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">
                    Weekly Report
                </h1>

                {/* GRID LAYOUT */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* LEFT COLUMN */}
                    <div className="space-y-6 lg:col-span-1">

                        {/* --- 14-Day Summary --- */}
                        <div className="p-4 bg-white rounded-xl shadow space-y-2">
                            <h2 className="text-lg font-semibold">14-Day Summary</h2>

                            <Metric label="Entries" value={s.num_entries} />
                            <Metric label="Average Score" value={s.avg_score} />
                            <Metric label="Standard Deviation" value={s.std_dev} />
                            <Metric label="Best Day (lower=better)" value={s.best} />
                            <Metric label="Worst Day (higher=worse)" value={s.worst} />
                            <Metric label="Negative Ratio" value={s.neg_ratio} />
                            <Metric label="Trend Slope" value={s.trend_slope} />
                        </div>

                        {/* --- Risk Score --- */}
                        <div className="p-4 bg-white rounded-xl shadow space-y-3">
                            <h2 className="text-lg font-semibold">Risk Score</h2>

                            <p
                                className={`text-3xl font-bold
                ${report.risk_score < 33
                                        ? "text-green-600"
                                        : report.risk_score < 66
                                            ? "text-yellow-500"
                                            : "text-red-600"
                                    }
              `}
                            >
                                {report.risk_score}
                            </p>

                            <p className="text-sm text-gray-600 leading-relaxed">
                                This represents your emotional risk estimate over the last
                                2 weeks. Higher values generally indicate more distress or
                                instability. Not a diagnosis — just insight.
                            </p>

                            {/* Legend */}
                            <div className="mt-3 space-y-1 text-sm">
                                <h3 className="font-medium text-gray-700">Legend</h3>

                                <Legend color="bg-green-600" label="< 33 — Low" />
                                <Legend color="bg-yellow-500" label="33 → 66 — Moderate" />
                                <Legend color="bg-red-600" label="> 66 — High" />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN — Nexis multi-section card*/}
                    <div className="p-6 rounded-xl shadow bg-white border flex flex-col space-y-6 lg:col-span-2">

                        {/* Header */}
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xl">
                                🤖
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-800 text-lg">Nexis</h2>
                                <p className="text-xs text-gray-500">Your AI emotional companion</p>
                            </div>
                        </div>

                        {/* Summary (2–3 sentences) */}
                        <Section title="Summary">
                            <p className="whitespace-pre-wrap text-gray-700">
                                {report.summary || "Not enough data to generate a summary."}
                            </p>
                        </Section>

                        {/* Key Insights */}
                        {!!(report.key_insights?.length) && (
                            <Section title="Key Insights">
                                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                                    {report.key_insights.map((i, idx) => <li key={idx}>{i}</li>)}
                                </ul>
                            </Section>
                        )}

                        {/* Suggestions (dynamic chips) */}
                        {!!(report.suggestions?.length) && (
                            <Section title="Suggestions">
                                <div className="flex flex-wrap gap-2">
                                    {report.suggestions.map((s, idx) => (
                                        <SuggestionChip key={idx} label={s} />
                                    ))}
                                </div>
                            </Section>
                        )}

                        {/* Strengths */}
                        {!!(report.strengths?.length) && (
                            <Section title="Strengths">
                                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                                    {report.strengths.map((s, idx) => <li key={idx}>{s}</li>)}
                                </ul>
                            </Section>
                        )}

                        {/* Possible Triggers */}
                        {!!(report.possible_triggers?.length) && (
                            <Section title="Possible Triggers">
                                <ul className="list-disc pl-5 space-y-1 text-gray-700">
                                    {report.possible_triggers.map((t, idx) => <li key={idx}>{t}</li>)}
                                </ul>
                            </Section>
                        )}

                        {/* Follow-up Recommendation */}
                        {report.recommend_followup && (
                            <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                                <p className="text-sm text-amber-800">
                                    If tough feelings continue, consider talking to someone you trust or a mental health professional.
                                </p>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </Layout>
    );
}

/* Reusable metric line */
function Metric({ label, value }) {
    return (
        <div className="flex justify-between border-b pb-2">
            <span className="text-gray-700">{label}</span>
            <span className="font-semibold">{value ?? "-"}</span>
        </div>
    );
}

/* Legend unit */
function Legend({ color, label }) {
    return (
        <div className="flex items-center space-x-2">
            <span className={`inline-block w-3 h-3 rounded-full ${color}`} />
            <span className="text-gray-700">{label}</span>
        </div>
    );
}

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
      {children}
    </div>
  );
}

function SuggestionChip({ label }) {
  return (
    <span className="px-3 py-1 text-xs rounded-full border bg-white text-indigo-600 border-indigo-300 shadow-sm">
      {label}
    </span>
  );
}


