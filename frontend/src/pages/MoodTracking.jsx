// src/pages/MoodTracking.jsx
import api from "../api/axios.jsx";
import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { Line, Pie } from "react-chartjs-2";
import { ArrowPathIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, ArcElement, Filler
);

const moodConfig = {
  Happy: { color: "rgba(34, 197, 94, 0.7)", border: "rgb(22, 163, 74)", hex: "#16a34a" },
  Neutral: { color: "rgba(100, 116, 139, 0.7)", border: "rgb(71, 85, 105)", hex: "#475569" },
  Angry: { color: "rgba(239, 68, 68, 0.7)", border: "rgb(185, 28, 28)", hex: "#b91c1c" },
  Fearful: { color: "rgba(245, 158, 11, 0.7)", border: "rgb(217, 119, 6)", hex: "#d97706" },
  Sad: { color: "rgba(99, 102, 241, 0.7)", border: "rgb(79, 70, 229)", hex: "#4f46e5" },
  Surprise: { color: "rgba(250, 204, 21, 0.7)", border: "rgb(202, 138, 4)", hex: "#ca8a04" },
  Disgust: { color: "rgba(168, 85, 247, 0.7)", border: "rgb(126, 34, 206)", hex: "#7e22ce" },
  Calm: { color: "rgba(20, 184, 166, 0.7)", border: "rgb(15, 118, 110)", hex: "#0f766e" },
};

const RANGE_DAYS = { last7days: 7, last30days: 30 };

function EmptyChartOverlay({ message }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 rounded-lg">
      <CalendarDaysIcon className="h-10 w-10 text-slate-300 mb-2" />
      <p className="text-slate-400 text-sm">{message}</p>
    </div>
  );
}

export default function MoodTracking() {
  const [dateRange, setDateRange] = useState("last7days");
  const [moodHistory, setMoodHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState(null); // tracks which entry is being analyzed

  const fetchMoodHistory = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const days = RANGE_DAYS[dateRange] ?? 7;
      const res = await api.get("/check-in/history", {
        headers: { Authorization: `Bearer ${token}` },
        params: { days },
      });

      const entries = res.data?.checkins ?? [];
      const formatted = entries.map((entry) => ({
        id: entry.id,
        date: new Date(entry.timestamp).toISOString().split("T")[0],
        mood: entry.emotion
          ? entry.emotion.charAt(0).toUpperCase() + entry.emotion.slice(1)
          : null,
        score: entry.confidence != null ? Math.round(entry.confidence / 10) : null,
        status: entry.status || "uploaded",
      }));

      setMoodHistory(formatted);
    } catch (err) {
      console.error("Failed to fetch mood history:", err);
      setMoodHistory([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMoodHistory(); }, [dateRange]);

  const handleAnalyze = async (id) => {
    setAnalyzingId(id);
    try {
      const token = localStorage.getItem("token");
      await api.post(`/check-in/analyze/${id}`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchMoodHistory(); // refresh list to show new emotion + Analyzed badge
    } catch (err) {
      console.error("Analyze failed", err);
    } finally {
      setAnalyzingId(null);
    }
  };

  // --- Computed stats ---
  const validScores = moodHistory.filter((e) => e.score != null).map((e) => e.score);
  const avgScore = validScores.length
    ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1)
    : null;

  const moodCounts = moodHistory.reduce((acc, e) => {
    if (e.mood) acc[e.mood] = (acc[e.mood] || 0) + 1;
    return acc;
  }, {});
  const dominantMood = Object.keys(moodCounts).sort((a, b) => moodCounts[b] - moodCounts[a])[0] ?? null;

  // Sort chronologically for line chart
  const sorted = [...moodHistory].sort((a, b) => new Date(a.date) - new Date(b.date));

  // --- Chart configs ---
  const trendChartData = {
    labels: sorted.map((e) => e.date.substring(5)),
    datasets: [{
      label: "Mood Score (0–10)",
      data: sorted.map((e) => e.score),
      borderColor: "rgb(99, 102, 241)",
      backgroundColor: "rgba(99, 102, 241, 0.08)",
      fill: true,
      tension: 0.4,
      pointBackgroundColor: sorted.map((e) => moodConfig[e.mood]?.hex ?? "rgb(99,102,241)"),
      pointRadius: 5,
      pointHoverRadius: 7,
    }],
  };

  const distributionChartData = {
    labels: Object.keys(moodCounts),
    datasets: [{
      data: Object.values(moodCounts),
      backgroundColor: Object.keys(moodCounts).map((m) => moodConfig[m]?.color ?? "rgba(200,200,200,0.7)"),
      borderColor: Object.keys(moodCounts).map((m) => moodConfig[m]?.border ?? "rgb(150,150,150)"),
      borderWidth: 2,
    }],
  };

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top", labels: { boxWidth: 12, padding: 15, font: { size: 11 } } },
    },
  };

  const lineOptions = {
    ...baseOptions,
    scales: {
      y: { beginAtZero: true, max: 10, grid: { color: "rgba(200,200,200,0.15)" }, ticks: { stepSize: 2 } },
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
    },
  };

  const pieOptions = {
    ...baseOptions,
    plugins: {
      ...baseOptions.plugins,
      legend: { position: "right", labels: { boxWidth: 12, padding: 12, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${ctx.parsed} check-in${ctx.parsed === 1 ? "" : "s"}`,
        },
      },
    },
  };

  const hasData = moodHistory.length > 0;

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Mood Tracking</h2>
          <p className="text-slate-500 text-sm mt-0.5">Your emotional patterns over time.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border border-slate-200 bg-white text-sm rounded-lg px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
          >
            <option value="last7days">Last 7 Days</option>
            <option value="last30days">Last 30 Days</option>
          </select>
          <button
            onClick={fetchMoodHistory}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-sky-600 hover:border-sky-300 transition-colors shadow-sm"
            title="Refresh"
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl p-5 shadow-sm border h-20">
                <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
                <div className="h-6 bg-slate-100 rounded w-1/3" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm h-72" />
            <div className="bg-white rounded-xl p-6 shadow-sm h-72" />
          </div>
        </div>
      ) : (
        <>
          {/* Stats summary row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Check-ins</p>
              <p className="text-2xl font-bold text-slate-800">{moodHistory.length}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Avg Mood Score</p>
              <p className="text-2xl font-bold text-slate-800">{avgScore ?? "—"}<span className="text-sm font-normal text-slate-400"> / 10</span></p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Most Common Mood</p>
              <p className="text-2xl font-bold text-slate-800">
                {dominantMood
                  ? <>{dominantMood} <span className="text-xl">{moodConfig[dominantMood] ? "" : ""}</span></>
                  : "—"}
              </p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h3 className="text-base font-semibold text-slate-700 mb-4">Mood Score Trend</h3>
              <div className="relative h-64">
                {!hasData && <EmptyChartOverlay message="No data yet for this period" />}
                <Line data={trendChartData} options={lineOptions} />
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <h3 className="text-base font-semibold text-slate-700 mb-4">Mood Distribution</h3>
              <div className="relative h-64">
                {!hasData && <EmptyChartOverlay message="No data yet for this period" />}
                <Pie data={distributionChartData} options={pieOptions} />
              </div>
            </div>
          </div>

          {/* Entry list */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-semibold text-slate-700">Entry Log</h3>
            </div>
            {moodHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <CalendarDaysIcon className="h-12 w-12 text-slate-300 mb-3" />
                <p className="text-slate-500 font-medium">No entries found</p>
                <p className="text-slate-400 text-sm mt-1">Submit a check-in to start tracking your mood.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {[...moodHistory]
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((entry) => (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-center gap-3 px-6 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-sm text-slate-500 w-24 flex-shrink-0">{entry.date}</span>

                      {entry.mood ? (
                        <span
                          className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            color: moodConfig[entry.mood]?.hex ?? "#64748b",
                            backgroundColor: moodConfig[entry.mood]?.color ?? "rgba(200,200,200,0.4)",
                          }}
                        >
                          {entry.mood}
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-400">
                          Pending
                        </span>
                      )}

                      {entry.score != null && (
                        <span className="text-xs text-slate-400">Score: {entry.score}/10</span>
                      )}

                      <div className="ml-auto flex items-center gap-2">
                        {entry.status === "analyzed" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-green-100 text-green-700">
                            Analyzed
                          </span>
                        )}
                        {entry.status === "uploaded" && (
                          <>
                            {analyzingId === entry.id ? (
                              // Analyzing in-progress state
                              <>
                                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-indigo-100 text-indigo-700 animate-pulse">
                                  <span className="w-2.5 h-2.5 border-2 border-indigo-400 border-t-indigo-700 rounded-full animate-spin" />
                                  Analyzing…
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700">
                                  Pending
                                </span>
                                <button
                                  onClick={() => handleAnalyze(entry.id)}
                                  disabled={analyzingId !== null}
                                  className="text-xs text-indigo-600 font-medium hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                  Analyze
                                </button>
                              </>
                            )}
                          </>
                        )}
                        {entry.status === "failed" && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-700">
                            Failed
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </>
      )}
    </Layout>
  );
}
