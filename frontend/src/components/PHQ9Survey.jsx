// src/components/PHQ9Survey.jsx
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import axios from "axios";

// PHQ-9 Questions
const questions = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself — or that you are a failure or have let yourself or your family down",
  "Trouble concentrating on things, such as reading the newspaper or watching television",
  "Moving or speaking so slowly that other people could have noticed. Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual",
  "Thoughts that you would be better off dead, or of hurting yourself in some way",
];

const options = [
  { label: "Not at all", value: 0 },
  { label: "Several days", value: 1 },
  { label: "More than half the days", value: 2 },
  { label: "Nearly every day", value: 3 },
];

export default function PHQ9Survey({ onClose }) {
  // Initialize state with 9 answers, all set to null
  const { auth } = useAuth();
  const [answers, setAnswers] = useState(Array(9).fill(null));
  const [result, setResult] = useState(null);

  const handleAnswerChange = (questionIndex, value) => {
    const newAnswers = [...answers];
    newAnswers[questionIndex] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    // Check if all questions are answered
    if (answers.includes(null)) {
      alert("Please answer all questions.");
      return;
    }

    // Calculate score
    const score = answers.reduce((total, val) => total + val, 0);

    // Interpret score
    let interpretation = "";
    if (score <= 4) interpretation = "Minimal depression";
    else if (score <= 9) interpretation = "Mild depression";
    else if (score <= 14) interpretation = "Moderate depression";
    else if (score <= 19) interpretation = "Moderately severe depression";
    else interpretation = "Severe depression";

    setResult({ score, interpretation });

    if (!auth || !auth.token) {
      console.error("No auth token found. User is not logged in.");
      alert("You must be logged in to submit a survey.");
      return;
    }
    
    try {
    const token = auth.token;

    if (!token) {
      console.error("Authentication token not found. Cannot submit survey.");
      return; 
    }

    await axios.post(
      "http://localhost:8000/survey/phq9",
      { // Data payload
        answers: answers,
        score: score,
        interpretation: interpretation,
      },
      { // Configuration object
        headers: {
          'Authorization': `Bearer ${token}` 
        }
      }
    );

    console.log("Survey submitted successfully!");

  } catch (err) {
    console.error("Error submitting survey:", err);
  }
};

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-semibold mb-6">PHQ-9 Wellness Survey</h2>
        
        {!result ? (
          <form onSubmit={(e) => e.preventDefault()}>
            <p className="mb-4 text-slate-600">
              Over the last 2 weeks, how often have you been bothered by any of
              the following problems?
            </p>
            <div className="space-y-6">
              {questions.map((q, qIndex) => (
                <div key={qIndex}>
                  <label className="font-medium text-slate-800">
                    {qIndex + 1}. {q}
                  </label>
                  <div className="flex flex-col sm:flex-row sm:justify-between mt-2">
                    {options.map((opt, oIndex) => (
                      <label key={oIndex} className="flex items-center space-x-2 p-2">
                        <input
                          type="radio"
                          name={`question-${qIndex}`}
                          value={opt.value}
                          onChange={() => handleAnswerChange(qIndex, opt.value)}
                          className="text-sky-500 focus:ring-sky-400"
                        />
                        <span className="text-slate-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-4 mt-8">
              <button
                type="button"
                onClick={onClose}
                className="text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="bg-sky-500 text-white px-6 py-2 rounded-lg font-semibold"
              >
                Submit
              </button>
            </div>
          </form>
        ) : (
          // --- Result Screen ---
          <div>
            <h3 className="text-xl font-semibold mb-4">Your Result</h3>
            <p className="text-4xl font-bold mb-2">{result.score} / 27</p>
            <p className="text-xl text-slate-700 mb-6">{result.interpretation}</p>
            <p className="text-slate-600">
              Thank you for completing the survey. Your results have been saved.
              This is not a medical diagnosis. If you are concerned, please
              consult a healthcare professional.
            </p>
            <div className="text-right mt-6">
              <button
                onClick={onClose}
                className="bg-sky-500 text-white px-6 py-2 rounded-lg font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}