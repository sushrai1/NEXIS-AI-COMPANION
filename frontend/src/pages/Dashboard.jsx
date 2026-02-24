// src/pages/Dashboard.jsx
import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import MultimodalCheckIn from "../components/MultimodalCheckIn";
import PHQ9Survey from "../components/PHQ9Survey";
import UploadVideoModal from "./uploadVideo";
import api from "../api/axios.jsx";
import { useToast } from "../components/Toast";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BellAlertIcon,
  ChartPieIcon,
  PencilSquareIcon,
  VideoCameraIcon,
  ChatBubbleLeftRightIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

const moodConfig = {
  Happy: { emoji: "😊", color: "bg-green-100 text-green-700", border: "border-green-200" },
  Neutral: { emoji: "😐", color: "bg-slate-100 text-slate-700", border: "border-slate-200" },
  Anxious: { emoji: "😟", color: "bg-amber-100 text-amber-700", border: "border-amber-200" },
  Sad: { emoji: "😢", color: "bg-indigo-100 text-indigo-700", border: "border-indigo-200" },
  Calm: { emoji: "😌", color: "bg-teal-100 text-teal-700", border: "border-teal-200" },
  Angry: { emoji: "😠", color: "bg-red-100 text-red-700", border: "border-red-200" },
  Fearful: { emoji: "😨", color: "bg-orange-100 text-orange-700", border: "border-orange-200" },
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// Simple shimmer skeleton card
function SkeletonCard() {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 min-h-[250px] animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-1/3 mb-4" />
      <div className="h-12 bg-slate-100 rounded mb-3" />
      <div className="h-3 bg-slate-200 rounded w-2/3 mb-2" />
      <div className="h-3 bg-slate-200 rounded w-1/2" />
    </div>
  );
}

export default function Dashboard() {
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [isSurveyOpen, setIsSurveyOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [quickThought, setQuickThought] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { auth } = useAuth();
  const toast = useToast();

  const [summaryData, setSummaryData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!auth.token) return;
      setIsLoading(true);
      try {
        const response = await api.get("/dashboard/summary", {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        setSummaryData(response.data);
      } catch (error) {
        console.error("Error fetching dashboard summary:", error);
        setSummaryData(null);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSummary();
  }, [auth.token, refreshKey]);

  const handleQuickThoughtSubmit = async (e) => {
    e.preventDefault();
    const thoughtText = quickThought.trim();
    if (!thoughtText || !auth?.token) return;
    setIsSubmitting(true);
    try {
      await api.post(
        "/quick-thought/",
        { text_content: thoughtText },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      setQuickThought("");
      toast("Thought submitted!", "success");
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error("Error submitting quick thought:", err);
      toast(err.response?.status === 401
        ? "Session expired. Please log in again."
        : "Failed to submit. Please try again.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentMoodText = summaryData?.current_mood_text;
  const moodMeta = moodConfig[currentMoodText];
  const moodEmoji = moodMeta?.emoji ?? "❓";
  const isImproving = summaryData?.mood_trend_text?.toLowerCase().includes("improv");
  const newAlertsCount = summaryData?.new_alerts_count ?? 0;

  return (
    <Layout>
      {/* Greeting */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-slate-800">
          {getGreeting()}{auth?.user?.name ? `, ${auth.user.name.split(" ")[0]}` : ""} 👋
        </h2>
        <p className="text-slate-500 text-sm mt-1">Here's your well-being snapshot for today.</p>
      </div>

      {/* Alerts banner */}
      {!isLoading && newAlertsCount > 0 && (
        <Link
          to="/alerts"
          className="flex items-center justify-between bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-5 py-3 mb-6 hover:bg-amber-100 transition-colors shadow-sm"
        >
          <div className="flex items-center gap-2">
            <BellAlertIcon className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <span className="font-semibold text-sm">
              You have {newAlertsCount} new alert{newAlertsCount > 1 ? "s" : ""} that need attention.
            </span>
          </div>
          <ArrowRightIcon className="h-4 w-4 flex-shrink-0" />
        </Link>
      )}

      {/* Quick Check-in */}
      <div className="mb-8 p-5 bg-white rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
          <ChatBubbleLeftRightIcon className="h-4 w-4 text-sky-500" />
          Quick Check-in
        </h3>
        <form onSubmit={handleQuickThoughtSubmit} className="flex flex-col sm:flex-row items-stretch gap-2">
          <input
            type="text"
            value={quickThought}
            onChange={(e) => setQuickThought(e.target.value)}
            placeholder="How are you feeling right now?"
            className="border border-slate-200 rounded-lg px-4 py-2.5 flex-grow focus:outline-none focus:ring-2 focus:ring-sky-400 text-sm bg-slate-50"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting || !quickThought.trim()}
            className="bg-sky-500 text-white px-5 py-2.5 rounded-lg font-semibold text-sm shadow-sm hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Sending…" : "Send"}
          </button>
        </form>
        <p className="text-xs text-slate-400 mt-2">
          Want more detail?{" "}
          <button onClick={() => setIsCheckInOpen(true)} className="text-sky-500 hover:underline font-medium">
            Start a full multimodal check-in
          </button>
        </p>
      </div>

      {/* 2×2 Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Card 1: Full Check-In */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 to-indigo-700 text-white p-6 rounded-xl shadow-lg flex flex-col justify-between min-h-[240px]">
          {/* decorative blob */}
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -bottom-8 -left-4 w-24 h-24 bg-white/5 rounded-full" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <VideoCameraIcon className="h-5 w-5 opacity-80" />
              <h3 className="text-lg font-semibold">Full Check-In</h3>
            </div>
            <p className="opacity-80 text-sm leading-relaxed mb-5">
              Use video, audio, and text for a richer, more accurate analysis of your emotional state.
            </p>
          </div>
          <div className="relative flex flex-wrap gap-3">
            <button
              onClick={() => setIsCheckInOpen(true)}
              className="bg-white text-indigo-700 px-5 py-2 rounded-lg font-semibold text-sm shadow hover:bg-indigo-50 transition-colors"
            >
              Start Check-In
            </button>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="bg-white/20 border border-white/30 text-white px-5 py-2 rounded-lg font-semibold text-sm hover:bg-white/30 transition-colors"
            >
              Upload Video
            </button>
          </div>
        </div>

        {/* Card 2: Mood Overview */}
        {isLoading ? <SkeletonCard /> : (
          <div className={`bg-white p-6 rounded-xl shadow-sm border ${moodMeta?.border ?? "border-slate-100"} flex flex-col min-h-[240px]`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <ChartPieIcon className="h-4 w-4 text-sky-500" />
                Current Mood
              </h3>
              {currentMoodText && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${moodMeta?.color ?? "bg-slate-100 text-slate-600"}`}>
                  {currentMoodText}
                </span>
              )}
            </div>

            <div className="flex-grow flex items-center gap-5 my-2">
              <span className="text-6xl select-none">{moodEmoji}</span>
              <div>
                <p className="text-slate-700 font-medium">
                  {currentMoodText ? `Feeling ${currentMoodText}` : "No mood data yet"}
                </p>
                {summaryData?.mood_trend_text && (
                  <p className={`text-sm mt-1 flex items-center gap-1 font-medium ${isImproving ? "text-green-600" : "text-slate-500"}`}>
                    {isImproving
                      ? <ArrowTrendingUpIcon className="h-4 w-4" />
                      : <ArrowTrendingDownIcon className="h-4 w-4" />}
                    {summaryData.mood_trend_text}
                  </p>
                )}
                {summaryData?.insight_message && (
                  <p className="text-xs text-slate-400 mt-2 leading-snug max-w-xs">
                    {summaryData.insight_message}
                  </p>
                )}
              </div>
            </div>

            <Link
              to="/mood"
              className="flex items-center gap-1 text-xs text-sky-600 hover:underline font-medium mt-3"
            >
              View full mood history <ArrowRightIcon className="h-3 w-3" />
            </Link>
          </div>
        )}

        {/* Card 3: PHQ-9 Survey */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between min-h-[240px]">
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <PencilSquareIcon className="h-4 w-4 text-indigo-500" />
              Wellness Survey
            </h3>
            <p className="text-slate-700 font-medium mb-1">PHQ-9 Depression Screen</p>
            <p className="text-slate-500 text-sm leading-relaxed">
              A clinically validated 9-question survey to track your mood patterns week over week. Takes ~2 minutes.
            </p>
          </div>
          <button
            onClick={() => setIsSurveyOpen(true)}
            className="self-start mt-5 bg-indigo-50 text-indigo-700 border border-indigo-200 px-5 py-2 rounded-lg font-semibold text-sm hover:bg-indigo-100 transition-colors"
          >
            Take Survey →
          </button>
        </div>

        {/* Card 4: Reports shortcut */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between min-h-[240px]">
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ChartPieIcon className="h-4 w-4 text-emerald-500" />
              Weekly Report
            </h3>
            <p className="text-slate-700 font-medium mb-1">Your AI-Powered Summary</p>
            <p className="text-slate-500 text-sm leading-relaxed">
              View personalized insights, trends, and suggestions based on your last 14 days of check-ins.
            </p>
          </div>
          <Link
            to="/reports"
            className="self-start mt-5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-5 py-2 rounded-lg font-semibold text-sm hover:bg-emerald-100 transition-colors"
          >
            View Report →
          </Link>
        </div>
      </div>

      {/* Modals */}
      {isCheckInOpen && <MultimodalCheckIn onClose={() => setIsCheckInOpen(false)} />}
      {isSurveyOpen && <PHQ9Survey onClose={() => setIsSurveyOpen(false)} />}
      {isUploadOpen && <UploadVideoModal onClose={() => setIsUploadOpen(false)} />}
    </Layout>
  );
}
