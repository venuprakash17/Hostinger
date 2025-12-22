/**
 * Fresher Classic Template
 * Safe default for mass applications - IT, non-IT, and service companies
 * Traditional layout with strong section headers
 */

import React from 'react';

interface ResumeData {
  profile: {
    full_name?: string;
    email?: string;
    phone_number?: string;
    linkedin_profile?: string;
    github_portfolio?: string;
    address?: string;
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
  projects?: Array<{
    project_title?: string;
    description?: string;
    technologies_used?: string[];
    contributions?: string[];
    duration_start?: string;
    duration_end?: string;
  }>;
  skills?: Record<string, string[]> | Array<{ category?: string; skills?: string[] }>;
  certifications?: Array<{
    certification_name?: string;
    issuing_organization?: string;
    issue_date?: string;
  }>;
  achievements?: Array<{
    title?: string;
    description?: string;
  }>;
  work_experience?: Array<{
    job_title?: string;
    company?: string;
    start_date?: string;
    end_date?: string;
    description?: string;
  }>;
}

interface CustomizationSettings {
  fontFamily: string;
  baseFontSize: number;
  headingFontSize: number;
  sectionTitleFontSize: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  lineHeight: number;
  sectionSpacing: number;
  paragraphSpacing: number;
  marginPadding: number;
  headerAlignment: 'left' | 'center';
  sectionTitleStyle: 'underline' | 'bold' | 'both';
}

interface FresherClassicProps {
  resumeData: ResumeData;
  className?: string;
  customization?: CustomizationSettings;
}

export function FresherClassic({ resumeData, className = '', customization }: FresherClassicProps) {
  const { profile, summary, education, projects, skills, certifications, achievements, work_experience } = resumeData;

  // Apply customization or use defaults
  const settings = customization || {
    fontFamily: 'Helvetica, Arial, sans-serif',
    baseFontSize: 10,
    headingFontSize: 22,
    sectionTitleFontSize: 11,
    primaryColor: '#000000',
    secondaryColor: '#333333',
    accentColor: '#0066cc',
    lineHeight: 1.4,
    sectionSpacing: 15,
    paragraphSpacing: 6,
    marginPadding: 0.75,
    headerAlignment: 'center',
    sectionTitleStyle: 'both',
  };

  const getSectionTitleStyle = () => {
    const base: React.CSSProperties = {
      fontSize: `${settings.sectionTitleFontSize}pt`,
      fontWeight: 'bold',
      marginBottom: `${settings.paragraphSpacing}px`,
      marginTop: '0',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      color: settings.primaryColor,
    };
    if (settings.sectionTitleStyle === 'underline' || settings.sectionTitleStyle === 'both') {
      base.borderBottom = `1px solid ${settings.primaryColor}`;
      base.paddingBottom = '2px';
    }
    return base;
  };

  return (
    <div className={`resume-template fresher-classic ${className}`} style={{
      fontFamily: settings.fontFamily,
      fontSize: `${settings.baseFontSize}pt`,
      lineHeight: settings.lineHeight.toString(),
      color: settings.secondaryColor,
      maxWidth: '8.5in',
      margin: '0 auto',
      padding: `${settings.marginPadding}in`,
      backgroundColor: '#ffffff'
    }}>
      {/* Header */}
      <div style={{
        textAlign: settings.headerAlignment,
        borderBottom: `2px solid ${settings.primaryColor}`,
        paddingBottom: '10px',
        marginBottom: `${settings.sectionSpacing}px`
      }}>
        <h1 style={{
          fontSize: `${settings.headingFontSize}pt`,
          fontWeight: 'bold',
          marginBottom: '5px',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          margin: '0 0 5px 0',
          color: settings.primaryColor
        }}>
          {profile?.full_name || 'Your Name'}
        </h1>
        <div style={{
          fontSize: '9pt',
          color: settings.secondaryColor
        }}>
          {profile?.email && <span>{profile.email}</span>}
          {profile?.phone_number && <span> | {profile.phone_number}</span>}
          {profile?.address && <span> | {profile.address}</span>}
          {profile?.company_name && <span> | Targeting: {profile.company_name}</span>}
          {profile?.linkedin_profile && (
            <span>
              {' | '}
              <a 
                href={profile.linkedin_profile.startsWith('http') ? profile.linkedin_profile : `https://${profile.linkedin_profile}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#0066cc', textDecoration: 'underline' }}
              >
                LinkedIn
              </a>
            </span>
          )}
          {profile?.github_portfolio && (
            <span>
              {' | '}
              <a 
                href={profile.github_portfolio.startsWith('http') ? profile.github_portfolio : `https://${profile.github_portfolio}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#0066cc', textDecoration: 'underline' }}
              >
                GitHub
              </a>
            </span>
          )}
        </div>
      </div>

      {/* Professional Summary */}
      {summary && (
        <div style={{ marginBottom: `${settings.sectionSpacing}px` }}>
          <h2 style={getSectionTitleStyle()}>
            Professional Summary
          </h2>
          <p style={{ 
            margin: 0, 
            fontSize: `${settings.baseFontSize}pt`,
            lineHeight: settings.lineHeight,
            color: settings.secondaryColor
          }}>{summary}</p>
        </div>
      )}

      {/* Education */}
      {education && education.length > 0 && (
        <div style={{ marginBottom: `${settings.sectionSpacing}px` }}>
          <h2 style={getSectionTitleStyle()}>
            Education
          </h2>
          {education.map((edu, idx) => (
            <div key={idx} style={{ marginBottom: `${settings.paragraphSpacing}px` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <div>
                  <strong style={{ 
                    fontSize: `${settings.baseFontSize + 1}pt`,
                    color: settings.primaryColor
                  }}>
                    {edu.degree || edu.institution_name}
                  </strong>
                  {edu.institution_name && edu.degree && (
                    <span style={{ 
                      fontSize: `${settings.baseFontSize}pt`, 
                      color: settings.secondaryColor 
                    }}> - {edu.institution_name}</span>
                  )}
                </div>
                <span style={{ 
                  fontSize: `${settings.baseFontSize - 1}pt`, 
                  color: settings.secondaryColor 
                }}>
                  {edu.start_date?.substring(0, 4) || ''} - {edu.is_current ? 'Present' : (edu.end_date?.substring(0, 4) || '')}
                </span>
              </div>
              {edu.field_of_study && (
                <div style={{ 
                  fontSize: `${settings.baseFontSize}pt`, 
                  color: settings.secondaryColor 
                }}>{edu.field_of_study}</div>
              )}
              {edu.cgpa_percentage && (
                <div style={{ 
                  fontSize: `${settings.baseFontSize}pt`, 
                  color: settings.secondaryColor 
                }}>CGPA: {edu.cgpa_percentage}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Work Experience */}
      {work_experience && work_experience.length > 0 && (
        <div style={{ marginBottom: `${settings.sectionSpacing}px` }}>
          <h2 style={getSectionTitleStyle()}>
            Work Experience
          </h2>
          {work_experience.map((exp, idx) => (
            <div key={idx} style={{ marginBottom: `${settings.paragraphSpacing}px` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <div>
                  <strong style={{ 
                    fontSize: `${settings.baseFontSize + 1}pt`,
                    color: settings.primaryColor
                  }}>{exp.job_title}</strong>
                  {exp.company && (
                    <span style={{ 
                      fontSize: `${settings.baseFontSize}pt`, 
                      color: settings.secondaryColor 
                    }}> - {exp.company}</span>
                  )}
                </div>
                <span style={{ 
                  fontSize: `${settings.baseFontSize - 1}pt`, 
                  color: settings.secondaryColor 
                }}>
                  {exp.start_date?.substring(0, 7) || ''} - {exp.end_date?.substring(0, 7) || 'Present'}
                </span>
              </div>
              {exp.description && (
                <p style={{ 
                  margin: '3px 0', 
                  fontSize: `${settings.baseFontSize}pt`,
                  lineHeight: settings.lineHeight,
                  color: settings.secondaryColor
                }}>{exp.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      {projects && projects.length > 0 && (
        <div style={{ marginBottom: `${settings.sectionSpacing}px` }}>
          <h2 style={getSectionTitleStyle()}>
            Projects
          </h2>
          {projects.map((proj, idx) => (
            <div key={idx} style={{ marginBottom: `${settings.paragraphSpacing}px` }}>
              <div style={{ marginBottom: '3px' }}>
                <strong style={{ 
                  fontSize: `${settings.baseFontSize + 1}pt`,
                  color: settings.primaryColor
                }}>{proj.project_title}</strong>
              </div>
              {proj.description && (
                <p style={{ 
                  margin: '3px 0', 
                  fontSize: `${settings.baseFontSize}pt`,
                  lineHeight: settings.lineHeight,
                  color: settings.secondaryColor
                }}>{proj.description}</p>
              )}
              {proj.technologies_used && proj.technologies_used.length > 0 && (
                <div style={{ 
                  fontSize: `${settings.baseFontSize}pt`, 
                  color: settings.secondaryColor 
                }}>
                  Technologies: {Array.isArray(proj.technologies_used) ? proj.technologies_used.join(', ') : proj.technologies_used}
                </div>
              )}
              {proj.contributions && proj.contributions.length > 0 && (
                <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                  {proj.contributions.map((contribution, cIdx) => (
                    <li key={cIdx} style={{ 
                      fontSize: `${settings.baseFontSize}pt`, 
                      marginBottom: '2px',
                      lineHeight: settings.lineHeight,
                      color: settings.secondaryColor
                    }}>{contribution}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {skills && (
        <div style={{ marginBottom: `${settings.sectionSpacing}px` }}>
          <h2 style={getSectionTitleStyle()}>
            Skills
          </h2>
          {typeof skills === 'object' && !Array.isArray(skills) && Object.keys(skills).length > 0 && (
            <div>
              {Object.entries(skills).map(([category, skillList]) => {
                const skillsArray = Array.isArray(skillList) ? skillList : [];
                if (skillsArray.length === 0) return null;
                return (
                  <div key={category} style={{ marginBottom: '5px' }}>
                    <strong style={{ 
                      fontSize: `${settings.baseFontSize}pt`,
                      color: settings.primaryColor
                    }}>{category}:</strong>{' '}
                    <span style={{ 
                      fontSize: `${settings.baseFontSize}pt`,
                      color: settings.secondaryColor
                    }}>{skillsArray.join(', ')}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Certifications */}
      {certifications && certifications.length > 0 && (
        <div style={{ marginBottom: `${settings.sectionSpacing}px` }}>
          <h2 style={getSectionTitleStyle()}>
            Certifications
          </h2>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {certifications.map((cert, idx) => (
              <li key={idx} style={{ 
                fontSize: `${settings.baseFontSize}pt`, 
                marginBottom: '3px',
                lineHeight: settings.lineHeight,
                color: settings.secondaryColor
              }}>
                {cert.certification_name} - {cert.issuing_organization}
                {cert.issue_date && ` (${cert.issue_date.substring(0, 4)})`}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Achievements */}
      {achievements && achievements.length > 0 && (
        <div style={{ marginBottom: `${settings.sectionSpacing}px` }}>
          <h2 style={getSectionTitleStyle()}>
            Achievements
          </h2>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            {achievements.map((achievement, idx) => (
              <li key={idx} style={{ 
                fontSize: `${settings.baseFontSize}pt`, 
                marginBottom: '3px',
                lineHeight: settings.lineHeight,
                color: settings.secondaryColor
              }}>
                {achievement.title}
                {achievement.description && `: ${achievement.description}`}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

