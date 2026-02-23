import { useState } from "react";
import api from "../api/axios";
import { useToast } from "../components/Toast";
import { CloudArrowUpIcon, XMarkIcon } from "@heroicons/react/24/outline";

export default function UploadVideoModal({ onClose }) {
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleUpload = async () => {
    if (!video) return;

    const token = localStorage.getItem("token");
    if (!token) {
      toast("You must be logged in to upload a video.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("video_file", video);

    setLoading(true);
    try {
      await api.post("/check-in/upload-video", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      toast("Video uploaded! It will be analyzed shortly.", "success");
      onClose();
    } catch (err) {
      console.error("Upload failed", err);
      const detail = err.response?.data?.detail;
      toast(detail || "Upload failed. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CloudArrowUpIcon className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-800">Upload Video</h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-40"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <p className="text-sm text-slate-500">
          Upload a video for emotion analysis. Supported formats: mp4, mov, avi, mkv, webm.
        </p>

        <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${video ? "border-indigo-300 bg-indigo-50" : "border-slate-200 bg-slate-50"
          }`}>
          <input
            type="file"
            accept="video/*"
            onChange={(e) => setVideo(e.target.files[0] || null)}
            className="hidden"
            id="video-upload-input"
            disabled={loading}
          />
          <label htmlFor="video-upload-input" className="cursor-pointer">
            <CloudArrowUpIcon className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            {video ? (
              <div>
                <p className="text-sm font-medium text-indigo-700 truncate">{video.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {(video.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                <span className="text-indigo-600 font-medium">Click to choose a file</span>
              </p>
            )}
          </label>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            disabled={loading || !video}
            onClick={handleUpload}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Uploading…
              </>
            ) : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
