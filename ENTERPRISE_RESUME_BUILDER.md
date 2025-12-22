# 🚀 Enterprise-Grade AI Resume Builder

## Overview

A world-class, AI-powered resume builder built with free and open-source technologies, designed to help students and freshers create interview-winning, ATS-optimized resumes.

---

## ✨ Key Features

### 🤖 Advanced AI Optimization (Using Ollama - Free & Open-Source)

1. **Premium Resume Optimization**
   - Industry-specific optimization (Software Engineering, Data Science, Web Development, etc.)
   - Multiple optimization levels (Basic, Standard, Advanced, Premium)
   - Automatic industry detection
   - Context-aware enhancements

2. **Skill Gap Analysis**
   - Identifies missing critical skills
   - Provides learning resource recommendations
   - Skill gap scoring (0-100)
   - Actionable improvement suggestions

3. **Career Insights**
   - Career level assessment (entry/junior/mid)
   - Recommended roles and career paths
   - Market value estimation
   - Growth area identification

4. **Intelligent Keyword Extraction**
   - Extracts must-have vs nice-to-have skills
   - Technology stack identification
   - Keyword matching with resume
   - Priority keyword recommendations

5. **ATS Scoring**
   - Comprehensive 100-point scoring system
   - Section-wise breakdown
   - Missing keyword identification
   - Strengths and improvements analysis

---

## 🎨 Professional Templates

### Current Templates (5):
1. **Fresher Classic** - Safe default for mass applications
2. **Project-Focused** - Best for tech freshers with strong projects
3. **Skills-First** - For students with strong skills/certifications
4. **Internship-Oriented** - Showcases internships and hands-on experience
5. **Minimal ATS Pro** - Maximum ATS compatibility

### Template Features:
- ATS-friendly design (single column, no graphics)
- Print-ready PDF generation
- Live preview with real-time updates
- One-page optimization
- Professional typography and spacing

---

## 🛠️ Tech Stack (100% Free & Open-Source)

### Backend:
- **FastAPI** - Modern Python web framework
- **Ollama** - Free, local LLM (supports llama3.1, mistral, codellama)
- **SQLAlchemy** - Database ORM
- **Pydantic** - Data validation
- **@react-pdf/renderer** - PDF generation

### Frontend:
- **React + TypeScript** - Modern UI framework
- **Tailwind CSS** - Utility-first CSS
- **Shadcn UI** - High-quality component library
- **Vite** - Fast build tool

### AI Models Supported:
- llama3.1:8b (Best quality)
- mistral:7b (Fast, good quality)
- llama3.2:3b (Fastest)
- llama3.2:1b (Ultra-fast)

---

## 📋 API Endpoints

### Core Endpoints:

1. **POST /resume/optimize**
   - Premium AI optimization
   - Industry detection
   - Multi-level optimization
   - Returns: Optimized resume + improvements list

2. **POST /resume/ats-score**
   - Comprehensive ATS scoring (0-100)
   - Section breakdown
   - Recommendations
   - Missing keywords

3. **POST /resume/skill-gap-analysis**
   - Analyzes skills vs target role
   - Provides learning resources
   - Skill gap score
   - Actionable recommendations

4. **POST /resume/career-insights**
   - Career path recommendations
   - Market value estimation
   - Growth areas
   - Recommended next roles

5. **POST /resume/extract-keywords**
   - Intelligent keyword extraction
   - Categorization (must-have, nice-to-have)
   - Keyword matching
   - Priority recommendations

6. **POST /resume/detect-industry**
   - Automatic industry detection
   - Industry-specific optimization hints

7. **POST /resume/generate-pdf**
   - PDF generation from optimized resume
   - Template-based rendering
   - ATS-safe formatting

---

## 🎯 Optimization Strategy

### Premium AI Optimization Process:

1. **Industry Detection**
   - Analyzes resume + job description
   - Detects target industry
   - Applies industry-specific keywords

2. **Content Enhancement**
   - Rewrites bullets with strong action verbs
   - Adds quantifiable metrics
   - Improves professional language
   - Maintains 100% truthfulness

3. **Keyword Optimization**
   - Matches job description keywords
   - Natural integration (no keyword stuffing)
   - Industry-standard terminology

4. **Structure Optimization**
   - ATS-friendly formatting
   - Logical section ordering
   - Consistent styling
   - One-page optimization

---

## 📊 ATS Scoring System

### Scoring Criteria (100 points):

1. **Personal Information** (10 points)
   - Complete contact info
   - Professional online presence

2. **Education** (15 points)
   - Complete entries
   - CGPA/percentage
   - Field of study

3. **Experience/Projects** (30 points) - Highest Weight
   - Substantial projects/experience
   - Detailed descriptions
   - Strong action verbs
   - Quantifiable achievements

4. **Skills** (20 points)
   - Comprehensive skill list (15+ skills)
   - Proper categorization
   - Technical + soft skills

5. **Keyword Matching** (20 points)
   - Exact keyword matches
   - Related/synonym matches
   - Industry terminology

6. **Additional Sections** (5 points)
   - Certifications
   - Achievements
   - Extracurricular

---

## 🔧 Setup Instructions

### Prerequisites:
1. Python 3.9+
2. Node.js 18+
3. Ollama installed and running

### Install Ollama:
```bash
# macOS/Linux
curl -fsSL https://ollama.com/install.sh | sh

# Pull recommended model
ollama pull llama3.1:8b
# Or for faster performance
ollama pull mistral:7b
```

### Backend Setup:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Setup:
```bash
npm install
npm run dev
```

### Environment Variables:
```bash
# Backend (.env)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

# Frontend (.env)
VITE_API_BASE_URL=http://localhost:8000
```

---

## 🎓 Best Practices for Students

### Resume Optimization Tips:

1. **Quantify Everything**
   - Use numbers, percentages, scale metrics
   - Show impact, not just responsibilities

2. **Strong Action Verbs**
   - Use: Architected, Engineered, Optimized, Developed
   - Avoid: Worked on, Helped with, Did, Made

3. **Keyword Matching**
   - Match job description terminology exactly
   - Include variations and acronyms
   - Industry-specific keywords

4. **Project Descriptions**
   - 3-5 sentence professional descriptions
   - 6-8 bullet points with metrics
   - Show problem-solving and impact

5. **Skills Section**
   - 15-25 technical skills
   - Categorized properly
   - Match project technologies

---

## 🚀 Future Enhancements

### Planned Features:
1. **10+ Premium Templates**
   - Industry-specific templates
   - Creative variations
   - International formats

2. **Resume Versioning**
   - Save multiple versions
   - Compare versions
   - A/B testing

3. **Cover Letter Generator**
   - AI-powered cover letters
   - Role-specific customization

4. **Interview Preparation**
   - Question generation
   - Answer suggestions
   - Mock interview practice

5. **Analytics Dashboard**
   - Resume performance tracking
   - ATS score trends
   - Application success rates

---

## 📝 License

This project is built with free and open-source technologies. All AI processing is done locally using Ollama (no API costs).

---

## 🤝 Contributing

Contributions are welcome! This is an open-source project built to help students and freshers create better resumes.

---

## 📞 Support

For issues, questions, or feature requests, please open an issue on the repository.

---

**Built with ❤️ for students and freshers worldwide**

