# AI-Based Faculty Leave Management System

A full-stack web application for managing faculty leaves with AI-powered predictions, substitute assignment, and digital approval workflows.

## Tech Stack
- **Frontend**: React 18, React Router v6, Material UI v5, Chart.js
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)
- **AI Engine**: Custom rule-based prediction engine (built-in)

## Project Structure
```
faculty-leave-management/
├── backend/   → Node.js + Express API
└── frontend/  → React SPA (Vite)
```

## Getting Started

### 1. Clone & Setup Backend
```bash
cd backend
npm install
# Edit .env with your MongoDB URI and JWT secret
npm run dev
```

### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

### 3. Access the App
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Default Leave Policy
| Leave Type  | Days/Year |
|-------------|-----------|
| Casual      | 12        |
| Medical     | 15        |
| Earned      | 20        |
| Emergency   | 5         |
| Maternity   | 90        |

## Features
- ✅ AI leave pattern prediction & risk scoring
- ✅ Auto substitute faculty assignment
- ✅ Digital approval workflow (Admin/HoD)
- ✅ Real-time notifications
- ✅ Leave balance tracking with visual charts
- ✅ Full leave history
- ✅ Role-based access (Faculty / HoD / Admin)