# Ollama Setup Guide for Resume Builder

## Overview
Ollama is a free, local AI alternative to OpenAI. It runs on your machine and provides AI-powered resume optimization and ATS scoring without API costs.

## Installation

### Step 1: Install Ollama
Visit [https://ollama.ai](https://ollama.ai) and download Ollama for your operating system:
- **macOS**: Download the `.dmg` installer
- **Linux**: Run `curl https://ollama.ai/install.sh | sh`
- **Windows**: Download the `.exe` installer

### Step 2: Install a Model
After installing Ollama, download a model. Recommended models:

```bash
# Best for general tasks (recommended)
ollama pull llama3.2

# Alternative options (choose one based on your needs)
ollama pull mistral       # Good balance of speed and quality
ollama pull codellama     # Better for technical content
ollama pull llama3.1      # Larger, more capable but slower
```

**Note**: First download may take several minutes depending on model size and internet speed.

### Step 3: Start Ollama Server
Ollama runs as a local server. After installation, it should start automatically.

Verify it's running:
```bash
curl http://localhost:11434/api/tags
```

If you see a JSON response, Ollama is running correctly.

### Step 4: Configure Backend

#### Option A: Use Default Settings (Recommended)
The backend is pre-configured to use Ollama at `http://localhost:11434` with the `llama3.2` model.

No configuration needed if:
- Ollama is running on localhost
- You're using `llama3.2` model

#### Option B: Custom Configuration
Create or update `backend/.env`:

```env
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
OLLAMA_TIMEOUT=120
```

**For remote Ollama server**:
```env
OLLAMA_BASE_URL=http://your-server-ip:11434
OLLAMA_MODEL=llama3.2
```

## How It Works

The backend uses a **smart fallback system**:

1. **Ollama (Free)** - Tries first if available
2. **OpenAI** - Falls back if Ollama unavailable
3. **Rule-based** - Final fallback if both AI services fail

This ensures the resume builder always works, even without AI.

## Testing

### Test Ollama Connection
```bash
cd backend
python3 -c "from app.services.ollama_service import check_ollama_availability; print('✅ Ollama available' if check_ollama_availability() else '❌ Ollama not available')"
```

### Test Resume Optimization
Use the resume preview modal in the UI and click "Optimize with AI". Check the browser console or backend logs to see which service is being used.

## Troubleshooting

### "Ollama not available"
1. Check if Ollama is running: `curl http://localhost:11434/api/tags`
2. Verify model is installed: `ollama list`
3. If needed, restart Ollama or install the model

### "Connection timeout"
- Increase `OLLAMA_TIMEOUT` in `.env` (default: 120 seconds)
- Check if Ollama server is accessible
- For remote servers, verify firewall settings

### "Model not found"
- Install the model: `ollama pull llama3.2`
- Update `OLLAMA_MODEL` in `.env` to match your installed model

### Slow responses
- Use smaller models (e.g., `llama3.2` instead of `llama3.1`)
- Reduce `OLLAMA_TIMEOUT` if you want faster failures
- Consider using OpenAI for faster responses (paid)

## Performance Tips

1. **Use GPU acceleration** (if available):
   - Ollama automatically uses GPU if CUDA/Metal is available
   - Significantly faster than CPU-only

2. **Choose the right model**:
   - `llama3.2`: Fast, good quality (recommended)
   - `mistral`: Balanced speed/quality
   - `llama3.1`: Best quality but slower

3. **Monitor resource usage**:
   - Ollama uses RAM and potentially GPU memory
   - Close other applications if running out of memory

## Cost Comparison

| Service | Cost | Setup |
|---------|------|-------|
| Ollama | **FREE** | Local installation |
| OpenAI | $0.15-0.60 per 1M tokens | API key required |

**Estimated costs for 100 resume optimizations:**
- Ollama: **$0**
- OpenAI: ~$2-5 (depending on resume length)

## Security & Privacy

✅ **Ollama advantages:**
- All data stays on your machine
- No data sent to external APIs
- Complete privacy and control

⚠️ **OpenAI considerations:**
- Data sent to OpenAI servers
- Subject to OpenAI's privacy policy
- Requires internet connection

## Next Steps

1. Install Ollama and a model
2. Verify it's working with the test command
3. Use the resume builder - it will automatically prefer Ollama
4. Monitor backend logs to see which service is being used

For questions or issues, check the backend logs or the browser console for detailed error messages.

