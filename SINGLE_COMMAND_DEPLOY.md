# 🚀 Single Command Deployment

## Complete End-to-End Deployment (One Command)

Navigate to your project folder and run:

```bash
cd /Users/venuprakashreddy/Documents/Svna_jobs/Latest_0.1/elevate-edu-ui && chmod +x deploy-complete.sh && ./deploy-complete.sh
```

This single command will:
1. ✅ Verify project directory
2. ✅ Commit all changes to git
3. ✅ Push to repository
4. ✅ Install/update dependencies
5. ✅ Build frontend for production
6. ✅ Create backup on server
7. ✅ Upload frontend files
8. ✅ Upload backend files
9. ✅ Setup and restart services
10. ✅ Verify deployment

## What Gets Deployed

### Frontend
- Built React application (optimized, minified)
- All static assets
- Production API URLs configured

### Backend
- All Python backend code
- API endpoints
- Database models
- Services (AI, resume, interview, etc.)

### Services Included
- ✅ Placement Module (Jobs, Rounds, Students, Analytics)
- ✅ Resume Builder (with AI optimization)
- ✅ AI Mock Interview
- ✅ Coding Labs
- ✅ Quizzes & Tests
- ✅ Analytics & Reporting
- ✅ All other features

## API Keys Configuration

### Optional API Keys (Services work without them)

**Frontend (.env.production):**
- `VITE_OPENAI_API_KEY` - For ResumeItNow features (optional)
- `VITE_GOOGLE_AI_API_KEY` - For resume enhancement (optional)

**Backend (backend/.env on server):**
- `OPENAI_API_KEY` - For AI features fallback (optional)
- `OLLAMA_BASE_URL` - FREE, no key needed (default: http://localhost:11434)
- `OLLAMA_MODEL` - FREE, no key needed (default: llama3.1:8b)

### How Services Work

1. **Ollama (FREE)** - Primary AI service, no API key needed
2. **OpenAI (Optional)** - Fallback if Ollama unavailable
3. **Google AI (Optional)** - For resume enhancement only

**All services work seamlessly without API keys using Ollama!**

## Pre-Deployment Checklist

Before running deployment:

1. **DNS**: Ensure `svnaprojob.online` points to `72.60.101.14`
2. **Server Access**: SSH access to `root@72.60.101.14`
3. **Backend .env**: Create `backend/.env` on server with:
   - `DATABASE_URL`
   - `SECRET_KEY` (generate: `openssl rand -hex 32`)
   - `BACKEND_CORS_ORIGINS` (includes https://svnaprojob.online)
   - `DEBUG=False`
   - Optional: `OPENAI_API_KEY`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`

## Post-Deployment

After deployment, verify:

```bash
# Check website
curl -I https://svnaprojob.online

# Check API
curl https://svnaprojob.online/api/v1/health

# Check AI services
curl https://svnaprojob.online/api/v1/mock-interview-ai/health
```

## Troubleshooting

If deployment fails:

```bash
# Check logs
ssh root@72.60.101.14 'docker-compose logs backend'

# Check nginx
ssh root@72.60.101.14 'nginx -t'

# Restart services
ssh root@72.60.101.14 'cd /root/elevate-edu && docker-compose restart'
```

---

**That's it! One command deploys everything! 🚀**
