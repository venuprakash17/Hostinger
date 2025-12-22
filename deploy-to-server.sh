#!/bin/bash

# ============================================================================
# Complete Deployment Script - Push All Changes to Server
# ============================================================================
# This script handles:
# - Building frontend
# - Pushing backend changes
# - Pushing frontend changes
# - Running tests
# - Restarting services
# ============================================================================

set -e  # Exit on error

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Default values (can be overridden by environment variables)
SERVER_HOST="${SERVER_HOST:-your-server.com}"
SERVER_USER="${SERVER_USER:-root}"
SERVER_PORT="${SERVER_PORT:-22}"
SERVER_PATH="${SERVER_PATH:-/var/www/elevate-edu}"
BACKEND_PATH="${BACKEND_PATH:-$SERVER_PATH/backend}"
FRONTEND_PATH="${FRONTEND_PATH:-$SERVER_PATH/frontend}"
GIT_REMOTE="${GIT_REMOTE:-origin}"
GIT_BRANCH="${GIT_BRANCH:-main}"

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Check prerequisites
check_prerequisites() {
    log_step "Checking Prerequisites"
    
    # Check Git
    if ! command -v git &> /dev/null; then
        log_error "Git is not installed"
        exit 1
    fi
    log_success "Git is installed"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    log_success "Node.js is installed ($(node --version))"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    log_success "npm is installed ($(npm --version))"
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        log_error "Python3 is not installed"
        exit 1
    fi
    log_success "Python3 is installed ($(python3 --version))"
    
    # Check if git repo is clean
    if [ -n "$(git status --porcelain)" ]; then
        log_warning "You have uncommitted changes"
        read -p "Do you want to commit them? (y/n): " commit_changes
        if [ "$commit_changes" = "y" ]; then
            git add .
            read -p "Enter commit message: " commit_msg
            git commit -m "${commit_msg:-Deploy changes}"
            log_success "Changes committed"
        else
            log_warning "Proceeding with uncommitted changes"
        fi
    fi
    
    log_success "All prerequisites met"
}

# Build frontend
build_frontend() {
    log_step "Building Frontend"
    
    log_info "Installing dependencies..."
    npm install --silent
    
    log_info "Building production bundle..."
    npm run build
    
    if [ -d "dist" ]; then
        log_success "Frontend built successfully"
        log_info "Build size: $(du -sh dist | cut -f1)"
    else
        log_error "Frontend build failed - dist directory not found"
        exit 1
    fi
}

# Run tests
run_tests() {
    log_step "Running Tests"
    
    # Check if backend is running locally
    if curl -s -f "http://localhost:8090/api/v1/auth/me" > /dev/null 2>&1; then
        log_info "Backend is running locally, running endpoint tests..."
        if [ -f "test-all-endpoints.py" ]; then
            python3 test-all-endpoints.py || log_warning "Some endpoint tests failed"
        fi
    else
        log_warning "Backend not running locally, skipping endpoint tests"
    fi
    
    log_success "Tests completed"
}

# Push to Git
push_to_git() {
    log_step "Pushing to Git Repository"
    
    log_info "Checking git status..."
    git fetch "$GIT_REMOTE"
    
    local_branch=$(git rev-parse --abbrev-ref HEAD)
    remote_branch="$GIT_REMOTE/$GIT_BRANCH"
    
    if git rev-parse --verify "$remote_branch" &> /dev/null; then
        local_commit=$(git rev-parse HEAD)
        remote_commit=$(git rev-parse "$remote_branch")
        
        if [ "$local_commit" = "$remote_commit" ]; then
            log_info "Local and remote are in sync"
        else
            log_info "Pushing to $GIT_REMOTE/$GIT_BRANCH..."
            git push "$GIT_REMOTE" "$GIT_BRANCH" || {
                log_error "Failed to push to git"
                exit 1
            }
            log_success "Pushed to git successfully"
        fi
    else
        log_info "Pushing new branch to $GIT_REMOTE..."
        git push -u "$GIT_REMOTE" "$GIT_BRANCH" || {
            log_error "Failed to push to git"
            exit 1
        }
        log_success "Pushed to git successfully"
    fi
}

# Deploy to server
deploy_to_server() {
    log_step "Deploying to Server"
    
    log_info "Server: $SERVER_USER@$SERVER_HOST:$SERVER_PORT"
    log_info "Path: $SERVER_PATH"
    
    # Check if server is reachable
    if ! ssh -p "$SERVER_PORT" -o ConnectTimeout=5 "$SERVER_USER@$SERVER_HOST" "echo 'Connection successful'" &> /dev/null; then
        log_error "Cannot connect to server"
        log_info "Please check:"
        log_info "  - Server is accessible"
        log_info "  - SSH key is configured"
        log_info "  - SERVER_HOST, SERVER_USER, SERVER_PORT are correct"
        exit 1
    fi
    log_success "Server connection verified"
    
    # Create deployment script for server
    cat > /tmp/deploy-server.sh << 'DEPLOY_SCRIPT'
#!/bin/bash
set -e

SERVER_PATH="${SERVER_PATH:-/var/www/elevate-edu}"
BACKEND_PATH="${BACKEND_PATH:-$SERVER_PATH/backend}"
FRONTEND_PATH="${FRONTEND_PATH:-$SERVER_PATH/frontend}"
GIT_REMOTE="${GIT_REMOTE:-origin}"
GIT_BRANCH="${GIT_BRANCH:-main}"

echo "📦 Pulling latest changes from git..."
cd "$SERVER_PATH"
git fetch "$GIT_REMOTE"
git checkout "$GIT_BRANCH"
git pull "$GIT_REMOTE" "$GIT_BRANCH"

echo "🔧 Setting up backend..."
cd "$BACKEND_PATH"
if [ -d "venv" ]; then
    source venv/bin/activate
fi
pip install -q -r requirements.txt

echo "🌐 Setting up frontend..."
cd "$FRONTEND_PATH"
npm install --silent
npm run build

echo "🔄 Restarting services..."
# Restart backend (adjust based on your setup)
if systemctl is-active --quiet elevate-edu-backend; then
    sudo systemctl restart elevate-edu-backend
    echo "✅ Backend service restarted"
fi

# Restart frontend (adjust based on your setup)
if systemctl is-active --quiet elevate-edu-frontend; then
    sudo systemctl restart elevate-edu-frontend
    echo "✅ Frontend service restarted"
fi

# Or if using PM2
if command -v pm2 &> /dev/null; then
    pm2 restart elevate-edu-backend 2>/dev/null || true
    pm2 restart elevate-edu-frontend 2>/dev/null || true
    echo "✅ PM2 services restarted"
fi

# Or if using Docker
if command -v docker-compose &> /dev/null && [ -f "docker-compose.yml" ]; then
    docker-compose down
    docker-compose up -d --build
    echo "✅ Docker services restarted"
fi

echo "✅ Deployment complete!"
DEPLOY_SCRIPT
    
    log_info "Uploading deployment script to server..."
    scp -P "$SERVER_PORT" /tmp/deploy-server.sh "$SERVER_USER@$SERVER_HOST:/tmp/deploy-server.sh"
    
    log_info "Running deployment on server..."
    ssh -p "$SERVER_PORT" "$SERVER_USER@$SERVER_HOST" "chmod +x /tmp/deploy-server.sh && \
        SERVER_PATH='$SERVER_PATH' \
        BACKEND_PATH='$BACKEND_PATH' \
        FRONTEND_PATH='$FRONTEND_PATH' \
        GIT_REMOTE='$GIT_REMOTE' \
        GIT_BRANCH='$GIT_BRANCH' \
        bash /tmp/deploy-server.sh"
    
    log_success "Deployment to server completed"
}

# Verify deployment
verify_deployment() {
    log_step "Verifying Deployment"
    
    # Determine server URL
    if [ "$SERVER_HOST" != "your-server.com" ]; then
        SERVER_URL="http://$SERVER_HOST"
        if [ "$SERVER_PORT" != "22" ] && [ "$SERVER_PORT" != "80" ]; then
            SERVER_URL="http://$SERVER_HOST:$SERVER_PORT"
        fi
        
        log_info "Testing server endpoints..."
        
        # Test health endpoint
        if curl -s -f "$SERVER_URL/api/v1/auth/me" > /dev/null 2>&1; then
            log_success "Server is responding"
        else
            log_warning "Server health check failed (this might be normal if auth is required)"
        fi
        
        # Run endpoint tests if script is available
        if [ -f "test-all-endpoints.py" ]; then
            log_info "Running endpoint tests against server..."
            API_BASE_URL="$SERVER_URL/api/v1" \
            python3 test-all-endpoints.py || log_warning "Some endpoint tests failed"
        fi
    else
        log_warning "Skipping verification (SERVER_HOST not configured)"
    fi
}

# Main deployment flow
main() {
    echo ""
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${CYAN}🚀 COMPLETE DEPLOYMENT TO SERVER${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    
    # Load configuration from .env if exists
    if [ -f ".env.deploy" ]; then
        log_info "Loading configuration from .env.deploy"
        source .env.deploy
    fi
    
    # Show configuration
    log_info "Configuration:"
    echo "  Server: $SERVER_USER@$SERVER_HOST:$SERVER_PORT"
    echo "  Server Path: $SERVER_PATH"
    echo "  Backend Path: $BACKEND_PATH"
    echo "  Frontend Path: $FRONTEND_PATH"
    echo "  Git Remote: $GIT_REMOTE"
    echo "  Git Branch: $GIT_BRANCH"
    echo ""
    
    read -p "Continue with deployment? (y/n): " confirm
    if [ "$confirm" != "y" ]; then
        log_warning "Deployment cancelled"
        exit 0
    fi
    
    # Run deployment steps
    check_prerequisites
    build_frontend
    run_tests
    push_to_git
    deploy_to_server
    verify_deployment
    
    echo ""
    log_step "Deployment Complete!"
    log_success "All changes have been deployed to your server"
    echo ""
    log_info "Next steps:"
    echo "  1. Check server logs for any errors"
    echo "  2. Verify all endpoints are working"
    echo "  3. Test the application in production"
    echo ""
}

# Run main function
main "$@"

