/**
 * Resume Preview Modal - Redesigned
 * Clean, modern design with prominent preview and real-time template switching
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { CustomizationPanel, CustomizationSettings, DEFAULT_SETTINGS } from './CustomizationPanel';

interface ResumePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumeData: ResumeData;
  targetRole?: string;
  companyName?: string;
  jobDescription?: string;
}

export function ResumePreviewModal({ 
  open, 
  onOpenChange, 
  resumeData, 
  targetRole: initialTargetRole,
  companyName: initialCompanyName,
  jobDescription: initialJobDescription
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

  // Customization settings
  const [customizationSettings, setCustomizationSettings] = useState<CustomizationSettings>(DEFAULT_SETTINGS);

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

  // Load enhanced projects from sessionStorage if available (from Smart Analysis)
  useEffect(() => {
    if (!open) return; // Only load when modal opens
    
    try {
      const enhancedData = sessionStorage.getItem('resume_enhanced_projects');
      if (enhancedData) {
        const parsed = JSON.parse(enhancedData);
        const { projects: enhancedProjects } = parsed;
        if (enhancedProjects && enhancedProjects.length > 0) {
          // Use enhanced projects instead of original - ONLY for preview
          setDisplayData(prev => ({
            ...prev,
            projects: enhancedProjects,
          }));
          setPreviewKey(prev => prev + 1);
          toast({
            title: 'Enhanced Projects Loaded',
            description: `Loaded ${enhancedProjects.length} AI-enhanced project(s) with optimized descriptions for preview. Your original projects in Build section remain unchanged.`,
          });
          return;
        }
      }
    } catch (error) {
      console.warn('Failed to load enhanced projects:', error);
    }
    
    // Fallback to original resumeData
    setDisplayData(resumeData);
    setPreviewKey(prev => prev + 1);
  }, [open, resumeData]);

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

  // Sync company name from input to resume data
  useEffect(() => {
    if (companyName && displayData.profile) {
      setDisplayData({
        ...displayData,
        profile: {
          ...displayData.profile,
          company_name: companyName,
        },
      });
    }
  }, [companyName]);

  const handleGeneratePDF = async () => {
    if (!displayData) return;
    setIsGeneratingPDF(true);
    try {
      // Use frontend PDF generator to match preview exactly
      const customizedData = getCustomizedData();
      const pdfData = {
        ...customizedData,
        // Ensure skills are in correct format
        skills: typeof customizedData.skills === 'object' && !Array.isArray(customizedData.skills)
          ? customizedData.skills
          : { technical: Array.isArray(customizedData.skills) ? customizedData.skills : [] },
      };
      
      const blob = await generateATSSafePDF(pdfData as any, selectedTemplate, customizationSettings);
      const filename = `resume_${customizedData.profile?.full_name?.replace(/\s+/g, '_') || 'resume'}_${selectedTemplate}.pdf`;
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({
        title: 'PDF Generated',
        description: `Your resume PDF (${TEMPLATE_CONFIGS[selectedTemplate].name}) has been downloaded`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate PDF',
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

  const renderTemplate = () => {
    if (!displayData) return null;
    const props = { resumeData: displayData, className: 'resume-preview-template' };
    const templateKey = `template-${selectedTemplate}-${previewKey}`;
    
    switch (selectedTemplate) {
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
                <DialogTitle className="text-2xl font-bold tracking-tight">Resume Builder</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1.5 font-medium">
                  Preview, optimize, and download your professional resume
                </p>
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
                {/* Canva-Style Customization Panel */}
                <div className="pt-4 border-t mb-6">
                  <CustomizationPanel
                    settings={customizationSettings}
                    onSettingsChange={(newSettings) => {
                      setCustomizationSettings(newSettings);
                      setPreviewKey(prev => prev + 1); // Force re-render
                    }}
                  />
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
                            onClick={() => {
                              setSelectedTemplate(templateId);
                              setPreviewKey(prev => prev + 1);
                            }}
                            className={`
                              relative group cursor-pointer transition-all duration-200
                              ${isSelected 
                                ? 'ring-2 ring-primary ring-offset-2 shadow-lg scale-[1.02]' 
                                : 'hover:ring-2 hover:ring-primary/50 hover:shadow-md'
                              }
                            `}
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

                {/* Canva-Style Customization Panel */}
                <div className="pt-4 border-t">
                  <CustomizationPanel
                    settings={customizationSettings}
                    onSettingsChange={(newSettings) => {
                      setCustomizationSettings(newSettings);
                      setPreviewKey(prev => prev + 1); // Force re-render
                    }}
                  />
                </div>

                {/* Customize Projects Section - Drag & Drop */}
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
                  <h3 className="font-semibold text-base">Live Preview</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Real-time template updates</p>
                </div>
                <Badge variant="secondary" className="ml-3 px-3 py-1 font-semibold">
                  {TEMPLATE_CONFIGS[selectedTemplate].name}
                </Badge>
              </div>
            </div>
            
            <ScrollArea className="flex-1 p-8">
              <div className="flex justify-center items-start min-h-full py-6">
                <div
                  key={previewKey}
                  className="resume-preview-container bg-white shadow-2xl rounded-xl overflow-hidden border-4 border-border/20 transition-all duration-300 hover:shadow-3xl"
                  style={{
                    width: '8.5in',
                    minHeight: '11in',
                    transform: 'scale(0.9)',
                    transformOrigin: 'top center',
                  }}
                >
                  {renderTemplate()}
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
      
      {/* Tailoring Suggestions Modal */}
    </Dialog>
  );
}

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
