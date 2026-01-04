# 🔑 API Keys Configuration Guide

## Required API Keys for All Services

### Frontend Environment Variables (.env.production)

Create `.env.production` file in project root:

```env
# Production API Base URL
VITE_API_BASE_URL=https://svnaprojob.online/api/v1
VITE_WS_BASE_URL=wss://svnaprojob.online

# OpenAI API Key (Optional - for ResumeItNow features)
# Get from: https://platform.openai.com/api-keys
VITE_OPENAI_API_KEY=your-openai-api-key-here

# Google AI (Gemini) API Key (Optional - for Resume Enhancement)
# Get from: https://aistudio.google.com/app/apikey
VITE_GOOGLE_AI_API_KEY=your-google-ai-api-key-here
```

### Backend Environment Variables (backend/.env)

Create `backend/.env` file on the server:

```env
# Database
DATABASE_URL=postgresql://elevate_user:YOUR_PASSWORD@postgres:5432/elevate_edu

# Security
SECRET_KEY=YOUR_SECRET_KEY_GENERATE_WITH_OPENSSL_RAND_HEX_32

# CORS
BACKEND_CORS_ORIGINS=https://svnaprojob.online,http://svnaprojob.online,https://www.svnaprojob.online,http://www.svnaprojob.online

# Production
DEBUG=False

# OpenAI API Key (Optional - for Resume Optimization & AI Interview)
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=your-openai-api-key-here

# Ollama Configuration (FREE - No API Key Needed)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```

## Service Dependencies

### 1. Resume Services ✅
- **Resume Builder**: Works without API keys (basic functionality)
- **Resume Optimization**: 
  - Primary: Ollama (FREE, no key needed)
  - Fallback: OpenAI (requires OPENAI_API_KEY)
- **ATS Scoring**:
  - Primary: Ollama (FREE)
  - Fallback: OpenAI (requires OPENAI_API_KEY)
- **Resume Enhancement**:
  - Optional: Google AI/Gemini (requires VITE_GOOGLE_AI_API_KEY)
  - Works without key (basic formatting)

### 2. AI Mock Interview ✅
- **Question Generation**:
  - Primary: Ollama (FREE, no key needed)
  - Fallback: OpenAI (requires OPENAI_API_KEY)
- **Answer Analysis**:
  - Primary: Ollama (FREE)
  - Fallback: OpenAI (requires OPENAI_API_KEY)
- **Speech Recognition**: Browser API (FREE, no key needed)
- **Text-to-Speech**: Browser API (FREE, no key needed)

### 3. Placement Module ✅
- **Job Management**: No API keys needed
- **Round Tracking**: No API keys needed
- **Analytics**: No API keys needed

## How Services Work Without API Keys

### Ollama (FREE - Default)
- Runs locally on server
- No API keys required
- No costs
- Works for: Resume optimization, ATS scoring, Interview questions, Answer analysis

### OpenAI (Optional - Paid)
- Only used if Ollama fails
- Requires API key
- Costs money per request
- Better quality but not required

### Google AI/Gemini (Optional - Paid)
- Only for resume enhancement
- Requires API key
- Costs money per request
- Not required for core functionality

## Setup Instructions

### On Server (backend/.env)

```bash
# SSH into server
ssh root@72.60.101.14

# Navigate to project
cd /root/elevate-edu

# Create/edit backend .env
nano backend/.env
```

Add these values (API keys are optional):
```env
DATABASE_URL=postgresql://elevate_user:YOUR_PASSWORD@postgres:5432/elevate_edu
SECRET_KEY=$(openssl rand -hex 32)
BACKEND_CORS_ORIGINS=https://svnaprojob.online,http://svnaprojob.online
DEBUG=False
OPENAI_API_KEY=your-key-here  # Optional
OLLAMA_BASE_URL=http://localhost:11434  # FREE
OLLAMA_MODEL=llama3.1:8b  # FREE
```

### For Frontend Build

The deployment script automatically sets:
- `VITE_API_BASE_URL=https://svnaprojob.online/api/v1`
- `VITE_WS_BASE_URL=wss://svnaprojob.online`

Optional API keys can be set in `.env.production` before building.

## Verification

### Check if services work:

1. **Resume Builder**: Should work without any keys
2. **Resume Optimization**: Works with Ollama (free), OpenAI optional
3. **AI Interview**: Works with Ollama (free), OpenAI optional
4. **Placement Module**: Works without any keys

### Test Commands:

```bash
# Check backend health
curl https://svnaprojob.online/api/v1/health

# Check if Ollama is running (on server)
ssh root@72.60.101.14 'curl http://localhost:11434/api/tags'
```

## Important Notes

1. **Ollama is FREE** - No API keys needed, no costs
2. **OpenAI is OPTIONAL** - Only used as fallback
3. **Google AI is OPTIONAL** - Only for resume enhancement
4. **All core features work without API keys**
5. **API keys improve quality but are not required**
