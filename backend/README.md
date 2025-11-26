# Elevate Edu Backend (Python FastAPI)

## 🚀 Quick Start

### 1. Install Python Dependencies

```bash
cd backend
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Set Up Database

**Option A: Supabase (Recommended - Free)**
1. Sign up at https://supabase.com
2. Create a new project
3. Go to Settings → Database
4. Copy the connection string
5. Add to `.env` file

**Option B: Local PostgreSQL**
```bash
# Install PostgreSQL
# macOS: brew install postgresql
# Ubuntu: sudo apt install postgresql

# Create database
createdb elevate_edu

# Connection string:
DATABASE_URL=postgresql://postgres:password@localhost:5432/elevate_edu
```

**Option C: Railway (Free Tier)**
1. Sign up at https://railway.app
2. Create new project
3. Add PostgreSQL database
4. Copy connection string to `.env`

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set:
- `DATABASE_URL` - Your PostgreSQL connection string
- `SECRET_KEY` - Generate with: `openssl rand -hex 32`

### 4. Run Database Migrations

```bash
# Install Alembic (if not already installed)
pip install alembic

# Initialize Alembic (first time only)
alembic init alembic

# Create initial migration
alembic revision --autogenerate -m "Initial migration"

# Apply migrations
alembic upgrade head
```

Or create tables manually:
```bash
python -c "from app.core.database import Base, engine; Base.metadata.create_all(bind=engine)"
```

### 5. Run the Server

```bash
uvicorn app.main:app --reload --port 8000
```

API will be available at:
- **API**: http://localhost:8000
- **Docs**: http://localhost:8000/api/docs
- **ReDoc**: http://localhost:8000/api/redoc

---

## 📁 Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPI app
│   ├── config.py         # Settings
│   ├── models/           # SQLAlchemy models
│   ├── schemas/          # Pydantic schemas
│   ├── api/              # API routes
│   │   └── auth.py       # Authentication endpoints
│   └── core/             # Core utilities
│       ├── database.py   # DB connection
│       └── security.py   # JWT, password hashing
├── alembic/              # Database migrations
├── requirements.txt      # Python dependencies
└── .env                  # Environment variables
```

---

## 🔑 API Endpoints

### Authentication

- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/signup` - Signup
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Get current user

### Example Request

```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'
```

---

## 🧪 Testing

```bash
# Test health endpoint
curl http://localhost:8000/health

# Test login
curl -X POST http://localhost:8000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "test123", "full_name": "Test User"}'
```

---

## 📝 Next Steps

1. ✅ Backend setup complete
2. ⏳ Create more API endpoints (users, profiles, colleges, etc.)
3. ⏳ Update frontend to use REST API
4. ⏳ Add AI endpoints (resume analysis, ATS scoring)
5. ⏳ Deploy to production

---

## 🔒 Security Notes

- Never commit `.env` file
- Use strong `SECRET_KEY` in production
- Enable HTTPS in production
- Set proper CORS origins
- Use environment-specific settings

