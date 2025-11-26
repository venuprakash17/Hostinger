/**
 * Cover Letter Generator
 * Generates professional cover letters with optional AI enhancement
 */

interface CoverLetterData {
  profile: any;
  education?: any[];
  projects?: any[];
  skills?: any[];
  companyName: string;
  position: string;
  whyInterested?: string;
  jobDescription?: string;
}

export interface CoverLetterResult {
  coverLetter: string;
  subject: string;
  highlights: string[];
}

/**
 * Generate template-based cover letter (always works, no API needed)
 */
function generateTemplateCoverLetter(data: CoverLetterData): CoverLetterResult {
  const { profile, education, projects, skills, companyName, position, whyInterested, jobDescription } = data;
  
  const firstName = profile?.full_name?.split(' ')[0] || 'there';
  const degree = education?.[0]?.degree || 'graduate';
  const field = education?.[0]?.field_of_study || '';
  const university = education?.[0]?.institution_name || education?.[0]?.institution || '';
  
  // Extract key skills
  const technicalSkills: string[] = [];
  if (skills && skills.length > 0) {
    skills.forEach((skill: any) => {
      if (skill.category === 'technical' && Array.isArray(skill.skills)) {
        technicalSkills.push(...skill.skills.slice(0, 5));
      }
    });
  }
  const topSkills = technicalSkills.length > 0 
    ? technicalSkills.slice(0, 4).join(', ') 
    : 'modern technologies';
  
  // Extract project count
  const projectCount = projects?.length || 0;
  
  // Generate motivation paragraph
  let motivation = whyInterested?.trim() || '';
  if (!motivation && companyName) {
    motivation = `I am excited about the opportunity to contribute to ${companyName}'s innovative projects and grow professionally in a dynamic environment.`;
  } else if (!motivation) {
    motivation = `I am excited about this opportunity and believe my skills align well with your requirements.`;
  }
  
  // Generate subject line
  const subject = `Application for ${position} Position - ${profile?.full_name || 'Your Name'}`;
  
  // Build cover letter
  let coverLetter = `Dear Hiring Manager,\n\n`;
  
  // Opening paragraph
  coverLetter += `I am writing to express my strong interest in the ${position} position at ${companyName}. `;
  coverLetter += `As a ${degree}${field ? ` in ${field}` : ''}${university ? ` from ${university}` : ''}, `;
  coverLetter += `I am enthusiastic about applying my technical expertise and passion for software development to contribute to your team's success.\n\n`;
  
  // Second paragraph - Skills and experience
  coverLetter += `My background in ${topSkills}${projectCount > 0 ? `, combined with hands-on experience developing ${projectCount}+ software projects` : ''}, `;
  coverLetter += `has equipped me with the technical skills and problem-solving abilities necessary to excel in this role. `;
  
  if (projects && projects.length > 0) {
    const topProject = projects[0];
    if (topProject?.project_title) {
      coverLetter += `Through projects like "${topProject.project_title}", I have developed strong capabilities in `;
      if (topProject.technologies_used && Array.isArray(topProject.technologies_used) && topProject.technologies_used.length > 0) {
        coverLetter += `${topProject.technologies_used.slice(0, 3).join(', ')}, `;
      } else {
        coverLetter += `${topSkills}, `;
      }
      coverLetter += `demonstrating my ability to build scalable solutions and work effectively in collaborative environments. `;
    }
  }
  
  if (jobDescription) {
    // Extract key requirements from job description
    const jdLower = jobDescription.toLowerCase();
    const hasAgile = jdLower.includes('agile') || jdLower.includes('scrum');
    const hasTeamwork = jdLower.includes('team') || jdLower.includes('collaborat');
    
    if (hasAgile || hasTeamwork) {
      coverLetter += `I thrive in agile environments and am committed to delivering high-quality work while collaborating effectively with cross-functional teams. `;
    }
  }
  
  coverLetter += `\n`;
  
  // Third paragraph - Motivation and value
  coverLetter += `${motivation} `;
  coverLetter += `I am particularly drawn to ${companyName} because of its reputation for innovation and commitment to excellence. `;
  coverLetter += `I am eager to bring my dedication, technical skills, and fresh perspective to your team. `;
  
  if (profile?.linkedin_profile || profile?.github_portfolio) {
    coverLetter += `I have attached my resume for your review, and you can also view my work on `;
    const links: string[] = [];
    if (profile?.linkedin_profile) links.push('LinkedIn');
    if (profile?.github_portfolio) links.push('GitHub');
    coverLetter += links.join(' and ') + '. ';
  }
  
  coverLetter += `\n\n`;
  
  // Closing paragraph
  coverLetter += `I would welcome the opportunity to discuss how my skills and enthusiasm can contribute to ${companyName}'s continued success. `;
  coverLetter += `Thank you for considering my application. I look forward to hearing from you.\n\n`;
  coverLetter += `Sincerely,\n${profile?.full_name || 'Your Name'}\n${profile?.email || ''}`;
  
  if (profile?.phone_number) {
    coverLetter += `\n${profile.phone_number}`;
  }
  
  // Generate highlights
  const highlights: string[] = [];
  if (topSkills) {
    highlights.push(`Technical expertise in ${topSkills.split(', ').slice(0, 2).join(' and ')}`);
  }
  if (projectCount > 0) {
    highlights.push(`${projectCount}+ hands-on software projects`);
  }
  if (degree && university) {
    highlights.push(`${degree} from ${university}`);
  }
  if (whyInterested) {
    highlights.push('Personalized motivation and interest');
  }
  if (jobDescription) {
    highlights.push('Tailored to job requirements');
  }
  
  return {
    coverLetter,
    subject,
    highlights: highlights.slice(0, 4),
  };
}

/**
 * Generate cover letter with AI enhancement (if API key available)
 */
export async function generateCoverLetter(data: CoverLetterData): Promise<CoverLetterResult> {
  const API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;
  
  // Always generate template first
  const templateResult = generateTemplateCoverLetter(data);
  
  // If no API key, return template version
  if (!API_KEY) {
    console.warn('Google AI API key not found. Generating template-based cover letter.');
    return templateResult;
  }
  
  // Try to enhance with AI
  try {
    const systemPrompt = `You are a professional cover letter writer with 10+ years of experience helping candidates land jobs at top companies.

Create compelling, personalized cover letters that:
- Are concise (3-4 paragraphs, ~300-400 words)
- Show genuine interest and research about the company
- Highlight relevant skills and experiences from the candidate's background
- Demonstrate value proposition and what the candidate brings
- Include a strong call to action
- Use professional yet personable tone
- Are ATS-friendly (avoid complex formatting)
- Are specific and avoid generic language

CRITICAL RULES:
- DO NOT use placeholders like "[Company Name]" - use the actual company name
- DO NOT use generic phrases - be specific and personal
- DO mention specific skills and projects from the candidate's background
- DO show enthusiasm and genuine interest
- DO keep it concise and impactful
- DO include proper greeting and closing with candidate's name

Return ONLY valid JSON:
{
  "coverLetter": "Complete cover letter text with proper paragraphs (use \\n\\n for paragraph breaks)",
  "subject": "Professional email subject line",
  "highlights": ["Key point 1", "Key point 2", "Key point 3", "Key point 4"]
}`;

    const userPrompt = `Write a professional cover letter for:

COMPANY: ${data.companyName}
POSITION: ${data.position}

CANDIDATE PROFILE:
Name: ${data.profile?.full_name || 'Candidate'}
Email: ${data.profile?.email || ''}
${data.education && data.education.length > 0 ? `Education: ${JSON.stringify(data.education.slice(0, 2), null, 2)}\n` : ''}
${data.projects && data.projects.length > 0 ? `Projects: ${JSON.stringify(data.projects.slice(0, 3), null, 2)}\n` : ''}
${data.skills && data.skills.length > 0 ? `Skills: ${JSON.stringify(data.skills, null, 2)}\n` : ''}
${data.whyInterested ? `Why Interested: ${data.whyInterested}\n` : ''}
${data.jobDescription ? `Job Description:\n${data.jobDescription}\n` : ''}

Create a compelling, personalized cover letter that highlights the candidate's relevant experience and shows genuine interest in ${data.companyName}.`;

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
            maxOutputTokens: 2048,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      return templateResult; // Fallback to template
    }

    const aiData = await response.json();
    const aiText = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiText) {
      return templateResult; // Fallback to template
    }

    // Extract JSON from response
    let jsonText = aiText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    try {
      const enhanced = JSON.parse(jsonText) as CoverLetterResult;
      
      // Validate and enhance
      if (enhanced.coverLetter && enhanced.coverLetter.length > 100) {
        return {
          coverLetter: enhanced.coverLetter.replace(/\\n/g, '\n'),
          subject: enhanced.subject || templateResult.subject,
          highlights: enhanced.highlights && enhanced.highlights.length > 0 
            ? enhanced.highlights.slice(0, 4)
            : templateResult.highlights,
        };
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return templateResult; // Fallback to template
    }
  } catch (error) {
    console.error('Error calling AI API:', error);
    return templateResult; // Fallback to template
  }
  
  return templateResult;
}

