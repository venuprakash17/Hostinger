# Interview Rounds Implementation

## Overview

The AI Mock Interview feature now supports **three interview rounds** with a cost-efficient AI strategy:
- **HR Round**: Behavioral and cultural fit questions
- **Technical Round**: Programming, algorithms, and technical skills
- **Managerial Round**: Leadership, team management, and strategic thinking

## Cost-Efficient AI Strategy

### Question Generation (Better Quality)
- **Primary**: OpenAI GPT-4o-mini ($0.15/1M input tokens, $0.60/1M output tokens)
  - High-quality, realistic questions
  - Company-specific and round-specific
  - Cost: ~$0.01-0.02 per interview (12-18 questions)
- **Fallback**: Ollama (FREE)
  - Used if OpenAI is not configured or fails
  - Still generates good questions

### Answer Analysis (Free)
- **Primary**: Ollama (FREE)
  - Comprehensive answer analysis
  - Detailed feedback and scoring
  - No cost per analysis

### Cost Breakdown
- **With OpenAI**: ~$0.01-0.02 per interview (question generation only)
- **Without OpenAI**: $0.00 (fully free with Ollama)
- **Answer Analysis**: Always FREE (Ollama)

## Implementation Details

### Frontend Changes

1. **Setup Screen** (`src/components/mock-interview/SetupScreen.tsx`)
   - Added "Interview Round" dropdown
   - Options: HR Round, Technical Round, Managerial Round
   - Round selection is required

2. **Welcome Screen** (`src/components/mock-interview/InterviewWelcome.tsx`)
   - Displays selected interview round
   - Shows round type in interview details

3. **Main Page** (`src/pages/MockInterviewAI.tsx`)
   - Passes interview round to backend
   - Maintains round context throughout interview

### Backend Changes

1. **API Endpoints** (`backend/app/api/mock_interview_ai.py`)
   - `POST /mock-interview-ai/start`: Accepts `interview_round` parameter
   - `POST /mock-interview-ai/generate-question`: Accepts `interview_round` parameter

2. **Question Service** (`backend/app/services/interview_questions_service.py`)
   - `_generate_questions_with_openai()`: OpenAI-based question generation
   - `get_company_interview_questions()`: Main function with OpenAI → Ollama fallback
   - Round-specific question templates and prompts
   - Default questions for each round type

## Round-Specific Questions

### HR Round
- Behavioral questions (STAR method)
- Cultural fit and motivation
- Communication skills
- Teamwork and conflict resolution
- Salary expectations, notice period
- Resume and background questions

### Technical Round
- Programming languages and frameworks
- Data structures and algorithms
- System design (for experienced candidates)
- Database and SQL
- Problem-solving and debugging
- Projects and technical achievements
- Technology trends

### Managerial Round
- Leadership style and experience
- Team management and delegation
- Conflict resolution
- Strategic thinking and planning
- Decision-making in complex situations
- Mentoring and coaching
- Business impact and metrics

## Configuration

### OpenAI (Optional - for better questions)
```bash
# In backend/.env
OPENAI_API_KEY=your_openai_api_key_here
```

### Ollama (Required - for answer analysis)
```bash
# Install and start Ollama
ollama serve
ollama pull llama3.2:3b
```

## Usage

1. **Select Interview Round**:
   - Choose HR, Technical, or Managerial round in setup screen

2. **Question Generation**:
   - System tries OpenAI first (if configured)
   - Falls back to Ollama if OpenAI unavailable
   - Questions are tailored to selected round

3. **Answer Analysis**:
   - Always uses Ollama (free)
   - Provides detailed feedback and scoring

## Cost Optimization Tips

1. **Use OpenAI for Questions** (Recommended):
   - Better quality questions
   - Very low cost (~$0.01-0.02 per interview)
   - More realistic and company-specific

2. **Use Ollama Only** (Fully Free):
   - No API costs
   - Still generates good questions
   - Perfect for development/testing

3. **Hybrid Approach** (Current Implementation):
   - OpenAI for questions (better quality)
   - Ollama for analysis (free)
   - Best of both worlds

## Testing

1. **Test HR Round**:
   ```bash
   # Start interview with HR round selected
   # Verify behavioral questions are generated
   ```

2. **Test Technical Round**:
   ```bash
   # Start interview with Technical round selected
   # Verify technical questions are generated
   ```

3. **Test Managerial Round**:
   ```bash
   # Start interview with Managerial round selected
   # Verify leadership/management questions are generated
   ```

## Future Enhancements

1. **Multi-Round Interviews**: Support for multiple rounds in one session
2. **Round-Specific Analysis**: Tailor feedback based on round type
3. **Question Difficulty**: Adjust based on experience level and round
4. **Custom Rounds**: Allow users to create custom round types

## Troubleshooting

### OpenAI Not Working
- Check `OPENAI_API_KEY` in environment variables
- Verify API key is valid and has credits
- System will automatically fall back to Ollama

### Ollama Not Working
- Ensure Ollama is running: `ollama serve`
- Check model is installed: `ollama list`
- Install model if needed: `ollama pull llama3.2:3b`

### Questions Not Round-Specific
- Verify `interview_round` parameter is being passed
- Check backend logs for round value
- Ensure question service is using round parameter
