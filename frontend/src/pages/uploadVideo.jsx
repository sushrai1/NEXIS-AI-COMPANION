import { useState } from "react";
import api from "../api/axios";

export default function UploadVideoModal({ onClose }) {
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async () => {
    if (!video) return;

    const formData = new FormData();
    formData.append("video_file", video);

    setLoading(true);
    try {
      await api.post("/check-in/upload-video", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      onClose();
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-[90%] max-w-md space-y-4 shadow-xl">

        <h2 className="text-lg font-semibold text-gray-900">Upload Video</h2>

        <input
          type="file"
          accept="video/*"
          onChange={(e) => setVideo(e.target.files[0])}
          className="border p-2 rounded-lg w-full"
        />

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>

          <button
            disabled={loading}
            onClick={handleUpload}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Upload"}
          </button>
        </div>

      </div>
    </div>
  );
}
