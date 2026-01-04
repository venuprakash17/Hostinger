# Ollama AI Service Setup Guide

This guide will help you set up Ollama for the AI Mock Interview feature.

## Quick Setup

### Option 1: Automated Setup (Recommended)
```bash
./scripts/setup-ollama.sh
```

### Option 2: Manual Setup

#### Step 1: Install Ollama

**macOS:**
```bash
brew install ollama
```

**Linux:**
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

**Windows:**
Download and install from: https://ollama.ai

#### Step 2: Start Ollama Service

```bash
ollama serve
```

This will start Ollama in the foreground. For background operation:
```bash
ollama serve > /tmp/ollama.log 2>&1 &
```

#### Step 3: Pull the Required Model

```bash
ollama pull llama3.2:3b
```

This will download the model (approximately 2GB). The first time may take a few minutes depending on your internet connection.

#### Step 4: Verify Installation

Check if Ollama is running:
```bash
curl http://localhost:11434/api/tags
```

Check if the model is installed:
```bash
ollama list
```

Test the backend health endpoint:
```bash
curl http://localhost:8000/api/v1/mock-interview-ai/health
```

## Troubleshooting

### Ollama Service Not Starting

1. **Check if port 11434 is already in use:**
   ```bash
   lsof -i :11434
   ```

2. **Check Ollama logs:**
   ```bash
   tail -f /tmp/ollama.log
   ```

3. **Restart Ollama:**
   ```bash
   pkill ollama
   ollama serve
   ```

### Model Not Found

If you get an error about the model not being found:
```bash
ollama pull llama3.2:3b
```

### Backend Can't Connect to Ollama

1. **Verify Ollama is running:**
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. **Check backend configuration:**
   - Ensure `OLLAMA_BASE_URL` environment variable is set correctly (default: `http://localhost:11434`)
   - Check backend logs for connection errors

3. **Test the connection:**
   ```bash
   curl http://localhost:8000/api/v1/mock-interview-ai/health
   ```

## Alternative Models

You can use other models if `llama3.2:3b` is not available:

- **Faster (smaller):** `llama3.2:1b`
  ```bash
  ollama pull llama3.2:1b
  ```

- **Better quality (larger):** `llama3.1:8b`
  ```bash
  ollama pull llama3.1:8b
  ```

- **Balanced:** `mistral:7b`
  ```bash
  ollama pull mistral:7b
  ```

The backend will automatically use the best available model.

## Running Ollama as a Service (Production)

### macOS (using launchd)

Create `/Library/LaunchDaemons/com.ollama.service.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.ollama.service</string>
    <key>ProgramArguments</key>
    <array>
        <string>/opt/homebrew/bin/ollama</string>
        <string>serve</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
```

Load the service:
```bash
sudo launchctl load /Library/LaunchDaemons/com.ollama.service.plist
```

### Linux (using systemd)

Create `/etc/systemd/system/ollama.service`:
```ini
[Unit]
Description=Ollama Service
After=network.target

[Service]
Type=simple
User=your-username
ExecStart=/usr/local/bin/ollama serve
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable ollama
sudo systemctl start ollama
```

## Verification

After setup, you should be able to:

1. ✅ Start a mock interview without errors
2. ✅ Get AI-generated questions
3. ✅ Receive answer analysis and feedback
4. ✅ Complete the full interview flow

## Need Help?

- Check the backend logs for detailed error messages
- Verify Ollama is accessible: `curl http://localhost:11434/api/tags`
- Test the health endpoint: `curl http://localhost:8000/api/v1/mock-interview-ai/health`
