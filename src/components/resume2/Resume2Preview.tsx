import { ScrollArea } from '@/components/ui/scroll-area';
import { Resume2Data } from '@/pages/Resume2';
import { ResumeTemplate } from '@/lib/resumeitnow/types/templates';
import { FresherClassic } from '@/components/resume/templates/FresherClassic';
import { ProjectFocused } from '@/components/resume/templates/ProjectFocused';
import { SkillsFirst } from '@/components/resume/templates/SkillsFirst';
import { InternshipFocused } from '@/components/resume/templates/InternshipFocused';
import { MinimalATSPro } from '@/components/resume/templates/MinimalATSPro';

interface Resume2PreviewProps {
  data: Resume2Data;
  template: ResumeTemplate;
}

export function Resume2Preview({ data, template }: Resume2PreviewProps) {
  // Convert Resume2Data to format expected by templates
  const resumeData = {
    profile: {
      full_name: data.personalInfo.fullName || 'Your Name',
      email: data.personalInfo.email || '',
      phone_number: data.personalInfo.phone || '',
      address: data.personalInfo.location || '',
      linkedin_profile: data.personalInfo.linkedin || '',
      github_portfolio: data.personalInfo.github || '',
      website: data.personalInfo.website || '',
    },
    summary: data.personalInfo.summary || '',
    education: data.education.map(edu => ({
      degree: edu.degree,
      institution_name: edu.institution,
      field_of_study: edu.field,
      start_date: edu.startDate,
      end_date: edu.endDate,
      is_current: edu.isCurrent,
      cgpa_percentage: edu.gpa,
    })),
    work_experience: data.experience.map(exp => ({
      job_title: exp.jobTitle,
      company: exp.company,
      location: exp.location,
      start_date: exp.startDate,
      end_date: exp.endDate,
      is_current: exp.isCurrent,
      description: exp.description,
    })),
    projects: data.projects.map(proj => ({
      project_title: proj.name,
      description: proj.description,
      technologies_used: proj.technologies,
      url: proj.url,
      duration_start: proj.startDate,
      duration_end: proj.endDate,
    })),
    skills: data.skills,
    certifications: data.certifications.map(cert => ({
      name: cert.name,
      issuer: cert.issuer,
      date: cert.date,
      url: cert.url,
    })),
    achievements: data.achievements.map(ach => ({
      title: ach.title,
      description: ach.description,
      date: ach.date,
    })),
  };

  const renderTemplate = () => {
    const props = { resumeData, customization: undefined, className: 'resume-preview' };
    
    switch (template) {
      case 'fresher_classic':
        return <FresherClassic {...props} />;
      case 'project_focused':
        return <ProjectFocused {...props} />;
      case 'skills_first':
        return <SkillsFirst {...props} />;
      case 'internship_focused':
        return <InternshipFocused {...props} />;
      case 'minimal_ats':
        return <MinimalATSPro {...props} />;
      default:
        return <FresherClassic {...props} />;
    }
  };

  return (
    <ScrollArea className="h-[800px] w-full">
      <div className="p-4 bg-white shadow-lg" style={{ minHeight: '800px' }}>
        {renderTemplate()}
      </div>
    </ScrollArea>
  );
}

