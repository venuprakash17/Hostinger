# Project Structure

## 📁 Directory Structure

```
elevate-edu-ui/
├── src/                    # Frontend React application
│   ├── components/        # React components
│   ├── pages/             # Page components
│   ├── integrations/      # API client
│   └── ...
│
├── backend/                # Backend FastAPI application
│   ├── app/               # Application code
│   │   ├── api/           # API endpoints
│   │   ├── models/        # Database models
│   │   ├── services/      # Business logic
│   │   └── ...
│   ├── requirements.txt   # Python dependencies
│   └── ...
│
├── public/                 # Static assets
├── cypress/               # E2E tests
├── aws-deployment/        # AWS deployment package
│   ├── scripts/           # Deployment scripts
│   ├── configs/           # Configuration templates
│   └── workflows/         # GitHub Actions
│
└── [config files]         # package.json, vite.config.ts, etc.
```

## 🚀 Quick Start

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

## 📦 Deployment

See `aws-deployment/MASTER_DEPLOYMENT_GUIDE.md` for AWS deployment.

