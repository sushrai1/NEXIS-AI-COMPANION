// src/pages/AlertsPage.jsx

import { useState } from "react";
import Layout from "../components/Layout";
//import { BellIcon, CheckCircleIcon } from '@heroicons/react/solid'; 

// --- Placeholder Data 
const placeholderAlerts = [
  { id: 1, type: "Persistent Low Mood", description: "Detected predominantly 'Sad' or 'Anxious' states for over 48 hours.", timestamp: "2025-10-21 09:15:00", status: "New", urgency: "High" },
  { id: 2, type: "Significant Mood Drop", description: "Mood score dropped significantly compared to the previous day's average.", timestamp: "2025-10-19 14:30:00", status: "Acknowledged", urgency: "Medium" },
  { id: 3, type: "High PHQ-9 Score", description: "Recent PHQ-9 survey score indicates Moderately Severe symptoms (Score: 18).", timestamp: "2025-10-18 11:00:00", status: "Acknowledged", urgency: "Medium" },
  { id: 4, type: "Check-in Recommended", description: "No check-in recorded in the last 36 hours.", timestamp: "2025-10-22 08:00:00", status: "New", urgency: "Low" },
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(placeholderAlerts);

  // Function to handle acknowledging an alert (example)
  const handleAcknowledge = (alertId) => {
    setAlerts(prevAlerts =>
      prevAlerts.map(alert =>
        alert.id === alertId ? { ...alert, status: 'Acknowledged' } : alert
      )
    );
    // TODO: Send acknowledgment update to the backend if needed
    console.log(`Alert ${alertId} acknowledged.`);
  };

  // Helper to get styling based on urgency/status
  const getAlertStyle = (alert) => {
    let baseStyle = "border-l-4 p-4 rounded-r-md shadow-sm mb-4";
    if (alert.status === 'Acknowledged') {
      return `${baseStyle} border-slate-300 bg-slate-50 opacity-70`; 
    }
    switch (alert.urgency) {
      case 'High':
        return `${baseStyle} border-red-500 bg-red-50`;
      case 'Medium':
        return `${baseStyle} border-amber-500 bg-amber-50`;
      case 'Low':
      default:
        return `${baseStyle} border-sky-500 bg-sky-50`;
    }
  };

  return (
    <Layout>
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-slate-800">Alerts & Notifications</h2>
        {/* TODO: Add Filter/Sort dropdowns if needed */}
      </div>

      {/* Alert List */}
      <div className="space-y-4">
        {alerts.length > 0 ? (
          // Sort alerts: Newest first, then by urgency (High > Medium > Low)
          [...alerts]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .sort((a, b) => {
                const urgencyOrder = { High: 3, Medium: 2, Low: 1 };
                return (urgencyOrder[b.urgency] || 0) - (urgencyOrder[a.urgency] || 0);
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
                {/* Action Button */}
                {alert.status === 'New' && (
                  <button
                    onClick={() => handleAcknowledge(alert.id)}
                    className="flex-shrink-0 bg-white border border-slate-300 text-slate-600 text-sm px-3 py-1 rounded shadow-sm hover:bg-slate-100 transition-colors"
                  >
                    Acknowledge
                  </button>
                )}
                 {alert.status === 'Acknowledged' && (
                   <span className="flex-shrink-0 text-sm text-green-600 font-medium">Acknowledged</span>
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
    </Layout>
  );
}