// src/pages/AlertsPage.jsx
import { useState, useEffect } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";
import {
  BellAlertIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

const URGENCY_CONFIG = {
  High: {
    border: "border-red-400",
    bg: "bg-red-50",
    badge: "bg-red-100 text-red-700",
    icon: ExclamationTriangleIcon,
    iconColor: "text-red-500",
  },
  Medium: {
    border: "border-amber-400",
    bg: "bg-amber-50",
    badge: "bg-amber-100 text-amber-700",
    icon: BellAlertIcon,
    iconColor: "text-amber-500",
  },
  Low: {
    border: "border-sky-400",
    bg: "bg-sky-50",
    badge: "bg-sky-100 text-sky-700",
    icon: InformationCircleIcon,
    iconColor: "text-sky-500",
  },
};

function formatTimestamp(ts) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // "all" | "New" | "Acknowledged"

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await api.get("/alerts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlerts(res.data);
    } catch (err) {
      console.error("Failed to fetch alerts:", err);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, []);

  const handleAcknowledge = async (alertId) => {
    // Optimistic update
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, status: "Acknowledged" } : a))
    );
    try {
      const token = localStorage.getItem("token");
      await api.patch(`/alerts/${alertId}/acknowledge`, null, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Acknowledge failed:", err);
      // Revert on error
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: "New" } : a))
      );
    }
  };

  const handleAcknowledgeAll = async () => {
    // Optimistic update
    setAlerts((prev) => prev.map((a) => ({ ...a, status: "Acknowledged" })));
    try {
      const token = localStorage.getItem("token");
      await api.post("/alerts/acknowledge-all", null, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error("Acknowledge all failed:", err);
      fetchAlerts(); // Revert by refetching
    }
  };

  const newCount = alerts.filter((a) => a.status === "New").length;
  const ackCount = alerts.filter((a) => a.status === "Acknowledged").length;

  const sorted = [...alerts].sort((a, b) => {
    const order = { High: 3, Medium: 2, Low: 1 };
    const urgencyDiff = (order[b.urgency] ?? 0) - (order[a.urgency] ?? 0);
    if (urgencyDiff !== 0) return urgencyDiff;
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  const visible = sorted.filter((a) => {
    if (filter === "New") return a.status === "New";
    if (filter === "Acknowledged") return a.status === "Acknowledged";
    return true;
  });

  return (
    <Layout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Alerts</h2>
          <p className="text-slate-500 text-sm mt-0.5">Monitor your emotional well-being signals.</p>
        </div>
        {newCount > 0 && (
          <button
            onClick={handleAcknowledgeAll}
            className="self-start sm:self-auto flex items-center gap-2 text-sm bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
          >
            <CheckCircleIcon className="h-4 w-4" />
            Acknowledge All
          </button>
        )}
      </div>

      {/* Filter chips */}
      {!loading && (
        <div className="flex flex-wrap gap-3 mb-6">
          {[
            { key: "all", label: `All (${alerts.length})`, active: "bg-slate-800 text-white border-slate-800" },
            { key: "New", label: `New (${newCount})`, active: "bg-red-600 text-white border-red-600" },
            { key: "Acknowledged", label: `Acknowledged (${ackCount})`, active: "bg-green-600 text-white border-green-600" },
          ].map(({ key, label, active }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border transition-colors ${filter === key ? active : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                }`}
            >
              {key === "all" && <FunnelIcon className="h-3.5 w-3.5" />}
              {key === "New" && <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />}
              {key === "Acknowledged" && <CheckCircleIcon className="h-3.5 w-3.5" />}
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-3" />
              <div className="h-3 bg-slate-100 rounded w-2/3 mb-2" />
              <div className="h-3 bg-slate-100 rounded w-1/4" />
            </div>
          ))}
        </div>
      )}

      {/* Alert list */}
      {!loading && (
        <div className="space-y-3">
          {visible.length > 0 ? (
            visible.map((alert) => {
              const cfg = URGENCY_CONFIG[alert.urgency] ?? URGENCY_CONFIG.Low;
              const AlertIcon = cfg.icon;
              const isAck = alert.status === "Acknowledged";

              return (
                <div
                  key={alert.id}
                  className={`flex items-start gap-4 p-4 rounded-xl border-l-4 shadow-sm transition-opacity ${cfg.border} ${cfg.bg} ${isAck ? "opacity-60" : ""}`}
                >
                  <AlertIcon className={`h-6 w-6 flex-shrink-0 mt-0.5 ${isAck ? "text-slate-400" : cfg.iconColor}`} />

                  <div className="flex-grow min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-800 text-sm">{alert.type}</h3>
                      {!isAck && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${cfg.badge}`}>
                          {alert.urgency}
                        </span>
                      )}
                      {isAck && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500">
                          Acknowledged
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 text-sm mb-1">{alert.description}</p>
                    <p className="text-xs text-slate-400">{formatTimestamp(alert.timestamp)}</p>
                  </div>

                  {!isAck && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="flex-shrink-0 flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-50 transition-colors"
                    >
                      <CheckCircleIcon className="h-3.5 w-3.5" />
                      Acknowledge
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm border border-slate-100 text-center">
              <CheckCircleIcon className="h-14 w-14 text-green-300 mb-4" />
              <p className="text-lg font-semibold text-slate-700 mb-1">
                {filter === "Acknowledged" ? "No acknowledged alerts" : "You're all clear!"}
              </p>
              <p className="text-slate-400 text-sm max-w-xs">
                {filter === "Acknowledged"
                  ? "No alerts have been acknowledged yet."
                  : "No emotional alerts detected. Keep it up!"}
              </p>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
