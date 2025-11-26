/**
 * Role-Based Resume Tailorer
 * Tailors resumes for specific job roles and provides suggestions
 */

interface ResumeData {
  profile: any;
  education: any[];
  projects?: any[];
  skills?: any[];
  certifications?: any[];
  achievements?: any[];
  extracurricular?: any[];
  hobbies?: any[];
}

interface RoleTailoredResume {
  summary: string;
  tailoredProjects: any[];
  tailoredSkills: any;
  recommendations: string[];
  suggestedProjects: string[];
  suggestedSkills: string[];
  atsScore?: number;
}

/**
 * Extract keywords from job description and role
 */
function extractRoleKeywords(targetRole: string, jobDescription?: string): {
  required: string[];
  preferred: string[];
  categories: string[];
} {
  const roleLower = targetRole.toLowerCase();
  const jobText = jobDescription ? jobDescription.toLowerCase() : '';
  const combined = `${roleLower} ${jobText}`;

  // Define role-based keyword categories
  const roleKeywords: Record<string, string[]> = {
    'software developer': ['javascript', 'react', 'node.js', 'python', 'sql', 'git', 'rest api', 'agile'],
    'software engineer': ['java', 'python', 'algorithms', 'data structures', 'system design', 'docker', 'kubernetes'],
    'frontend developer': ['react', 'vue', 'angular', 'typescript', 'html', 'css', 'javascript', 'responsive design'],
    'backend developer': ['node.js', 'python', 'django', 'express', 'postgresql', 'mongodb', 'api', 'rest'],
    'full stack developer': ['react', 'node.js', 'mongodb', 'postgresql', 'javascript', 'typescript', 'git', 'rest api'],
    'data scientist': ['python', 'machine learning', 'pandas', 'numpy', 'sql', 'data analysis', 'statistics'],
    'data engineer': ['python', 'sql', 'apache spark', 'hadoop', 'etl', 'data pipelines', 'aws'],
    'devops engineer': ['docker', 'kubernetes', 'aws', 'ci/cd', 'jenkins', 'terraform', 'linux'],
    'mobile developer': ['react native', 'flutter', 'ios', 'android', 'swift', 'kotlin'],
    'product manager': ['agile', 'scrum', 'product strategy', 'stakeholder management', 'analytics'],
    'ui/ux designer': ['figma', 'adobe xd', 'user research', 'wireframing', 'prototyping', 'design systems'],
  };

  const required: string[] = [];
  const preferred: string[] = [];
  const categories: string[] = [];

  // Find matching role category
  for (const [role, keywords] of Object.entries(roleKeywords)) {
    if (combined.includes(role)) {
      required.push(...keywords.slice(0, 8));
      preferred.push(...keywords.slice(8));
      break;
    }
  }

  // Extract keywords from job description
  const commonTech = [
    'python', 'javascript', 'java', 'react', 'node.js', 'sql', 'mongodb', 'postgresql',
    'aws', 'docker', 'git', 'rest api', 'typescript', 'html', 'css', 'agile'
  ];

  commonTech.forEach(tech => {
    if ((combined.includes(tech) || jobText.includes(tech)) && !required.includes(tech)) {
      preferred.push(tech);
    }
  });

  // Determine category
  if (combined.includes('frontend') || combined.includes('ui') || combined.includes('front-end')) {
    categories.push('Frontend Development');
  }
  if (combined.includes('backend') || combined.includes('api') || combined.includes('server')) {
    categories.push('Backend Development');
  }
  if (combined.includes('data') || combined.includes('analytics') || combined.includes('ml')) {
    categories.push('Data Science');
  }
  if (combined.includes('devops') || combined.includes('cloud') || combined.includes('infrastructure')) {
    categories.push('DevOps');
  }

  return { required: [...new Set(required)], preferred: [...new Set(preferred)], categories };
}

/**
 * Tailor projects for specific role
 */
function tailorProjects(projects: any[], roleKeywords: any, targetRole: string): any[] {
  if (!projects || projects.length === 0) return [];

  return projects.map(project => {
    const projectText = `${project.project_title} ${project.description || ''} ${project.technologies_used?.join(' ') || ''}`.toLowerCase();
    
    // Calculate relevance score
    let relevanceScore = 0;
    roleKeywords.required.forEach((keyword: string) => {
      if (projectText.includes(keyword.toLowerCase())) {
        relevanceScore += 2;
      }
    });
    roleKeywords.preferred.forEach((keyword: string) => {
      if (projectText.includes(keyword.toLowerCase())) {
        relevanceScore += 1;
      }
    });

    // Enhance project description with role-specific language
    let enhancedDescription = project.description || '';
    if (!enhancedDescription || enhancedDescription.length < 50) {
      enhancedDescription = `Developed ${project.project_title}, demonstrating proficiency in ${targetRole.toLowerCase()} technologies and best practices.`;
    }

    // Enhance contributions if missing
    let contributions = project.contributions || [];
    if (contributions.length === 0 && project.role_contribution) {
      contributions = [project.role_contribution];
    }

    return {
      ...project,
      description: enhancedDescription,
      contributions,
      relevanceScore,
      tailored: true,
    };
  }).sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)); // Sort by relevance
}

/**
 * Tailor skills for specific role
 */
function tailorSkills(skills: any[], roleKeywords: any): any {
  const formatted: Record<string, string[]> = {
    technical: [],
    soft: [],
    languages: [],
  };

  // Organize existing skills
  if (skills && skills.length > 0) {
    skills.forEach((skill: any) => {
      const category = skill.category || 'technical';
      const skillList = Array.isArray(skill.skills) 
        ? skill.skills 
        : (typeof skill.skills === 'string' ? skill.skills.split(',').map((s: string) => s.trim()) : []);
      
      if (!formatted[category]) formatted[category] = [];
      formatted[category].push(...skillList);
    });
  }

  // Add role-relevant skills if missing
  roleKeywords.required.forEach((keyword: string) => {
    if (!formatted.technical.includes(keyword)) {
      formatted.technical.push(keyword);
    }
  });

  // Add preferred skills
  roleKeywords.preferred.slice(0, 5).forEach((keyword: string) => {
    if (!formatted.technical.includes(keyword)) {
      formatted.technical.push(keyword);
    }
  });

  // Ensure soft skills
  if (!formatted.soft || formatted.soft.length === 0) {
    formatted.soft = ['Problem Solving', 'Teamwork', 'Communication', 'Time Management'];
  }

  return formatted;
}

/**
 * Generate role-specific summary
 */
function generateRoleSummary(profile: any, education: any[], projects: any[], targetRole: string, roleKeywords: any): string {
  const degree = education?.[0]?.degree || '';
  const field = education?.[0]?.field_of_study || '';
  const projectCount = projects?.length || 0;
  const topSkills = roleKeywords.required.slice(0, 4).join(', ');

  let summary = `Motivated ${targetRole} candidate`;
  
  if (degree) {
    summary += ` with a ${degree}${field ? ` in ${field}` : ''}`;
  }
  
  if (topSkills) {
    summary += ` and expertise in ${topSkills}`;
  }

  if (projectCount > 0) {
    summary += `. Proven track record of developing ${projectCount}+ software projects`;
  }

  summary += `. Strong foundation in software engineering principles with hands-on experience in building scalable applications. `;
  summary += `Seeking opportunities to leverage technical skills and contribute to innovative projects as a ${targetRole}.`;

  return summary;
}

/**
 * Generate suggestions based on role requirements
 */
function generateSuggestions(
  profile: any,
  education: any[],
  projects: any[],
  skills: any[],
  roleKeywords: any,
  targetRole: string
): {
  recommendations: string[];
  suggestedProjects: string[];
  suggestedSkills: string[];
} {
  const recommendations: string[] = [];
  const suggestedProjects: string[] = [];
  const suggestedSkills: string[] = [];

  // Check missing required skills
  const existingSkills = skills?.flatMap((s: any) => 
    Array.isArray(s.skills) ? s.skills : (typeof s.skills === 'string' ? s.skills.split(',').map((sk: string) => sk.trim()) : [])
  ) || [];
  
  const missingRequired = roleKeywords.required.filter((skill: string) => 
    !existingSkills.some((es: string) => es.toLowerCase().includes(skill.toLowerCase()))
  );

  if (missingRequired.length > 0) {
    recommendations.push(`Learn these essential skills for ${targetRole}: ${missingRequired.slice(0, 5).join(', ')}`);
    suggestedSkills.push(...missingRequired.slice(0, 5));
  }

  // Check project relevance
  if (!projects || projects.length === 0) {
    recommendations.push(`Add at least 2-3 projects relevant to ${targetRole} to strengthen your resume`);
  } else {
    const relevantProjects = projects.filter((p: any) => {
      const projectText = `${p.project_title} ${p.description || ''}`.toLowerCase();
      return roleKeywords.required.some((keyword: string) => projectText.includes(keyword.toLowerCase()));
    });

    if (relevantProjects.length < 2) {
      recommendations.push(`Add more projects that showcase ${targetRole} skills to improve your profile`);
    }
  }

  // Generate role-specific project suggestions
  if (roleKeywords.categories.includes('Frontend Development')) {
    suggestedProjects.push(
      'Build a responsive portfolio website with React and Tailwind CSS',
      'Create a real-time chat application using WebSockets',
      'Develop an e-commerce frontend with shopping cart functionality'
    );
  } else if (roleKeywords.categories.includes('Backend Development')) {
    suggestedProjects.push(
      'Build a RESTful API with authentication and authorization',
      'Create a microservices architecture with Docker',
      'Develop a database-driven application with CRUD operations'
    );
  } else if (roleKeywords.categories.includes('Data Science')) {
    suggestedProjects.push(
      'Build a machine learning model for prediction',
      'Create a data visualization dashboard',
      'Develop a data analysis pipeline with ETL processes'
    );
  } else if (roleKeywords.categories.includes('DevOps')) {
    suggestedProjects.push(
      'Set up CI/CD pipeline with GitHub Actions',
      'Create infrastructure as code with Terraform',
      'Build containerized applications with Docker and Kubernetes'
    );
  } else {
    suggestedProjects.push(
      `Build a full-stack application showcasing ${targetRole} skills`,
      'Create a project demonstrating problem-solving abilities',
      'Develop a portfolio project highlighting your best work'
    );
  }

  // General recommendations
  if (!profile?.linkedin_profile) {
    recommendations.push('Add your LinkedIn profile to improve professional presence');
  }

  if (!profile?.github_portfolio) {
    recommendations.push('Create a GitHub profile and showcase your projects');
  }

  if (projects && projects.length > 0) {
    const projectsWithMetrics = projects.filter((p: any) => 
      (p.description || '').match(/\d+%|\d+\+|\d+\s*(users|requests)/i)
    );
    if (projectsWithMetrics.length < projects.length / 2) {
      recommendations.push('Add quantifiable metrics to your projects (percentages, numbers, scale)');
    }
  }

  return {
    recommendations: recommendations.slice(0, 8),
    suggestedProjects: suggestedProjects.slice(0, 5),
    suggestedSkills: suggestedSkills.slice(0, 8),
  };
}

/**
 * Main function to tailor resume for specific role
 */
export function tailorResumeForRole(
  resumeData: ResumeData,
  targetRole: string,
  jobDescription?: string
): RoleTailoredResume {
  // Extract role keywords
  const roleKeywords = extractRoleKeywords(targetRole, jobDescription);

  // Tailor each section
  const tailoredProjects = tailorProjects(resumeData.projects || [], roleKeywords, targetRole);
  const tailoredSkills = tailorSkills(resumeData.skills || [], roleKeywords);
  const summary = generateRoleSummary(
    resumeData.profile,
    resumeData.education || [],
    resumeData.projects || [],
    targetRole,
    roleKeywords
  );

  // Generate suggestions
  const { recommendations, suggestedProjects, suggestedSkills } = generateSuggestions(
    resumeData.profile,
    resumeData.education || [],
    resumeData.projects || [],
    resumeData.skills || [],
    roleKeywords,
    targetRole
  );

  return {
    summary,
    tailoredProjects,
    tailoredSkills,
    recommendations,
    suggestedProjects,
    suggestedSkills,
    atsScore: 75, // Default ATS score
  };
}

/**
 * Enhance with AI if API key available (optional enhancement)
 */
export async function enhanceWithAI(
  tailoredResume: RoleTailoredResume,
  resumeData: ResumeData,
  targetRole: string,
  jobDescription?: string
): Promise<RoleTailoredResume> {
  const API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;
  
  if (!API_KEY) {
    // Return tailored resume without AI enhancement
    return tailoredResume;
  }

  try {
    const systemPrompt = `You are an expert resume writer specializing in tailoring resumes for specific job roles.

Your task is to enhance this resume specifically for the role: ${targetRole}

${jobDescription ? `Job Description:\n${jobDescription}\n\n` : ''}

Enhance the resume by:
1. Rewriting the professional summary to align perfectly with ${targetRole} requirements
2. Highlighting relevant projects and skills
3. Adding role-specific keywords naturally
4. Improving project descriptions with role-focused achievements
5. Ensuring all content aligns with ${targetRole} expectations

Return ONLY valid JSON:
{
  "summary": "Enhanced professional summary (3-4 sentences)",
  "tailoredProjects": [enhanced projects array],
  "tailoredSkills": { "technical": [...], "soft": [...] },
  "recommendations": ["suggestion 1", "suggestion 2", ...],
  "suggestedProjects": ["project idea 1", ...],
  "suggestedSkills": ["skill 1", ...],
  "atsScore": 80
}`;

    const userPrompt = `Enhance this resume for ${targetRole}:

PROFILE:
${JSON.stringify(resumeData.profile, null, 2)}

EDUCATION:
${JSON.stringify(resumeData.education, null, 2)}

PROJECTS:
${JSON.stringify(resumeData.projects, null, 2)}

SKILLS:
${JSON.stringify(resumeData.skills, null, 2)}

CURRENT TAILORED SUMMARY:
${tailoredResume.summary}

Enhance and optimize for ${targetRole}.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: systemPrompt }] },
            { parts: [{ text: userPrompt }] }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
          },
        }),
      }
    );

    if (!response.ok) {
      return tailoredResume; // Fallback to non-AI version
    }

    const data = await response.json();
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiText) {
      return tailoredResume;
    }

    // Extract JSON
    let jsonText = aiText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    try {
      const enhanced = JSON.parse(jsonText);
      return {
        ...tailoredResume,
        summary: enhanced.summary || tailoredResume.summary,
        tailoredProjects: enhanced.tailoredProjects || tailoredResume.tailoredProjects,
        tailoredSkills: enhanced.tailoredSkills || tailoredResume.tailoredSkills,
        recommendations: enhanced.recommendations || tailoredResume.recommendations,
        suggestedProjects: enhanced.suggestedProjects || tailoredResume.suggestedProjects,
        suggestedSkills: enhanced.suggestedSkills || tailoredResume.suggestedSkills,
        atsScore: enhanced.atsScore || tailoredResume.atsScore,
      };
    } catch {
      return tailoredResume;
    }
  } catch (error) {
    console.error('AI enhancement failed, using tailored resume:', error);
    return tailoredResume;
  }
}

