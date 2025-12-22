# Mock Interview AI Setup Guide

## Quick Start

The Mock Interview feature uses **Ollama** (100% free, open-source AI) running locally on your machine.

### Step 1: Install Ollama

**macOS:**
```bash
# Download from https://ollama.ai or use Homebrew:
brew install ollama
```

**Linux:**
```bash
curl https://ollama.ai/install.sh | sh
```

**Windows:**
Download the installer from https://ollama.ai

### Step 2: Start Ollama

Ollama usually starts automatically after installation. To verify it's running:

```bash
curl http://localhost:11434/api/tags
```

If you see a JSON response, Ollama is running! ✅

If not, start it manually:
```bash
ollama serve
```

### Step 3: Download AI Model

The Mock Interview needs an AI model. Download one:

```bash
# Recommended (fast and good quality):
ollama pull llama3.2:3b

# Alternative options:
ollama pull llama3.2:1b    # Faster, smaller
ollama pull mistral:7b     # Better quality, slower
ollama pull llama3.1:8b    # Best quality, slowest
```

**Note:** First download may take a few minutes depending on your internet speed.

### Step 4: Verify Setup

Check if the model is available:
```bash
ollama list
```

You should see `llama3.2:3b` (or your chosen model) in the list.

### Step 5: Start Mock Interview

1. Make sure backend is running: `http://localhost:8000`
2. Make sure frontend is running: `http://localhost:5173` (or `8080`)
3. Navigate to "Mock Interview (AI)" in the sidebar
4. Fill in job details and click "Start Mock Interview"

## Troubleshooting

### Error: "Ollama API unavailable"

**Solution:**
1. Check if Ollama is running: `curl http://localhost:11434/api/tags`
2. If not running, start it: `ollama serve`
3. Make sure you've pulled a model: `ollama pull llama3.2:3b`

### Error: "Connection refused"

**Solution:**
- Ollama is not running. Start it with `ollama serve` or restart your computer (it should auto-start).

### Error: "Model not found"

**Solution:**
- Download the model: `ollama pull llama3.2:3b`

### Slow Responses

**Solution:**
- Use a smaller/faster model: `ollama pull llama3.2:1b`
- Or use a more powerful computer
- Close other applications to free up resources

## System Requirements

- **RAM:** At least 4GB free (8GB+ recommended)
- **Storage:** ~2GB for model
- **OS:** macOS, Linux, or Windows

## Need Help?

- Ollama Docs: https://github.com/ollama/ollama
- Check backend logs for detailed error messages
- Make sure port 11434 is not blocked by firewall

