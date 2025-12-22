# 🚀 Resume Builder - Quick Start Guide

## Overview

The Enterprise Resume Builder is now fully functional with advanced AI optimization using Ollama (free, local LLM).

## ✅ What's Working

1. **Backend Server** - FastAPI with advanced AI endpoints
2. **Premium AI Optimization** - Using Ollama (free, open-source)
3. **5 Professional Templates** - ATS-friendly resume templates
4. **One-Page PDF Generation** - Optimized for single-page resumes
5. **Advanced Features**:
   - Industry detection
   - Skill gap analysis
   - Career insights
   - Keyword extraction
   - ATS scoring

## 🚀 Quick Start

### Option 1: Use the Start Script (Recommended)

```bash
./start-resume-builder.sh
```

This will:
- Check and create virtual environment
- Install dependencies
- Check Ollama status
- Start the backend server

### Option 2: Manual Start

```bash
# 1. Navigate to backend
cd backend

# 2. Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies (if not already installed)
pip install -r requirements.txt

# 4. Start the server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 🤖 Ollama Setup (Optional but Recommended)

For AI-powered optimization, install Ollama:

### Install Ollama:

```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Or download from: https://ollama.com
```

### Pull a Model:

```bash
# Best quality (recommended)
ollama pull llama3.1:8b

# Or faster option
ollama pull mistral:7b

# Or fastest option
ollama pull llama3.2:3b
```

### Start Ollama (if not auto-started):

```bash
ollama serve
```

The system will automatically:
- Detect available models
- Use the best model available
- Fall back gracefully if Ollama is unavailable

## 🔍 Verify Backend is Running

```bash
# Check health endpoint
curl http://localhost:8000/health

# Should return: {"status":"healthy"}

# Check API docs
open http://localhost:8000/api/docs
```

## 📋 Available Endpoints

### Core Endpoints:

1. **POST /api/v1/resume/optimize**
   - Premium AI optimization
   - Industry detection
   - Returns optimized resume

2. **POST /api/v1/resume/ats-score-ai**
   - ATS scoring (0-100)
   - Comprehensive feedback

3. **POST /api/v1/resume/generate-pdf**
   - Generate PDF from resume
   - Template-based rendering

### Advanced Endpoints:

4. **POST /api/v1/resume/skill-gap-analysis**
   - Analyze missing skills
   - Learning recommendations

5. **POST /api/v1/resume/career-insights**
   - Career path recommendations
   - Market value estimation

6. **POST /api/v1/resume/extract-keywords**
   - Extract keywords from JD
   - Categorize by priority

7. **POST /api/v1/resume/detect-industry**
   - Auto-detect industry
   - Industry-specific hints

## 🐛 Troubleshooting

### Backend Not Starting

1. **Check Python version** (requires 3.9+):
   ```bash
   python --version
   ```

2. **Check port 8000 is free**:
   ```bash
   lsof -i :8000
   # Kill process if needed: kill -9 <PID>
   ```

3. **Check dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

### Ollama Issues

1. **Ollama not found**:
   - Install from https://ollama.com
   - Or the system will use OpenAI if configured

2. **No models available**:
   ```bash
   ollama pull llama3.1:8b
   ```

3. **Ollama not responding**:
   ```bash
   # Check if running
   curl http://localhost:11434/api/tags
   
   # Start if needed
   ollama serve
   ```

### Import Errors

If you see import errors:
```bash
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

## 🎯 Testing the Resume Builder

### 1. Start Backend:
```bash
./start-resume-builder.sh
```

### 2. Start Frontend:
```bash
npm run dev
```

### 3. Access the Application:
- Frontend: http://localhost:8080 (or port shown)
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/api/docs

### 4. Test Resume Optimization:

Use the frontend UI or test via API:

```bash
curl -X POST http://localhost:8000/api/v1/resume/optimize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "resume_data": {
      "profile": {"full_name": "Test User"},
      "education": [{"degree": "B.Tech", "institution_name": "Test University"}],
      "projects": [{"project_title": "Test Project"}],
      "skills": {"technical": ["Python", "JavaScript"]}
    },
    "target_role": "Software Developer"
  }'
```

## ✨ Features Summary

- ✅ **Free AI**: Uses Ollama (local, no API costs)
- ✅ **Premium Optimization**: Industry-specific enhancements
- ✅ **Multiple Templates**: 5 professional ATS-friendly templates
- ✅ **One-Page PDF**: Smart content optimization
- ✅ **Advanced Analysis**: Skill gaps, career insights, keyword extraction
- ✅ **Production Ready**: Error handling, fallbacks, logging

## 📞 Need Help?

1. Check logs: Backend logs will show detailed error messages
2. Check API docs: http://localhost:8000/api/docs
3. Verify Ollama: `ollama list` to see available models
4. Check health: `curl http://localhost:8000/health`

---

**Built with ❤️ using free and open-source technologies**

