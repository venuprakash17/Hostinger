/**
 * Free ATS (Applicant Tracking System) Analyzer
 * No API required - Client-side rule-based analysis
 */

export interface ATSAnalysis {
  overallScore: number;
  categoryScores: {
    format: number;
    keywords: number;
    experience: number;
    skills: number;
    contact: number;
    readability: number;
  };
  strengths: string[];
  improvements: string[];
  missingKeywords: string[];
  recommendations: string[];
}

interface ResumeSection {
  name: string;
  present: boolean;
  quality: number; // 0-1
}

/**
 * Extract sections from resume text
 */
function extractSections(resumeText: string): ResumeSection[] {
  const text = resumeText.toLowerCase();
  const sections: ResumeSection[] = [];

  // Common section patterns
  const sectionPatterns = [
    { name: 'Contact Information', patterns: ['contact', 'phone', 'email', 'address', 'linkedin', 'github'] },
    { name: 'Professional Summary', patterns: ['summary', 'objective', 'profile', 'about'] },
    { name: 'Education', patterns: ['education', 'academic', 'university', 'degree', 'bachelor', 'master'] },
    { name: 'Experience', patterns: ['experience', 'employment', 'work history', 'career', 'position'] },
    { name: 'Projects', patterns: ['projects', 'project', 'portfolio', 'work samples'] },
    { name: 'Skills', patterns: ['skills', 'technical skills', 'competencies', 'expertise'] },
    { name: 'Certifications', patterns: ['certifications', 'certificates', 'credentials'] },
    { name: 'Achievements', patterns: ['achievements', 'awards', 'accomplishments', 'honors'] },
  ];

  sectionPatterns.forEach(({ name, patterns }) => {
    const found = patterns.some(pattern => text.includes(pattern));
    if (found) {
      // Check quality based on content length and keywords
      const sectionText = extractSectionText(resumeText, patterns);
      const quality = calculateSectionQuality(sectionText);
      sections.push({ name, present: true, quality });
    } else {
      sections.push({ name, present: false, quality: 0 });
    }
  });

  return sections;
}

function extractSectionText(resumeText: string, patterns: string[]): string {
  const lines = resumeText.split('\n');
  let sectionStart = -1;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    if (patterns.some(pattern => line.includes(pattern) && line.length < 50)) {
      sectionStart = i;
      break;
    }
  }
  
  if (sectionStart === -1) return '';
  
  // Extract section content (next 10-20 lines or until next section header)
  const sectionLines: string[] = [];
  for (let i = sectionStart + 1; i < Math.min(sectionStart + 20, lines.length); i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Stop at next section header (all caps or short lines with keywords)
    if (line.length < 30 && /^[A-Z\s]+$/.test(line)) break;
    sectionLines.push(line);
  }
  
  return sectionLines.join(' ');
}

function calculateSectionQuality(text: string): number {
  if (!text || text.length < 20) return 0.3;
  if (text.length < 50) return 0.5;
  if (text.length < 100) return 0.7;
  
  // Check for quantifiable metrics
  const hasMetrics = /\d+%|\d+\+|\d+\s*(users|requests|years|months)|increased|decreased|improved|reduced/i.test(text);
  if (hasMetrics) return Math.min(1.0, 0.8 + (text.length / 500));
  
  return Math.min(1.0, 0.6 + (text.length / 1000));
}

/**
 * Extract technical keywords from resume
 */
function extractKeywords(resumeText: string, jobDescription?: string): {
  found: string[];
  missing: string[];
  score: number;
} {
  const text = resumeText.toLowerCase();
  
  // Common technical keywords (categories)
  const keywordCategories = {
    programming: ['python', 'javascript', 'java', 'c++', 'typescript', 'go', 'rust', 'php', 'ruby', 'swift', 'kotlin'],
    web: ['react', 'vue', 'angular', 'node.js', 'express', 'html', 'css', 'rest api', 'graphql', 'next.js'],
    databases: ['sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'oracle', 'sqlite'],
    cloud: ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ci/cd'],
    tools: ['git', 'github', 'gitlab', 'jenkins', 'jira', 'agile', 'scrum'],
    ml_ai: ['machine learning', 'deep learning', 'tensorflow', 'pytorch', 'nlp', 'data science'],
    mobile: ['react native', 'flutter', 'ios', 'android', 'mobile development'],
  };

  const found: string[] = [];
  const allKeywords: string[] = [];
  
  Object.values(keywordCategories).flat().forEach(keyword => {
    allKeywords.push(keyword);
    if (text.includes(keyword.toLowerCase())) {
      found.push(keyword);
    }
  });

  // If job description provided, extract keywords from it
  const jobKeywords: string[] = [];
  if (jobDescription) {
    const jobText = jobDescription.toLowerCase();
    allKeywords.forEach(keyword => {
      if (jobText.includes(keyword.toLowerCase()) && !found.includes(keyword)) {
        jobKeywords.push(keyword);
      }
    });
  }

  // Calculate score: % of found keywords
  const score = Math.min(25, (found.length / allKeywords.length) * 25);

  return {
    found,
    missing: jobDescription ? jobKeywords : [],
    score,
  };
}

/**
 * Analyze contact information
 */
function analyzeContact(resumeText: string): { present: boolean; score: number; details: string[] } {
  const text = resumeText.toLowerCase();
  const details: string[] = [];
  let score = 0;

  const checks = [
    { pattern: /\b[\w\.-]+@[\w\.-]+\.\w+\b/, name: 'Email', points: 3 },
    { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\+\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/, name: 'Phone', points: 3 },
    { pattern: /linkedin\.com/, name: 'LinkedIn', points: 2 },
    { pattern: /github\.com/, name: 'GitHub', points: 2 },
    { pattern: /\b\d{5}\b|\b[A-Z]{2}\s+\d{5}\b/, name: 'Address', points: 0 }, // Optional
  ];

  checks.forEach(({ pattern, name, points }) => {
    if (pattern.test(resumeText)) {
      details.push(name);
      score += points;
    }
  });

  return {
    present: score >= 3,
    score: Math.min(10, score),
    details,
  };
}

/**
 * Analyze format and structure
 */
function analyzeFormat(resumeText: string, sections: ResumeSection[]): number {
  let score = 0;

  // Check for essential sections (max 12 points)
  const essentialSections = ['Contact Information', 'Education', 'Skills'];
  essentialSections.forEach(sectionName => {
    const section = sections.find(s => s.name === sectionName);
    if (section?.present) {
      score += 4 * section.quality;
    }
  });

  // Check for recommended sections (max 8 points)
  const recommendedSections = ['Professional Summary', 'Experience', 'Projects'];
  recommendedSections.forEach(sectionName => {
    const section = sections.find(s => s.name === sectionName);
    if (section?.present) {
      score += (8 / recommendedSections.length) * section.quality;
    }
  });

  // Check formatting quality (max 5 points)
  const lines = resumeText.split('\n');
  const hasBullets = resumeText.includes('•') || resumeText.includes('-') || resumeText.includes('*');
  const hasNumbers = /\d+\./.test(resumeText);
  const hasConsistentSpacing = lines.filter(l => l.trim().length > 0).length > 10;
  
  if (hasBullets || hasNumbers) score += 2;
  if (hasConsistentSpacing) score += 3;

  return Math.min(20, score);
}

/**
 * Analyze experience and achievements
 */
function analyzeExperience(resumeText: string): number {
  let score = 0;
  const text = resumeText.toLowerCase();

  // Check for quantifiable metrics (max 10 points)
  const metrics = [
    /\d+%/, // Percentages
    /\d+\+/, // Numbers with +
    /\bincreased\b|\bdecreased\b|\bimproved\b|\breduced\b/i, // Action words with metrics context
    /\d+\s*(users|requests|queries|transactions|views|downloads)/i,
    /\b\d+\s*(years?|months?)\s*(of|experience)/i,
  ];

  let metricCount = 0;
  metrics.forEach(pattern => {
    if (pattern.test(resumeText)) {
      metricCount++;
    }
  });

  score += Math.min(10, metricCount * 2);

  // Check for action verbs (max 5 points)
  const actionVerbs = [
    'developed', 'created', 'built', 'designed', 'implemented', 'led', 'managed',
    'optimized', 'improved', 'increased', 'reduced', 'architected', 'engineered'
  ];
  
  const verbCount = actionVerbs.filter(verb => text.includes(verb)).length;
  score += Math.min(5, verbCount * 0.5);

  // Check for project/experience details (max 5 points)
  const hasProjects = /project|experience|work|employment/i.test(text);
  const hasDuration = /\d{4}\s*[-–]\s*\d{4}|present|current/i.test(text);
  
  if (hasProjects) score += 2;
  if (hasDuration) score += 3;

  return Math.min(20, score);
}

/**
 * Analyze skills section
 */
function analyzeSkills(resumeText: string): number {
  let score = 0;
  const text = resumeText.toLowerCase();

  // Count technical skills (max 10 points)
  const skillKeywords = [
    'python', 'javascript', 'java', 'react', 'node.js', 'sql', 'html', 'css',
    'aws', 'docker', 'git', 'mongodb', 'postgresql', 'express', 'typescript'
  ];

  const foundSkills = skillKeywords.filter(skill => text.includes(skill)).length;
  score += Math.min(10, foundSkills * 0.67);

  // Check for skills organization (max 5 points)
  const hasSkillsSection = /skills?:|technical\s+skills?:/i.test(resumeText);
  const hasSkillCategories = /programming|frontend|backend|database|tools|cloud/i.test(text);
  
  if (hasSkillsSection) score += 3;
  if (hasSkillCategories) score += 2;

  return Math.min(15, score);
}

/**
 * Analyze readability
 */
function analyzeReadability(resumeText: string): number {
  let score = 10; // Start with full points

  const lines = resumeText.split('\n');
  const avgLineLength = resumeText.length / lines.length;

  // Check for too long lines (penalty)
  const longLines = lines.filter(line => line.length > 80).length;
  score -= Math.min(2, longLines * 0.1);

  // Check for proper spacing
  const hasProperSpacing = lines.some((line, i) => {
    const isEmpty = line.trim().length === 0;
    const prevIsEmpty = i > 0 && lines[i - 1].trim().length === 0;
    return isEmpty && !prevIsEmpty;
  });
  if (!hasProperSpacing && lines.length > 20) score -= 2;

  // Check for consistency in formatting
  const hasConsistentFormatting = !(/\t/.test(resumeText) && /  +/.test(resumeText));
  if (!hasConsistentFormatting) score -= 1;

  return Math.max(0, Math.min(10, score));
}

/**
 * Generate recommendations
 */
function generateRecommendations(analysis: Partial<ATSAnalysis>, sections: ResumeSection[], keywords: any): string[] {
  const recommendations: string[] = [];

  if (analysis.categoryScores) {
    if (analysis.categoryScores.contact < 7) {
      recommendations.push("Add complete contact information including email, phone, and LinkedIn profile");
    }

    if (analysis.categoryScores.format < 15) {
      const missingSections = sections.filter(s => !s.present).map(s => s.name);
      if (missingSections.length > 0) {
        recommendations.push(`Add missing sections: ${missingSections.slice(0, 3).join(', ')}`);
      }
    }

    if (analysis.categoryScores.keywords < 15) {
      recommendations.push(`Include more technical keywords relevant to your field`);
      if (keywords.missing.length > 0) {
        recommendations.push(`Consider adding: ${keywords.missing.slice(0, 5).join(', ')}`);
      }
    }

    if (analysis.categoryScores.experience < 12) {
      recommendations.push("Add quantifiable achievements with numbers, percentages, and metrics");
      recommendations.push("Use strong action verbs (Developed, Architected, Optimized, etc.)");
    }

    if (analysis.categoryScores.skills < 10) {
      recommendations.push("Expand your skills section with more technical skills and tools");
      recommendations.push("Organize skills by category (Programming, Tools, Frameworks)");
    }

    if (analysis.categoryScores.readability < 7) {
      recommendations.push("Improve formatting with consistent spacing and bullet points");
      recommendations.push("Keep line length under 80 characters for better readability");
    }
  }

  // General recommendations
  if (analysis.overallScore && analysis.overallScore < 70) {
    recommendations.push("Review all sections for completeness and professional language");
    recommendations.push("Add more specific details and achievements to each section");
  }

  return recommendations.slice(0, 8); // Limit to 8 recommendations
}

/**
 * Main ATS analysis function
 */
export function analyzeATS(resumeText: string, jobDescription?: string): ATSAnalysis {
  if (!resumeText || resumeText.trim().length < 50) {
    return {
      overallScore: 0,
      categoryScores: {
        format: 0,
        keywords: 0,
        experience: 0,
        skills: 0,
        contact: 0,
        readability: 0,
      },
      strengths: [],
      improvements: ["Resume text is too short or empty"],
      missingKeywords: [],
      recommendations: ["Please provide complete resume text for analysis"],
    };
  }

  // Extract sections
  const sections = extractSections(resumeText);

  // Analyze each category
  const formatScore = analyzeFormat(resumeText, sections);
  const keywords = extractKeywords(resumeText, jobDescription);
  const experienceScore = analyzeExperience(resumeText);
  const skillsScore = analyzeSkills(resumeText);
  const contactInfo = analyzeContact(resumeText);
  const readabilityScore = analyzeReadability(resumeText);

  const categoryScores = {
    format: Math.round(formatScore),
    keywords: Math.round(keywords.score),
    experience: Math.round(experienceScore),
    skills: Math.round(skillsScore),
    contact: Math.round(contactInfo.score),
    readability: Math.round(readabilityScore),
  };

  // Calculate overall score
  const overallScore = Math.round(
    Object.values(categoryScores).reduce((sum, score) => sum + score, 0)
  );

  // Generate strengths
  const strengths: string[] = [];
  if (contactInfo.present) {
    strengths.push("Complete contact information provided");
  }
  if (sections.filter(s => s.present).length >= 5) {
    strengths.push("Well-organized with multiple sections");
  }
  if (keywords.found.length >= 10) {
    strengths.push(`Strong keyword presence (${keywords.found.length} technical terms found)`);
  }
  if (experienceScore >= 15) {
    strengths.push("Quantifiable achievements and metrics included");
  }
  if (readabilityScore >= 8) {
    strengths.push("Good readability and formatting");
  }

  // Generate improvements
  const improvements: string[] = [];
  if (categoryScores.format < 15) {
    improvements.push("Missing or incomplete sections - add all essential resume sections");
  }
  if (categoryScores.keywords < 15) {
    improvements.push(`Low keyword density - add more relevant technical terms (${keywords.found.length} found)`);
  }
  if (categoryScores.experience < 12) {
    improvements.push("Add more quantifiable achievements and metrics");
  }
  if (categoryScores.skills < 10) {
    improvements.push("Expand skills section with more technical skills");
  }
  if (categoryScores.contact < 7) {
    improvements.push("Complete contact information (email, phone, LinkedIn)");
  }

  const recommendations = generateRecommendations(
    { overallScore, categoryScores },
    sections,
    keywords
  );

  return {
    overallScore,
    categoryScores,
    strengths: strengths.length > 0 ? strengths : ["Resume structure is good"],
    improvements: improvements.length > 0 ? improvements : ["Minor improvements can be made"],
    missingKeywords: keywords.missing.slice(0, 10),
    recommendations,
  };
}

