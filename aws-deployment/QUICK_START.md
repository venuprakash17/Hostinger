# ⚡ Quick Start - 5 Minute Setup

Fastest way to deploy Elevate Edu to AWS.

## 🚀 Prerequisites

- AWS account
- AWS CLI configured (`aws configure`)
- GitHub account (optional)

## 📝 Steps

### 1. Create AWS Resources (15 min)

Follow `MASTER_DEPLOYMENT_GUIDE.md` Step 1:
- Create RDS database
- Create EC2 instance
- Create S3 bucket
- Create CloudFront distribution

### 2. Deploy Backend (5 min)

```bash
# SSH into EC2
ssh -i key.pem ubuntu@ec2-ip

# Upload and run script
scp scripts/deploy-backend.sh ubuntu@ec2-ip:~/
ssh -i key.pem ubuntu@ec2-ip
chmod +x deploy-backend.sh
./deploy-backend.sh
```

### 3. Deploy Frontend (5 min)

```bash
# On local machine
cd /path/to/elevate-edu-ui
chmod +x scripts/deploy-frontend.sh
./scripts/deploy-frontend.sh
```

### 4. Verify (2 min)

- Visit: `https://your-cloudfront-url.cloudfront.net`
- Test login
- Test features

## ✅ Done!

**For detailed instructions**: See `MASTER_DEPLOYMENT_GUIDE.md`

