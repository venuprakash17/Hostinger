/**
 * Smart Resume Analysis Modal
 * Analyzes resume completeness and suggests missing sections and projects
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  X, 
  Lightbulb,
  Target,
  FileText,
  GraduationCap,
  Code,
  Award,
  Briefcase,
  Users,
  BookOpen,
  ChevronDown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { resumeStorage } from '@/lib/resumeStorage';

// Helper function to get API base URL (same logic as API client)
// Forces localhost in development if production URL is detected
const getAPIBase = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  // If in development and URL contains production IP, use localhost
  if (import.meta.env.DEV && envUrl && envUrl.includes('72.60.101.14')) {
    return 'http://localhost:8000/api/v1';
  }
  return envUrl || 'http://localhost:8000/api/v1';
};

interface MissingSection {
  section: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  icon: React.ReactNode;
  action: string;
}

interface SkillGapAnalysis {
  missing_critical_skills?: string[];
  recommended_skills?: string[];
  skill_gap_score?: number;
  recommendations?: string[];
  learning_resources?: Array<{ skill: string; resource_type: string; description: string }>;
}

interface ProjectRelevance {
  project_title: string;
  relevant: boolean;
  relevance_score?: number;
  reason?: string;
  suggestion?: string;
}

interface ProjectAnalysis {
  irrelevant_projects: ProjectRelevance[];
  needs_more_projects: boolean;
  recommended_project_count: number;
}

interface SmartResumeAnalysisModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resumeData: any;
  targetRole?: string;
  companyName?: string;
  jobDescription?: string;
  onAddSections: (sections: string[]) => void;
  onAddProjects: () => void;
  onRemoveProjects?: (projectTitles: string[]) => void;
  onProceed: () => void;
}

export function SmartResumeAnalysisModal({
  open,
  onOpenChange,
  resumeData,
  targetRole,
  companyName,
  jobDescription,
  onAddSections,
  onAddProjects,
  onRemoveProjects,
  onProceed,
}: SmartResumeAnalysisModalProps) {
  const { toast } = useToast();
  const [missingSections, setMissingSections] = useState<MissingSection[]>([]);
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [completenessScore, setCompletenessScore] = useState(0);
  const [projectSuggestions, setProjectSuggestions] = useState(false);
  const [skillGapAnalysis, setSkillGapAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [projectAnalysis, setProjectAnalysis] = useState<ProjectAnalysis | null>(null);
  const [selectedProjectsToRemove, setSelectedProjectsToRemove] = useState<Set<string>>(new Set());
  const [isAnalyzingSkills, setIsAnalyzingSkills] = useState(false);
  const [isAnalyzingProjects, setIsAnalyzingProjects] = useState(false);
  const [projectRanking, setProjectRanking] = useState<any>(null);
  const [isRankingProjects, setIsRankingProjects] = useState(false);
  const [selectedProjectsToKeep, setSelectedProjectsToKeep] = useState<Set<string>>(new Set());
  const [isRewritingDescriptions, setIsRewritingDescriptions] = useState(false);

  useEffect(() => {
    if (open) {
      analyzeResume();
      // Always analyze projects (will use fallback if no targetRole)
      analyzeSkillsAndProjects();
    }
  }, [open, resumeData, targetRole, jobDescription]);

  const analyzeResume = () => {
    setIsAnalyzing(true);
    
    // Analyze resume completeness
    const sections: MissingSection[] = [];
    let completedSections = 0;
    let totalSections = 0;

    // Check Personal Info
    totalSections++;
    if (resumeData.profile?.full_name && resumeData.profile?.email && resumeData.profile?.phone_number) {
      completedSections++;
    } else {
      sections.push({
        section: 'personal_info',
        title: 'Personal Information',
        description: 'Complete your name, email, and phone number for recruiters to contact you.',
        priority: 'high',
        icon: <FileText className="h-4 w-4" />,
        action: 'Fill Personal Info',
      });
    }

    // Check Education
    totalSections++;
    if (resumeData.education && resumeData.education.length > 0) {
      completedSections++;
    } else {
      sections.push({
        section: 'education',
        title: 'Education',
        description: 'Add your educational background - degree, institution, and CGPA.',
        priority: 'high',
        icon: <GraduationCap className="h-4 w-4" />,
        action: 'Add Education',
      });
    }

    // Check Projects
    totalSections++;
    const projectCount = resumeData.projects?.length || 0;
    if (projectCount >= 3) {
      completedSections++;
    } else if (projectCount > 0) {
      completedSections += 0.5; // Partial credit
      sections.push({
        section: 'projects',
        title: 'More Projects',
        description: `You have ${projectCount} project(s). Add ${3 - projectCount} more to strengthen your resume.`,
        priority: 'high',
        icon: <Code className="h-4 w-4" />,
        action: 'Add Projects',
      });
    } else {
      sections.push({
        section: 'projects',
        title: 'Projects',
        description: 'Add at least 2-3 projects showcasing your technical skills and achievements.',
        priority: 'high',
        icon: <Code className="h-4 w-4" />,
        action: 'Add Projects',
      });
    }

    // Check Skills
    totalSections++;
    const skillsCount = Array.isArray(resumeData.skills) 
      ? resumeData.skills.length 
      : Object.values(resumeData.skills || {}).flat().length;
    if (skillsCount >= 10) {
      completedSections++;
    } else if (skillsCount > 0) {
      completedSections += 0.5;
      sections.push({
        section: 'skills',
        title: 'More Skills',
        description: `You have ${skillsCount} skill(s). Add more relevant skills for ${targetRole || 'your target role'}.`,
        priority: 'medium',
        icon: <Target className="h-4 w-4" />,
        action: 'Add Skills',
      });
    } else {
      sections.push({
        section: 'skills',
        title: 'Skills',
        description: 'Add technical and soft skills relevant to your target role.',
        priority: 'high',
        icon: <Target className="h-4 w-4" />,
        action: 'Add Skills',
      });
    }

    // Check Certifications (optional but recommended)
    totalSections++;
    if (resumeData.certifications && resumeData.certifications.length > 0) {
      completedSections++;
    } else {
      sections.push({
        section: 'certifications',
        title: 'Certifications',
        description: 'Add relevant certifications to showcase your expertise and continuous learning.',
        priority: 'medium',
        icon: <Award className="h-4 w-4" />,
        action: 'Add Certifications',
      });
    }

    // Check Achievements (optional)
    if (!resumeData.achievements || resumeData.achievements.length === 0) {
      sections.push({
        section: 'achievements',
        title: 'Achievements',
        description: 'Add academic achievements, competitions, or recognitions.',
        priority: 'low',
        icon: <Award className="h-4 w-4" />,
        action: 'Add Achievements',
      });
    } else {
      completedSections++;
    }
    totalSections++;

    // Check Work Experience (optional for freshers)
    if (!resumeData.work_experience || resumeData.work_experience.length === 0) {
      if (targetRole) {
        sections.push({
          section: 'work_experience',
          title: 'Work Experience / Internships',
          description: 'Add internships or work experience relevant to your target role.',
          priority: 'medium',
          icon: <Briefcase className="h-4 w-4" />,
          action: 'Add Experience',
        });
      }
    } else {
      completedSections++;
    }
    if (targetRole) totalSections++;

    // Calculate completeness score
    const score = Math.round((completedSections / totalSections) * 100);
    setCompletenessScore(score);
    setMissingSections(sections);

    // Enable project suggestions if we have a target role (will be refined by project analysis)
    if (targetRole) {
      setProjectSuggestions(true);
    }

    setIsAnalyzing(false);
  };

  // Create fallback ranking when AI is unavailable
  const createFallbackRanking = (projects: any[]) => {
    if (!projects || projects.length === 0) return null;
    
    // Simple heuristic ranking based on:
    // 1. Has description (more complete = better)
    // 2. Has technologies (shows technical depth)
    // 3. Has contributions (shows impact)
    // 4. Has timeline (shows commitment)
    const ranked = projects.map((project, idx) => {
      let score = 50; // Base score
      
      if (project.description && project.description.length > 50) score += 15;
      if (project.technologies_used && project.technologies_used.length > 0) score += 15;
      if (project.contributions && project.contributions.length > 0) score += 15;
      if (project.duration_start || project.duration_end) score += 5;
      
      // Boost score if project title contains relevant keywords (if targetRole exists)
      if (targetRole) {
        const roleKeywords = targetRole.toLowerCase().split(' ');
        const titleLower = (project.project_title || '').toLowerCase();
        roleKeywords.forEach(keyword => {
          if (titleLower.includes(keyword)) score += 5;
        });
      }
      
      return {
        project_title: project.project_title || project.title || `Project ${idx + 1}`,
        rank: idx + 1,
        relevance_score: Math.min(score + 10, 100),
        impact_score: Math.min(score, 100),
        overall_score: Math.min(score + 5, 100),
        reason: "Project demonstrates relevant skills and technologies",
        should_include: idx < Math.min(3, projects.length),
      };
    });
    
    // Sort by overall score descending
    ranked.sort((a, b) => b.overall_score - a.overall_score);
    ranked.forEach((p, idx) => {
      p.rank = idx + 1;
      p.should_include = idx < 3;
    });
    
    return {
      summary: `Ranked ${projects.length} projects based on completeness and relevance. Top 2-3 are recommended.`,
      ranked_projects: ranked,
      projects_to_keep: ranked.slice(0, Math.min(3, ranked.length)).map(p => p.project_title),
    };
  };

  // Rank ALL projects using AI (show scores for all projects)
  const rankBestProjects = async () => {
    const projects = resumeData.projects || [];
    if (projects.length === 0) {
      setProjectRanking(null);
      return;
    }
    
    setIsRankingProjects(true);
    
    // Always create fallback ranking first (so projects show immediately)
    const fallbackRanking = createFallbackRanking(projects);
    setProjectRanking(fallbackRanking);
    
    // Auto-select top 2-3 from fallback (prefer 3, but allow 2)
    if (fallbackRanking && fallbackRanking.ranked_projects.length > 0) {
      const sortedProjects = fallbackRanking.ranked_projects;
      const topProjects = sortedProjects.slice(0, Math.min(3, sortedProjects.length));
      const projectTitles = topProjects.map((p: any) => p.project_title);
      setSelectedProjectsToKeep(new Set(projectTitles));
    }
    
    // If no target role, use fallback only
    if (!targetRole) {
      setIsRankingProjects(false);
      return;
    }
    
    // Try AI ranking (will update if successful)
    try {
      const API_BASE = getAPIBase();
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(`${API_BASE}/resume/rank-best-projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          projects: projects,
          target_role: targetRole,
          job_description: jobDescription || undefined,
          top_n: projects.length, // Rank ALL projects
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.ranked_projects && result.ranked_projects.length > 0) {
          setProjectRanking(result);
          // Auto-select top 2-3 projects from AI ranking (prefer 3, but allow 2)
          const sortedProjects = result.ranked_projects.sort((a: any, b: any) => (a.rank || 0) - (b.rank || 0));
          const topProjects = sortedProjects.slice(0, Math.min(3, sortedProjects.length));
          const projectTitles = topProjects.map((p: any) => p.project_title);
          setSelectedProjectsToKeep(new Set(projectTitles));
        }
      }
    } catch (error) {
      console.error('Error ranking projects with AI:', error);
      // Keep fallback ranking if AI fails
    } finally {
      setIsRankingProjects(false);
    }
  };

  // Analyze skills and projects using AI
  const analyzeSkillsAndProjects = async () => {
    // Always rank projects (even without targetRole, will use fallback)
    await rankBestProjects();
    
    if (!targetRole) return;

    // Analyze skill gaps
    setIsAnalyzingSkills(true);
    try {
      const formatSkillsForAPI = (skills: any): string[] => {
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

      const resumeDataForAPI = {
        ...resumeData,
        skills: formatSkillsForAPI(resumeData.skills),
      };

      const API_BASE = getAPIBase();
      const response = await fetch(`${API_BASE}/resume/skill-gap-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({
          resume_data: resumeDataForAPI,
          target_role: targetRole,
          job_description: jobDescription,
        }),
      });

      if (response.ok) {
        const analysis = await response.json();
        setSkillGapAnalysis(analysis);
      }
    } catch (error) {
      console.error('Error analyzing skill gaps:', error);
    } finally {
      setIsAnalyzingSkills(false);
    }

    // Analyze project relevance
    setIsAnalyzingProjects(true);
    try {
      const projects = resumeData.projects || [];
      if (projects.length === 0) {
        setProjectAnalysis({
          irrelevant_projects: [],
          needs_more_projects: true,
          recommended_project_count: 3,
        });
        setIsAnalyzingProjects(false);
        return;
      }

      // Use AI to analyze all projects' relevance via backend
      const API_BASE = getAPIBase();
      const token = localStorage.getItem('access_token');
      
      try {
        const response = await fetch(`${API_BASE}/resume/analyze-all-projects-relevance`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            projects: projects,
            target_role: targetRole,
            job_description: jobDescription || undefined,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          const projectAnalyses = result.project_analyses || [];
          
          setProjectAnalysis({
            irrelevant_projects: projectAnalyses,
            needs_more_projects: result.needs_more_projects || projects.length < 3,
            recommended_project_count: result.recommended_project_count || 3,
          });
        } else {
          throw new Error('API request failed');
        }
      } catch (apiError) {
        console.warn('AI project analysis failed, using enhanced heuristic fallback:', apiError);
        // Enhanced fallback heuristic (much better than before)
        const projectRelevance = await analyzeProjectsWithEnhancedHeuristic(projects, targetRole, jobDescription);
        setProjectAnalysis({
          irrelevant_projects: projectRelevance,
          needs_more_projects: projects.length < 3,
          recommended_project_count: 3,
        });
      }
    } catch (error) {
      console.error('Error analyzing projects:', error);
    } finally {
      setIsAnalyzingProjects(false);
    }
  };

  // Enhanced heuristic analysis fallback (if AI fails)
  const analyzeProjectsWithEnhancedHeuristic = async (projects: any[], targetRole: string, jobDescription?: string): Promise<ProjectRelevance[]> => {
    const roleLower = targetRole.toLowerCase();
    const jdLower = (jobDescription || '').toLowerCase();
    
    // Extract key terms from role and JD
    const roleTerms = extractKeyTerms(roleLower);
    const jdTerms = extractKeyTerms(jdLower.substring(0, 2000));
    const allKeyTerms = [...new Set([...roleTerms, ...jdTerms])];

    // Common tech/skill mappings for better relevance detection
    const techMappings: Record<string, string[]> = {
      'software engineer': ['react', 'node', 'javascript', 'python', 'java', 'api', 'database', 'git', 'web', 'application', 'development'],
      'software developer': ['react', 'node', 'javascript', 'python', 'java', 'api', 'database', 'git', 'web', 'application', 'development'],
      'full-stack': ['react', 'node', 'express', 'mongodb', 'postgresql', 'api', 'frontend', 'backend', 'javascript'],
      'frontend': ['react', 'javascript', 'html', 'css', 'typescript', 'ui', 'ux', 'web'],
      'backend': ['node', 'python', 'java', 'api', 'database', 'server', 'rest', 'express'],
      'data scientist': ['python', 'pandas', 'numpy', 'ml', 'machine learning', 'data', 'analysis', 'visualization'],
      'data analyst': ['python', 'sql', 'excel', 'data', 'analysis', 'visualization', 'dashboard'],
      'ml engineer': ['python', 'tensorflow', 'pytorch', 'ml', 'ai', 'deep learning', 'model', 'neural'],
    };

    // Get role-specific expected techs
    const expectedTechs = Object.entries(techMappings).find(([key]) => roleLower.includes(key))?.[1] || [];

    return projects.map((project: any) => {
      const projectTitle = (project.project_title || '').toLowerCase();
      const projectDesc = (project.description || '').toLowerCase();
      const projectTechs = (project.technologies_used || []).map((t: string) => t.toLowerCase());
      const projectContribs = (project.contributions || []).map((c: string) => c.toLowerCase()).join(' ');
      
      const projectText = `${projectTitle} ${projectDesc} ${projectTechs.join(' ')} ${projectContribs}`;

      // Calculate relevance score using multiple factors
      let score = 0;
      let matchCount = 0;
      const totalChecks = Math.max(allKeyTerms.length + expectedTechs.length, 1);

      // Check keyword matches (weighted)
      allKeyTerms.forEach(term => {
        if (projectText.includes(term)) {
          matchCount++;
          // Give more weight to longer, more specific terms
          score += term.length > 5 ? 3 : 2;
        }
      });

      // Check technology matches (higher weight)
      expectedTechs.forEach(tech => {
        if (projectTechs.some(pt => pt.includes(tech) || tech.includes(pt))) {
          matchCount++;
          score += 5; // Tech matches are very important
        }
      });

      // Calculate final score (0-100)
      const baseScore = Math.min(100, (matchCount / totalChecks) * 100);
      const weightedScore = Math.min(100, (score / (totalChecks * 2)) * 100);
      const finalScore = Math.round((baseScore * 0.4) + (weightedScore * 0.6));

      // More lenient threshold - projects with score >= 30 are considered relevant
      // This ensures AI-suggested projects (which should be well-aligned) are recognized
      const isRelevant = finalScore >= 30 || matchCount > 0;

      return {
        project_title: project.project_title || 'Untitled Project',
        relevant: isRelevant,
        relevance_score: finalScore,
        reason: isRelevant 
          ? `Project demonstrates ${matchCount > 0 ? matchCount : 'some'} relevant ${matchCount === 1 ? 'skill/technology' : 'skills/technologies'} for ${targetRole}`
          : `Limited alignment with ${targetRole} requirements - only ${matchCount} matching ${matchCount === 1 ? 'term' : 'terms'} found`,
        suggestion: isRelevant 
          ? 'This project is relevant and strengthens your resume for this role'
          : 'Consider replacing with a project that better demonstrates skills required for this role, or add more relevant technologies/contributions',
      };
    });
  };

  // Extract key terms from text (removes common words, keeps meaningful terms)
  const extractKeyTerms = (text: string): string[] => {
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'where', 'when', 'why', 'how', 'all', 'each', 'every', 'some', 'any', 'no', 'not', 'only', 'just', 'more', 'most', 'very', 'too', 'so', 'than', 'then']);
    
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter(word => word.length > 2 && !commonWords.has(word))
      .filter((word, idx, arr) => arr.indexOf(word) === idx) // Remove duplicates
      .slice(0, 50); // Limit to top 50 terms
  };

  const toggleSection = (section: string) => {
    const newSelected = new Set(selectedSections);
    if (newSelected.has(section)) {
      newSelected.delete(section);
    } else {
      newSelected.add(section);
    }
    setSelectedSections(newSelected);
  };

  const handleAddSelected = () => {
    if (selectedSections.size === 0) {
      toast({
        title: 'No Sections Selected',
        description: 'Please select sections you want to add to your resume.',
        variant: 'destructive',
      });
      return;
    }

    onAddSections(Array.from(selectedSections));
    toast({
      title: 'Sections Added',
      description: `Added ${selectedSections.size} section(s). Please fill them in the form below.`,
    });
    
    // Close modal and let user fill the sections
    onOpenChange(false);
  };

  const handleGetProjectSuggestions = () => {
    onAddProjects();
    onOpenChange(false);
  };

  // Rewrite descriptions for selected projects and update localStorage
  const handleRewriteSelectedProjects = async () => {
    if (selectedProjectsToKeep.size < 2 || selectedProjectsToKeep.size > 3) {
      toast({
        title: 'Select 2-3 Projects',
        description: 'Please select 2-3 projects to proceed.',
        variant: 'destructive',
      });
      return null;
    }

    setIsRewritingDescriptions(true);
    try {
      const API_BASE = getAPIBase();
      const token = localStorage.getItem('access_token');
      
      // Get selected projects from original data (preserve all fields including timeline)
      const selectedProjects = (resumeData.projects || []).filter((p: any) => 
        selectedProjectsToKeep.has(p.project_title || p.title)
      );
      
      if (selectedProjects.length === 0) {
        toast({
          title: 'Error',
          description: 'No projects found to rewrite. Please try again.',
          variant: 'destructive',
        });
        return null;
      }
      
      const response = await fetch(`${API_BASE}/resume/rewrite-project-descriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          projects: selectedProjects,
          target_role: targetRole || undefined,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        const rewrittenProjects = result.rewritten_projects || [];
        
        if (rewrittenProjects.length === 0) {
          toast({
            title: 'Error',
            description: 'No rewritten projects received from server.',
            variant: 'destructive',
          });
          return null;
        }
        
        // Helper function to get project title consistently
        const getProjectTitle = (proj: any) => proj.project_title || proj.title || '';
        
        // Create a map of rewritten projects by title for easy lookup
        const rewrittenMap = new Map<string, any>();
        rewrittenProjects.forEach((rw: any) => {
          const title = getProjectTitle(rw);
          if (title) {
            rewrittenMap.set(title, rw);
          }
        });
        
        // Get existing projects from localStorage
        const existingProjects = resumeStorage.load('projects_saved') || [];
        
        // Create a map of existing projects by title
        const existingMap = new Map<string, any>();
        existingProjects.forEach((proj: any) => {
          const title = getProjectTitle(proj);
          if (title) {
            existingMap.set(title, proj);
          }
        });
        
        // Build final projects list: use rewritten projects, merge with existing data where available
        const finalProjects: any[] = [];
        const selectedTitles = Array.from(selectedProjectsToKeep);
        
        for (const title of selectedTitles) {
          const rewritten = rewrittenMap.get(title);
          if (rewritten) {
            const existing = existingMap.get(title);
            if (existing) {
              // Merge rewritten description with existing project data (preserve all other fields)
              finalProjects.push({
                ...existing,
                description: rewritten.description || existing.description,
                project_title: rewritten.project_title || existing.project_title || existing.title,
                title: rewritten.project_title || existing.project_title || existing.title,
                duration_start: rewritten.duration_start || existing.duration_start,
                duration_end: rewritten.duration_end || existing.duration_end,
              });
            } else {
              // Project doesn't exist in localStorage, add the rewritten one
              finalProjects.push({
                ...rewritten,
                project_title: rewritten.project_title || rewritten.title,
                title: rewritten.project_title || rewritten.title,
              });
            }
          } else {
            // Fallback: use existing project if rewritten not found
            const existing = existingMap.get(title);
            if (existing) {
              finalProjects.push(existing);
            }
          }
        }
        
        if (finalProjects.length < 2 || finalProjects.length > 3) {
          toast({
            title: 'Error',
            description: `Expected 2-3 projects, but got ${finalProjects.length}. Please try again.`,
            variant: 'destructive',
          });
          return null;
        }
        
        // IMPORTANT: Save enhanced projects to sessionStorage for preview ONLY
        // DO NOT modify localStorage - keep Build section unchanged
        sessionStorage.setItem('resume_enhanced_projects', JSON.stringify({
          projects: finalProjects,
          selectedTitles: selectedTitles,
          timestamp: Date.now(),
        }));
        
        toast({
          title: 'Projects Enhanced for Preview',
          description: `Successfully enhanced ${finalProjects.length} project(s) with AI-written descriptions (3 sentences each). These enhanced versions will be used in the resume preview. Your original projects in the Build section remain unchanged.`,
        });
        
        return rewrittenProjects;
      } else {
        throw new Error('Failed to rewrite descriptions');
      }
    } catch (error) {
      console.error('Error rewriting project descriptions:', error);
      toast({
        title: 'Error',
        description: 'Failed to rewrite project descriptions. Please try again.',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsRewritingDescriptions(false);
    }
  };

  const handleRemoveProjects = () => {
    if (selectedProjectsToRemove.size === 0) {
      toast({
        title: 'No Projects Selected',
        description: 'Please select projects you want to remove.',
        variant: 'destructive',
      });
      return;
    }

    if (onRemoveProjects) {
      onRemoveProjects(Array.from(selectedProjectsToRemove));
      toast({
        title: 'Projects Removed',
        description: `Removed ${selectedProjectsToRemove.size} project(s). Consider adding more relevant projects.`,
      });
      setSelectedProjectsToRemove(new Set());
      onOpenChange(false);
    }
  };

  const toggleProjectRemoval = (projectTitle: string) => {
    const newSelected = new Set(selectedProjectsToRemove);
    if (newSelected.has(projectTitle)) {
      newSelected.delete(projectTitle);
    } else {
      newSelected.add(projectTitle);
    }
    setSelectedProjectsToRemove(newSelected);
  };

  const handleProceedWithoutAdding = () => {
    onProceed();
    onOpenChange(false);
  };

  const highPrioritySections = missingSections.filter(s => s.priority === 'high');
  const mediumPrioritySections = missingSections.filter(s => s.priority === 'medium');
  const lowPrioritySections = missingSections.filter(s => s.priority === 'low');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-primary/5 to-primary/10 flex-shrink-0">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 rounded-lg bg-primary/10">
              <Lightbulb className="h-6 w-6 text-primary" />
            </div>
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Smart Resume Analysis
            </span>
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            We've analyzed your resume and found some areas to strengthen it for{' '}
            <span className="font-semibold text-foreground">{targetRole || 'your application'}</span>
            {companyName && ` at ${companyName}`}.
          </DialogDescription>
        </DialogHeader>

        {(isAnalyzing || isAnalyzingSkills || isAnalyzingProjects || isRankingProjects) ? (
          <div className="flex flex-col items-center justify-center p-12 flex-1 min-h-0">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <span className="mt-4 text-lg font-medium">
              {isAnalyzing && 'Analyzing your resume structure...'}
              {isRankingProjects && 'Ranking your projects with AI...'}
              {isAnalyzingSkills && 'Analyzing skills for the role...'}
              {isAnalyzingProjects && 'Checking project relevance with AI...'}
            </span>
            <span className="mt-2 text-sm text-muted-foreground">
              Using AI to provide personalized recommendations
            </span>
          </div>
        ) : (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <div className="px-6 py-4 space-y-6">
              {/* Completeness Score */}
              <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-2 border-primary/20 shadow-lg">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                      Resume Completeness
                    </CardTitle>
                    <Badge 
                      variant={completenessScore >= 80 ? 'default' : completenessScore >= 60 ? 'secondary' : 'destructive'} 
                      className="text-base px-4 py-1.5 font-semibold"
                    >
                      {completenessScore}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Progress value={completenessScore} className="h-4 mb-3" />
                  <p className="text-sm font-medium">
                    {completenessScore >= 80 
                      ? '✨ Great! Your resume is well-structured. Consider adding optional sections below.'
                      : completenessScore >= 60
                      ? '💪 Good progress! Add the recommended sections below to strengthen your resume.'
                      : '📝 Your resume needs more sections. Add the high-priority sections below.'}
                  </p>
                </CardContent>
              </Card>

              {/* AI Project Ranking - Show ALL projects with scores - Always show if projects exist */}
              {(resumeData.projects && resumeData.projects.length > 0) ? (
                <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-2 border-purple-200 dark:border-purple-800 shadow-lg">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50 shrink-0">
                          <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">Select Best 2-3 Projects {targetRole ? '(AI-Ranked)' : '(Ranked)'}</CardTitle>
                          <CardDescription className="text-sm mt-1">
                            {targetRole ? (
                              <>Your {resumeData.projects?.length || 0} projects are ranked by AI based on relevance, impact, and alignment with <strong>{targetRole}</strong>. Select <strong>2-3 projects</strong> to keep. Selected projects will have AI-enhanced descriptions (exactly 3 sentences each).</>
                            ) : (
                              <>You have {resumeData.projects?.length || 0} projects. Select <strong>2-3 best projects</strong> to keep. Selected projects will have AI-enhanced descriptions (exactly 3 sentences each).</>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                      <Badge variant={(selectedProjectsToKeep.size >= 2 && selectedProjectsToKeep.size <= 3) ? 'default' : 'secondary'} className="bg-white dark:bg-gray-800 font-semibold">
                        {selectedProjectsToKeep.size} / 2-3
                      </Badge>
                        {!isRankingProjects && targetRole && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={rankBestProjects}
                            className="text-xs"
                          >
                            <Target className="h-3 w-3 mr-1" />
                            Re-rank with AI
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isRankingProjects ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-purple-600 mr-2" />
                        <span className="text-sm text-muted-foreground">AI is analyzing and ranking your projects...</span>
                      </div>
                    ) : projectRanking?.ranked_projects && projectRanking.ranked_projects.length > 0 ? (
                      <>
                        {/* All Projects with Scores - Sorted by Rank */}
                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                          {projectRanking.ranked_projects
                            .sort((a: any, b: any) => (a.rank || 0) - (b.rank || 0))
                            .map((ranked: any, idx: number) => {
                          const isSelected = selectedProjectsToKeep.has(ranked.project_title);
                          const originalProject = (resumeData.projects || []).find((p: any) => p.project_title === ranked.project_title);
                          const hasTimeline = originalProject?.duration_start || originalProject?.duration_end;
                          
                          return (
                            <Card
                              key={idx}
                              className={`cursor-pointer transition-all ${
                                isSelected
                                  ? 'border-2 border-purple-500 bg-purple-50 dark:bg-purple-950/30 shadow-md'
                                  : 'hover:border-purple-300 border hover:shadow-sm'
                              }`}
                              onClick={() => {
                                const newSelected = new Set(selectedProjectsToKeep);
                                if (isSelected) {
                                  newSelected.delete(ranked.project_title);
                                } else {
                                  if (newSelected.size > 3) {
                                    toast({
                                      title: 'Maximum 3 Projects',
                                      description: 'You can only select up to 3 projects. Please remove one first.',
                                      variant: 'destructive',
                                    });
                                    return;
                                  }
                                  newSelected.add(ranked.project_title);
                                }
                                setSelectedProjectsToKeep(newSelected);
                              }}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                  {/* Rank Badge */}
                                  <div className={`p-2.5 rounded-lg font-bold text-sm shrink-0 ${
                                    isSelected
                                      ? 'bg-purple-500 text-white'
                                      : 'bg-muted'
                                  }`}>
                                    #{ranked.rank || idx + 1}
                                  </div>
                                  
                                  {/* Project Details */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <h5 className="font-semibold text-base">{ranked.project_title}</h5>
                                        {isSelected && (
                                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                            Selected
                                          </Badge>
                                        )}
                                        {hasTimeline && (
                                          <Badge variant="outline" className="text-xs">
                                            {originalProject.duration_start && originalProject.duration_end 
                                              ? `${originalProject.duration_start.substring(0, 7)} - ${originalProject.duration_end.substring(0, 7)}`
                                              : originalProject.duration_start 
                                              ? `Started: ${originalProject.duration_start.substring(0, 7)}`
                                              : ''}
                                          </Badge>
                                        )}
                                      </div>
                                      {!isSelected && (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-purple-600 hover:text-purple-700 shrink-0"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (selectedProjectsToKeep.size >= 3) {
                                              toast({
                                                title: 'Maximum 3 Projects',
                                                description: 'You can only select up to 3 projects. Please remove one first.',
                                                variant: 'destructive',
                                              });
                                              return;
                                            }
                                            const newSelected = new Set(selectedProjectsToKeep);
                                            newSelected.add(ranked.project_title);
                                            setSelectedProjectsToKeep(newSelected);
                                          }}
                                        >
                                          <Plus className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                    
                                    {/* Scores */}
                                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                                      <Badge variant="outline" className="text-xs">
                                        Relevance: {ranked.relevance_score || 0}/100
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        Impact: {ranked.impact_score || 0}/100
                                      </Badge>
                                      <Badge variant="outline" className={`text-xs font-semibold ${
                                        (ranked.overall_score || 0) >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                        (ranked.overall_score || 0) >= 60 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                        'bg-primary/10'
                                      }`}>
                                        Overall: {ranked.overall_score || 0}/100
                                      </Badge>
                                    </div>
                                    
                                    {/* Current Description - Only show if not selected */}
                                    {!isSelected && originalProject?.description && (
                                      <div className="mb-2 p-2 bg-muted/50 rounded-md">
                                        <p className="text-xs font-medium text-muted-foreground mb-1">Current:</p>
                                        <p className="text-xs text-muted-foreground line-clamp-2 italic">
                                          {originalProject.description}
                                        </p>
                                      </div>
                                    )}
                                    
                                    {/* Reason */}
                                    <p className="text-xs text-muted-foreground mb-2">
                                      <span className="font-medium">Why:</span> {ranked.reason}
                                    </p>
                                    
                                    {/* Remove Button for Selected */}
                                    {isSelected && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-1"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const newSelected = new Set(selectedProjectsToKeep);
                                          newSelected.delete(ranked.project_title);
                                          setSelectedProjectsToKeep(newSelected);
                                        }}
                                      >
                                        <X className="h-3 w-3 mr-1" />
                                        Remove
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                            })}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-purple-600 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Preparing project rankings...</p>
                      </div>
                    )}

                    {selectedProjectsToKeep.size > 0 && (
                      <Alert className={(selectedProjectsToKeep.size >= 2 && selectedProjectsToKeep.size <= 3) ? 'bg-green-50 dark:bg-green-950/20 border-green-200' : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200'}>
                        <CheckCircle2 className={`h-4 w-4 ${(selectedProjectsToKeep.size >= 2 && selectedProjectsToKeep.size <= 3) ? 'text-green-600' : 'text-amber-600'}`} />
                        <AlertDescription className={`text-sm ${(selectedProjectsToKeep.size >= 2 && selectedProjectsToKeep.size <= 3) ? 'text-green-800 dark:text-green-200' : 'text-amber-800 dark:text-amber-200'}`}>
                          {(selectedProjectsToKeep.size >= 2 && selectedProjectsToKeep.size <= 3) ? (
                            <>
                              <strong>Perfect! {selectedProjectsToKeep.size} project(s) selected.</strong> Click the button below to enhance descriptions (exactly 3 sentences each) and update your resume.
                            </>
                          ) : (
                            <>
                              <strong>{selectedProjectsToKeep.size} project(s) selected.</strong> Please select <strong>2-3 projects</strong> to proceed. Selected projects will have AI-enhanced descriptions (exactly 3 sentences each).
                            </>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ) : null}

              {/* Missing Sections */}
              {missingSections.length > 0 && (
                <Card className="border-2 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      Recommended Sections to Add
                    </CardTitle>
                    <CardDescription>
                      Select sections below to enhance your resume and improve your completeness score
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">

                  {/* High Priority */}
                  {highPrioritySections.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-destructive">High Priority</h4>
                      {highPrioritySections.map((section) => (
                        <Card
                          key={section.section}
                          className={`cursor-pointer transition-all ${
                            selectedSections.has(section.section)
                              ? 'border-primary border-2 bg-primary/5'
                              : 'hover:border-primary/50'
                          }`}
                          onClick={() => toggleSection(section.section)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${
                                selectedSections.has(section.section)
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}>
                                {section.icon}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold">{section.title}</h4>
                                  {selectedSections.has(section.section) && (
                                    <CheckCircle2 className="h-5 w-5 text-primary" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Medium Priority */}
                  {mediumPrioritySections.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-amber-600">Medium Priority</h4>
                      {mediumPrioritySections.map((section) => (
                        <Card
                          key={section.section}
                          className={`cursor-pointer transition-all ${
                            selectedSections.has(section.section)
                              ? 'border-primary border-2 bg-primary/5'
                              : 'hover:border-primary/50'
                          }`}
                          onClick={() => toggleSection(section.section)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg ${
                                selectedSections.has(section.section)
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}>
                                {section.icon}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-semibold">{section.title}</h4>
                                  {selectedSections.has(section.section) && (
                                    <CheckCircle2 className="h-5 w-5 text-primary" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Low Priority */}
                  {lowPrioritySections.length > 0 && (
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-between text-sm">
                          <span>Low Priority Sections ({lowPrioritySections.length})</span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="space-y-2 mt-2">
                        {lowPrioritySections.map((section) => (
                          <Card
                            key={section.section}
                            className={`cursor-pointer transition-all ${
                              selectedSections.has(section.section)
                                ? 'border-primary border-2 bg-primary/5'
                                : 'hover:border-primary/50'
                            }`}
                            onClick={() => toggleSection(section.section)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${
                                  selectedSections.has(section.section)
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}>
                                  {section.icon}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <h4 className="font-semibold">{section.title}</h4>
                                    {selectedSections.has(section.section) && (
                                      <CheckCircle2 className="h-5 w-5 text-primary" />
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1">{section.description}</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Skill Gap Analysis */}
              {skillGapAnalysis && !isAnalyzingSkills && (
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Target className="h-5 w-5 text-blue-600" />
                      Skill Analysis for {targetRole}
                      {skillGapAnalysis.skill_gap_score !== undefined && (
                        <Badge variant={skillGapAnalysis.skill_gap_score >= 70 ? 'default' : skillGapAnalysis.skill_gap_score >= 50 ? 'secondary' : 'destructive'} className="ml-auto">
                          {skillGapAnalysis.skill_gap_score}/100
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {skillGapAnalysis.recommended_skills && skillGapAnalysis.recommended_skills.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Recommended Skills to Add:</h4>
                        <div className="flex flex-wrap gap-2">
                          {skillGapAnalysis.recommended_skills.slice(0, 10).map((skill, idx) => (
                            <Badge key={idx} variant="outline" className="bg-white dark:bg-gray-800">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {skillGapAnalysis.missing_critical_skills && skillGapAnalysis.missing_critical_skills.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-destructive">Critical Skills Missing:</h4>
                        <div className="flex flex-wrap gap-2">
                          {skillGapAnalysis.missing_critical_skills.map((skill, idx) => (
                            <Badge key={idx} variant="destructive">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {skillGapAnalysis.recommendations && skillGapAnalysis.recommendations.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Recommendations:</h4>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                          {skillGapAnalysis.recommendations.slice(0, 3).map((rec, idx) => (
                            <li key={idx}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Project Relevance Analysis */}
              {projectAnalysis && !isAnalyzingProjects && (
                <Card className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-yellow-950/30 border-2 border-amber-200 dark:border-amber-800 shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                        <Code className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <span>AI Project Relevance Analysis</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {projectAnalysis.irrelevant_projects.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 text-destructive">
                          Projects That May Not Be Relevant ({projectAnalysis.irrelevant_projects.filter(p => !p.relevant).length}):
                        </h4>
                        <div className="space-y-2">
                          {projectAnalysis.irrelevant_projects.filter(p => !p.relevant).map((project, idx) => (
                            <Card
                              key={idx}
                              className={`cursor-pointer transition-all ${
                                selectedProjectsToRemove.has(project.project_title)
                                  ? 'border-destructive border-2 bg-destructive/5'
                                  : 'hover:border-amber-300'
                              }`}
                              onClick={() => toggleProjectRemoval(project.project_title)}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <h5 className="font-semibold text-sm">{project.project_title}</h5>
                                      {project.relevance_score !== undefined && (
                                        <Badge variant="outline" className="text-xs">
                                          {project.relevance_score}/100
                                        </Badge>
                                      )}
                                      {selectedProjectsToRemove.has(project.project_title) && (
                                        <CheckCircle2 className="h-4 w-4 text-destructive" />
                                      )}
                                    </div>
                                    {project.reason && (
                                      <p className="text-xs text-muted-foreground mt-1">{project.reason}</p>
                                    )}
                                    {project.suggestion && (
                                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{project.suggestion}</p>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                        {selectedProjectsToRemove.size > 0 && (
                          <Button
                            onClick={handleRemoveProjects}
                            variant="destructive"
                            size="sm"
                            className="mt-2"
                          >
                            <X className="mr-2 h-4 w-4" />
                            Remove Selected Projects ({selectedProjectsToRemove.size})
                          </Button>
                        )}
                      </div>
                    )}
                    {projectAnalysis.needs_more_projects && (
                      <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                        <Lightbulb className="h-4 w-4 text-blue-600" />
                        <AlertDescription className="text-blue-800 dark:text-blue-200">
                          <strong>Add More Projects!</strong> You currently have {resumeData.projects?.length || 0} project(s). 
                          We recommend at least {projectAnalysis.recommended_project_count} relevant projects for {targetRole}.
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Project Suggestions Alert */}
              {(projectSuggestions || 
                (projectAnalysis && projectAnalysis.needs_more_projects) ||
                (projectAnalysis && projectAnalysis.irrelevant_projects.filter(p => !p.relevant).length > 0)) && (
                <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
                  <Lightbulb className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 dark:text-blue-200">
                    <strong>Project Suggestions Available!</strong> {
                      projectAnalysis && projectAnalysis.irrelevant_projects.filter(p => !p.relevant).length > 0
                        ? `We found ${projectAnalysis.irrelevant_projects.filter(p => !p.relevant).length} project(s) that may not be relevant. Get AI-powered project suggestions tailored for ${targetRole} to replace them.`
                        : projectAnalysis && projectAnalysis.needs_more_projects
                        ? `You need more relevant projects for ${targetRole}. Get AI-powered project suggestions to strengthen your resume.`
                        : `Get AI-powered project suggestions tailored for ${targetRole} to strengthen your resume.`
                    }
                  </AlertDescription>
                </Alert>
              )}

              {/* Success Message if Complete */}
              {missingSections.length === 0 && (
                <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 dark:text-green-200">
                    <strong>Excellent!</strong> Your resume has all essential sections. You're ready to optimize and download!
                  </AlertDescription>
                </Alert>
              )}
            </div>
            </div>
          </div>
        )}

        {/* Action Buttons - Fixed at bottom */}
        {!(isAnalyzing || isAnalyzingSkills || isAnalyzingProjects || isRankingProjects) && (
          <div className="border-t bg-background px-6 py-4 space-y-3 flex-shrink-0">
              {/* Project Ranking Actions */}
              {projectRanking && selectedProjectsToKeep.size > 0 && (
                <Button
                  onClick={async () => {
                    if (selectedProjectsToKeep.size < 2 || selectedProjectsToKeep.size > 3) {
                      toast({
                        title: 'Select 2-3 Projects',
                        description: 'Please select 2-3 projects to proceed.',
                        variant: 'destructive',
                      });
                      return;
                    }
                    const rewrittenProjects = await handleRewriteSelectedProjects();
                    if (rewrittenProjects) {
                      onOpenChange(false);
                    }
                  }}
                  disabled={isRewritingDescriptions || selectedProjectsToKeep.size < 2 || selectedProjectsToKeep.size > 3}
                  size="lg"
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRewritingDescriptions ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      AI-Enhancing Descriptions...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-5 w-5" />
                      Keep {selectedProjectsToKeep.size} Selected Project{selectedProjectsToKeep.size > 1 ? 's' : ''} & AI-Enhance Descriptions (3 Sentences Each)
                    </>
                  )}
                </Button>
              )}

              {/* Project Suggestions */}
              {(projectSuggestions || 
                (projectAnalysis && projectAnalysis.needs_more_projects) ||
                (projectAnalysis && projectAnalysis.irrelevant_projects.filter(p => !p.relevant).length > 0)) && (
                <Button
                  onClick={handleGetProjectSuggestions}
                  variant="outline"
                  size="lg"
                  className="w-full border-2 border-primary text-primary hover:bg-primary/10 font-semibold"
                >
                  <Lightbulb className="mr-2 h-5 w-5" />
                  Get AI Project Suggestions
                </Button>
              )}

              {/* Section Actions */}
              {selectedSections.size > 0 && (
                <Button
                  onClick={handleAddSelected}
                  disabled={selectedSections.size === 0}
                  size="lg"
                  className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold shadow-lg"
                >
                  <Plus className="mr-2 h-5 w-5" />
                  Add Selected Sections ({selectedSections.size})
                </Button>
              )}

              {/* Footer Actions */}
              <div className="flex gap-3 pt-2 border-t">
                <Button
                  onClick={handleProceedWithoutAdding}
                  variant="outline"
                  className="flex-1 font-medium"
                  size="lg"
                >
                  Proceed to Preview
                </Button>
                <Button
                  onClick={() => onOpenChange(false)}
                  variant="ghost"
                  className="flex-1"
                  size="lg"
                >
                  Cancel
                </Button>
              </div>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

