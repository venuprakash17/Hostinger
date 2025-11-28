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

## Deployment

See `hostinger-deployment/` folder for Hostinger deployment guides and scripts with GitHub CI/CD.

## Deployment

See `hostinger-deployment/` folder for complete Hostinger deployment guide with GitHub CI/CD.

## Documentation

- **Deployment**: `hostinger-deployment/MASTER_DEPLOYMENT_GUIDE.md`
- **Quick Start**: `hostinger-deployment/QUICK_START.md`
- **GitHub CI/CD**: `hostinger-deployment/GITHUB_SETUP.md`

## License

Proprietary
