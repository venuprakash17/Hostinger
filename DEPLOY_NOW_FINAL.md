# 🚀 DEPLOY NOW - Final Command

## Single Command for Complete Deployment

**Copy and paste this exact command:**

```bash
cd /Users/venuprakashreddy/Documents/Svna_jobs/Latest_0.1/elevate-edu-ui && chmod +x deploy-complete.sh && ./deploy-complete.sh
```

## What This Does

1. ✅ **Navigates to project folder**
2. ✅ **Makes script executable**
3. ✅ **Commits all changes to git**
4. ✅ **Pushes to repository**
5. ✅ **Installs dependencies**
6. ✅ **Builds frontend for production** (with svnaprojob.online domain)
7. ✅ **Creates backup on server**
8. ✅ **Uploads frontend files**
9. ✅ **Uploads backend files**
10. ✅ **Restarts services on server**
11. ✅ **Verifies deployment**

## All Services Included

### ✅ Core Services (No API Keys Required)
- Placement Module (Jobs, Rounds, Students, Analytics)
- Resume Builder
- AI Mock Interview
- Coding Labs
- Quizzes & Tests
- User Management
- Analytics & Reporting

### ✅ AI Services (Work with FREE Ollama)
- Resume Optimization (Ollama - FREE)
- ATS Scoring (Ollama - FREE)
- AI Interview Questions (Ollama - FREE)
- Answer Analysis (Ollama - FREE)

### ✅ Optional Enhanced Services
- OpenAI fallback (if API key provided)
- Google AI enhancement (if API key provided)

**All services work seamlessly without API keys!**

## API Keys (All Optional)

### Frontend (Optional)
- `VITE_OPENAI_API_KEY` - For ResumeItNow features
- `VITE_GOOGLE_AI_API_KEY` - For resume enhancement

### Backend (Optional, on server)
- `OPENAI_API_KEY` - For AI fallback
- `OLLAMA_BASE_URL` - FREE (default: http://localhost:11434)
- `OLLAMA_MODEL` - FREE (default: llama3.1:8b)

**Services work without any API keys using Ollama!**

## Pre-Deployment (One-Time Setup)

On the server, create `backend/.env`:

```bash
ssh root@72.60.101.14
cd /root/elevate-edu
nano backend/.env
```

Add:
```env
DATABASE_URL=postgresql://elevate_user:YOUR_PASSWORD@postgres:5432/elevate_edu
SECRET_KEY=$(openssl rand -hex 32)
BACKEND_CORS_ORIGINS=https://svnaprojob.online,http://svnaprojob.online
DEBUG=False
# Optional:
OPENAI_API_KEY=your-key-here
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

## Post-Deployment Verification

```bash
# Check website
curl -I https://svnaprojob.online

# Check API
curl https://svnaprojob.online/api/v1/health

# Check AI services
curl https://svnaprojob.online/api/v1/mock-interview-ai/health

# Or run verification script
./verify-all-services.sh
```

## Troubleshooting

If deployment fails:

```bash
# Check server logs
ssh root@72.60.101.14 'docker-compose logs backend'

# Check nginx
ssh root@72.60.101.14 'nginx -t'

# Restart services
ssh root@72.60.101.14 'cd /root/elevate-edu && docker-compose restart'
```

---

## 🎯 THE COMMAND

```bash
cd /Users/venuprakashreddy/Documents/Svna_jobs/Latest_0.1/elevate-edu-ui && chmod +x deploy-complete.sh && ./deploy-complete.sh
```

**That's it! One command deploys everything! 🚀**
