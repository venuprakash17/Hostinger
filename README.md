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

### Docker Deployment (Recommended)

```bash
# Start all services
docker-compose up -d

# Or for local development
docker-compose -f docker-compose.local.yml up -d
```

### Manual Deployment

1. **Backend**: Deploy FastAPI app to your server
2. **Frontend**: Build and serve static files via Nginx
3. **Database**: Configure PostgreSQL/MySQL connection

See `docker-compose.yml` and `nginx.conf` for configuration details.

---

## 📦 Project Structure

```
elevate-edu-ui/
├── src/                    # Frontend (React + TypeScript)
├── backend/               # Backend (FastAPI + Python)
├── public/                # Static assets
├── docker-compose.yml     # Docker deployment
├── nginx.conf             # Nginx configuration
└── hostinger-deployment/  # Deployment scripts
```

## License

Proprietary
