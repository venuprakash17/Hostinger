/**
 * Resume Template Types
 * Defines available resume templates and their configurations
 */

export type ResumeTemplate = 'modern' | 'professional' | 'minimal' | 'fresher_classic' | 'project_focused' | 'skills_first' | 'internship_focused' | 'minimal_ats';

export interface TemplateConfig {
  id: ResumeTemplate;
  name: string;
  description: string;
  fontFamily: string;
  fontSize: number;
  colorScheme: {
    primary: string;
    secondary: string;
    accent: string;
  };
  layout: {
    headerStyle: 'centered' | 'left' | 'split';
    sectionSpacing: number;
    bulletStyle: 'dash' | 'dot' | 'arrow';
  };
}

export const TEMPLATE_CONFIGS: Record<ResumeTemplate, TemplateConfig> = {
  modern: {
    id: 'modern',
    name: 'Modern',
    description: 'Clean, contemporary design with bold headers',
    fontFamily: 'Helvetica',
    fontSize: 10,
    colorScheme: {
      primary: '#000000',
      secondary: '#333333',
      accent: '#000000',
    },
    layout: {
      headerStyle: 'centered',
      sectionSpacing: 10,
      bulletStyle: 'dash',
    },
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    description: 'Traditional, conservative design for corporate roles',
    fontFamily: 'Helvetica',
    fontSize: 10,
    colorScheme: {
      primary: '#1a1a1a',
      secondary: '#4a4a4a',
      accent: '#000000',
    },
    layout: {
      headerStyle: 'left',
      sectionSpacing: 7,
      bulletStyle: 'dot',
    },
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    description: 'Simple, elegant design with maximum readability and spacing',
    fontFamily: 'Helvetica',
    fontSize: 10,
    colorScheme: {
      primary: '#000000',
      secondary: '#666666',
      accent: '#000000',
    },
    layout: {
      headerStyle: 'left',
      sectionSpacing: 12,
      bulletStyle: 'dash',
    },
  },
  fresher_classic: {
    id: 'fresher_classic',
    name: 'Fresher Classic',
    description: 'Safe default for mass applications. Works across IT, non-IT, and service companies',
    fontFamily: 'Helvetica',
    fontSize: 10,
    colorScheme: {
      primary: '#000000',
      secondary: '#333333',
      accent: '#000000',
    },
    layout: {
      headerStyle: 'centered',
      sectionSpacing: 10,
      bulletStyle: 'dot',
    },
  },
  project_focused: {
    id: 'project_focused',
    name: 'Project-Focused',
    description: 'Highlight strong academic and personal projects. Best for tech freshers',
    fontFamily: 'Helvetica',
    fontSize: 10,
    colorScheme: {
      primary: '#000000',
      secondary: '#333333',
      accent: '#000000',
    },
    layout: {
      headerStyle: 'left',
      sectionSpacing: 10,
      bulletStyle: 'dash',
    },
  },
  skills_first: {
    id: 'skills_first',
    name: 'Skills-First',
    description: 'For students with limited projects but strong skills and certifications',
    fontFamily: 'Helvetica',
    fontSize: 10,
    colorScheme: {
      primary: '#000000',
      secondary: '#333333',
      accent: '#000000',
    },
    layout: {
      headerStyle: 'left',
      sectionSpacing: 10,
      bulletStyle: 'dot',
    },
  },
  internship_focused: {
    id: 'internship_focused',
    name: 'Internship-Oriented',
    description: 'Showcase internships, workshops, and hands-on exposure',
    fontFamily: 'Helvetica',
    fontSize: 10,
    colorScheme: {
      primary: '#000000',
      secondary: '#333333',
      accent: '#000000',
    },
    layout: {
      headerStyle: 'centered',
      sectionSpacing: 10,
      bulletStyle: 'dash',
    },
  },
  minimal_ats: {
    id: 'minimal_ats',
    name: 'Minimal ATS Pro',
    description: 'Maximum ATS compatibility and readability. Ultra-clean layout',
    fontFamily: 'Helvetica',
    fontSize: 10,
    colorScheme: {
      primary: '#000000',
      secondary: '#666666',
      accent: '#000000',
    },
    layout: {
      headerStyle: 'left',
      sectionSpacing: 12,
      bulletStyle: 'dot',
    },
  },
};

