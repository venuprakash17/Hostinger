/**
 * PDF Generator Service with ATS-Safe Formatting
 * Matches ResumeItNow format and structure exactly
 * Uses Arial/Calibri fonts and A4 standard margins
 */

import { pdf, Document, Page, Text, View, StyleSheet, Font, Link } from '@react-pdf/renderer';
import { ResumeTemplate, TEMPLATE_CONFIGS } from '../types/templates';

/**
 * ATS-Safe PDF Styles - ResumeItNow Format
 * Following ATS best practices and ResumeItNow structure:
 * - Standard fonts (Arial/Calibri/Helvetica)
 * - A4 page size
 * - Standard margins (30pt = ~1cm)
 * - Simple formatting (no tables, graphics, complex layouts)
 * - Professional spacing and typography
 */
export const createATSSafeStyles = (templateConfig?: { fontFamily?: string; fontSize?: number; colorScheme?: any; layout?: any }) => StyleSheet.create({
  page: {
    padding: 54, // Match preview: 0.75in = 54pt for better visual match
    fontSize: templateConfig?.fontSize || 10, // Match preview: 10pt base font
    fontFamily: templateConfig?.fontFamily || 'Helvetica',
    lineHeight: 1.6, // Match preview: further increased for better readability
    color: templateConfig?.colorScheme?.primary || '#000000',
    maxHeight: 792, // A4 height in points (11in = 792pt) - enforce single page
  },
  header: {
    marginBottom: 12, // Match preview: 15px -> 12pt
    textAlign: (templateConfig?.layout?.headerStyle === 'centered' ? 'center' : 'left') as any,
    borderBottomWidth: 2,
    borderBottomColor: templateConfig?.colorScheme?.primary || '#000000',
    borderBottomStyle: 'solid',
    paddingBottom: 7, // Match preview: 10px -> 7pt
  },
  name: {
    fontSize: templateConfig?.layout?.headerStyle === 'centered' ? 20 : 16, // Match preview better: 22pt -> 20pt (centered), 16pt (left)
    fontWeight: 'bold',
    marginBottom: 4, // Match preview: 5px -> 4pt
    letterSpacing: templateConfig?.layout?.headerStyle === 'centered' ? 0.8 : 0.3,
    fontFamily: 'Helvetica-Bold',
    color: templateConfig?.colorScheme?.primary || '#000000',
    textTransform: 'uppercase',
  },
  contact: {
    fontSize: 9, // Match preview
    color: templateConfig?.colorScheme?.secondary || '#333333',
    marginBottom: 0,
    lineHeight: 1.4, // Match preview
  },
  link: {
    fontSize: 9,
    color: '#0066cc',
    textDecoration: 'underline',
    marginBottom: 2,
    lineHeight: 1.5,
  },
  section: {
    marginTop: 0,
    marginBottom: 22, // Match preview: more spacing for less clustering
  },
  sectionTitle: {
    fontSize: 11, // Match preview
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: templateConfig?.colorScheme?.primary || '#000000',
    borderBottomStyle: 'solid',
    paddingBottom: 2,
    marginBottom: 10, // Match preview: fixed spacing after section title
    marginTop: 0,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontFamily: 'Helvetica-Bold',
    color: templateConfig?.colorScheme?.primary || '#000000',
  },
  text: {
    fontSize: 10, // Match preview: base font size
    lineHeight: 1.6, // Match preview: further increased for better readability
    marginTop: 2,
    marginBottom: 2,
  },
  summary: {
    fontSize: 10, // Match preview
    lineHeight: 1.6, // Match preview: further increased for better readability
    marginBottom: 0,
    textAlign: 'left',
  },
  subsection: {
    marginBottom: 10, // Match preview: increased spacing for less clustering
  },
  title: {
    fontSize: 11, // Match preview better
    fontWeight: 'bold',
    marginBottom: 1,
    fontFamily: 'Helvetica-Bold',
  },
  subtitle: {
    fontSize: 10, // Match preview
    color: templateConfig?.colorScheme?.secondary || '#333333',
    marginBottom: 2,
    lineHeight: 1.6, // Match preview: further increased for better readability
  },
  date: {
    fontSize: 9, // Match preview better
    color: '#666666',
    fontStyle: 'normal',
    marginBottom: 0,
  },
  bullet: {
    fontSize: 10, // Match preview: base font
    marginLeft: 18, // Match preview
    marginBottom: 2, // Match preview
    lineHeight: 1.6, // Match preview: further increased for better readability
  },
  compactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  skillCategory: {
    fontSize: 10, // Match preview
    fontWeight: 'bold',
    marginBottom: 2,
    fontFamily: 'Helvetica-Bold',
  },
  skillItems: {
    fontSize: 10, // Match preview
    lineHeight: 1.6, // Match preview: further increased for better readability
  },
});

export interface ResumeData {
  profile: {
    full_name?: string;
    email?: string;
    phone_number?: string;
    linkedin_profile?: string;
    github_portfolio?: string;
    address?: string;
    website?: string;
    company_name?: string;
  };
  summary?: string;
  education?: Array<{
    degree?: string;
    institution_name?: string;
    field_of_study?: string;
    start_date?: string;
    end_date?: string;
    is_current?: boolean;
    cgpa_percentage?: string;
  }>;
  work_experience?: Array<{
    job_title?: string;
    company?: string;
    location?: string;
    start_date?: string;
    end_date?: string;
    is_current?: boolean;
    description?: string;
    achievements?: string[];
  }>;
  projects?: Array<{
    project_title?: string;
    description?: string;
    technologies_used?: string[];
    contributions?: string[];
    duration_start?: string;
    duration_end?: string;
    url?: string;
  }>;
  skills?: Record<string, string[]> | Array<{
    category?: string;
    skills?: string[];
  }>;
  certifications?: Array<{
    certification_name?: string;
    issuing_organization?: string;
    issue_date?: string;
    expiry_date?: string;
    credential_id?: string;
    credential_url?: string;
  }>;
  achievements?: Array<{
    title?: string;
    description?: string;
    date?: string;
    organization?: string;
  }>;
  extracurricular?: Array<{
    activity_name?: string;
    activity_organization?: string;
    role?: string;
    description?: string;
    start_date?: string;
    end_date?: string;
  }>;
  hobbies?: Array<{
    hobby_name?: string;
    description?: string;
  }> | string[];
  languages?: Array<{
    language?: string;
    proficiency?: string;
  }>;
  references?: Array<{
    name?: string;
    position?: string;
    company?: string;
    email?: string;
    phone?: string;
  }>;
}

/**
 * Generate ATS-safe PDF from resume data - ResumeItNow Format
 */
export async function generateATSSafePDF(
  resumeData: ResumeData,
  template: ResumeTemplate = 'modern',
  customizationSettings?: any
): Promise<Blob> {
  const templateConfig = TEMPLATE_CONFIGS[template];
  
  // Merge customization settings with template config
  const mergedConfig = customizationSettings ? {
    ...templateConfig,
    fontFamily: customizationSettings.fontFamily || templateConfig.fontFamily,
    fontSize: customizationSettings.baseFontSize || 10,
    colorScheme: {
      primary: customizationSettings.primaryColor || '#000000',
      secondary: customizationSettings.secondaryColor || '#333333',
      accent: customizationSettings.accentColor || '#0066cc',
    },
    layout: {
      ...templateConfig.layout,
      headerStyle: customizationSettings.headerAlignment || templateConfig.layout.headerStyle,
      sectionSpacing: customizationSettings.sectionSpacing || templateConfig.layout.sectionSpacing,
    },
  } : templateConfig;
  
      // CRITICAL: Use the projects from resumeData EXACTLY as passed (no modifications)
      // The preview modal already ensures displayData.projects contains the correct enhanced projects
      // DO NOT slice or modify - use EXACT same projects array
      const projectsFromPreview = resumeData.projects || [];
      
      console.log(`[PDF Generator] Using template: ${template}`, {
        name: mergedConfig.name,
        headerStyle: mergedConfig.layout.headerStyle,
        sectionSpacing: mergedConfig.layout.sectionSpacing,
        customizations: customizationSettings ? 'Applied' : 'None',
        projectsCount: projectsFromPreview.length,
        firstProjectTitle: projectsFromPreview[0]?.project_title,
        firstProjectDesc: projectsFromPreview[0]?.description?.substring(0, 150),
        allProjectTitles: projectsFromPreview.map((p: any) => p.project_title),
      });
      
      // Use EXACT same projects array (already top 3 from preview)
      // DO NOT modify - preview already ensures correct projects
      let finalResumeData = {
        ...resumeData,
        projects: projectsFromPreview, // Use EXACT same array (no slicing, no modification)
      };
      
      console.log('[PDF Generator] Using EXACT projects from resumeData (same as preview):', {
        projectCount: finalResumeData.projects.length,
        firstProjectTitle: finalResumeData.projects[0]?.project_title,
        firstProjectDesc: finalResumeData.projects[0]?.description?.substring(0, 150),
        secondProjectDesc: finalResumeData.projects[1]?.description?.substring(0, 150),
        thirdProjectDesc: finalResumeData.projects[2]?.description?.substring(0, 150),
        source: 'resumeData (from preview - no modifications)'
      });
      
      const styles = createATSSafeStyles(mergedConfig);
      const { 
        profile, 
        summary, 
        education, 
        work_experience,
        projects, 
        skills, 
        certifications, 
        achievements, 
        extracurricular, 
        hobbies,
        languages,
        references
      } = finalResumeData;

  const ResumePDF = (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header - Template-based styling */}
        <View style={styles.header}>
          <Text style={styles.name}>
            {(profile?.full_name || 'Your Name').toUpperCase()}
          </Text>
          <Text style={styles.contact}>
            {profile?.email || ''} {profile?.phone_number ? `| ${profile.phone_number}` : ''}
            {profile?.address ? ` | ${profile.address}` : ''}
            {profile?.company_name ? ` | Targeting: ${profile.company_name}` : ''}
            {profile?.linkedin_profile && (
              <>
                {' | '}
                <Link
                  src={
                    profile.linkedin_profile.startsWith('http://') || profile.linkedin_profile.startsWith('https://')
                      ? profile.linkedin_profile
                      : `https://www.linkedin.com/in/${profile.linkedin_profile.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '').replace(/\/$/, '')}`
                  }
                  style={{ color: '#0066cc', textDecoration: 'underline' }}
                >
                  LinkedIn
                </Link>
              </>
            )}
            {profile?.github_portfolio && (
              <>
                {' | '}
                <Link
                  src={
                    profile.github_portfolio.startsWith('http://') || profile.github_portfolio.startsWith('https://')
                      ? profile.github_portfolio
                      : `https://github.com/${profile.github_portfolio.replace(/^https?:\/\/(www\.)?github\.com\//, '').replace(/\/$/, '')}`
                  }
                  style={{ color: '#0066cc', textDecoration: 'underline' }}
                >
                  GitHub
                </Link>
              </>
            )}
          </Text>
        </View>

        {/* Summary */}
        {summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PROFESSIONAL SUMMARY</Text>
            <Text style={styles.summary}>{summary}</Text>
          </View>
        )}

        {/* Work Experience - Show BEFORE Education if present */}
        {work_experience && work_experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>WORK EXPERIENCE</Text>
            {work_experience
              .sort((a: any, b: any) => {
                const aEnd = a.end_date || '';
                const bEnd = b.end_date || '';
                const aCurrent = a.is_current || (typeof aEnd === 'string' && /present/i.test(aEnd));
                const bCurrent = b.is_current || (typeof bEnd === 'string' && /present/i.test(bEnd));
                if (aCurrent && !bCurrent) return -1;
                if (!aCurrent && bCurrent) return 1;
                if (aEnd && bEnd) return bEnd.localeCompare(aEnd);
                return 0;
              })
              .map((exp: any, idx: number) => {
                const jobTitle = exp.job_title || exp.title || exp.position || '';
                const company = exp.company || exp.employer || exp.organization || '';
                const location = exp.location || '';
                const start = exp.start_date ? exp.start_date.substring(0, 7) : (exp.start ? exp.start.substring(0, 7) : '');
                const endRaw = exp.end_date || exp.end;
                const isCurrent = exp.is_current || (typeof endRaw === 'string' && /present/i.test(endRaw));
                const end = isCurrent ? 'Present' : (endRaw ? endRaw.substring(0, 7) : '');
                const description = exp.description || '';
                const achievements = exp.achievements || [];

                return (
                  <View key={idx} style={{ marginBottom: 14 }}>
                    <View style={styles.compactRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.title}>{jobTitle}</Text>
                        {(company || location) && (
                          <Text style={[styles.subtitle, { marginTop: 2 }]}>
                            {company}{location ? ` • ${location}` : ''}
                          </Text>
                        )}
                      </View>
                      {(start || end) && (
                        <Text style={styles.date}>{start} - {end}</Text>
                      )}
                    </View>
                    {description && (
                      <Text style={[styles.text, { marginTop: 5 }]}>{description}</Text>
                    )}
                    {achievements && achievements.length > 0 && (
                      <View style={{ marginTop: 2 }}>
                        {achievements.map((ach: string, aIdx: number) => ( // Use ALL achievement bullets
                          <Text key={aIdx} style={styles.bullet}>
                            • {ach}
                          </Text>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
          </View>
        )}

        {/* Education */}
        {education && education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EDUCATION</Text>
            {education
              .sort((a: any, b: any) => {
                const aEnd = a.end_date || a.end || a.endDate || '';
                const bEnd = b.end_date || b.end || b.endDate || '';
                const aCurrent = a.is_current || /present/i.test(aEnd);
                const bCurrent = b.is_current || /present/i.test(bEnd);
                
                if (aCurrent && !bCurrent) return -1;
                if (!aCurrent && bCurrent) return 1;
                if (aEnd && bEnd) return bEnd.localeCompare(aEnd);
                return 0;
              })
              // Use ALL education entries from data
              .map((edu: any, idx: number) => {
                const institution = edu.institution_name || edu.institution || edu.school || edu.university || edu.college;
                let degree = edu.degree || edu.degree_title || edu.title || '';
                degree = degree.replace(/^B\.tech$/i, 'B.Tech').replace(/^b\.tech$/i, 'B.Tech');
                degree = degree.replace(/^M\.tech$/i, 'M.Tech').replace(/^m\.tech$/i, 'M.Tech');
                const field = edu.field_of_study || edu.major || edu.specialization;
                const start = edu.start_date ? edu.start_date.substring(0, 4) : (edu.start ? edu.start.substring(0, 4) : '');
                const endRaw = edu.end_date || edu.end || edu.endDate;
                const isCurrent = (edu.is_current ?? edu.current) ?? (typeof endRaw === 'string' && /present/i.test(endRaw));
                const end = isCurrent ? 'Present' : (endRaw ? endRaw.substring(0, 4) : '');
                const cgpa = edu.cgpa_percentage || edu.cgpa || edu.gpa || edu.score;

                return (
                  <View key={idx} style={{ marginBottom: 14 }}>
                    <View style={styles.compactRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.title}>
                          {degree || ''} {institution ? `- ${institution}` : ''}
                        </Text>
                        {field && (
                          <Text style={[styles.subtitle, { marginTop: 2, marginBottom: 1 }]}>{field}</Text>
                        )}
                        {cgpa && (
                          <Text style={[styles.subtitle, { marginTop: 1, marginBottom: 0 }]}>CGPA: {cgpa}</Text>
                        )}
                      </View>
                      {(start || end) && (
                        <Text style={styles.date}>{start} - {end}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
          </View>
        )}

        {/* Skills - Exclude languages if they exist separately */}
        {skills && Object.keys(skills).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SKILLS</Text>
            {Object.entries(skills).map(([category, skillList]: [string, any]) => {
              // Skip languages if they have a separate section
              const categoryLower = category.toLowerCase();
              if ((categoryLower === 'languages' || categoryLower === 'language') && languages && languages.length > 0) {
                return null;
              }
              const skillsArray = Array.isArray(skillList) ? skillList : [];
              if (skillsArray.length === 0) return null;
              return (
                <View key={category} style={{ marginBottom: 6 }}>
                  <Text style={styles.skillCategory}>{category.charAt(0).toUpperCase() + category.slice(1)}: </Text>
                  <Text style={styles.skillItems}>{skillsArray.join(', ')}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Projects - Use ALL projects */}
        {projects && projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PROJECTS</Text>
            {projects.map((project: any, idx: number) => ( // Use top 3 projects (ResumeItNow best practice)
              <View key={idx} style={{ marginBottom: 18 }}> {/* More spacing between projects */}
                <View style={{ marginBottom: 6 }}>
                  {project.url ? (
                    <Link
                      src={
                        project.url.startsWith('http://') || project.url.startsWith('https://')
                          ? project.url
                          : `https://${project.url}`
                      }
                      style={{ color: '#0066cc', textDecoration: 'underline', fontSize: 11, fontWeight: 'bold' }}
                    >
                      {project.project_title || project.title || project.projectName}
                    </Link>
                  ) : (
                    <Text style={styles.title}>
                      {project.project_title || project.title || project.projectName}
                    </Text>
                  )}
                </View>
                {project.description && (
                  <Text style={{ 
                    marginTop: 8, 
                    marginBottom: 10, 
                    fontSize: 10, 
                    lineHeight: 1.6, 
                    paddingLeft: 0,
                    textAlign: 'justify' as any,
                    color: templateConfig?.colorScheme?.secondary || '#333333'
                  }}>
                    {/* Clean bullet points and normalize whitespace (same as preview) */}
                    {project.description
                      .replace(/^[-•*]\s+/gm, '')
                      .replace(/\n+/g, ' ')
                      .replace(/\s+/g, ' ')
                      .trim()}
                  </Text>
                )}
                {project.technologies_used && project.technologies_used.length > 0 && (
                  <Text style={{ 
                    fontSize: 9.5, 
                    color: templateConfig?.colorScheme?.secondary || '#333333',
                    fontStyle: 'italic',
                    marginTop: 6,
                    marginBottom: 2
                  }}>
                    <Text style={{ fontWeight: 'bold' }}>Tech Stack:</Text> {Array.isArray(project.technologies_used)
                      ? project.technologies_used.join(' • ') // Match preview: use bullet separator
                      : project.technologies_used}
                  </Text>
                )}
                {/* Hide contributions if description is AI-enhanced (3 sentences) - same as preview */}
                {project.contributions && project.contributions.length > 0 && 
                 (!project.description || project.description.split('.').filter((s: string) => s.trim().length > 10).length < 3) && (
                  <View style={{ marginTop: 3 }}>
                    {project.contributions.map((contribution: string, cIdx: number) => (
                      <Text key={cIdx} style={{ fontSize: 10, marginBottom: 2, marginLeft: 18, lineHeight: 1.35 }}>
                        • {contribution}
                      </Text>
                    ))}
                  </View>
                )}
                {(!project.contributions || project.contributions.length === 0) && project.role_contribution && (
                  <Text style={{ fontSize: 9, marginLeft: 16, lineHeight: 1.25 }}>
                    • {project.role_contribution.length > 100 ? project.role_contribution.substring(0, 100) + '...' : project.role_contribution}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Certifications - Use ALL certifications */}
        {certifications && certifications.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CERTIFICATIONS</Text>
            {certifications
              .filter((cert: any) => cert && (cert.certification_name || cert.title || cert.certificationName))
              // Use ALL certifications from data
              .map((cert: any, idx: number) => {
                const certName = cert.certification_name || cert.title || cert.certificationName || '';
                const org = cert.issuing_organization || cert.organization || cert.issuer || cert.issuingOrganization || '';
                const date = cert.issue_date || cert.date_issued || cert.date || cert.issueDate || '';
                
                let certText = certName;
                if (org && org.trim() && org.trim() !== certName.trim()) {
                  certText += ` - ${org}`;
                }
                if (date && date.trim()) {
                  const formattedDate = date.length > 4 ? date.substring(0, 4) : date;
                  certText += ` (${formattedDate})`;
                }
                
                return (
                  <Text key={idx} style={{ fontSize: 10, marginBottom: 2, marginLeft: 18, lineHeight: 1.35 }}>
                    • {certText}
                  </Text>
                );
              })}
          </View>
        )}

        {/* Achievements - Use ALL achievements */}
        {achievements && achievements.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ACHIEVEMENTS</Text>
            {achievements
              .filter((ach: any) => ach && (ach.achievement_title || ach.title))
              // Use ALL achievements from data
              .map((ach: any, idx: number) => {
                const title = ach.achievement_title || ach.title || '';
                const desc = ach.description || '';
                
                let achievementText = title;
                if (desc && desc.trim() && desc.length < 60) { // Truncate long descriptions
                  achievementText += `: ${desc}`;
                } else if (desc && desc.trim()) {
                  achievementText += `: ${desc.substring(0, 60)}...`;
                }
                
                return (
                  <Text key={idx} style={{ fontSize: 9, marginBottom: 3, marginLeft: 16, lineHeight: 1.5 }}>
                    • {achievementText}
                  </Text>
                );
              })}
          </View>
        )}

        {/* Extracurricular - Use ALL entries */}
        {extracurricular && extracurricular.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EXTRACURRICULAR</Text>
            {extracurricular.map((extra: any, idx: number) => (
              <View key={idx} style={{ marginBottom: 4 }}>
                <Text style={styles.bullet}>
                  • <Text style={styles.title}>
                    {extra.activity_organization || extra.activity_name}
                    {extra.role && ` - ${extra.role}`}
                  </Text>
                  {extra.description && extra.description.length < 60 && (
                    <Text style={styles.text}>: {extra.description}</Text>
                  )}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Languages - Separate section after Skills (extract from skills if needed) */}
        {(() => {
          // Extract languages from skills if not provided separately
          let languagesToShow = languages || [];
          if (languagesToShow.length === 0 && skills) {
            const langCategory = Object.entries(skills).find(([cat]) => 
              cat.toLowerCase() === 'languages' || cat.toLowerCase() === 'language'
            );
            if (langCategory) {
              languagesToShow = Array.isArray(langCategory[1]) ? langCategory[1] : [];
            }
          }
          
          if (languagesToShow.length > 0) {
            return (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>LANGUAGES</Text>
                <Text style={styles.text}>
                  {languagesToShow
                    .map((lang: any) => {
                      const langName = typeof lang === 'string' ? lang : (lang.language || lang.name || '');
                      const proficiency = typeof lang === 'object' && lang.proficiency ? ` (${lang.proficiency})` : '';
                      return langName + proficiency;
                    })
                    .filter((s: string) => s && s.trim())
                    .join(' • ')}
                </Text>
              </View>
            );
          }
          return null;
        })()}

        {/* Hobbies - Use ALL entries */}
        {hobbies && hobbies.length > 0 && (
          <View style={[styles.section, { marginTop: 4 }]}>
            <Text style={styles.sectionTitle}>INTERESTS</Text>
            <Text style={styles.text}>
              {hobbies
                .map((hobby: any) => typeof hobby === 'string' ? hobby : (hobby.hobby_name || hobby.name || hobby.title || ''))
                .filter((s: string) => s && s.trim())
                .join(' • ')}
            </Text>
          </View>
        )}

        {/* References - Use ALL entries if provided */}
        {references && references.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>REFERENCES</Text>
            {references.map((ref: any, idx: number) => (
              <View key={idx} style={styles.subsection}>
                <Text style={styles.title}>{ref.name || ''}</Text>
                {(ref.position || ref.company) && (
                  <Text style={styles.subtitle}>
                    {ref.position}{ref.company ? ` at ${ref.company}` : ''}
                  </Text>
                )}
                {(ref.email || ref.phone) && (
                  <Text style={styles.contact}>
                    {ref.email || ''}{ref.email && ref.phone ? ' | ' : ''}{ref.phone || ''}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );

  // Generate PDF blob
  return await pdf(ResumePDF).toBlob();
}

/**
 * Download PDF file
 */
export function downloadPDF(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
