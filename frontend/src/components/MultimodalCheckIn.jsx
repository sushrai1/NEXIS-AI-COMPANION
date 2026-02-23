// src/components/MultimodalCheckIn.jsx
import { useState, useRef, useEffect } from "react";
import api from "../api/axios.jsx";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./Toast";
import { VideoCameraIcon, XMarkIcon } from "@heroicons/react/24/outline";

export default function MultimodalCheckIn({ onClose }) {
  const { auth } = useAuth();
  const toast = useToast();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [feedback, setFeedback] = useState("Click 'Start Recording' to begin.");
  const [recordingTime, setRecordingTime] = useState(0);

  // --- Cleanup on unmount: always release the camera ---
  useEffect(() => {
    return () => {
      stopStream();
      clearInterval(timerIntervalRef.current);
    };
  }, []);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const formatTime = (t) => {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const startRecording = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      streamRef.current = mediaStream;

      if (videoRef.current) videoRef.current.srcObject = mediaStream;

      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(mediaStream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        clearInterval(timerIntervalRef.current);
        setRecordingTime(0);

        const videoBlob = new Blob(recordedChunksRef.current, { type: "video/webm" });

        // Stop camera immediately — indicator turns off
        stopStream();
        recordedChunksRef.current = [];
        mediaRecorderRef.current = null;

        if (videoBlob.size === 0) {
          setFeedback("Recording was empty. Please try again.");
          return;
        }

        // Close modal immediately — analysis runs in the background
        toast("Check-in submitted! Analysis is running in the background.", "success");
        onClose();

        // Fire-and-forget upload (errors are logged but don't affect UX)
        sendDataToBackend(videoBlob).catch((err) =>
          console.error("Background check-in upload failed:", err)
        );
      };

      recorder.start();
      setIsRecording(true);
      setFeedback("Recording…");
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing media devices:", err);
      setFeedback("Could not access camera/microphone. Please check permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setFeedback("Submitting your check-in…");
    }
  };

  // Discard the current recording without submitting
  const cancelRecording = () => {
    clearInterval(timerIntervalRef.current);
    setRecordingTime(0);
    if (mediaRecorderRef.current) {
      // Detach onstop so it doesn't trigger the upload path
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    recordedChunksRef.current = [];
    stopStream();
    setIsRecording(false);
    setFeedback("Recording cancelled. Click 'Start Recording' to try again.");
  };

  // Background upload — modal is already closed when this runs
  const sendDataToBackend = async (videoBlob) => {
    if (!auth?.token) return;

    const formData = new FormData();
    formData.append("video_file", videoBlob, "checkin.webm");
    formData.append("text_input", textInput);

    await api.post("/check-in/multimodal", formData, {
      headers: {
        Authorization: `Bearer ${auth.token}`,
        "Content-Type": "multipart/form-data",
      },
    });
  };

  const handleClose = () => {
    if (isRecording) {
      cancelRecording();
      if (onClose) onClose();
      return;
    }
    stopStream();
    clearInterval(timerIntervalRef.current);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <VideoCameraIcon className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-semibold text-slate-800">Multimodal Check-In</h2>
          </div>
          <div className="flex items-center gap-3">
            {isRecording && (
              <span className="flex items-center gap-1.5 text-red-500 text-sm font-mono">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                {formatTime(recordingTime)}
              </span>
            )}
            <button
              onClick={handleClose}
              className="text-slate-400 hover:text-slate-700 transition-colors"
              title={isRecording ? "Cancel recording" : "Close"}
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Status */}
          <p className="text-sm text-slate-500">{feedback}</p>

          {/* Video preview */}
          <div className="bg-slate-900 rounded-xl overflow-hidden">
            <video ref={videoRef} autoPlay muted className="w-full h-80 object-cover" />
          </div>

          {/* Text input */}
          <textarea
            className="w-full p-3 border border-slate-200 rounded-xl text-sm resize-none bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            rows={3}
            placeholder="How are you feeling today? (Optional — adds context to the analysis)"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            disabled={isRecording || isUploading}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          {/* Left side */}
          {!isRecording ? (
            <button
              onClick={handleClose}
              className="text-sm text-slate-500 hover:text-slate-700 px-4 py-2"
            >
              Cancel
            </button>
          ) : (
            <button
              onClick={cancelRecording}
              className="text-sm text-red-500 hover:text-red-700 px-4 py-2 font-medium"
            >
              Cancel Recording
            </button>
          )}

          {/* Right side */}
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="flex items-center gap-2 bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-semibold shadow hover:bg-green-700 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-white" />
              Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-semibold shadow hover:bg-red-700 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              Stop & Submit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}