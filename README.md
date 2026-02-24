# NEXIS AI Companion

NEXIS AI Companion is a comprehensive mental health support platform that leverages multimodal emotion analysis to provide users with deep insights into their emotional well-being. By combining video recording and text input, the system analyzes facial expressions and sentiment to track moods over time, generate alerts for negative emotional states, and provide detailed weekly reports.

## System Overview

The platform is built with a decoupled architecture consisting of a high-performance Python backend and a modern React frontend.

### Core Features

1. Multimodal Check-in: Users can perform check-ins using both video and text. The system extracts emotional signals from facial expressions and written content.
2. Real-time Dashboard: Provides a summary of current mood trends, recent check-ins, and pending alerts.
3. Emotional Alerting: Automatically detects high-risk emotional states (such as anxiety or distress) and generates persistent alerts that can be acknowledged by the user or their connected guardians.
4. Intelligent Reporting: Aggregates 14-day data to generate structured insights, risk scores, and personalized suggestions for mental health improvement.
5. Secure Authentication: Robust JWT-based authentication system with support for user roles (User, Guardian, Doctor).
6. Connection Management: Allows users to link their accounts with guardians or healthcare professionals for supervised support.

## Technical Stack

### Backend
- Framework: FastAPI
- Database: PostgreSQL with SQLAlchemy ORM
- Emotion Analysis: MediaPipe, OpenCV, and custom ML models for facial emotion recognition
- Sentiment Analysis: VADER Sentiment Analysis
- Authentication: OAuth2 with JWT (JSON Web Tokens)
- Task Management: FastAPI BackgroundTasks for asynchronous processing

### Frontend
- Framework: React (Vite)
- Styling: Tailwind CSS
- Iconography: Heroicons
- Charts: Chart.js (React-Chartjs-2)
- State Management: React Context API for Global Authentication and Notifications

## Project Structure

```text
NEXIS-AI-COMPANION/
├── backend/                # Python FastAPI application
│   ├── routes/             # API endpoints (auth, checkin, alerts, etc.)
│   ├── utils/              # ML models, security, and aggregation helpers
│   ├── models.py           # SQLAlchemy database models
│   ├── db.py               # Database connection configuration
│   └── app.py              # Application entry point
├── frontend/               # React Vite application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # Global state providers (Auth, Toast)
│   │   ├── pages/          # Full-page components
│   │   └── api/            # Axios configuration and API wrappers
│   └── tailwind.config.js  # Styling configuration
└── README.md               # Project documentation
```

## Setup and Installation

### Backend Prerequisites
- Python 3.9 or higher
- PostgreSQL Database
- FFmpeg (for video processing)

### Backend Installation
1. Navigate to the backend directory:
   cd backend

2. Create and activate a virtual environment:
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate

3. Install dependencies:
   pip install -r requirements.txt

4. Configure environment variables in a .env file:
   DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/nexis
   SECRET_KEY=your_secret_key_here
   ALGORITHM=HS256

5. Run the application:
   uvicorn app:app --reload

### Frontend Installation
1. Navigate to the frontend directory:
   cd frontend

2. Install dependencies:
   npm install

3. Run the development server:
   npm run dev

## Security and Compliance
- Password Hashing: Uses bcrypt for secure password storage.
- Token-based Security: All protected routes require a valid JWT bearer token.
- Background Processing: Long-running ML tasks are handled in background threads to maintain API responsiveness and prevent timing attacks.

## Contribution
Please ensure that any code contributions follow the existing architecture patterns and include necessary updates to the documentation. Ensure all backend routes are properly registered in the main application entry point.

## License
This project is licensed under the MIT License.