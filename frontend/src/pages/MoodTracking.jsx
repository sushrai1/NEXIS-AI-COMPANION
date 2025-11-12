// src/pages/MoodTracking.jsx
import api from "../api/axios";
import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import { Line, Pie } from 'react-chartjs-2';
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
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
);

export default function MoodTracking() {
  const [dateRange, setDateRange] = useState("last7days");
  const [moodHistory, setMoodHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- Fetch Data from FastAPI ---
  useEffect(() => {
    const fetchMoodHistory = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await api.get('/check-in/history', {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = res.data;

        // ✅ always use checkins as backend returns that key
        const entries = data.checkins || [];

        const formatted = entries.map(entry => ({
          id: entry.id,
          date: new Date(entry.timestamp).toISOString().split("T")[0],
          mood: entry.emotion ? entry.emotion.charAt(0).toUpperCase() + entry.emotion.slice(1) : null,
          score: entry.confidence ? Math.round(entry.confidence / 10) : null,
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

    fetchMoodHistory();
  }, [dateRange]);

  const handleAnalyze = async (id) => {
    try {
      await api.post(`/check-in/analyze/${id}`);
      // Refresh list
      const token = localStorage.getItem("token");
      const res = await api.get('/check-in/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data;
      const entries = data.checkins || [];
      const formatted = entries.map(entry => ({
        id: entry.id,
        date: new Date(entry.timestamp).toISOString().split("T")[0],
        mood: entry.emotion ? entry.emotion.charAt(0).toUpperCase() + entry.emotion.slice(1) : null,
        score: entry.confidence ? Math.round(entry.confidence / 10) : null,
        status: entry.status || "uploaded",
      }));
      setMoodHistory(formatted);
    } catch (err) {
      console.error("Analyze failed", err);
      alert("Analysis failed");
    }
  };

  // --- Chart Configurations ---
  const moodConfig = {
    Happy: { color: 'rgba(34, 197, 94, 0.7)', border: 'rgb(22, 163, 74)' },
    Neutral: { color: 'rgba(100, 116, 139, 0.7)', border: 'rgb(71, 85, 105)' },
    Angry: { color: 'rgba(239, 68, 68, 0.7)', border: 'rgb(185, 28, 28)' },
    Fearful: { color: 'rgba(245, 158, 11, 0.7)', border: 'rgb(217, 119, 6)' },
    Sad: { color: 'rgba(99, 102, 241, 0.7)', border: 'rgb(79, 70, 229)' },
    Surprise: { color: 'rgba(250, 204, 21, 0.7)', border: 'rgb(202, 138, 4)' },
    Disgust: { color: 'rgba(168, 85, 247, 0.7)', border: 'rgb(126, 34, 206)' },
    Calm: { color: 'rgba(20, 184, 166, 0.7)', border: 'rgb(15, 118, 110)' },
  };

  const trendChartData = {
    labels: moodHistory.map(entry => entry.date.substring(5)),
    datasets: [
      {
        label: 'Mood Score (0–10)',
        data: moodHistory.map(entry => entry.score),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointRadius: 4,
      },
    ],
  };

  const moodCounts = moodHistory.reduce((acc, entry) => {
    acc[entry.mood] = (acc[entry.mood] || 0) + 1;
    return acc;
  }, {});

  const distributionChartData = {
    labels: Object.keys(moodCounts),
    datasets: [
      {
        label: '# of Days',
        data: Object.values(moodCounts),
        backgroundColor: Object.keys(moodCounts).map(
          mood => moodConfig[mood]?.color || 'rgba(200, 200, 200, 0.7)'
        ),
        borderColor: Object.keys(moodCounts).map(
          mood => moodConfig[mood]?.border || 'rgb(150, 150, 150)'
        ),
        borderWidth: 1,
      },
    ],
  };

  const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { boxWidth: 12, padding: 15 },
      },
      title: { display: false },
    },
  };

  const lineChartOptions = {
    ...commonChartOptions,
    scales: {
      y: {
        beginAtZero: true,
        max: 10,
        grid: { color: 'rgba(200, 200, 200, 0.2)' },
      },
      x: { grid: { display: false } },
    },
  };

  const pieChartOptions = {
    ...commonChartOptions,
    plugins: {
      ...commonChartOptions.plugins,
      legend: {
        position: 'right',
        labels: { boxWidth: 12, padding: 15 },
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            let label = context.label || '';
            if (label) label += ': ';
            if (context.parsed !== null) {
              label += context.parsed + (context.parsed === 1 ? ' day' : ' days');
            }
            return label;
          },
        },
      },
    },
  };

  return (
    <Layout>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <h2 className="text-3xl font-bold text-slate-800">Mood Tracking</h2>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="p-2 border rounded-md shadow-sm self-start sm:self-center"
        >
          <option value="last7days">Last 7 Days</option>
          <option value="last30days">Last 30 Days</option>
        </select>
      </div>

      {loading ? (
        <p className="text-center text-slate-500 mt-10">Loading your mood history...</p>
      ) : (
        <>
          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-4 text-center text-slate-700">Mood Trend</h3>
              <div className="relative h-64">
                <Line data={trendChartData} options={lineChartOptions} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-4 text-center text-slate-700">Mood Distribution</h3>
              <div className="relative h-64">
                <Pie data={distributionChartData} options={pieChartOptions} />
              </div>
            </div>
          </div>

          {/* Mood History List */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-slate-700">Daily Entries</h3>
            <ul className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {moodHistory.length > 0 ? (
                [...moodHistory]
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((entry, index) => (
                    <li
                      key={index}
                      className="flex flex-wrap justify-between items-center gap-2 p-3 border-b last:border-b-0 hover:bg-slate-50 rounded"
                    >
                      <span className="font-medium text-slate-600 w-full sm:w-auto">
                        {entry.date}
                      </span>
                      <span
                        className="font-semibold px-2 py-1 text-xs rounded"
                        style={{
                          color: moodConfig[entry.mood]?.border || 'rgb(150, 150, 150)',
                          backgroundColor:
                            moodConfig[entry.mood]?.color || 'rgba(200, 200, 200, 0.7)',
                        }}
                      >
                        {entry.mood}
                      </span>
                      <span className="text-slate-500 text-sm hidden md:inline">
                        (Score: {entry.score})
                      </span>
                      <div className="ml-auto sm:ml-0 flex items-center gap-3">

                        {/* ✅ Status Badge */}
                        {entry.status === "analyzed" && (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-600">
                            Analyzed
                          </span>
                        )}

                        {entry.status === "uploaded" && (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-600">
                            Pending
                          </span>
                        )}

                        {entry.status === "failed" && (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-red-100 text-red-600">
                            Failed
                          </span>
                        )}


                        {/* ✅ Analyze button for pending */}
                        {entry.status === "uploaded" && (
                          <button
                            onClick={() => handleAnalyze(entry.id)}
                            className="text-sm text-indigo-600 hover:underline"
                          >
                            Analyze
                          </button>
                        )}

                        {/* ✅ View details only when analyzed */}
                        {entry.status === "analyzed" && (
                          <button className="text-sm text-sky-600 hover:underline">
                            View Details
                          </button>
                        )}

                      </div>

                    </li>
                  ))
              ) : (
                <p className="text-slate-500 text-center py-4">
                  No mood entries found for this period.
                </p>
              )}
            </ul>
          </div>
        </>
      )}
    </Layout>
  );
}
