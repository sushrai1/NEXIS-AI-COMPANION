// src/pages/MoodTracking.jsx

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
  ArcElement 
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// --- Placeholder Data ---
const placeholderMoodHistory = [
  { date: "2025-10-15", mood: "Happy", score: 8 },
  { date: "2025-10-16", mood: "Neutral", score: 5 },
  { date: "2025-10-17", mood: "Anxious", score: 3 },
  { date: "2025-10-18", mood: "Happy", score: 7 },
  { date: "2025-10-19", mood: "Sad", score: 2 },
  { date: "2025-10-20", mood: "Neutral", score: 6 },
  { date: "2025-10-21", mood: "Happy", score: 9 },
  { date: "2025-10-22", mood: "Calm", score: 7 },
];

export default function MoodTracking() {
  const [dateRange, setDateRange] = useState("last7days");
  const [moodHistory, setMoodHistory] = useState(placeholderMoodHistory);

  // --- Chart Data Preparation ---
  const trendChartData = {
    // Extract last 5 chars (MM-DD) for labels
    labels: moodHistory.map(entry => entry.date.substring(5)),
    datasets: [
      {
        label: 'Mood Score (0-10)',
        data: moodHistory.map(entry => entry.score),
        borderColor: 'rgb(59, 130, 246)', // Tailwind sky-500
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointRadius: 4,
      },
    ],
  };

  // moods and their colors for consistency
  const moodConfig = {
    Happy: { color: 'rgba(34, 197, 94, 0.7)', border: 'rgb(22, 163, 74)' }, // Green
    Neutral: { color: 'rgba(100, 116, 139, 0.7)', border: 'rgb(71, 85, 105)' }, // Slate
    Anxious: { color: 'rgba(245, 158, 11, 0.7)', border: 'rgb(217, 119, 6)' }, // Amber
    Sad: { color: 'rgba(99, 102, 241, 0.7)', border: 'rgb(79, 70, 229)' }, // Indigo
    Calm: { color: 'rgba(20, 184, 166, 0.7)', border: 'rgb(15, 118, 110)' } // Teal
  };

  // Calculating distribution data dynamically based on current moodHistory
  const moodCounts = moodHistory.reduce((acc, entry) => {
    acc[entry.mood] = (acc[entry.mood] || 0) + 1;
    return acc;
  }, {});

  const distributionChartData = {
      labels: Object.keys(moodCounts), // Labels derived from data
      datasets: [
        {
          label: '# of Days',
          data: Object.values(moodCounts), // Counts derived from data
          backgroundColor: Object.keys(moodCounts).map(mood => moodConfig[mood]?.color || 'rgba(200, 200, 200, 0.7)'), // Map colors
          borderColor: Object.keys(moodCounts).map(mood => moodConfig[mood]?.border || 'rgb(150, 150, 150)'),
          borderWidth: 1,
        },
      ],
    };

   // --- Chart Options ---
   const commonChartOptions = {
     responsive: true,
     maintainAspectRatio: false, // Essential for fixed height containers
     plugins: {
       legend: {
         position: 'top',
         labels: {
            boxWidth: 12, 
            padding: 15 
         }
       },
       title: {
         display: false,
       },
     },
   };

   const lineChartOptions = {
     ...commonChartOptions,
     scales: {
       y: {
         beginAtZero: true,
         max: 10, 
         grid: { 
            color: 'rgba(200, 200, 200, 0.2)'
         }
       },
       x: {
         grid: {
            display: false 
         }
       }
     }
   };

   const pieChartOptions = {
      ...commonChartOptions,
      plugins: {
          ...commonChartOptions.plugins,
          legend: { 
             position: 'right',
             labels: {
                boxWidth: 12,
                padding: 15
             }
          },
          tooltip: { 
              callbacks: {
                  label: function(context) {
                      let label = context.label || '';
                      if (label) { label += ': '; }
                      if (context.parsed !== null) {
                          label += context.parsed + (context.parsed === 1 ? ' day' : ' days');
                      }
                      return label;
                  }
              }
          }
      }
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
          {/* TODO: Add custom range later */}
        </select>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Mood Trend Chart */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4 text-center text-slate-700">Mood Trend</h3>
          <div className="relative h-64"> 
            <Line data={trendChartData} options={lineChartOptions} />
          </div>
        </div>

        {/* Mood Distribution Chart */}
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4 text-center text-slate-700">Mood Distribution</h3>
           <div className="relative h-64"> 
             <Pie data={distributionChartData} options={pieChartOptions} />
          </div>
        </div>
      </div>

      {/* Mood History List/Calendar */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-slate-700">Daily Entries</h3>
        <ul className="space-y-3 max-h-80 overflow-y-auto pr-2"> 
          {moodHistory.length > 0 ? (
            // Sort entries by date descending before mapping
            [...moodHistory].sort((a, b) => new Date(b.date) - new Date(a.date)).map((entry, index) => (
              <li key={index} className="flex flex-wrap justify-between items-center gap-2 p-3 border-b last:border-b-0 hover:bg-slate-50 rounded">
                <span className="font-medium text-slate-600 w-full sm:w-auto">{entry.date}</span>
                <span
                    className="font-semibold px-2 py-1 text-xs rounded" 
                    style={{
                        color: moodConfig[entry.mood]?.border || 'rgb(150, 150, 150)',
                        backgroundColor: moodConfig[entry.mood]?.color || 'rgba(200, 200, 200, 0.7)'
                    }}
                >
                    {entry.mood}
                </span>
                <span className="text-slate-500 text-sm hidden md:inline">(Score: {entry.score})</span> 
                <button className="text-sm text-sky-600 hover:underline ml-auto sm:ml-0">
                  View Details
                </button>
              </li>
            ))
          ) : (
            <p className="text-slate-500 text-center py-4">No mood entries found for this period.</p>
          )}
        </ul>
      </div>
    </Layout>
  );
}