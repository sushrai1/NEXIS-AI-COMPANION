// src/pages/AlertsPage.jsx

import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";   // ✅ use axios wrapper

// Define negative emotion categories
const NEGATIVE = ["sad", "angry", "fearful", "disgust"];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await api.get("/check-in/history", {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = res.data;
        console.log("ALERT HISTORY RESPONSE:", data);

        const checkins = data.checkins || [];

        const newAlerts = [];

        checkins.forEach((entry, index) => {
          const emotion = entry.emotion?.toLowerCase();

          // ⚠️ Negative emotional state alert
          if (NEGATIVE.includes(emotion)) {
            newAlerts.push({
              id: entry.id,
              type: "Negative Emotion Detected",
              description: `Detected '${entry.emotion}' with confidence ${entry.confidence != null ? entry.confidence.toFixed(1) : "N/A"
                }%.`,
              timestamp: entry.timestamp,
              status: "New",
              urgency: emotion === "fearful" || emotion === "angry" ? "High" : "Medium",
            });
          }

          // ⚠️ Confidence drop compared to previous
          if (index > 0) {
            const prev = checkins[index - 1];
            if (prev.confidence != null && entry.confidence != null) {
              if (prev.confidence - entry.confidence >= 20) {
                newAlerts.push({
                  id: `${entry.id}-drop`,
                  type: "Significant Mood Drop",
                  description: `Confidence dropped from ${prev.confidence.toFixed(1)
                    }% → ${entry.confidence.toFixed(1)}%.`,
                  timestamp: entry.timestamp,
                  status: "New",
                  urgency: "Medium",
                });
              }
            }
          }
        });

        setAlerts(newAlerts);
      } catch (err) {
        console.error("Failed to fetch alerts:", err);
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  // Handle acknowledging an alert
  const handleAcknowledge = (alertId) => {
    setAlerts((prevAlerts) =>
      prevAlerts.map((alert) =>
        alert.id === alertId ? { ...alert, status: "Acknowledged" } : alert
      )
    );

    // TODO: Send acknowledgment update to backend
    console.log(`Alert ${alertId} acknowledged.`);
  };

  const getAlertStyle = (alert) => {
    let baseStyle = "border-l-4 p-4 rounded-r-md shadow-sm mb-4";
    if (alert.status === "Acknowledged") {
      return `${baseStyle} border-slate-300 bg-slate-50 opacity-70`;
    }
    switch (alert.urgency) {
      case "High":
        return `${baseStyle} border-red-500 bg-red-50`;
      case "Medium":
        return `${baseStyle} border-amber-500 bg-amber-50`;
      case "Low":
      default:
        return `${baseStyle} border-sky-500 bg-sky-50`;
    }
  };

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-slate-800">Alerts & Notifications</h2>
      </div>

      {loading && (
        <div className="text-center py-10 bg-white rounded-lg shadow">
          <p className="text-slate-500">Loading alerts...</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-4">
          {alerts.length > 0 ? (
            [...alerts]
              // Sort by timestamp → latest first
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              // Sort by urgency
              .sort((a, b) => {
                const order = { High: 3, Medium: 2, Low: 1 };
                return (order[b.urgency] || 0) - (order[a.urgency] || 0);
              })
              .map((alert) => (
                <div key={alert.id} className={getAlertStyle(alert)}>
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-semibold text-lg text-slate-800 mb-1">{alert.type}</h3>
                      <p className="text-slate-600 text-sm mb-2">{alert.description}</p>
                      <p className="text-xs text-slate-400">
                        {new Date(alert.timestamp).toLocaleString()}
                      </p>
                    </div>

                    {alert.status === "New" ? (
                      <button
                        onClick={() => handleAcknowledge(alert.id)}
                        className="flex-shrink-0 bg-white border border-slate-300 text-slate-600 text-sm px-3 py-1 rounded shadow-sm hover:bg-slate-100 transition-colors"
                      >
                        Acknowledge
                      </button>
                    ) : (
                      <span className="flex-shrink-0 text-sm text-green-600 font-medium">
                        Acknowledged
                      </span>
                    )}
                  </div>
                </div>
              ))
          ) : (
            <div className="text-center py-10 bg-white rounded-lg shadow">
              <p className="text-slate-500">No new alerts.</p>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
