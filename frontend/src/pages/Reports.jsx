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

    if (!report)
        return (
            <Layout>
                <p>No report found.</p>
            </Layout>
        );

    const s = report.summary_14 || {};

    return (
        <Layout>
            <div className="p-6 max-w-4xl mx-auto space-y-6">
                <h1 className="text-2xl font-bold text-gray-800 mb-2">
                    Weekly Report
                </h1>

                {/* ✅ LLM Narrative moved to top */}
                {report.narrative && (
                    <div className="p-6 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl shadow">
                        <h2 className="text-lg font-semibold mb-2">AI Summary</h2>
                        <p className="leading-relaxed opacity-90 whitespace-pre-wrap">
                            {report.narrative}
                        </p>
                    </div>
                )}

                {/* ✅ Risk Score with explanation */}
                <div className="p-4 bg-white rounded-xl shadow space-y-2">
                    <h2 className="text-lg font-semibold">Risk Score</h2>
                    <p className="text-3xl font-bold text-indigo-600">
                        {report.risk_score}
                    </p>

                    <p className="text-sm text-gray-600 leading-relaxed">
                        This score reflects your overall emotional pattern across the past 2 weeks.
                        Higher values typically indicate more emotional instability or frequent
                        negative emotional states. This is <strong>not a diagnosis</strong>, but
                        rather an estimate to help you understand your emotional trend.
                    </p>
                </div>

                {/* 14-Day Metrics */}
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
            </div>
        </Layout>
    );
}

function Metric({ label, value }) {
    return (
        <div className="flex justify-between border-b pb-2">
            <span className="text-gray-700">{label}</span>
            <span className="font-semibold">{value ?? "-"}</span>
        </div>
    );
}
