# 📖 How to Use This Deployment Package

## 🎯 Overview

This package contains everything you need to deploy Elevate Edu to AWS. All files are ready to use - just follow the guides!

## 📁 Package Contents

### Scripts (`scripts/`)
Ready-to-use deployment scripts:
- **deploy-backend.sh** - Deploy backend to EC2
- **deploy-frontend.sh** - Deploy frontend to S3/CloudFront
- **ec2-user-data.sh** - EC2 initialization (optional)

### Configs (`configs/`)
Configuration templates:
- **backend.env.example** - Backend environment variables template
- **nginx.conf.example** - Nginx reverse proxy template

### Workflows (`workflows/`)
GitHub Actions for automated deployment:
- **deploy-backend.yml** - Automated backend deployment
- **deploy-frontend.yml** - Automated frontend deployment
- **test.yml** - Test workflow

### Documentation
- **MASTER_DEPLOYMENT_GUIDE.md** - Complete guide (START HERE!)
- **QUICK_START.md** - Quick reference
- **README.md** - Package overview

## 🚀 Usage Instructions

### Step 1: Read the Master Guide

**Open**: `MASTER_DEPLOYMENT_GUIDE.md`

This guide walks you through:
- AWS resource creation
- Backend deployment
- Frontend deployment
- GitHub CI/CD setup
- Troubleshooting

### Step 2: Create AWS Resources

Follow the guide to create:
1. RDS PostgreSQL database
2. EC2 instance
3. S3 bucket
4. CloudFront distribution

### Step 3: Deploy Backend

**Option A: Manual (First Time)**
```bash
# Upload script to EC2
scp scripts/deploy-backend.sh ubuntu@ec2-ip:~/

# SSH into EC2
ssh -i key.pem ubuntu@ec2-ip

# Run script
chmod +x deploy-backend.sh
./deploy-backend.sh
```

**Option B: GitHub CI/CD (After Setup)**
- Push code to GitHub
- Automatic deployment!

### Step 4: Deploy Frontend

**Option A: Manual**
```bash
# On local machine
chmod +x scripts/deploy-frontend.sh
./scripts/deploy-frontend.sh
```

**Option B: GitHub CI/CD**
- Push frontend changes
- Automatic deployment!

### Step 5: Configure (If Needed)

**Backend Environment**:
```bash
# Copy template
cp configs/backend.env.example backend/.env

# Edit with your values
nano backend/.env
```

**Nginx (Optional)**:
```bash
# Copy template
sudo cp configs/nginx.conf.example /etc/nginx/sites-available/elevate-edu-backend

# Edit and enable
sudo nano /etc/nginx/sites-available/elevate-edu-backend
sudo ln -s /etc/nginx/sites-available/elevate-edu-backend /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

## 🔄 GitHub CI/CD Setup

### 1. Copy Workflows

```bash
# Copy workflows to your project
cp workflows/*.yml ../.github/workflows/
```

### 2. Add GitHub Secrets

Go to: **Repository → Settings → Secrets → Actions**

Add all secrets (see MASTER_DEPLOYMENT_GUIDE.md)

### 3. Push Code

```bash
git add .github/
git commit -m "Add GitHub Actions workflows"
git push origin main
```

### 4. Automatic Deployment

Now every push to `main` automatically deploys!

## 📋 File Usage Summary

| File | When to Use | How to Use |
|------|-------------|------------|
| `MASTER_DEPLOYMENT_GUIDE.md` | Always | Read first, follow steps |
| `scripts/deploy-backend.sh` | Backend deployment | Run on EC2 |
| `scripts/deploy-frontend.sh` | Frontend deployment | Run locally |
| `configs/backend.env.example` | Backend config | Copy to `backend/.env` |
| `configs/nginx.conf.example` | Nginx setup | Copy to `/etc/nginx/` |
| `workflows/*.yml` | CI/CD setup | Copy to `.github/workflows/` |

## ✅ Verification

After deployment:

1. **Backend**: `curl http://ec2-ip:8000/health`
2. **Frontend**: Visit CloudFront URL
3. **Features**: Test login, coding, etc.

## 🆘 Troubleshooting

See `MASTER_DEPLOYMENT_GUIDE.md` troubleshooting section for:
- Backend not starting
- Frontend not loading
- Database connection issues
- GitHub Actions failures

---

**Ready?** Start with `MASTER_DEPLOYMENT_GUIDE.md`!

