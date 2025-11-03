// src/components/MultimodalCheckIn.jsx

import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function MultimodalCheckIn({ onClose }) {
  const { auth } = useAuth();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerIntervalRef = useRef(null); 

  const [isRecording, setIsRecording] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [feedback, setFeedback] = useState("Click 'Start Recording' to begin.");
  const [recordingTime, setRecordingTime] = useState(0); // State for recording time in seconds

  // Helper function to format time (e.g., 0:05, 1:23)
  const formatTime = (timeInSeconds) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  // Function to start capturing media
  const startRecording = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(mediaStream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
          console.log("Data chunk added. Total chunks:", recordedChunksRef.current.length);
        }
      };

      recorder.onstop = async () => {
        console.log("mediaRecorder.onstop event fired. Preparing blob.");
        // Clear timer interval when recording stops
        clearInterval(timerIntervalRef.current);
        setRecordingTime(0);

        const videoBlob = new Blob(recordedChunksRef.current, { type: "video/webm" });
        console.log("Blob created. Size:", videoBlob.size, "bytes. Calling sendDataToBackend...");

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }

        if (videoBlob.size > 0) {
          await sendDataToBackend(videoBlob);
        } else {
          console.error("Blob size is 0. Not sending.");
          setFeedback("Recording failed, please try again.");
          return;
        }

        recordedChunksRef.current = [];
        streamRef.current = null;
        mediaRecorderRef.current = null;
        onClose();
      };

      recorder.start();
      setIsRecording(true);
      setFeedback("Recording...");
      setRecordingTime(0); // Reset timer

      // Start the timer interval
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime((prevTime) => prevTime + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing media devices:", err);
      setFeedback("Could not access camera/microphone. Please check permissions.");
    }
  };

  // Function to stop recording
  const stopRecording = () => {
    console.log("stopRecording() called.");
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setFeedback("Processing your check-in...");
      // Timer interval is cleared in the onstop handler
    } else {
      console.error("stopRecording called, but mediaRecorderRef.current is null!");
    }
  };

  // Function to send data to your FastAPI backend
  const sendDataToBackend = async (videoBlob) => {
    // ... (rest of sendDataToBackend remains the same)
        console.log("sendDataToBackend() called. Creating FormData.");

        const formData = new FormData();
        formData.append("video_file", videoBlob, "checkin.webm");
        formData.append("text_input", textInput);

        if (!auth || !auth.token) {
            console.error("Auth token is MISSING! Auth object:", auth);
      setFeedback("Error: You are not logged in or token is missing.");
      return;
        }

        try {
            const response = await axios.post(
                "http://localhost:8000/check-in/multimodal",
                formData,
                {
                    headers: {
                        "Authorization": `Bearer ${auth.token}`
                    },
                }
            );

            console.log("Backend response:", response.data);
            alert("Video submitted successfully!");
            setFeedback("Check-in complete!");

        } catch (err) {
            console.error("Error uploading file:", err);
            if (err.response && err.response.status === 401) {
                setFeedback("Authentication failed. Please log in again.");
            } else {
                setFeedback("There was an error processing your check-in.");
            }
        }
  };

  return (
    // Make the modal background slightly darker for better focus
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      {/* --- INCREASED MODAL SIZE --- */}
      {/* Changed max-w-2xl to max-w-4xl */}
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-4xl">
        <h2 className="text-2xl font-semibold mb-4">Multimodal Check-In</h2>
        <div className="flex justify-between items-center mb-4">
            <p className="text-slate-600">{feedback}</p>
            {/* --- DISPLAY TIMER --- */}
            {isRecording && (
              <span className="text-red-500 font-mono text-lg">{formatTime(recordingTime)}</span>
            )}
        </div>


        <div className="bg-black rounded-md mb-4">
          {/* --- INCREASED VIDEO HEIGHT --- */}
          {/* Changed h-64 to h-96 */}
          <video ref={videoRef} autoPlay muted className="w-full h-96 rounded-md" />
        </div>

        <textarea
          className="w-full p-3 border rounded-md mb-4 text-slate-700"
          rows="3"
          placeholder="How are you feeling today? (Optional)"
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          disabled={isRecording}
        />

        <div className="flex justify-between items-center">
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 px-4 py-2 rounded" // Added padding for easier clicking
            disabled={isRecording} // Disable cancel while recording
          >
            Cancel
          </button>
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="bg-green-500 text-white px-5 py-2 rounded-lg font-semibold shadow hover:bg-green-600 transition-colors"
            >
              Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="bg-red-500 text-white px-5 py-2 rounded-lg font-semibold shadow hover:bg-red-600 transition-colors"
            >
              Stop & Submit
            </button>
          )}
        </div>
      </div>
    </div>
  );
}