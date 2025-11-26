# Elevate Edu - Educational Management System

A comprehensive educational management platform with coding practice, labs, quizzes, and more.

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL / SQLite
- **Code Execution**: Piston API

## Project Structure

```
elevate-edu-ui/
├── src/                    # Frontend React application
├── backend/                # Backend FastAPI application
├── public/                 # Static assets
├── aws-deployment/         # AWS deployment scripts and configs
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

See `aws-deployment/` folder for AWS deployment guides and scripts.

## Documentation

- **Deployment**: `aws-deployment/MASTER_DEPLOYMENT_GUIDE.md`
- **API Testing**: See Postman collection in `aws-deployment/`

## License

Proprietary
