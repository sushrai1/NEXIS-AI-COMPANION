// src/pages/Home.jsx
import { Link } from "react-router-dom";
import {
  VideoCameraIcon,
  ChartBarSquareIcon,
  SparklesIcon,
  LockClosedIcon,
  TrashIcon,
  ShieldCheckIcon,
  HeartIcon,
} from "@heroicons/react/24/outline";

export default function Home() {
  return (
    <div className="bg-slate-50 text-slate-800">

      {/* Sticky header */}
      <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md shadow-sm z-50">
        <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-sky-600">Nexis</Link>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-slate-600 hover:text-sky-600 transition-colors text-sm font-medium">
              Login
            </Link>
            <Link
              to="/register"
              className="bg-sky-500 text-white px-5 py-2 rounded-full shadow-md hover:bg-sky-600 transition-colors text-sm font-medium"
            >
              Register
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="pt-32 pb-20 text-center bg-gradient-to-b from-sky-50 to-white">
          <div className="container mx-auto px-6">
            <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 mb-6 leading-tight">
              Understand Your Emotions.
              <br />
              <span className="text-sky-600">Reclaim Your Balance.</span>
            </h1>
            <p className="max-w-3xl mx-auto text-lg text-slate-600 mb-10">
              Nexis is your private, multimodal AI companion for mental well-being. It listens,
              sees, and understands to provide real-time support—securely.
            </p>
            <Link
              to="/register"
              className="bg-sky-500 text-white px-8 py-3 rounded-full shadow-lg hover:bg-sky-600 transition-transform hover:scale-105 text-lg font-semibold"
            >
              Get Started
            </Link>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-20 bg-white">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold mb-4">A Holistic View of Your Well-being</h2>
            <p className="text-slate-600 mb-12 max-w-2xl mx-auto">
              In just a few moments, gain a deeper understanding of your emotional state.
            </p>
            <div className="grid md:grid-cols-3 gap-12">
              <div className="flex flex-col items-center">
                <div className="bg-sky-100 rounded-full p-4 mb-4">
                  <VideoCameraIcon className="h-10 w-10 text-sky-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">1. Check-in Naturally</h3>
                <p className="text-slate-500">
                  Share your thoughts through text, voice, or a simple video check-in. It's
                  intuitive and takes less than a minute.
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="bg-sky-100 rounded-full p-4 mb-4">
                  <ChartBarSquareIcon className="h-10 w-10 text-sky-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">2. Get a Clear Analysis</h3>
                <p className="text-slate-500">
                  Nexis's AI analyzes facial cues, vocal tone, and text together for an accurate
                  picture of your emotional state.
                </p>
              </div>
              <div className="flex flex-col items-center">
                <div className="bg-sky-100 rounded-full p-4 mb-4">
                  <SparklesIcon className="h-10 w-10 text-sky-500" />
                </div>
                <h3 className="text-xl font-semibold mb-2">3. Receive Personalized Insights</h3>
                <p className="text-slate-500">
                  Get tailored recommendations and weekly reports to enhance your mental clarity
                  and well-being.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Privacy */}
        <section className="py-20 bg-slate-900 text-white">
          <div className="container mx-auto px-6 text-center">
            <h2 className="text-4xl font-bold mb-4">Your Privacy is Our Foundation.</h2>
            <p className="text-2xl font-semibold text-sky-400 mb-12">
              Raw Data Deleted. Insights Secured. Period.
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 text-left">
              {[
                {
                  icon: TrashIcon,
                  title: "Privacy Through Deletion",
                  text: "Your raw video and audio are automatically deleted immediately after processing. We never store your raw recordings.",
                },
                {
                  icon: LockClosedIcon,
                  title: "Insight-Focused Storage",
                  text: "We only store anonymized emotional insights derived from your data, used to improve your experience.",
                },
                {
                  icon: ShieldCheckIcon,
                  title: "Zero Data Footprint",
                  text: "Temporary session data is automatically purged. We store your insights, not your raw inputs.",
                },
                {
                  icon: HeartIcon,
                  title: "Ethical by Design",
                  text: "Built on a foundation of user safety, transparency, and ethical AI practices.",
                },
              ].map(({ icon: Icon, title, text }) => (
                <div key={title} className="bg-slate-800 p-6 rounded-lg">
                  <Icon className="h-8 w-8 text-sky-400 mb-3" />
                  <h3 className="font-semibold text-lg mb-2 text-sky-400">{title}</h3>
                  <p className="text-slate-300 text-sm">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 text-center">
          <div className="container mx-auto px-6">
            <h2 className="text-4xl font-bold mb-4">Ready to Begin Your Journey?</h2>
            <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
              Be the first to experience the next generation of mental health support.
            </p>
            <Link
              to="/register"
              className="bg-sky-500 text-white px-8 py-3 rounded-full shadow-lg hover:bg-sky-600 transition-transform hover:scale-105 text-lg font-semibold"
            >
              Create Your Free Account
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 text-slate-300 py-12">
        <div className="container mx-auto px-6 text-center">
          <p className="font-bold text-lg text-white mb-1">Nexis</p>
          <p>&copy; {new Date().getFullYear()} Nexis. All Rights Reserved.</p>
          <div className="flex justify-center gap-6 mt-4 text-sm">
            {/* Placeholder links — routes not yet implemented */}
            <span className="opacity-40 cursor-not-allowed" title="Coming soon">Privacy Policy</span>
            <span className="opacity-40 cursor-not-allowed" title="Coming soon">Terms of Service</span>
            <span className="opacity-40 cursor-not-allowed" title="Coming soon">Contact</span>
          </div>
        </div>
      </footer>
    </div>
  );
}