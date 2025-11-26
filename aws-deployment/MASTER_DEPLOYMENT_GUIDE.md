# 🎯 Master Deployment Guide - Complete Walkthrough

**One guide to rule them all!** Follow this guide from start to finish for successful AWS deployment.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: AWS Setup](#step-1-aws-setup)
3. [Step 2: GitHub Setup (Optional but Recommended)](#step-2-github-setup-optional-but-recommended)
4. [Step 3: Deploy Backend](#step-3-deploy-backend)
5. [Step 4: Deploy Frontend](#step-4-deploy-frontend)
6. [Step 5: Verify Deployment](#step-5-verify-deployment)
7. [Step 6: Setup GitHub CI/CD (Optional)](#step-6-setup-github-cicd-optional)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required
- ✅ AWS account (free tier eligible)
- ✅ AWS CLI installed (`aws --version`)
- ✅ SSH key pair for EC2
- ✅ Basic terminal knowledge

### Optional (for CI/CD)
- ✅ GitHub account
- ✅ Git installed

---

## Step 1: AWS Setup

### 1.1 Create RDS PostgreSQL Database

1. **Go to**: AWS Console → RDS → Create database
2. **Settings**:
   - Engine: PostgreSQL 15.x
   - Template: Free tier
   - DB instance identifier: `elevate-edu-db`
   - Master username: `elevate_admin`
   - Master password: `[Create strong password - SAVE THIS!]`
   - Instance class: `db.t2.micro`
   - Storage: 20 GB
   - Public access: **YES**
   - Database name: `elevate_edu`
   - Backup: Disable (or 7-day retention)

3. **Wait**: 5-10 minutes for database to be available
4. **Save**: Endpoint URL, port (5432), username, password

### 1.2 Create EC2 Instance

1. **Go to**: AWS Console → EC2 → Launch Instance
2. **Settings**:
   - Name: `elevate-edu-backend`
   - AMI: Ubuntu Server 22.04 LTS
   - Instance type: `t2.micro`
   - Key pair: Create new or use existing
   - Network settings:
     - Allow HTTP (port 80)
     - Allow HTTPS (port 443)
     - Allow Custom TCP (port 8000)
     - Allow SSH (port 22) - Restrict to your IP
   - Storage: 8 GB

3. **User Data** (Optional): Paste contents of `scripts/ec2-user-data.sh`
4. **Launch**: Wait for instance to be running
5. **Save**: Public IP address, Public DNS name

### 1.3 Configure Security Groups

#### Backend Security Group
- **Inbound Rules**:
  - HTTP (80) from 0.0.0.0/0
  - HTTPS (443) from 0.0.0.0/0
  - Custom TCP (8000) from 0.0.0.0/0
  - SSH (22) from YOUR_IP/32

#### RDS Security Group
- **Inbound Rules**:
  - PostgreSQL (5432) from Backend Security Group

### 1.4 Create S3 Bucket

1. **Go to**: AWS Console → S3 → Create bucket
2. **Settings**:
   - Bucket name: `elevate-edu-frontend-[unique-id]` (must be globally unique)
   - Region: Same as EC2/RDS
   - Block Public Access: **Uncheck** (we need public access)
   - Versioning: Disable

3. **Configure**:
   - **Bucket Policy**: Add public read policy (see AWS_DEPLOYMENT_GUIDE.md)
   - **Static Website Hosting**: Enable
     - Index document: `index.html`
     - Error document: `index.html`

4. **Save**: Bucket name

### 1.5 Create CloudFront Distribution

1. **Go to**: AWS Console → CloudFront → Create Distribution
2. **Settings**:
   - Origin Domain: Select your S3 bucket
   - Viewer Protocol: Redirect HTTP to HTTPS
   - Default Root Object: `index.html`
   - Price Class: Use only North America and Europe

3. **Wait**: 10-15 minutes for distribution to deploy
4. **Save**: CloudFront URL (e.g., `d1234567890.cloudfront.net`)

---

## Step 2: GitHub Setup (Optional but Recommended)

### 2.1 Create GitHub Repository

1. **Go to**: GitHub → New repository
2. **Settings**:
   - Name: `elevate-edu-ui`
   - Visibility: Private (recommended)
   - Don't initialize with README

3. **Copy**: Repository URL

### 2.2 Push Code to GitHub

```bash
# In your project directory
cd /path/to/elevate-edu-ui

# Initialize git (if not done)
git init
git remote add origin https://github.com/your-username/elevate-edu-ui.git

# Add all files
git add .

# Commit
git commit -m "Initial commit: Elevate Edu application"

# Push
git push -u origin main
```

### 2.3 Setup GitHub Secrets (For CI/CD)

**Go to**: Repository → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `AWS_ACCESS_KEY_ID` | Your AWS access key |
| `AWS_SECRET_ACCESS_KEY` | Your AWS secret key |
| `AWS_REGION` | Your AWS region (e.g., `us-east-1`) |
| `EC2_HOST` | EC2 public IP or DNS |
| `EC2_USER` | `ubuntu` |
| `EC2_SSH_KEY` | Your EC2 SSH private key (entire content) |
| `RDS_ENDPOINT` | RDS endpoint URL |
| `RDS_PASSWORD` | RDS password |
| `SECRET_KEY` | Generate with: `openssl rand -hex 32` |
| `S3_BUCKET_NAME` | Your S3 bucket name |
| `CLOUDFRONT_DISTRIBUTION_ID` | CloudFront distribution ID |

### 2.4 Copy GitHub Workflows

```bash
# Copy workflow files
cp aws-deployment/workflows/*.yml .github/workflows/

# Commit and push
git add .github/
git commit -m "Add GitHub Actions workflows"
git push origin main
```

---

## Step 3: Deploy Backend

### Option A: Manual Deployment (First Time)

1. **SSH into EC2**:
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

2. **Upload deployment script**:
```bash
# On your local machine
scp -i your-key.pem aws-deployment/scripts/deploy-backend.sh ubuntu@your-ec2-ip:~/
```

3. **Run deployment script**:
```bash
# On EC2
chmod +x deploy-backend.sh
./deploy-backend.sh
```

4. **When prompted**:
   - Enter Git repository URL (if using GitHub)
   - Or skip if deploying manually
   - Configure `.env` file with:
     - Database URL
     - Secret Key
     - CORS Origins

5. **Verify**:
```bash
# Check service status
sudo systemctl status elevate-edu-backend

# Check logs
sudo journalctl -u elevate-edu-backend -f

# Test API
curl http://localhost:8000/health
```

### Option B: GitHub CI/CD (After Setup)

1. **Push to main branch**:
```bash
git checkout main
git merge develop  # or your feature branch
git push origin main
```

2. **Monitor**: GitHub → Actions tab
3. **Verify**: Backend deploys automatically

---

## Step 4: Deploy Frontend

### Option A: Manual Deployment

1. **On your local machine**:
```bash
# Make script executable
chmod +x aws-deployment/scripts/deploy-frontend.sh

# Run script
./aws-deployment/scripts/deploy-frontend.sh
```

2. **When prompted**:
   - S3 Bucket Name
   - EC2 Backend IP
   - CloudFront Distribution ID (optional)

3. **Script will**:
   - Build frontend
   - Upload to S3
   - Invalidate CloudFront cache

### Option B: GitHub CI/CD (After Setup)

1. **Push frontend changes to main**:
```bash
git add src/
git commit -m "Update frontend"
git push origin main
```

2. **Monitor**: GitHub → Actions tab
3. **Verify**: Frontend deploys automatically

---

## Step 5: Verify Deployment

### 5.1 Test Backend

```bash
# Health check
curl http://your-ec2-ip:8000/health

# API docs
curl http://your-ec2-ip:8000/api/docs

# Test endpoint
curl http://your-ec2-ip:8000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 5.2 Test Frontend

1. **Visit**: `https://your-cloudfront-url.cloudfront.net`
2. **Verify**: Frontend loads correctly
3. **Test**: Login functionality
4. **Test**: All features work

### 5.3 Test Code Execution

1. **Go to**: Coding Practice section
2. **Select**: A problem
3. **Write code**: Test Python/C/C++/Java/JavaScript
4. **Run**: Verify code executes
5. **Submit**: Verify submission works

---

## Step 6: Setup GitHub CI/CD (Optional)

### 6.1 Already Done If You Followed Step 2

If you already:
- ✅ Created GitHub repository
- ✅ Added secrets
- ✅ Copied workflows

Then CI/CD is ready! Just push to `main` branch.

### 6.2 Daily Workflow

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes
# ... edit files ...

# 3. Commit
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature

# 4. Create Pull Request on GitHub
# 5. After review, merge to main
# 6. Automatic deployment happens!
```

---

## Troubleshooting

### Backend Not Starting

```bash
# SSH into EC2
ssh -i key.pem ubuntu@ec2-ip

# Check service status
sudo systemctl status elevate-edu-backend

# View logs
sudo journalctl -u elevate-edu-backend -f

# Check database connection
python3 -c "from app.core.database import engine; engine.connect()"

# Restart service
sudo systemctl restart elevate-edu-backend
```

### Frontend Not Loading

1. **Check S3 bucket**:
   - Verify files are uploaded
   - Check bucket permissions
   - Verify static website hosting is enabled

2. **Check CloudFront**:
   - Verify distribution status is "Deployed"
   - Check origin configuration
   - Clear browser cache

3. **Check CORS**:
   - Verify backend CORS includes CloudFront URL
   - Check browser console for errors

### Database Connection Failed

1. **Verify security group**:
   - RDS allows PostgreSQL from EC2 security group

2. **Check connection string**:
   - Verify endpoint is correct
   - Check username/password
   - Test connection manually:
```bash
psql -h endpoint -U username -d elevate_edu
```

### GitHub Actions Failing

1. **Check secrets**:
   - Verify all secrets are added correctly
   - Check secret values are correct

2. **Check logs**:
   - Go to Actions tab
   - Click on failed workflow
   - Review error messages

3. **Common issues**:
   - SSH key format incorrect
   - EC2 host unreachable
   - AWS credentials invalid

---

## 📚 Additional Resources

- **Detailed Guide**: `../AWS_DEPLOYMENT_GUIDE.md`
- **Technical Details**: `../TECHNICAL_CONSIDERATIONS_AWS.md`
- **GitHub CI/CD**: `../GITHUB_CI_CD_GUIDE.md`
- **API Testing**: `../POSTMAN_API_GUIDE.md`

---

## ✅ Success Checklist

- [ ] RDS database created and accessible
- [ ] EC2 instance running
- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] CloudFront distribution working
- [ ] All features tested and working
- [ ] GitHub CI/CD setup (optional)
- [ ] Monitoring configured (optional)

---

## 🎉 You're Done!

Your application should now be live at:
**https://your-cloudfront-url.cloudfront.net**

### Next Steps

1. ✅ Test all features
2. ✅ Set up monitoring (CloudWatch)
3. ✅ Configure backups
4. ✅ Add custom domain (optional)
5. ✅ Set up alerts

---

**Need Help?** Check the troubleshooting section or review the detailed guides.

**Last Updated**: 2024

