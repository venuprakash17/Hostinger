/**
 * AI Resume Enhancer
 * Uses Google AI Studio (Gemini) to enhance resumes and make them ATS-friendly
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

interface EnhancedResume {
  summary: string;
  formattedEducation: any[];
  formattedProjects?: any[];
  formattedSkills?: any;
  formattedCertifications?: any[];
  formattedAchievements?: any[];
  formattedExtracurricular?: any[];
  formattedHobbies?: any[];
  atsScore?: number;
  recommendations?: string[];
}

export async function enhanceResumeWithAI(
  resumeData: ResumeData
): Promise<EnhancedResume> {
  const API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;
  
  if (!API_KEY) {
    // Fallback: Return basic formatted resume without AI enhancement
    console.warn('Google AI API key not found. Generating basic resume without AI enhancement.');
    return formatResumeBasic(resumeData);
  }

  try {
    const systemPrompt = `You are a TOP-TIER resume writer and ATS (Applicant Tracking System) optimization specialist with 15+ years of experience helping candidates land jobs at Fortune 500 companies.

YOUR MISSION: Transform this raw resume data into a PROFESSIONAL, ATS-OPTIMIZED resume that will:
1. Pass through ATS filters (70%+ of resumes are rejected by ATS)
2. Impress recruiters with professional language
3. Stand out with quantifiable achievements
4. Use industry-standard keywords strategically
5. Follow best practices for modern resume writing

CRITICAL ENHANCEMENT RULES:

PROFESSIONAL SUMMARY (3-4 sentences - CRITICAL FOR RECRUITERS):
- Start with degree level and field of study
- Highlight 3-4 specific technical skills (not generic terms)
- Mention relevant projects/experience (even if academic)
- Include soft skills that matter (problem-solving, communication)
- Use action-oriented language
- Example format: "Motivated [Field] graduate with expertise in [specific technologies like React, Python, Node.js]. Proven ability to [specific achievement from projects]. Strong foundation in [relevant areas] with hands-on experience building [project types]. Seeking [target role] positions where I can leverage [key skills] to [contribute value]."

EDUCATION:
- Format consistently: "Degree in [Field], [Institution Name]"
- For students: Highlight CGPA prominently if above 3.5/4.0 or equivalent
- Include graduation date format: "YYYY - YYYY" or "YYYY - Present"
- Add relevant coursework/key highlights if space allows
- Order by relevance (most recent/highest degree first)
- Fix common errors: "B.tech" → "B.Tech", "10 Class" → "Class 10"

PROJECTS (CRITICAL - ENHANCE HEAVILY):
- NEVER leave projects with basic descriptions like "A project focused on [title]"
- ALWAYS create detailed, professional descriptions (3-4 sentences explaining the project purpose, scope, and impact)
- ALWAYS generate 5-7 compelling bullet points with STRONG action verbs and metrics:
  * REQUIRED action verbs: Developed, Architected, Engineered, Optimized, Implemented, Led, Designed, Built, Deployed, Scaled, Automated, Streamlined, Enhanced, Improved
  * REQUIRED quantifiable metrics: "Increased performance by 40%", "Reduced load time by 50%", "Handled 1000+ concurrent users", "Improved user engagement by 35%", "Reduced costs by 25%"
  * If metrics not provided, INFER realistic metrics based on project type (e.g., web apps: "Handled 500+ daily active users", "Improved page load time by 2 seconds")
  * Include specific technologies used (infer comprehensively from project title if missing)
  * Highlight business impact and technical achievements
- Format: Title, Technologies (array), Description (detailed), Contributions (array of 5-7 bullets with metrics)

SKILLS (CRITICAL - RECRUITERS SCAN THIS FIRST):
- Technical Skills: Add 8-15 relevant skills based on education, projects, and field
  * Programming Languages: Python, JavaScript, Java, C++, etc.
  * Frameworks/Libraries: React, Node.js, Django, Express, etc.
  * Tools & Technologies: Git, Docker, AWS, PostgreSQL, MongoDB, etc.
  * If student mentions AI/ML projects: Add TensorFlow, Machine Learning, NLP
  * If web projects: Add HTML, CSS, REST APIs, etc.
  * INFER missing skills from project technologies
- Soft Skills: Add 4-6 professional soft skills (Teamwork, Communication, Problem-Solving, etc.)
- Languages: Format as "Language (Proficiency Level)" - e.g., "English (Fluent)"
- IMPORTANT: Never leave skills section sparse - always populate with relevant skills

ATS OPTIMIZATION:
- Use keywords from the student's field throughout
- Ensure consistent formatting
- Avoid graphics, tables, or complex layouts
- Use standard section headers
- Include quantifiable metrics everywhere possible

RETURN FORMAT - STRICT JSON ONLY:
{
  "summary": "Professional 2-3 sentence summary with keywords and achievements",
  "formattedEducation": [
    {
      "institution_name": "string",
      "degree": "string",
      "field_of_study": "string",
      "start_date": "YYYY-MM",
      "end_date": "YYYY-MM or null",
      "cgpa_percentage": "string or null",
      "is_current": boolean,
      "relevant_coursework": "string or null"
    }
  ],
  "formattedProjects": [
    {
      "project_title": "string",
      "description": "3-4 sentence detailed professional description explaining project purpose, scope, technologies, and impact",
      "technologies_used": ["tech1", "tech2", "tech3", "tech4", "tech5"],
      "contributions": [
        "Developed [specific feature] resulting in [quantifiable metric]",
        "Architected [system component] that [achievement with number]",
        "Implemented [feature] using [technology], improving [metric] by [percentage]",
        "Optimized [system/process], reducing [metric] by [percentage]",
        "Deployed [solution] handling [number] of [users/requests/etc]",
        "Built [feature] that [achievement with measurable impact]",
        "Led [initiative] achieving [quantifiable result]"
      ],
      "duration_start": "YYYY-MM",
      "duration_end": "YYYY-MM or null",
      "github_demo_link": "string or null"
    }
  ],
  "formattedSkills": {
    "technical": ["skill1", "skill2"],
    "soft": ["skill1", "skill2"],
    "languages": ["Language (Proficiency)"]
  },
  "formattedCertifications": [array],
  "formattedAchievements": [array],
  "formattedExtracurricular": [array],
  "formattedHobbies": [array of strings],
  "atsScore": 85,
  "recommendations": [
    "Specific, actionable suggestion 1",
    "Specific, actionable suggestion 2",
    "Specific, actionable suggestion 3",
    "Specific, actionable suggestion 4",
    "Specific, actionable suggestion 5"
  ]
}

CRITICAL RULES - FOLLOW STRICTLY: 
- NEVER use generic descriptions like "A project focused on [title]" - ALWAYS create detailed, professional descriptions
- NEVER use placeholders like "N/A", "Not specified", "TBD", "Not provided"
- ALWAYS infer and create COMPLETE professional content even if user input is minimal
- ALWAYS add quantifiable metrics (percentages, numbers, scale) - INFER realistic metrics if not provided
- For projects without descriptions: Create 3-4 sentence descriptions based on title and technologies
- For projects without contributions: Generate 5-7 professional bullet points with action verbs and metrics
- For achievements/extracurricular: Enhance descriptions to be professional and impactful
- ALWAYS return valid JSON (no markdown, no code blocks, no explanation text)
- ALWAYS ensure ATS score is realistic (70-95 range based on data quality and enhancement)
- ALWAYS provide 5-7 specific, actionable recommendations
- Make the resume sound impressive, professional, and ATS-friendly

EXAMPLE OF GOOD PROJECT ENHANCEMENT:
Input: {"project_title": "AI Resume Builder", "description": "", "technologies_used": []}
Output: {
  "project_title": "AI Resume Builder",
  "description": "Developed an intelligent resume optimization platform leveraging AI and natural language processing to help job seekers create ATS-friendly resumes. The application analyzes resume content, suggests improvements, and generates professional summaries tailored to specific job roles. Implemented real-time collaboration features and automated PDF generation with industry-standard formatting.",
  "technologies_used": ["React", "TypeScript", "Node.js", "OpenAI API", "PostgreSQL", "Tailwind CSS", "PDF Generation"],
  "contributions": [
    "Architected and developed full-stack web application using React and Node.js, handling 1000+ concurrent users with 99.9% uptime",
    "Implemented AI-powered content analysis using OpenAI API, improving resume ATS compatibility scores by an average of 35%",
    "Built automated PDF generation system with ATS-friendly formatting, processing 500+ resumes daily",
    "Designed and developed real-time collaboration features enabling multiple users to edit resumes simultaneously",
    "Optimized database queries and API endpoints, reducing average response time by 40%",
    "Deployed scalable cloud infrastructure using Docker and Kubernetes, supporting 10,000+ monthly active users",
    "Integrated advanced analytics dashboard tracking user engagement and resume improvement metrics"
  ]
}`;

    const userPrompt = `You are an expert resume writer helping a STUDENT create a RECRUITER-FRIENDLY, ATS-OPTIMIZED resume.

RECRUITER PERSPECTIVE - WHAT THEY LOOK FOR:
1. Clear, quantifiable achievements
2. Relevant technical skills (8-15 skills minimum)
3. Professional language and formatting
4. No spelling/grammar errors
5. Specific project descriptions with impact
6. Proper degree formatting (B.Tech not B.tech)

STUDENT PROFILE DATA:

PROFILE:
${JSON.stringify(resumeData.profile, null, 2)}

EDUCATION:
${JSON.stringify(resumeData.education, null, 2)}

${resumeData.projects && resumeData.projects.length > 0 ? `PROJECTS:\n${JSON.stringify(resumeData.projects, null, 2)}\n` : ''}
${resumeData.skills && resumeData.skills.length > 0 ? `CURRENT SKILLS (EXPAND THESE):\n${JSON.stringify(resumeData.skills, null, 2)}\n\nIMPORTANT: Infer and add 8-15 relevant technical skills based on projects and education field.` : 'SKILLS: NONE PROVIDED - INFER 8-15 RELEVANT TECHNICAL SKILLS FROM EDUCATION FIELD AND PROJECTS'}
${resumeData.certifications && resumeData.certifications.length > 0 ? `CERTIFICATIONS:\n${JSON.stringify(resumeData.certifications, null, 2)}\n` : ''}
${resumeData.achievements && resumeData.achievements.length > 0 ? `ACHIEVEMENTS:\n${JSON.stringify(resumeData.achievements, null, 2)}\n` : ''}
${resumeData.extracurricular && resumeData.extracurricular.length > 0 ? `EXTRACURRICULAR:\n${JSON.stringify(resumeData.extracurricular, null, 2)}\n` : ''}
${resumeData.hobbies && resumeData.hobbies.length > 0 ? `HOBBIES:\n${JSON.stringify(resumeData.hobbies, null, 2)}\n` : ''}

YOUR TASK:
1. Create a compelling 3-4 sentence professional summary that highlights the student's strengths
2. Expand technical skills to 8-15 relevant skills (infer from projects and education field)
3. Enhance all projects with detailed descriptions and 5-7 bullet points with metrics
4. Fix any formatting errors (e.g., "B.tech" → "B.Tech", "Volentier" → "Volunteer")
5. Enhance achievements/extracurricular to be professional and impactful
6. Make EVERYTHING recruiter-friendly and ATS-optimized

Remember: This is a STUDENT resume - focus on:
- Academic achievements (CGPA, projects, coursework)
- Technical skills and technologies learned
- Project experience and problem-solving abilities
- Eagerness to learn and contribute`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: systemPrompt }
              ]
            },
            {
              parts: [
                { text: userPrompt }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      // Fallback to basic formatting
      return formatResumeBasic(resumeData);
    }

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      console.error('Unexpected AI API response:', data);
      return formatResumeBasic(resumeData);
    }

    const aiText = data.candidates[0].content.parts[0].text;
    
    // Extract JSON from the response (AI might wrap it in markdown code blocks)
    let jsonText = aiText.trim();
    
    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    try {
      const enhanced = JSON.parse(jsonText) as EnhancedResume;
      
      // Ensure projects have contributions array even if AI didn't provide it
      const enhancedProjects = enhanced.formattedProjects?.map(proj => {
        if (!proj.contributions || proj.contributions.length === 0) {
          // Generate contributions from description or title
          const contributions = generateContributionsFromProject(proj);
          return { ...proj, contributions };
        }
        return proj;
      }) || [];
      
      // Merge with original data, prioritizing AI-enhanced content
      return {
        ...enhanced,
        formattedEducation: enhanced.formattedEducation && enhanced.formattedEducation.length > 0 
          ? enhanced.formattedEducation 
          : resumeData.education,
        formattedProjects: enhancedProjects.length > 0 
          ? enhancedProjects 
          : (enhanced.formattedProjects || resumeData.projects || []),
        formattedSkills: enhanced.formattedSkills && Object.keys(enhanced.formattedSkills).length > 0
          ? enhanced.formattedSkills 
          : formatSkillsBasic(resumeData.skills || []),
        formattedCertifications: enhanced.formattedCertifications && enhanced.formattedCertifications.length > 0
          ? enhanced.formattedCertifications 
          : formatCertifications(resumeData.certifications || []),
        formattedAchievements: enhanced.formattedAchievements && enhanced.formattedAchievements.length > 0
          ? enhanced.formattedAchievements 
          : formatAchievements(resumeData.achievements || []),
        formattedExtracurricular: enhanced.formattedExtracurricular && enhanced.formattedExtracurricular.length > 0
          ? enhanced.formattedExtracurricular 
          : (resumeData.extracurricular || []),
        formattedHobbies: enhanced.formattedHobbies && enhanced.formattedHobbies.length > 0
          ? enhanced.formattedHobbies 
          : (resumeData.hobbies || []),
        // Ensure we have atsScore and recommendations
        atsScore: enhanced.atsScore || 75,
        recommendations: enhanced.recommendations && enhanced.recommendations.length > 0
          ? enhanced.recommendations 
          : generateDefaultRecommendations(),
      };
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('AI Response:', aiText);
      // Fallback to basic formatting but with enhanced basic formatting
      return formatResumeBasic(resumeData);
    }
  } catch (error) {
    console.error('Error calling AI API:', error);
    // Fallback to basic formatting
    return formatResumeBasic(resumeData);
  }
}

// Basic formatting fallback when AI is not available
function formatResumeBasic(resumeData: ResumeData): EnhancedResume {
  return {
    summary: generateBasicSummary(resumeData),
    formattedEducation: resumeData.education.map(edu => ({
      institution_name: edu.institution_name,
      degree: edu.degree,
      field_of_study: edu.field_of_study,
      start_date: edu.start_date,
      end_date: edu.end_date,
      cgpa_percentage: edu.cgpa_percentage,
      is_current: edu.is_current,
    })),
    formattedProjects: resumeData.projects?.map(proj => {
      // Create professional description if missing
      const basicDescription = proj.description || 
        `Developed ${proj.project_title}, a comprehensive software solution addressing key challenges in the domain. Implemented modern technologies and best practices to deliver a scalable, efficient, and user-friendly application. The project demonstrates strong technical skills, problem-solving abilities, and practical experience in software development.`;
      
      // Infer technologies from project title if missing
      const inferredTechs = Array.isArray(proj.technologies_used) && proj.technologies_used.length > 0
        ? proj.technologies_used 
        : (typeof proj.technologies_used === 'string' && proj.technologies_used.trim()
            ? proj.technologies_used.split(',').map(t => t.trim())
            : inferTechnologiesFromTitle(proj.project_title));
      
      // Generate contributions if missing
      const contributions = proj.contributions && Array.isArray(proj.contributions) && proj.contributions.length > 0
        ? proj.contributions
        : (proj.role_contribution 
            ? [proj.role_contribution] 
            : generateContributionsFromProject({ ...proj, technologies_used: inferredTechs }));
      
      return {
        project_title: proj.project_title,
        description: basicDescription,
        technologies_used: inferredTechs,
        contributions: contributions,
        role_contribution: proj.role_contribution,
        github_demo_link: proj.github_demo_link,
        duration_start: proj.duration_start,
        duration_end: proj.duration_end,
      };
    }) || [],
    formattedSkills: formatSkillsBasic(resumeData.skills || []),
    formattedCertifications: formatCertifications(resumeData.certifications || []),
    formattedAchievements: formatAchievements(resumeData.achievements || []),
    formattedExtracurricular: resumeData.extracurricular || [],
    formattedHobbies: resumeData.hobbies?.map(h => typeof h === 'string' ? h : h.hobby_name) || [],
    atsScore: 70, // Basic score when AI not available
    recommendations: [
      "Add more quantifiable achievements to your projects",
      "Include relevant keywords from job descriptions",
      "Use strong action verbs in descriptions",
      "Add more technical skills if applicable",
    ],
  };
}

function formatSkillsBasic(skills: any[]): Record<string, string[]> {
  const formatted = skills.reduce((acc: any, skill: any) => {
    const category = skill.category || 'technical';
    if (!acc[category]) acc[category] = [];
    const skillsList = Array.isArray(skill.skills) 
      ? skill.skills 
      : (typeof skill.skills === 'string' 
          ? skill.skills.split(',').map((s: string) => s.trim()).filter(Boolean)
          : []);
    acc[category].push(...skillsList);
    return acc;
  }, {});
  
  // Ensure technical skills section exists and has minimum skills
  if (!formatted.technical || formatted.technical.length < 3) {
    if (!formatted.technical) formatted.technical = [];
    // Add common technical skills if missing
    const commonTechs = ['Git', 'HTML', 'CSS', 'JavaScript'];
    commonTechs.forEach(tech => {
      if (!formatted.technical.includes(tech)) {
        formatted.technical.push(tech);
      }
    });
  }
  
  // Add soft skills if missing
  if (!formatted.soft || formatted.soft.length === 0) {
    formatted.soft = ['Problem Solving', 'Teamwork', 'Communication', 'Time Management'];
  }
  
  return formatted;
}

function generateBasicSummary(resumeData: ResumeData): string {
  const name = resumeData.profile?.full_name || 'Professional';
  const education = resumeData.education?.[0];
  const degree = education?.degree || '';
  const field = education?.field_of_study || '';
  const hasProjects = resumeData.projects && resumeData.projects.length > 0;
  const hasSkills = resumeData.skills && resumeData.skills.length > 0;
  
  let summary = `${name} is a ${degree} ${field ? `in ${field}` : ''} graduate `;
  
  if (hasProjects) {
    summary += `with hands-on experience developing ${resumeData.projects.length}+ software projects. `;
  }
  
  if (hasSkills) {
    summary += `Proficient in modern technologies and development practices. `;
  }
  
  summary += `${field ? `Specialized in ${field} with ` : 'With '}strong problem-solving abilities and a passion for innovation. `;
  summary += `Seeking opportunities to apply technical expertise and contribute to impactful projects.`;
  
  return summary;
}

function inferTechnologiesFromTitle(title: string): string[] {
  const titleLower = title.toLowerCase();
  const techMap: Record<string, string[]> = {
    'web': ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'Express', 'REST API'],
    'mobile': ['React Native', 'Flutter', 'iOS', 'Android', 'Swift', 'Kotlin'],
    'ai': ['Python', 'Machine Learning', 'TensorFlow', 'OpenAI', 'NumPy', 'Pandas', 'Scikit-learn'],
    'ml': ['Python', 'Machine Learning', 'TensorFlow', 'NumPy', 'Pandas', 'Scikit-learn'],
    'resume': ['React', 'TypeScript', 'Node.js', 'PDF Generation', 'HTML', 'CSS'],
    'app': ['React', 'Node.js', 'JavaScript', 'HTML', 'CSS', 'Express'],
    'api': ['REST API', 'Node.js', 'Express', 'PostgreSQL', 'MongoDB', 'JWT'],
    'database': ['SQL', 'PostgreSQL', 'MongoDB', 'MySQL', 'Redis'],
    'ecommerce': ['React', 'Node.js', 'Stripe', 'MongoDB', 'Express'],
    'dashboard': ['React', 'Chart.js', 'Node.js', 'REST API'],
  };
  
  // Default techs based on common student projects
  const defaultTechs = ['JavaScript', 'React', 'Node.js', 'HTML', 'CSS', 'Git', 'REST API'];
  
  for (const [keyword, techs] of Object.entries(techMap)) {
    if (titleLower.includes(keyword)) {
      return techs;
    }
  }
  
  return defaultTechs;
}

function generateBasicContributions(title: string, technologies: string[]): string[] {
  const techList = technologies.length > 0 ? technologies.join(', ') : 'modern technologies';
  
  return [
    `Developed and deployed ${title} using ${techList}, implementing best practices for code quality and performance`,
    `Architected scalable solution handling user interactions and data processing efficiently`,
    `Implemented responsive design ensuring optimal user experience across multiple devices and screen sizes`,
    `Optimized application performance resulting in improved load times and user engagement`,
    `Integrated modern development tools and frameworks for enhanced productivity and maintainability`,
  ];
}

function generateContributionsFromProject(project: any): string[] {
  const title = project.project_title || 'Project';
  const techs = Array.isArray(project.technologies_used) && project.technologies_used.length > 0
    ? project.technologies_used.slice(0, 5).join(', ')
    : (typeof project.technologies_used === 'string' && project.technologies_used.trim()
        ? project.technologies_used
        : 'modern technologies');
  const desc = project.description || '';
  
  // Extract key info from description and title
  const titleLower = title.toLowerCase();
  const descLower = desc.toLowerCase();
  const hasWeb = titleLower.includes('web') || descLower.includes('web') || titleLower.includes('app') || descLower.includes('application');
  const hasAI = titleLower.includes('ai') || titleLower.includes('machine learning') || titleLower.includes('ml') || descLower.includes('ai') || descLower.includes('machine learning');
  const hasMobile = titleLower.includes('mobile') || descLower.includes('mobile') || titleLower.includes('ios') || titleLower.includes('android');
  const hasResume = titleLower.includes('resume');
  const hasAPI = titleLower.includes('api') || descLower.includes('api');
  
  const contributions: string[] = [];
  
  if (hasAI) {
    contributions.push(
      `Developed AI-powered features using machine learning algorithms, improving accuracy by 30% and processing 1000+ requests daily`,
      `Implemented natural language processing capabilities enabling intelligent content analysis and recommendations`
    );
  } else if (hasMobile) {
    contributions.push(
      `Built responsive mobile application supporting iOS and Android platforms with 500+ active users`,
      `Optimized mobile app performance reducing load time by 40% and improving user retention by 25%`
    );
  } else if (hasResume) {
    contributions.push(
      `Developed comprehensive resume builder platform with AI-powered content enhancement, processing 500+ resumes daily`,
      `Implemented automated PDF generation with ATS-friendly formatting, improving user success rate by 35%`
    );
  } else if (hasAPI) {
    contributions.push(
      `Designed and developed RESTful API architecture handling 1000+ concurrent requests with 99% uptime`,
      `Implemented authentication and authorization systems ensuring secure data access and user management`
    );
  } else if (hasWeb) {
    contributions.push(
      `Architected and developed full-stack web application using ${techs}, handling 1000+ concurrent users with 99% uptime`,
      `Built responsive frontend with modern frameworks ensuring seamless user experience across all devices`
    );
  } else {
    contributions.push(
      `Developed comprehensive software solution using ${techs}, implementing scalable architecture supporting enterprise-level usage`,
      `Built robust application with clean code architecture following industry best practices and design patterns`
    );
  }
  
  contributions.push(
    `Implemented robust error handling and validation logic, reducing system errors by 40%`,
    `Optimized database queries and API endpoints, reducing average response time by 35%`,
    `Designed intuitive user interface following modern UX principles, improving user engagement by 25%`,
    `Deployed application using CI/CD pipeline, enabling rapid feature releases and seamless updates`,
    `Integrated third-party APIs and services, expanding application functionality and user capabilities`
  );
  
  return contributions.slice(0, 5); // Return up to 5 contributions
}

function generateDefaultRecommendations(): string[] {
  return [
    "Add more quantifiable achievements to projects (percentages, numbers, scale)",
    "Include specific technologies and tools used in each project",
    "Use strong action verbs (Developed, Architected, Optimized, Led) in all descriptions",
    "Add more projects to demonstrate breadth of experience (aim for 3-5 projects)",
    "Include relevant certifications to showcase continuous learning",
    "Add detailed descriptions highlighting business impact and technical achievements",
    "Ensure all sections are complete with professional, ATS-friendly content"
  ];
}

// Format certifications to ensure proper structure
function formatCertifications(certifications: any[]): any[] {
  return certifications
    .filter(cert => cert && (cert.certification_name || cert.title || cert.name))
    .map(cert => ({
      certification_name: cert.certification_name || cert.title || cert.name || '',
      issuing_organization: cert.issuing_organization || cert.organization || cert.issuer || '',
      issue_date: cert.issue_date || cert.date_issued || cert.date || null,
      credential_url: cert.credential_url || cert.url || null,
    }))
    .filter(cert => cert.certification_name && cert.certification_name.trim());
}

// Format achievements to ensure proper structure
function formatAchievements(achievements: any[]): any[] {
  return achievements
    .filter(ach => ach && (ach.achievement_title || ach.title))
    .map(ach => ({
      achievement_title: ach.achievement_title || ach.title || '',
      description: ach.description || '',
      issuing_body: ach.issuing_body || ach.issuer || '',
      achievement_date: ach.achievement_date || ach.date || null,
    }))
    .filter(ach => ach.achievement_title && ach.achievement_title.trim());
}

