// src/pages/NotFound.jsx
import { Link } from "react-router-dom";
import { ExclamationCircleIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
                <ExclamationCircleIcon className="h-10 w-10 text-red-500" />
            </div>

            <h1 className="text-4xl font-bold text-slate-800 mb-2">404 - Page Not Found</h1>
            <p className="text-slate-500 max-w-md mb-8">
                Oops! The page you're looking for doesn't exist or has been moved.
                Let's get you back on track.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
                <Link
                    to="/dashboard"
                    className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back to Dashboard
                </Link>
                <Link
                    to="/"
                    className="flex items-center justify-center gap-2 bg-white text-slate-600 border border-slate-200 px-6 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-all shadow-sm"
                >
                    Go to Home
                </Link>
            </div>

            <div className="mt-16 text-slate-300 pointer-events-none select-none">
                <span className="text-8xl font-black">404</span>
            </div>
        </div>
    );
}
