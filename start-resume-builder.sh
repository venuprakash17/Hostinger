#!/bin/bash

# Enterprise Resume Builder - Start Script
# This script starts the backend server for the resume builder

set -e

echo "🚀 Starting Enterprise Resume Builder Backend"
echo "=============================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -d "backend" ]; then
    echo -e "${RED}❌ Error: backend directory not found${NC}"
    echo "Please run this script from the project root directory"
    exit 1
fi

# Navigate to backend
cd backend

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}⚠️  Virtual environment not found. Creating one...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
echo -e "${YELLOW}📦 Activating virtual environment...${NC}"
source venv/bin/activate

# Install/upgrade dependencies
echo -e "${YELLOW}📥 Installing dependencies...${NC}"
pip install -q --upgrade pip
pip install -q -r requirements.txt

# Check if Ollama is available (optional, but recommended)
echo -e "${YELLOW}🤖 Checking Ollama availability...${NC}"
if command -v ollama &> /dev/null; then
    if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Ollama is running${NC}"
        echo -e "${YELLOW}💡 To install a model, run: ollama pull llama3.1:8b${NC}"
    else
        echo -e "${YELLOW}⚠️  Ollama is installed but not running. Start it with: ollama serve${NC}"
        echo -e "${YELLOW}   Or install a model: ollama pull llama3.1:8b${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Ollama not found. Install from: https://ollama.com${NC}"
    echo -e "${YELLOW}   The system will use OpenAI if configured, or return original data.${NC}"
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Using defaults.${NC}"
    echo -e "${YELLOW}   Copy .env.example to .env and configure if needed.${NC}"
fi

# Start the server
echo -e "${GREEN}🚀 Starting FastAPI server on port 8000...${NC}"
echo ""
echo -e "${GREEN}✅ Backend will be available at: http://localhost:8000${NC}"
echo -e "${GREEN}✅ API docs: http://localhost:8000/api/docs${NC}"
echo -e "${GREEN}✅ Health check: http://localhost:8000/health${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

