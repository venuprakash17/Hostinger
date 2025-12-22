/**
 * Skills-First Template
 * For students with limited projects but strong skills and certifications
 * Skills section immediately after summary
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
  }>;
  skills?: Record<string, string[]>;
  certifications?: Array<{
    certification_name?: string;
    issuing_organization?: string;
    issue_date?: string;
  }>;
}

interface SkillsFirstProps {
  resumeData: ResumeData;
  className?: string;
}

export function SkillsFirst({ resumeData, className = '' }: SkillsFirstProps) {
  const { profile, summary, education, projects, skills, certifications } = resumeData;

  const sectionStyle = {
    fontSize: '11pt',
    fontWeight: 'bold' as const,
    textTransform: 'uppercase' as const,
    borderBottom: '1px solid #000',
    paddingBottom: '3px',
    marginBottom: '8px',
    letterSpacing: '0.5px'
  };

  return (
    <div className={`resume-template skills-first ${className}`} style={{
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontSize: '10pt',
      lineHeight: '1.4',
      color: '#000000',
      maxWidth: '8.5in',
      margin: '0 auto',
      padding: '0.75in',
      backgroundColor: '#ffffff'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'left', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '15px' }}>
        <h1 style={{
          fontSize: '20pt',
          fontWeight: 'bold',
          marginBottom: '5px',
          margin: '0 0 5px 0'
        }}>
          {profile?.full_name || 'Your Name'}
        </h1>
        <div style={{ fontSize: '9pt', color: '#333' }}>
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

      {/* Summary */}
      {summary && (
        <div style={{ marginBottom: '12px' }}>
          <h2 style={sectionStyle}>Professional Summary</h2>
          <p style={{ margin: 0, fontSize: '10pt' }}>{summary}</p>
        </div>
      )}

      {/* Skills - Immediately after summary */}
      {skills && (
        <div style={{ marginBottom: '12px' }}>
          <h2 style={sectionStyle}>Skills</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {Object.entries(skills).map(([category, skillList]) => {
              const skillsArray = Array.isArray(skillList) ? skillList : [];
              if (skillsArray.length === 0) return null;
              return (
                <div key={category} style={{ marginBottom: '8px' }}>
                  <strong style={{ fontSize: '10pt', display: 'block', marginBottom: '3px' }}>
                    {category}:
                  </strong>
                  <div style={{ fontSize: '10pt', lineHeight: '1.6' }}>
                    {skillsArray.join(' • ')}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Certifications - After skills */}
      {certifications && certifications.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <h2 style={sectionStyle}>Certifications</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {certifications.map((cert, idx) => (
              <div key={idx} style={{ fontSize: '10pt', marginBottom: '5px' }}>
                <strong>{cert.certification_name}</strong>
                {cert.issuing_organization && <span> - {cert.issuing_organization}</span>}
                {cert.issue_date && <span style={{ color: '#666' }}> ({cert.issue_date.substring(0, 4)})</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education - Compact section */}
      {education && education.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <h2 style={sectionStyle}>Education</h2>
          {education.map((edu, idx) => (
            <div key={idx} style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong style={{ fontSize: '11pt' }}>{edu.degree || edu.institution_name}</strong>
                  {edu.institution_name && edu.degree && (
                    <span style={{ fontSize: '10pt', color: '#333' }}> - {edu.institution_name}</span>
                  )}
                </div>
                <span style={{ fontSize: '9pt', color: '#666' }}>
                  {edu.start_date?.substring(0, 4) || ''} - {edu.is_current ? 'Present' : (edu.end_date?.substring(0, 4) || '')}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      {projects && projects.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <h2 style={sectionStyle}>Projects</h2>
          {projects.map((proj, idx) => (
            <div key={idx} style={{ marginBottom: '10px' }}>
              <div style={{ marginBottom: '3px' }}>
                <strong style={{ fontSize: '11pt' }}>{proj.project_title}</strong>
              </div>
              {proj.description && (
                <p style={{ margin: '3px 0', fontSize: '10pt' }}>{proj.description}</p>
              )}
              {proj.technologies_used && proj.technologies_used.length > 0 && (
                <div style={{ fontSize: '10pt', color: '#333' }}>
                  {Array.isArray(proj.technologies_used) ? proj.technologies_used.join(' • ') : proj.technologies_used}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

