// src/pages/Dashboard.jsx
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import MultimodalCheckIn from "../components/MultimodalCheckIn";
import PHQ9Survey from "../components/PHQ9Survey";
import api from "../api/axios";
import {
  ArrowTrendingUpIcon,
  BellAlertIcon,
  ChartPieIcon,
  PencilSquareIcon,
  VideoCameraIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';

export default function Dashboard() {
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);
  const [quickThought, setQuickThought] = useState("");
  const { auth } = useAuth();

  const [summaryData, setSummaryData] = useState({
    currentMoodEmoji: "🤔",
    currentMoodText: "Loading...",
    moodTrendIcon: null,
    moodTrendText: "Loading...",
    simpleInsight: "Loading insights...",
    newAlertsCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!auth.token) return;

      setIsLoading(true);
      try {
        const response = await api.get('/dashboard/summary', {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
        const data = response.data;

        // Map mood text to emoji (adjust moodConfig as needed)
        const moodEmoji = moodConfig[data.current_mood_text]?.emoji || "❓";
        const trendIcon = data.mood_trend_text?.includes("Improving") ?
          <ArrowTrendingUpIcon className="h-5 w-5 text-green-500 inline-block mr-1" /> :
          <ArrowTrendingUpIcon className="h-5 w-5 text-slate-400 inline-block mr-1 transform rotate-90" />; // Example for stable/down

        setSummaryData({
          currentMoodEmoji: moodEmoji,
          currentMoodText: data.current_mood_text || "Not available",
          moodTrendIcon: trendIcon,
          moodTrendText: data.mood_trend_text || "No trend data",
          simpleInsight: data.insight_message,
          newAlertsCount: data.new_alerts_count || 0,
          // Add recentMoods if you fetch/return them
        });

      } catch (error) {
        console.error("Error fetching dashboard summary:", error);
        setSummaryData(prev => ({ ...prev, simpleInsight: "Could not load insights." }));
      } finally {
        setIsLoading(false);
      }
    };

    fetchSummary();
  }, [auth.token, refreshKey]);

  // Map moods to colors/icons for consistency
  const moodConfig = {
    Happy: { emoji: "😊", color: 'bg-green-100 text-green-700' },
    Neutral: { emoji: "😐", color: 'bg-slate-100 text-slate-700' },
    Anxious: { emoji: "😟", color: 'bg-amber-100 text-amber-700' },
    Sad: { emoji: "😢", color: 'bg-indigo-100 text-indigo-700' },
    Calm: { emoji: "😌", color: 'bg-teal-100 text-teal-700' },
  };

  const handleQuickThoughtSubmit = async (e) => {
    e.preventDefault();
    const thoughtText = quickThought.trim();
    if (!thoughtText) return;

    // Check for auth token
    if (!auth || !auth.token) {
      console.error("No auth token found for quick thought submission.");
      alert("Please log in again to submit your thought.");
      return;
    }

    console.log("Submitting quick thought:", thoughtText);

    try {
      const response = await api.post(
        '/quick-thought/',
        { text_content: thoughtText },
        {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        }
      );

//      console.log("Quick thought submission response:", response.data);
      setQuickThought("");
      alert("Thought submitted successfully!");
      setRefreshKey(prevKey => prevKey + 1);

    } catch (err) {
      console.error("Error submitting quick thought:", err);
      if (err.response && err.response.status === 401) {
        alert("Authentication failed. Please log in again.");
      } else {
        alert("Failed to submit thought. Please try again.");
      }
    }
  };

  return (

    <Layout>
      {/* Page Header */}
      {auth && auth.user && (
        <h2 className="text-3xl font-bold text-slate-800 mb-6">
          Welcome back, {auth.user.name}
        </h2>
      )}

      {/* "What's on your mind?" Section */}
      <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-700 mb-3 flex items-center">
          <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2 text-sky-500" />
          Quick Check-in
        </h3>
        <p className="text-sm text-slate-600 mb-4">How are you feeling right now?</p>
        <form onSubmit={handleQuickThoughtSubmit} className="flex flex-col sm:flex-row items-stretch gap-2">
          <input
            type="text"
            value={quickThought}
            onChange={(e) => setQuickThought(e.target.value)}
            placeholder="Share a quick thought..."
            className="border border-slate-300 rounded-lg p-3 flex-grow focus:ring-sky-500 focus:border-sky-500 text-sm"
          />
          <button
            type="submit"
            className="bg-sky-500 text-white px-5 py-2.5 rounded-lg font-semibold text-sm shadow-sm hover:bg-sky-600 transition-colors"
          >
            Submit
          </button>
        </form>
        <p className="text-xs text-slate-500 mt-2">Or start a full <button onClick={() => setIsCheckInOpen(true)} className="text-sky-600 hover:underline">Multimodal Check-In</button>.</p>
      </div>


      {/* --- 2x2 Grid for Main Content --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Card 1: Start Multimodal Check-In */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white p-6 rounded-xl shadow-lg flex flex-col justify-between min-h-[250px]">
          <div>
            <h3 className="text-xl font-semibold mb-2 flex items-center">
              <VideoCameraIcon className="h-6 w-6 mr-2 opacity-80" />
              Full Check-In
            </h3>
            <p className="opacity-90 text-sm mb-4 leading-relaxed">
              Use video, audio, and text for a deeper analysis of your emotional state.
            </p>
          </div>
          <button
            onClick={() => setIsCheckInOpen(true)}
            className="self-start bg-white text-indigo-600 px-5 py-2 rounded-lg font-semibold text-sm shadow hover:bg-indigo-50 transition-colors"
          >
            Start Full Check-In
          </button>
        </div>

        {/* Card 2: Alerts & Simple Insight */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between min-h-[250px]">
          {/* Alerts Section */}
          {summaryData.newAlertsCount > 0 && (
            <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg mb-4 hover:shadow-md transition-shadow duration-200">
                 <div className="flex items-center justify-between">
                   <div className="flex items-center">
                      <BellAlertIcon className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0"/>
                      <p className="font-semibold text-amber-800 text-sm">
                        {summaryData.newAlertsCount} New Alert{summaryData.newAlertsCount > 1 ? 's' : ''}
                      </p>
                   </div>
                   <Link to="/alerts" className="text-xs text-amber-700 hover:underline font-medium ml-2 flex-shrink-0">
                     View
                   </Link>
                 </div>
               </div>
          )}

          {/* Simple Insight Area */}
          <div className="flex-grow flex flex-col justify-center">
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Quick Insight</h3>
            {isLoading ? (
              <p className="text-slate-400 text-sm">Loading...</p>
            ) : (
              <p className="text-slate-600 text-sm leading-relaxed">
                {summaryData.simpleInsight}
              </p>
            )}
          </div>
        </div>

        {/* Card 3: Mood Overview (Simple Insights) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col min-h-[250px]">
          <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center">
            <ChartPieIcon className="h-5 w-5 mr-2 text-sky-500" />
            Recent Mood Overview
          </h3>
          {isLoading ? (
            <p className="text-slate-400 text-center my-auto">Loading mood data...</p>
          ) : (
            <>
              <div className="text-center my-auto">
                <p className="text-5xl mb-1">
                  {summaryData.currentMoodEmoji}
                </p>
                <p className="text-base font-medium text-slate-700 mb-3">
                  Currently feeling {summaryData.currentMoodText}
                </p>
                <p className="text-sm text-slate-600 flex items-center justify-center">
                  {summaryData.moodTrendIcon} {/* Display the icon component */}
                  Trend: {summaryData.moodTrendText}
                </p>
              </div>
              <Link to="/mood" className="text-sm text-sky-600 hover:underline font-medium block text-center mt-4">
                View Full Mood History &rarr;
              </Link>
            </>
          )}
        </div>

        {/* Card 4: Wellness Survey (PHQ-9) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between min-h-[250px]">
          <div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2 flex items-center">
              <PencilSquareIcon className="h-5 w-5 mr-2 text-indigo-500" />
              Wellness Survey
            </h3>
            <p className="text-slate-600 text-sm mb-4 leading-relaxed">
              Take your regular PHQ-9 survey to track changes over time.
            </p>
          </div>
          <button
            onClick={() => setIsSurveyOpen(true)}
            className="self-start bg-slate-100 text-slate-700 px-5 py-2 rounded-lg font-medium text-sm hover:bg-slate-200 transition-colors border border-slate-200"
          >
            Take PHQ-9 Survey
          </button>
        </div>

      </div>

      {/* --- Modals --- */}
      {isCheckInOpen && (
        <MultimodalCheckIn onClose={() => setIsCheckInOpen(false)} />
      )}

      {isSurveyOpen && (
        <PHQ9Survey onClose={() => setIsSurveyOpen(false)} />
      )}
    </Layout>

  );
}
