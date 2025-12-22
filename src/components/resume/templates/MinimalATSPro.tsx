/**
 * Minimal ATS Pro Template
 * Maximum ATS compatibility and readability
 * Ultra-clean layout with large margins and simple typography
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
  work_experience?: Array<{
    job_title?: string;
    company?: string;
    start_date?: string;
    end_date?: string;
    description?: string;
  }>;
}

interface MinimalATSProProps {
  resumeData: ResumeData;
  className?: string;
}

export function MinimalATSPro({ resumeData, className = '' }: MinimalATSProProps) {
  const { profile, summary, education, projects, skills, certifications, work_experience } = resumeData;

  return (
    <div className={`resume-template minimal-ats ${className}`} style={{
      fontFamily: 'Helvetica, Arial, sans-serif',
      fontSize: '11pt',
      lineHeight: '1.6',
      color: '#000000',
      maxWidth: '8.5in',
      margin: '0 auto',
      padding: '1in',
      backgroundColor: '#ffffff'
    }}>
      {/* Header - Ultra simple */}
      <div style={{ textAlign: 'left', marginBottom: '20px', borderBottom: '1px solid #ccc', paddingBottom: '15px' }}>
        <h1 style={{
          fontSize: '18pt',
          fontWeight: 'bold',
          marginBottom: '8px',
          margin: '0 0 8px 0',
          letterSpacing: '0.3px'
        }}>
          {profile?.full_name || 'Your Name'}
        </h1>
        <div style={{ fontSize: '10pt', color: '#555', lineHeight: '1.8' }}>
          {profile?.email && <div>{profile.email}</div>}
          {profile?.phone_number && <div>{profile.phone_number}</div>}
          {profile?.address && <div>{profile.address}</div>}
          {profile?.company_name && <div>Targeting: {profile.company_name}</div>}
          {profile?.linkedin_profile && (
            <div>
              <a 
                href={profile.linkedin_profile.startsWith('http') ? profile.linkedin_profile : `https://${profile.linkedin_profile}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#0066cc', textDecoration: 'underline' }}
              >
                LinkedIn
              </a>
            </div>
          )}
          {profile?.github_portfolio && (
            <div>
              <a 
                href={profile.github_portfolio.startsWith('http') ? profile.github_portfolio : `https://${profile.github_portfolio}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#0066cc', textDecoration: 'underline' }}
              >
                GitHub
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div style={{ marginBottom: '18px' }}>
          <h2 style={{
            fontSize: '12pt',
            fontWeight: 'bold',
            marginBottom: '10px',
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>
            Professional Summary
          </h2>
          <p style={{ margin: 0, fontSize: '11pt', lineHeight: '1.7' }}>{summary}</p>
        </div>
      )}

      {/* Education */}
      {education && education.length > 0 && (
        <div style={{ marginBottom: '18px' }}>
          <h2 style={{
            fontSize: '12pt',
            fontWeight: 'bold',
            marginBottom: '10px',
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>
            Education
          </h2>
          {education.map((edu, idx) => (
            <div key={idx} style={{ marginBottom: '12px' }}>
              <div style={{ marginBottom: '5px' }}>
                <strong style={{ fontSize: '11pt' }}>{edu.degree || edu.institution_name}</strong>
                {edu.institution_name && edu.degree && (
                  <span style={{ fontSize: '11pt' }}>, {edu.institution_name}</span>
                )}
                <span style={{ fontSize: '11pt', float: 'right', fontWeight: 'normal' }}>
                  {edu.start_date?.substring(0, 4) || ''} - {edu.is_current ? 'Present' : (edu.end_date?.substring(0, 4) || '')}
                </span>
              </div>
              {edu.field_of_study && (
                <div style={{ fontSize: '11pt', color: '#555', marginBottom: '3px' }}>{edu.field_of_study}</div>
              )}
              {edu.cgpa_percentage && (
                <div style={{ fontSize: '11pt', color: '#555' }}>CGPA: {edu.cgpa_percentage}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Work Experience */}
      {work_experience && work_experience.length > 0 && (
        <div style={{ marginBottom: '18px' }}>
          <h2 style={{
            fontSize: '12pt',
            fontWeight: 'bold',
            marginBottom: '10px',
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>
            Work Experience
          </h2>
          {work_experience.map((exp, idx) => (
            <div key={idx} style={{ marginBottom: '12px' }}>
              <div style={{ marginBottom: '5px' }}>
                <strong style={{ fontSize: '11pt' }}>{exp.job_title}</strong>
                {exp.company && <span style={{ fontSize: '11pt' }}>, {exp.company}</span>}
                <span style={{ fontSize: '11pt', float: 'right', fontWeight: 'normal' }}>
                  {exp.start_date?.substring(0, 7) || ''} - {exp.end_date?.substring(0, 7) || 'Present'}
                </span>
              </div>
              {exp.description && (
                <p style={{ margin: '5px 0', fontSize: '11pt', lineHeight: '1.7' }}>{exp.description}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Projects */}
      {projects && projects.length > 0 && (
        <div style={{ marginBottom: '18px' }}>
          <h2 style={{
            fontSize: '12pt',
            fontWeight: 'bold',
            marginBottom: '10px',
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>
            Projects
          </h2>
          {projects.map((proj, idx) => (
            <div key={idx} style={{ marginBottom: '12px' }}>
              <div style={{ marginBottom: '5px' }}>
                <strong style={{ fontSize: '11pt' }}>{proj.project_title}</strong>
              </div>
              {proj.description && (
                <p style={{ margin: '5px 0', fontSize: '11pt', lineHeight: '1.7' }}>{proj.description}</p>
              )}
              {proj.technologies_used && proj.technologies_used.length > 0 && (
                <div style={{ fontSize: '11pt', color: '#555', marginTop: '3px' }}>
                  {Array.isArray(proj.technologies_used) ? proj.technologies_used.join(', ') : proj.technologies_used}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Skills */}
      {skills && (
        <div style={{ marginBottom: '18px' }}>
          <h2 style={{
            fontSize: '12pt',
            fontWeight: 'bold',
            marginBottom: '10px',
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>
            Skills
          </h2>
          {Object.entries(skills).map(([category, skillList]) => {
            const skillsArray = Array.isArray(skillList) ? skillList : [];
            if (skillsArray.length === 0) return null;
            return (
              <div key={category} style={{ marginBottom: '8px', lineHeight: '1.7' }}>
                <strong style={{ fontSize: '11pt' }}>{category}:</strong>{' '}
                <span style={{ fontSize: '11pt' }}>{skillsArray.join(', ')}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Certifications */}
      {certifications && certifications.length > 0 && (
        <div style={{ marginBottom: '18px' }}>
          <h2 style={{
            fontSize: '12pt',
            fontWeight: 'bold',
            marginBottom: '10px',
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}>
            Certifications
          </h2>
          {certifications.map((cert, idx) => (
            <div key={idx} style={{ fontSize: '11pt', marginBottom: '6px', lineHeight: '1.7' }}>
              {cert.certification_name} - {cert.issuing_organization}
              {cert.issue_date && <span> ({cert.issue_date.substring(0, 4)})</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

