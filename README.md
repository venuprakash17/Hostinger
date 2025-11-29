# Elevate Edu - Educational Management System

A comprehensive educational management platform with coding practice, labs, quizzes, and more.

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: FastAPI (Python)
- **Database**: MySQL / PostgreSQL / SQLite
- **Code Execution**: Piston API

## Project Structure

```
elevate-edu-ui/
├── src/                    # Frontend React application
├── backend/                # Backend FastAPI application
├── public/                 # Static assets
├── hostinger-deployment/  # Hostinger deployment scripts and configs
└── cypress/               # E2E tests
```

## Quick Start

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
npm install
npm run dev
```

## 🚀 Deployment

**📄 Complete Guide:** `COMPLETE_DEPLOYMENT_GUIDE.md`

This single comprehensive guide covers:
- ✅ GitHub repository setup
- ✅ What to commit
- ✅ Hostinger VPS setup (fresh OS)
- ✅ Docker deployment (recommended)
- ✅ Manual deployment
- ✅ GitHub CI/CD configuration
- ✅ End-to-end deployment

**Quick Start:** See `QUICK_START.md` for checklist

---

## 📦 Project Structure

```
elevate-edu-ui/
├── src/                    # Frontend (React + TypeScript)
├── backend/               # Backend (FastAPI + Python)
├── public/                # Static assets
├── .github/workflows/     # GitHub CI/CD workflows
├── docker-compose.yml     # Docker deployment
├── nginx.conf             # Nginx configuration
└── COMPLETE_DEPLOYMENT_GUIDE.md  # ⭐ Start here!
```

## License

Proprietary
