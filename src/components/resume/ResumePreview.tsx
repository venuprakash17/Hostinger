/**
 * Resume Preview Component
 * Optimized for real-time updates using CSS variables and React.memo
 */

import React, { memo, useEffect, useRef } from 'react';
// Customization settings interface (simplified for AI mode)
interface CustomizationSettings {
  fontFamily?: string;
  baseFontSize?: number;
  headingFontSize?: number;
  sectionTitleFontSize?: number;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  lineHeight?: number;
  sectionSpacing?: number;
  paragraphSpacing?: number;
  marginPadding?: number;
  headerAlignment?: 'left' | 'center';
  sectionTitleStyle?: 'underline' | 'bold' | 'both';
  visibleSections?: Record<string, boolean>;
}
import { ResumeData } from '@/services/resumeOptimizationService';
import {
  FresherClassic,
  ProjectFocused,
  SkillsFirst,
  InternshipFocused,
  MinimalATSPro,
} from './templates';
import { ResumeTemplate } from '@/lib/resumeitnow/types/templates';

interface ResumePreviewProps {
  resumeData: ResumeData;
  customization: CustomizationSettings;
  template: ResumeTemplate;
  previewKey?: number;
}

export const ResumePreview = memo(function ResumePreview({
  resumeData,
  customization,
  template,
  previewKey = 0,
}: ResumePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Debug logging to track when projects change
  useEffect(() => {
    console.log('[ResumePreview] Component rendered with:', {
      projectCount: resumeData.projects?.length || 0,
      firstProjectTitle: resumeData.projects?.[0]?.project_title,
      firstProjectDesc: resumeData.projects?.[0]?.description?.substring(0, 100),
      previewKey,
      template,
    });
  }, [resumeData.projects, previewKey, template]);

  // Apply CSS variables only if customization is provided (for AI mode, it's undefined)
  useEffect(() => {
    if (containerRef.current && customization) {
      const root = containerRef.current;
      // Apply customization settings as CSS variables if provided
      if (customization.fontFamily) root.style.setProperty('--resume-font-family', customization.fontFamily);
      if (customization.baseFontSize) root.style.setProperty('--resume-base-font-size', `${customization.baseFontSize}pt`);
      if (customization.headingFontSize) root.style.setProperty('--resume-heading-font-size', `${customization.headingFontSize}pt`);
      if (customization.sectionTitleFontSize) root.style.setProperty('--resume-section-title-font-size', `${customization.sectionTitleFontSize}pt`);
      if (customization.primaryColor) root.style.setProperty('--resume-primary-color', customization.primaryColor);
      if (customization.secondaryColor) root.style.setProperty('--resume-secondary-color', customization.secondaryColor);
      if (customization.accentColor) root.style.setProperty('--resume-accent-color', customization.accentColor);
      if (customization.lineHeight) root.style.setProperty('--resume-line-height', String(customization.lineHeight));
      if (customization.sectionSpacing) root.style.setProperty('--resume-section-spacing', `${customization.sectionSpacing}px`);
      if (customization.paragraphSpacing) root.style.setProperty('--resume-paragraph-spacing', `${customization.paragraphSpacing}px`);
      if (customization.marginPadding) root.style.setProperty('--resume-margin-padding', `${customization.marginPadding}in`);
    }
  }, [customization]);

  const props = {
    resumeData,
    customization,
    className: 'resume-preview-template',
  };

  const templateKey = `template-${template}-${previewKey}`;

  const renderTemplate = () => {
    switch (template) {
      case 'fresher_classic':
        return <FresherClassic key={templateKey} {...props} />;
      case 'project_focused':
        return <ProjectFocused key={templateKey} {...props} />;
      case 'skills_first':
        return <SkillsFirst key={templateKey} {...props} />;
      case 'internship_focused':
        return <InternshipFocused key={templateKey} {...props} />;
      case 'minimal_ats':
        return <MinimalATSPro key={templateKey} {...props} />;
      case 'modern':
      case 'professional':
      case 'minimal':
        return <FresherClassic key={templateKey} {...props} />;
      default:
        return <FresherClassic key={templateKey} {...props} />;
    }
  };

  return (
    <div
      ref={containerRef}
      className="resume-preview-wrapper"
      style={{
        // CSS variables will be applied via useEffect
        fontFamily: 'var(--resume-font-family, Helvetica, Arial, sans-serif)',
      }}
    >
      {renderTemplate()}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to ensure re-render when projects change
  const prevProjects = prevProps.resumeData?.projects || [];
  const nextProjects = nextProps.resumeData?.projects || [];
  
  // Always re-render if projects array reference changed or length changed
  if (prevProjects !== nextProjects || prevProjects.length !== nextProjects.length) {
    return false; // Re-render
  }
  
  // Check if project descriptions changed
  for (let i = 0; i < prevProjects.length; i++) {
    if (prevProjects[i]?.description !== nextProjects[i]?.description) {
      return false; // Re-render
    }
  }
  
  // Re-render if previewKey, template, or customization changed
  if (
    prevProps.previewKey !== nextProps.previewKey ||
    prevProps.template !== nextProps.template ||
    prevProps.customization !== nextProps.customization
  ) {
    return false; // Re-render
  }
  
  return true; // Skip re-render
});

