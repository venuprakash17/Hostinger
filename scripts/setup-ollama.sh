#!/bin/bash
# Setup script for Ollama AI service
# This script helps set up Ollama for the AI Mock Interview feature

set -e

echo "🚀 Setting up Ollama AI Service..."
echo ""

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama is not installed."
    echo ""
    echo "Please install Ollama first:"
    echo "  macOS: brew install ollama"
    echo "  Linux: curl -fsSL https://ollama.ai/install.sh | sh"
    echo "  Windows: Download from https://ollama.ai"
    echo ""
    exit 1
fi

echo "✅ Ollama is installed at: $(which ollama)"
echo ""

# Check if Ollama is running
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama service is already running"
else
    echo "⚠️  Ollama service is not running. Starting it..."
    ollama serve > /tmp/ollama.log 2>&1 &
    sleep 3
    
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo "✅ Ollama service started successfully"
    else
        echo "❌ Failed to start Ollama service"
        echo "   Check the logs: tail -f /tmp/ollama.log"
        exit 1
    fi
fi

echo ""

# Check if llama3.2:3b model is installed
if ollama list | grep -q "llama3.2:3b"; then
    echo "✅ Model 'llama3.2:3b' is already installed"
else
    echo "📥 Installing model 'llama3.2:3b' (this may take a few minutes)..."
    ollama pull llama3.2:3b
    echo "✅ Model installed successfully"
fi

echo ""
echo "🎉 Ollama setup complete!"
echo ""
echo "Available models:"
ollama list
echo ""
echo "To verify, test the health endpoint:"
echo "  curl http://localhost:8000/api/v1/mock-interview-ai/health"
echo ""
