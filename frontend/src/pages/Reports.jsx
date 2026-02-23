// src/pages/Reports.jsx
import { useEffect, useState } from "react";
import api from "../api/axios.jsx";
import Layout from "../components/Layout";
import {
    LightBulbIcon,
    SparklesIcon,
    BoltIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
    ChartBarIcon,
} from "@heroicons/react/24/outline";

// Gauge / risk bar for visual risk score display
function RiskBar({ score }) {
    const pct = Math.min(100, Math.max(0, score ?? 0));
    const color =
        pct < 33 ? "bg-green-500" : pct < 66 ? "bg-amber-500" : "bg-red-500";
    const label =
        pct < 33 ? "Low Risk" : pct < 66 ? "Moderate Risk" : "High Risk";
    const textColor =
        pct < 33 ? "text-green-600" : pct < 66 ? "text-amber-600" : "text-red-600";

    return (
        <div>
            <div className="flex justify-between items-baseline mb-1">
                <span className={`text-2xl font-bold ${textColor}`}>{score ?? "—"}</span>
                <span className={`text-xs font-semibold uppercase tracking-wider ${textColor}`}>{label}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${color}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0</span><span>33</span><span>66</span><span>100</span>
            </div>
        </div>
    );
}

function MetricRow({ label, value, hint }) {
    return (
        <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
            <div>
                <span className="text-sm text-slate-700">{label}</span>
                {hint && <p className="text-[10px] text-slate-400 mt-0.5">{hint}</p>}
            </div>
            <span className="font-semibold text-slate-800 text-sm ml-4 flex-shrink-0">{value ?? "—"}</span>
        </div>
    );
}

function Section({ title, icon: Icon, iconColor = "text-indigo-500", children }) {
    return (
        <div className="space-y-3">
            <h3 className={`flex items-center gap-2 text-sm font-semibold uppercase tracking-wider ${iconColor}`}>
                <Icon className="h-4 w-4" />
                {title}
            </h3>
            {children}
        </div>
    );
}

function SuggestionChip({ label }) {
    return (
        <span className="inline-flex items-center px-3 py-1.5 text-xs rounded-full border bg-white text-indigo-700 border-indigo-200 shadow-sm font-medium">
            {label}
        </span>
    );
}

function LoadingSkeleton() {
    return (
        <Layout>
            <div className="animate-pulse space-y-6">
                <div className="h-7 bg-slate-200 rounded w-1/4" />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="space-y-4 lg:col-span-1">
                        <div className="bg-white rounded-xl p-5 shadow space-y-3">
                            <div className="h-4 bg-slate-200 rounded w-1/2" />
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex justify-between">
                                    <div className="h-3 bg-slate-100 rounded w-2/5" />
                                    <div className="h-3 bg-slate-200 rounded w-1/5" />
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-6 shadow lg:col-span-2 space-y-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-4 bg-slate-100 rounded w-full" />
                        ))}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

export default function Report() {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    const fetchReport = async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await api.get("/dashboard/weekly-report");
            setReport(res.data);
        } catch (err) {
            console.error("Failed to load report:", err);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchReport(); }, []);

    if (loading) return <LoadingSkeleton />;

    if (error || !report) {
        return (
            <Layout>
                <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
                    <ExclamationTriangleIcon className="h-12 w-12 text-slate-300" />
                    <p className="text-slate-500 font-medium">Could not load your report.</p>
                    <button
                        onClick={fetchReport}
                        className="flex items-center gap-2 bg-sky-500 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-sky-600 transition-colors"
                    >
                        <ArrowPathIcon className="h-4 w-4" /> Try Again
                    </button>
                </div>
            </Layout>
        );
    }

    const s = report.summary_14 || {};

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-800">Weekly Report</h1>
                        <p className="text-slate-500 text-sm mt-0.5">Based on your last 14 days of check-ins.</p>
                    </div>
                    <button
                        onClick={fetchReport}
                        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-sky-600 transition-colors"
                    >
                        <ArrowPathIcon className="h-4 w-4" /> Refresh
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Left column */}
                    <div className="space-y-5 lg:col-span-1">

                        {/* Risk Score */}
                        <div className="p-5 bg-white rounded-xl shadow-sm border border-slate-100 space-y-4">
                            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wider">
                                <ChartBarIcon className="h-4 w-4 text-slate-400" />
                                Emotional Risk Score
                            </h2>
                            <RiskBar score={report.risk_score} />
                            <p className="text-xs text-slate-400 leading-relaxed">
                                Estimates your emotional risk over the last 2 weeks. Not a diagnosis — just an indicator.
                            </p>
                        </div>

                        {/* 14-Day Stats */}
                        <div className="p-5 bg-white rounded-xl shadow-sm border border-slate-100">
                            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                                <ChartBarIcon className="h-4 w-4 text-slate-400" />
                                14-Day Stats
                            </h2>
                            <MetricRow label="Total Check-ins" value={s.num_entries} />
                            <MetricRow label="Average Mood Score" value={s.avg_score} hint="Out of 100" />
                            <MetricRow label="Score Variability" value={s.std_dev} hint="Lower = more stable" />
                            <MetricRow label="Best Score" value={s.best} />
                            <MetricRow label="Lowest Score" value={s.worst} />
                            <MetricRow label="Negative Mood Rate" value={s.neg_ratio != null ? `${(s.neg_ratio * 100).toFixed(0)}%` : null} />
                            <MetricRow label="Trend Direction" value={s.trend_slope != null ? (s.trend_slope > 0 ? "↑ Improving" : "↓ Declining") : null} />
                        </div>
                    </div>

                    {/* Right column — AI Report */}
                    <div className="p-6 rounded-xl shadow-sm bg-white border border-slate-100 flex flex-col gap-6 lg:col-span-2">
                        {/* Nexis header */}
                        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg shadow">
                                🤖
                            </div>
                            <div>
                                <p className="font-semibold text-slate-800">Nexis AI</p>
                                <p className="text-xs text-slate-400">Your emotional companion</p>
                            </div>
                        </div>

                        {/* Summary */}
                        <Section title="Summary" icon={SparklesIcon} iconColor="text-violet-500">
                            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                                {report.summary || "Not enough data to generate a summary yet. Keep checking in!"}
                            </p>
                        </Section>

                        {/* Key Insights */}
                        {!!report.key_insights?.length && (
                            <Section title="Key Insights" icon={LightBulbIcon} iconColor="text-amber-500">
                                <ul className="space-y-2">
                                    {report.key_insights.map((insight, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                                            {insight}
                                        </li>
                                    ))}
                                </ul>
                            </Section>
                        )}

                        {/* Strengths */}
                        {!!report.strengths?.length && (
                            <Section title="Your Strengths" icon={BoltIcon} iconColor="text-emerald-500">
                                <ul className="space-y-2">
                                    {report.strengths.map((s, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            </Section>
                        )}

                        {/* Suggestions */}
                        {!!report.suggestions?.length && (
                            <Section title="Suggestions" icon={SparklesIcon} iconColor="text-sky-500">
                                <div className="flex flex-wrap gap-2">
                                    {report.suggestions.map((s, idx) => (
                                        <SuggestionChip key={idx} label={s} />
                                    ))}
                                </div>
                            </Section>
                        )}

                        {/* Possible Triggers */}
                        {!!report.possible_triggers?.length && (
                            <Section title="Possible Triggers" icon={ExclamationTriangleIcon} iconColor="text-red-400">
                                <ul className="space-y-2">
                                    {report.possible_triggers.map((t, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                                            {t}
                                        </li>
                                    ))}
                                </ul>
                            </Section>
                        )}

                        {/* Follow-up banner */}
                        {report.recommend_followup && (
                            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                                <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-amber-800">
                                    If tough feelings persist, consider talking to someone you trust or a mental health professional.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}
