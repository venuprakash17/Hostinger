/**
 * Resume Preview Modal - Redesigned
 * Clean, modern design with prominent preview and real-time template switching
 */

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Download, FileText, X, Eye, Sparkles, Target, Lightbulb, Input as InputIcon, Briefcase, GripVertical, Edit2, Save, Trash2 } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useToast } from '@/hooks/use-toast';
import { ResumeTemplate, TEMPLATE_CONFIGS } from '@/lib/resumeitnow/types/templates';
import {
  FresherClassic,
  ProjectFocused,
  SkillsFirst,
  InternshipFocused,
  MinimalATSPro,
} from './templates';
import { ResumePreview } from './ResumePreview';
import { 
  type ResumeData, 
  optimizeResume, 
  calculateATSScore,
  type ATSScoreResponse 
} from '@/services/resumeOptimizationService';
import { generateATSSafePDF } from '@/lib/resumeitnow/services/pdfGeneratorService';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { ProjectSuggestionModal } from './ProjectSuggestionModal';
import { resumeStorage } from '@/lib/resumeStorage';

// Helper function to get API base URL
const getAPIBase = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  // If in development and URL contains production IP, use localhost
  if (import.meta.env.DEV && envUrl && envUrl.includes('72.60.101.14')) {
    return 'http://localhost:8000/api/v1';
  }
  return envUrl || 'http://localhost:8000/api/v1';
};

interface ResumePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumeData: ResumeData;
  targetRole?: string;
  companyName?: string;
  jobDescription?: string;
  mode?: 'ai-powered'; // Only AI-powered mode supported
}

export const ResumePreviewModal = memo(function ResumePreviewModal({ 
  open, 
  onOpenChange, 
  resumeData, 
  targetRole: initialTargetRole,
  companyName: initialCompanyName,
  jobDescription: initialJobDescription,
  mode = 'ai-powered' as const
}: ResumePreviewModalProps) {
  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<ResumeTemplate>('fresher_classic');
  const [displayData, setDisplayData] = useState<ResumeData>(resumeData);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  
  // Job application fields
  const [targetRole, setTargetRole] = useState(initialTargetRole || '');
  const [companyName, setCompanyName] = useState(initialCompanyName || '');
  const [jobDescription, setJobDescription] = useState(initialJobDescription || '');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [atsScore, setAtsScore] = useState<ATSScoreResponse | null>(null);
  const [showProjectSuggestions, setShowProjectSuggestions] = useState(false);
  const [optimizationImprovements, setOptimizationImprovements] = useState<string[]>([]);
  
  // Drag and drop states
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState<string>('');
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // For AI-powered mode, we use displayData directly (no customization panel)
  // IMPORTANT: This must update when displayData.projects changes
  const customizedData = useMemo(() => {
    console.log('[ResumePreview] customizedData memo updated:', {
      hasProjects: !!displayData.projects,
      projectCount: displayData.projects?.length || 0,
      firstProjectTitle: displayData.projects?.[0]?.project_title,
      firstProjectDesc: displayData.projects?.[0]?.description?.substring(0, 50),
    });
    return displayData;
  }, [displayData, displayData.projects]); // Explicitly depend on projects

  // Memoize getCustomizedData function
  const getCustomizedData = useCallback(() => {
    return customizedData;
  }, [customizedData]);

  // Format skills for API (backend expects flat list)
  const formatSkillsForAPI = (skills: Record<string, string[]> | string[] | undefined): string[] => {
    if (!skills) return [];
    if (Array.isArray(skills)) {
      return skills.filter(s => typeof s === 'string' && s.trim().length > 0);
    }
    if (typeof skills === 'object') {
      const flatList: string[] = [];
      Object.values(skills).forEach(categorySkills => {
        if (Array.isArray(categorySkills)) {
          categorySkills.forEach(skill => {
            if (typeof skill === 'string' && skill.trim().length > 0) {
              flatList.push(skill);
            }
          });
        }
      });
      return flatList;
    }
    return [];
  };

  // Handle optimization
  const handleOptimize = async () => {
    if (!targetRole.trim()) {
      toast({
        title: "Target Role Required",
        description: "Please enter the job role you are applying for",
        variant: "destructive",
      });
      return;
    }

    setIsOptimizing(true);
    try {
      const apiData = {
        ...displayData,
        skills: formatSkillsForAPI(displayData.skills),
      };

      const result = await optimizeResume(
        apiData as any,
        targetRole,
        jobDescription || undefined
      );

      const optimized = result.optimized_resume || result;
      
      // Convert skills back to dict format if needed
      if (optimized.skills && Array.isArray(optimized.skills)) {
        optimized.skills = { technical: optimized.skills };
      }

      // Ensure profile structure is maintained with company name
      if (!optimized.profile && displayData.profile) {
        optimized.profile = { ...displayData.profile };
      }
      if (optimized.profile && companyName) {
        optimized.profile.company_name = companyName;
      }

      setDisplayData(optimized);
      setOptimizationImprovements(result.improvements_made || []);
      setPreviewKey(prev => prev + 1);

      toast({
        title: "Resume Optimized!",
        description: `Your resume has been tailored for ${targetRole} with ${result.improvements_made?.length || 0} improvements.`,
      });

      // Calculate ATS score
      const atsResult = await calculateATSScore(
        optimized,
        jobDescription || undefined
      );
      setAtsScore(atsResult);

      // Check if we should suggest adding projects
      const currentProjectsCount = optimized.projects?.length || 0;
      if (currentProjectsCount < 3 && targetRole) {
        setTimeout(() => {
          setShowProjectSuggestions(true);
        }, 1000);
      }
    } catch (error) {
      console.error('Error optimizing resume:', error);
      toast({
        title: "Optimization Failed",
        description: error instanceof Error ? error.message : "Failed to optimize resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  // Handle adding suggested projects
  const handleAddProjects = async (newProjects: any[]) => {
    try {
      const existingProjects = resumeStorage.load('projects_saved') || [];
      const projectsToAdd = newProjects.map((proj, idx) => ({
        ...proj,
        id: `suggested_${Date.now()}_${idx}`,
        created_at: new Date().toISOString(),
      }));
      const allProjectsToSave = [...existingProjects, ...projectsToAdd];
      resumeStorage.save('projects_saved', allProjectsToSave);
      window.dispatchEvent(new Event('resumeDataUpdated'));
      
      toast({
        title: "Projects Added!",
        description: `Added ${newProjects.length} project(s). Re-optimizing your resume...`,
      });
      
      // Re-optimize after projects are added
      setTimeout(() => {
        handleOptimize();
      }, 500);
    } catch (error) {
      console.error('Error adding projects:', error);
      toast({
        title: "Error",
        description: "Failed to add projects. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Auto-rewrite ALL projects to 3 sentences when preview opens (AI-powered)
  const [isAutoRewriting, setIsAutoRewriting] = useState(false);
  
  // Auto-rewrite all projects on modal open
  useEffect(() => {
    if (!open) return; // Only when modal opens
    
    const autoRewriteAllProjects = async () => {
      // ALWAYS force rewrite to ensure 3-sentence descriptions
      // Check cache first, but validate it has proper 3-sentence descriptions
      let useCached = false;
      try {
        const enhancedData = sessionStorage.getItem('resume_enhanced_projects');
        if (enhancedData) {
          const parsed = JSON.parse(enhancedData);
          const { projects: enhancedProjects, timestamp } = parsed;
          
          // Check if data is recent (within 1 hour) AND has valid 3-sentence descriptions
          const isRecent = timestamp && (Date.now() - timestamp) < 3600000;
          
          if (enhancedProjects && enhancedProjects.length > 0 && isRecent) {
            // Validate that cached projects have 3-sentence descriptions
            const allHaveThreeSentences = enhancedProjects.every((proj: any) => {
              const desc = proj.description || '';
              const sentences = desc.split('.').filter((s: string) => s.trim().length > 10);
              return sentences.length === 3;
            });
            
            if (allHaveThreeSentences) {
              // Use cached data - it's valid (top 3 projects, ResumeItNow best practice)
              // Ensure we only use top 3 projects
              const top3Projects = enhancedProjects.slice(0, 3);
              // Create a completely new object to ensure React detects the change
              const updatedData = {
                ...resumeData,
                projects: top3Projects,
              };
              setDisplayData(updatedData);
              setPreviewKey(prev => prev + 1);
              console.log('[ResumePreview] Loaded valid cached top 3 enhanced projects (ResumeItNow best practice):', {
                count: top3Projects.length,
                firstDesc: top3Projects[0]?.description?.substring(0, 100),
                sentenceCount: top3Projects[0]?.description?.split('.').filter(s => s.trim().length > 10).length,
              });
              useCached = true;
            } else {
              console.log('[ResumePreview] Cached projects missing 3-sentence descriptions, will rewrite');
              sessionStorage.removeItem('resume_enhanced_projects');
            }
          } else if (enhancedProjects && !isRecent) {
            // Clear stale data
            sessionStorage.removeItem('resume_enhanced_projects');
            console.log('[ResumePreview] Cleared stale enhanced projects');
          }
        }
      } catch (error) {
        console.warn('[ResumePreview] Failed to check cached projects:', error);
      }
      
      // If we used cached data, skip rewrite
      if (useCached) {
        return;
      }
      
      // Get top 3 projects (ResumeItNow best practice: exactly 3 projects)
      // First check if we have selected projects from Smart Analysis
      let projectsToEnhance = resumeData.projects || [];
      const roleToUse = targetRole || initialTargetRole || '';
      
      // Check for selected projects from Smart Analysis modal
      try {
        const enhancedData = sessionStorage.getItem('resume_enhanced_projects');
        if (enhancedData) {
          const parsed = JSON.parse(enhancedData);
          const { projects: enhancedProjects, selectedTitles } = parsed;
          
          // If we have selected titles, use only those projects (top 3)
          if (selectedTitles && selectedTitles.length > 0) {
            projectsToEnhance = (resumeData.projects || []).filter((p: any) => 
              selectedTitles.includes(p.project_title || p.title)
            ).slice(0, 3); // Ensure max 3
            console.log('[ResumePreview] Using selected projects from Smart Analysis:', projectsToEnhance.length);
          } else if (enhancedProjects && enhancedProjects.length > 0) {
            // Use enhanced projects if available (already top 3)
            projectsToEnhance = enhancedProjects.slice(0, 3);
            console.log('[ResumePreview] Using enhanced projects (top 3):', projectsToEnhance.length);
          } else {
            // Fallback: Use top 3 projects based on ranking or first 3
            projectsToEnhance = (resumeData.projects || []).slice(0, 3);
            console.log('[ResumePreview] Using top 3 projects (fallback):', projectsToEnhance.length);
          }
        } else {
          // No enhanced data: Use top 3 projects (ResumeItNow best practice)
          projectsToEnhance = (resumeData.projects || []).slice(0, 3);
          console.log('[ResumePreview] Using top 3 projects (no cache):', projectsToEnhance.length);
        }
      } catch (error) {
        console.warn('[ResumePreview] Error checking selected projects, using top 3:', error);
        projectsToEnhance = (resumeData.projects || []).slice(0, 3);
      }
      
      if (projectsToEnhance.length > 0) {
        setIsAutoRewriting(true);
        
        // Set initial display data immediately (show original while processing)
        setDisplayData(resumeData);
        
        try {
          const API_BASE = getAPIBase();
          const token = localStorage.getItem('access_token');
          
          console.log('[ResumePreview] Auto-rewriting top 3 projects to 3 sentences (ResumeItNow best practice):', projectsToEnhance.length, roleToUse ? `for ${roleToUse}` : '');
          
          // Create AbortController for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
          
          const response = await fetch(`${API_BASE}/resume/rewrite-project-descriptions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              projects: projectsToEnhance, // Rewrite top 3 projects only (ResumeItNow best practice)
              target_role: roleToUse || undefined,
            }),
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);

          if (response.ok) {
            const result = await response.json();
            const rewrittenProjects = result.rewritten_projects || [];
            
            if (rewrittenProjects.length > 0) {
              // Save top 3 rewritten projects to sessionStorage (ResumeItNow best practice)
              const top3Rewritten = rewrittenProjects.slice(0, 3);
              sessionStorage.setItem('resume_enhanced_projects', JSON.stringify({
                projects: top3Rewritten,
                selectedTitles: top3Rewritten.map((p: any) => p.project_title || p.title),
                timestamp: Date.now(),
                autoRewritten: true,
              }));
              
              // Update display data with top 3 rewritten projects - FORCE UPDATE
              // Create a completely new object to ensure React detects the change
              const updatedData = {
                ...resumeData,
                projects: top3Rewritten,
              };
              
              setDisplayData(updatedData);
              
              // Force preview refresh with a new key
              setPreviewKey(prev => prev + 1);
              
              console.log('[ResumePreview] Updated displayData with top 3 enhanced projects:', {
                projectCount: top3Rewritten.length,
                firstProject: top3Rewritten[0]?.project_title,
                firstDescription: top3Rewritten[0]?.description?.substring(0, 100),
                sentenceCount: top3Rewritten[0]?.description?.split('.').filter(s => s.trim().length > 10).length,
              });
              
              console.log('[ResumePreview] Auto-rewrote top 3 projects (ResumeItNow best practice):', top3Rewritten.length);
              console.log('[ResumePreview] Sample enhanced project:', {
                title: top3Rewritten[0]?.project_title,
                description: top3Rewritten[0]?.description,
                sentenceCount: top3Rewritten[0]?.description?.split('.').filter(s => s.trim()).length,
              });
              
              toast({
                title: 'AI Enhancement Complete',
                description: `Top 3 projects (ResumeItNow best practice) have been automatically enhanced with professional 3-sentence descriptions${roleToUse ? ` optimized for ${roleToUse}` : ''}.`,
              });
            } else {
              console.warn('[ResumePreview] No rewritten projects received');
              setDisplayData(resumeData);
            }
          } else {
            const errorText = await response.text();
            console.error('[ResumePreview] Failed to rewrite projects:', errorText);
            toast({
              title: 'Enhancement Failed',
              description: 'Could not enhance projects. Using original descriptions. You can try again using the button below.',
              variant: 'destructive',
            });
            setDisplayData(resumeData);
          }
        } catch (error: any) {
          if (error.name === 'AbortError') {
            console.error('[ResumePreview] Request timeout - enhancement took too long');
            toast({
              title: 'Enhancement Timeout',
              description: 'AI enhancement is taking longer than expected. Using original descriptions. You can try again using the button below.',
              variant: 'destructive',
            });
          } else {
            console.error('[ResumePreview] Error auto-rewriting projects:', error);
            toast({
              title: 'Enhancement Error',
              description: error.message || 'Failed to enhance projects. Using original descriptions.',
              variant: 'destructive',
            });
          }
          setDisplayData(resumeData);
        } finally {
          setIsAutoRewriting(false);
        }
      } else {
        // No projects or no target role - just use original data
        setDisplayData(resumeData);
        setPreviewKey(prev => prev + 1);
      }
    };
    
    autoRewriteAllProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // Only run when modal opens, targetRole and resumeData are stable

  // Sync company name from input to display data when changed (without optimization)
  useEffect(() => {
    if (companyName !== undefined) {
      setDisplayData(prev => ({
        ...prev,
        profile: {
          ...prev.profile,
          company_name: companyName || undefined,
        },
      }));
      setPreviewKey(prev => prev + 1);
    }
  }, [companyName]);

  // Sync company name from input to resume data (removed duplicate - already handled above)
  // This useEffect was causing infinite loops, removed

  const handleGeneratePDF = async () => {
    if (!displayData) {
      toast({
        title: 'Error',
        description: 'No resume data available',
        variant: 'destructive',
      });
      return;
    }
    
    setIsGeneratingPDF(true);
    try {
      // CRITICAL: Use customizedData directly (same as preview) to ensure perfect sync
      // customizedData is memoized from displayData, so it's the EXACT same data shown in preview
      const customizedData = getCustomizedData();
      
      // Get the EXACT projects array from customizedData (same as what preview uses)
      // Preview uses: <ResumePreview resumeData={customizedData} />
      // So we must use customizedData.projects (not displayData.projects)
      const previewProjects = customizedData.projects || [];
      
      // Use EXACT same projects as preview (customizedData.projects)
      // This ensures PDF matches preview 100%
      let finalData = {
        ...customizedData,
        projects: previewProjects, // Use EXACT same projects array as preview (no slicing, no modification)
      };
      
      console.log('[PDF Download] Using customizedData projects (EXACT same as preview):', {
        projectCount: finalData.projects.length,
        previewProjectCount: previewProjects.length,
        firstProjectTitle: finalData.projects[0]?.project_title,
        firstProjectDesc: finalData.projects[0]?.description?.substring(0, 200),
        previewFirstDesc: previewProjects[0]?.description?.substring(0, 200),
        areSame: finalData.projects === previewProjects, // Same array reference
        areDescriptionsSame: finalData.projects[0]?.description === previewProjects[0]?.description,
        source: 'customizedData (same as preview component)'
      });
      
      const pdfData = {
        ...finalData,
        // Ensure skills are in correct format
        skills: typeof finalData.skills === 'object' && !Array.isArray(finalData.skills)
          ? finalData.skills
          : { technical: Array.isArray(finalData.skills) ? finalData.skills : [] },
      };
      
      console.log('[PDF Download] Generating PDF with:', {
        template: selectedTemplate,
        name: pdfData.profile?.full_name,
        projectsCount: pdfData.projects?.length || 0,
        hasEnhancedProjects: finalData.projects !== customizedData.projects,
      });
      
      const blob = await generateATSSafePDF(pdfData as any, selectedTemplate);
      
      if (!blob || blob.size === 0) {
        throw new Error('Generated PDF is empty');
      }
      
      const filename = `resume_${pdfData.profile?.full_name?.replace(/\s+/g, '_') || 'resume'}_${selectedTemplate}_${Date.now()}.pdf`;
      
      // Create download link with better error handling
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);
      
      toast({
        title: 'PDF Generated Successfully',
        description: `Your resume PDF (${TEMPLATE_CONFIGS[selectedTemplate].name}) has been downloaded`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'PDF Generation Failed',
        description: error instanceof Error ? error.message : 'Failed to generate PDF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (event: any) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    // Reorder projects
    if (active.id.toString().startsWith('project-')) {
      const oldIndex = displayData.projects?.findIndex(
        (p, idx) => `project-${idx}` === active.id
      ) ?? -1;
      const newIndex = displayData.projects?.findIndex(
        (p, idx) => `project-${idx}` === over.id
      ) ?? -1;

      if (oldIndex !== -1 && newIndex !== -1 && displayData.projects) {
        const newProjects = arrayMove(displayData.projects, oldIndex, newIndex);
        setDisplayData(prev => ({
          ...prev,
          projects: newProjects,
        }));
        setPreviewKey(prev => prev + 1);
      }
    }

    setActiveId(null);
  };

  // Handle project description editing
  const handleEditProject = (projectId: string, currentDescription: string) => {
    setEditingProjectId(projectId);
    setEditingDescription(currentDescription);
  };

  const handleSaveProjectEdit = (projectId: string) => {
    if (!displayData.projects) return;
    
    const updatedProjects = displayData.projects.map((proj: any, idx: number) => {
      if (`project-${idx}` === projectId) {
        return { ...proj, description: editingDescription };
      }
      return proj;
    });

    setDisplayData(prev => ({
      ...prev,
      projects: updatedProjects,
    }));
    setEditingProjectId(null);
    setEditingDescription('');
    setPreviewKey(prev => prev + 1);
    
    toast({
      title: 'Project Updated',
      description: 'Project description updated successfully.',
    });
  };

  // Use optimized ResumePreview component for real-time updates
  // This component uses CSS variables and React.memo for better performance

  const fresherTemplates: ResumeTemplate[] = [
    'fresher_classic', 
    'project_focused', 
    'skills_first', 
    'internship_focused', 
    'minimal_ats',
    'modern',
    'professional',
    'minimal'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] max-h-[98vh] w-full p-0 gap-0 flex flex-col bg-background">
        {/* Header - Modern & Clean */}
        <DialogHeader className="px-8 pt-6 pb-4 border-b flex-shrink-0 bg-gradient-to-br from-background via-primary/5 to-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl shadow-sm">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI-Powered Resume Builder
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground mt-1.5 font-medium">
                  AI-optimized templates with live preview and instant download
                </DialogDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-9 w-9 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </DialogHeader>

        {/* Main Content - Split Layout with Better Spacing */}
        <div className="flex-1 flex overflow-hidden bg-gradient-to-br from-background to-muted/20">
          {/* Left Sidebar - Clean & Spacious */}
          <div className="w-[360px] border-r border-border/50 bg-background/95 backdrop-blur-sm flex flex-col overflow-hidden shadow-lg">
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* AI Optimization Info */}
                <div className="pt-4 border-t mb-6">
                  {isAutoRewriting ? (
                    <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                      <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                      <AlertDescription className="text-sm text-blue-800 dark:text-blue-200">
                        <strong>AI Enhancement in Progress:</strong> Rewriting all project descriptions to professional 3-sentence format{targetRole ? ` optimized for ${targetRole}` : ''}...
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200">
                      <Sparkles className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-sm text-green-800 dark:text-green-200">
                        <strong>AI-Powered Mode:</strong> All project descriptions have been automatically enhanced with professional 3-sentence format. Select a template below to preview and download.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Manual Enhance Button (Fallback) */}
                  {!isAutoRewriting && displayData.projects && displayData.projects.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full"
                      onClick={async () => {
                        setIsAutoRewriting(true);
                        try {
                          const API_BASE = getAPIBase();
                          const token = localStorage.getItem('access_token');
                          const projects = displayData.projects || [];
                          const roleToUse = targetRole || initialTargetRole || '';
                          
                          console.log('[ResumePreview] Manual enhance triggered:', projects.length);
                          
                          const response = await fetch(`${API_BASE}/resume/rewrite-project-descriptions`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${token}`,
                            },
                            body: JSON.stringify({
                              projects: projects,
                              target_role: roleToUse || undefined,
                            }),
                          });

                          if (response.ok) {
                            const result = await response.json();
                            const rewrittenProjects = result.rewritten_projects || [];
                            
                            if (rewrittenProjects.length > 0) {
                              sessionStorage.setItem('resume_enhanced_projects', JSON.stringify({
                                projects: rewrittenProjects,
                                timestamp: Date.now(),
                                autoRewritten: true,
                              }));
                              
                              setDisplayData(prev => ({
                                ...prev,
                                projects: rewrittenProjects,
                              }));
                              setPreviewKey(prev => prev + 1);
                              
                              toast({
                                title: 'Projects Enhanced',
                                description: `All ${rewrittenProjects.length} project(s) enhanced with 3-sentence descriptions.`,
                              });
                            }
                          }
                        } catch (error) {
                          console.error('[ResumePreview] Manual enhance error:', error);
                          toast({
                            title: 'Enhancement Failed',
                            description: 'Failed to enhance projects. Please try again.',
                            variant: 'destructive',
                          });
                        } finally {
                          setIsAutoRewriting(false);
                        }
                      }}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Re-Enhance All Projects with AI
                    </Button>
                  )}
                </div>

                {/* Template Selector - Beautiful Card-Based Selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">Choose Template</h3>
                        <p className="text-xs text-muted-foreground">Select your preferred design</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full border border-primary/20">
                      <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      <span className="text-xs font-medium text-primary">Live Preview</span>
                    </div>
                  </div>
                  
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="grid gap-3">
                      {fresherTemplates.map((templateId) => {
                        const config = TEMPLATE_CONFIGS[templateId];
                        const isSelected = selectedTemplate === templateId;
                        
                        return (
                          <div
                            key={templateId}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedTemplate(templateId);
                              setPreviewKey(prev => prev + 1);
                            }}
                            className={`
                              relative group cursor-pointer transition-all duration-200
                              ${isSelected 
                                ? 'ring-2 ring-primary ring-offset-2 shadow-lg scale-[1.02]' 
                                : 'hover:ring-2 hover:ring-primary/50 hover:shadow-md hover:scale-[1.01]'
                              }
                              active:scale-[0.99]
                            `}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedTemplate(templateId);
                                setPreviewKey(prev => prev + 1);
                              }
                            }}
                          >
                            <Card className={`
                              border-2 overflow-hidden
                              ${isSelected 
                                ? 'border-primary bg-gradient-to-br from-primary/10 via-primary/5 to-transparent' 
                                : 'border-border hover:border-primary/50 bg-card'
                              }
                            `}>
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-2">
                                      <div className={`
                                        p-1.5 rounded-lg
                                        ${isSelected 
                                          ? 'bg-primary text-primary-foreground' 
                                          : 'bg-muted text-muted-foreground group-hover:bg-primary/10'
                                        }
                                      `}>
                                        <FileText className="h-4 w-4" />
                                      </div>
                                      <h4 className={`
                                        font-bold text-base
                                        ${isSelected ? 'text-primary' : 'text-foreground'}
                                      `}>
                                        {config.name}
                                      </h4>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                      {config.description}
                                    </p>
                                  </div>
                                  {isSelected && (
                                    <div className="flex-shrink-0">
                                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                                        <svg className="h-4 w-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                  
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-3.5 w-3.5" />
                      <span>All templates are ATS-friendly and single-page optimized</span>
                    </div>
                  </div>
                </div>

                {/* Removed customization panel - AI-only mode */}

                {/* Projects Section - View Only (AI mode) */}
                {displayData.projects && displayData.projects.length > 0 && (
                  <div className="space-y-3 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <h3 className="font-semibold text-sm">Customize Projects</h3>
                      <Badge variant="outline" className="ml-auto text-xs">
                        {displayData.projects.length} projects
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Drag to reorder or click edit to customize descriptions
                    </p>
                    
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={displayData.projects.map((_, idx) => `project-${idx}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                          {displayData.projects.map((project: any, idx: number) => {
                            const projectId = `project-${idx}`;
                            const isEditing = editingProjectId === projectId;
                            
                            return (
                              <SortableProjectItem
                                key={projectId}
                                id={projectId}
                                project={project}
                                isEditing={isEditing}
                                editingDescription={editingDescription}
                                onEdit={() => handleEditProject(projectId, project.description || '')}
                                onSave={() => handleSaveProjectEdit(projectId)}
                                onCancel={() => {
                                  setEditingProjectId(null);
                                  setEditingDescription('');
                                }}
                                onDescriptionChange={setEditingDescription}
                                onRemove={() => {
                                  const updated = displayData.projects?.filter((_, i) => i !== idx) || [];
                                  setDisplayData(prev => ({ ...prev, projects: updated }));
                                  setPreviewKey(prev => prev + 1);
                                  toast({
                                    title: 'Project Removed',
                                    description: 'Project removed from preview.',
                                  });
                                }}
                              />
                            );
                          })}
                        </div>
                      </SortableContext>
                      <DragOverlay>
                        {activeId ? (
                          <div className="opacity-50 bg-background border-2 border-primary rounded-lg p-3">
                            <p className="font-medium text-sm">
                              {displayData.projects?.[parseInt(activeId.split('-')[1])]?.project_title}
                            </p>
                          </div>
                        ) : null}
                      </DragOverlay>
                    </DndContext>
                  </div>
                )}

                {/* Info Card */}
                <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                  <AlertDescription className="text-xs">
                    <strong>💡 Pro Tip:</strong> Enhanced projects (with 3-sentence descriptions) are shown here. 
                    Your original projects in the Build section remain unchanged. Use customization panel for Canva-style editing.
                  </AlertDescription>
                </Alert>

                {/* Download Button - Stunning Design */}
                <div className="pt-4 border-t space-y-3">
                  <Button
                    onClick={handleGeneratePDF}
                    disabled={isGeneratingPDF}
                    size="lg"
                    className="w-full h-12 bg-gradient-to-r from-primary via-primary/95 to-primary text-white hover:from-primary/90 hover:via-primary/85 hover:to-primary/90 font-bold text-base shadow-xl hover:shadow-2xl transition-all duration-300"
                  >
                    {isGeneratingPDF ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-5 w-5" />
                        Download Resume PDF
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground font-medium">
                    Template: <span className="text-primary">{TEMPLATE_CONFIGS[selectedTemplate].name}</span>
                  </p>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Right Side - Preview (Stunning & Spacious) */}
          <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-muted/30 via-background to-muted/20">
            <div className="px-8 py-5 border-b border-border/50 bg-background/80 backdrop-blur-sm flex items-center justify-between flex-shrink-0 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Eye className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-base flex items-center gap-2">
                    Live Preview
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                      Real-time
                    </span>
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Real-time template updates with AI optimization
                  </p>
                </div>
                <Badge variant="secondary" className="ml-3 px-3 py-1 font-semibold">
                  {TEMPLATE_CONFIGS[selectedTemplate].name}
                </Badge>
              </div>
            </div>
            
            <ScrollArea className="flex-1 p-8">
              <div className="flex flex-col justify-center items-center min-h-full py-6 gap-6">
                {/* Preview Container */}
                <div
                  key={`preview-${previewKey}-${selectedTemplate}`}
                  className="resume-preview-container bg-white shadow-2xl rounded-xl overflow-hidden border-4 border-border/20 transition-all duration-200 hover:shadow-3xl hover:scale-[0.91]"
                  style={{
                    width: '8.5in',
                    minHeight: '11in',
                    transform: 'scale(0.9)',
                    transformOrigin: 'top center',
                    transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
                  }}
                >
                  <div className="resume-content-wrapper">
                    {displayData && (
                      <ResumePreview
                        resumeData={customizedData}
                        customization={undefined}
                        template={selectedTemplate}
                        previewKey={previewKey}
                      />
                    )}
                  </div>
                </div>

                {/* Download Button at Bottom - Canva Style */}
                <div className="w-full max-w-[8.5in] px-4">
                  <Button
                    onClick={handleGeneratePDF}
                    disabled={isGeneratingPDF || !displayData}
                    size="lg"
                    className="w-full h-14 bg-gradient-to-r from-primary via-primary/95 to-primary text-white hover:from-primary/90 hover:via-primary/85 hover:to-primary/90 font-bold text-base shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isGeneratingPDF ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        <span>Generating PDF...</span>
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-5 w-5" />
                        <span>Download Resume PDF</span>
                        <span className="ml-2 text-xs opacity-90">({TEMPLATE_CONFIGS[selectedTemplate].name})</span>
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground mt-2 font-medium">
                    <span className="inline-flex items-center gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                      Preview matches download exactly
                    </span>
                  </p>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
      
      {/* Tailoring Suggestions Modal */}
    </Dialog>
  );
});

// Sortable Project Item Component
interface SortableProjectItemProps {
  id: string;
  project: any;
  isEditing: boolean;
  editingDescription: string;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDescriptionChange: (value: string) => void;
  onRemove: () => void;
}

function SortableProjectItem({
  id,
  project,
  isEditing,
  editingDescription,
  onEdit,
  onSave,
  onCancel,
  onDescriptionChange,
  onRemove,
}: SortableProjectItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group border rounded-lg p-3 bg-card hover:bg-accent/50 transition-colors ${
        isDragging ? 'ring-2 ring-primary' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing mt-1 text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-semibold text-sm line-clamp-1">{project.project_title || project.title}</h4>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {!isEditing ? (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={onEdit}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                    onClick={onRemove}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-green-600"
                    onClick={onSave}
                  >
                    <Save className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={onCancel}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
          {isEditing ? (
            <Textarea
              value={editingDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              className="text-xs min-h-[80px] mt-1"
              placeholder="Edit project description (3 sentences recommended)"
            />
          ) : (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {project.description || 'No description'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
