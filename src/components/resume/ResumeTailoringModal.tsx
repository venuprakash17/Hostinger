/**
 * Resume Tailoring Modal
 * Shows role-specific suggestions for improving resume
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Circle, Plus, ArrowRight, Sparkles, Target, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TailoringSuggestion {
  type: 'project' | 'skill' | 'certification' | 'achievement' | 'keyword';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  action?: string;
}

interface ResumeTailoringModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetRole?: string;
  jobDescription?: string;
  currentProjects: number;
  currentSkills: string[];
  atsScore?: number;
  missingKeywords?: string[];
  recommendations?: string[];
}

export function ResumeTailoringModal({
  open,
  onOpenChange,
  targetRole,
  jobDescription,
  currentProjects,
  currentSkills = [],
  atsScore,
  missingKeywords = [],
  recommendations = [],
}: ResumeTailoringModalProps) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<TailoringSuggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && (targetRole || jobDescription)) {
      generateSuggestions();
    }
  }, [open, targetRole, jobDescription, currentProjects, currentSkills.length, missingKeywords]);

  const generateSuggestions = () => {
    const newSuggestions: TailoringSuggestion[] = [];

    // Project suggestions
    if (currentProjects < 3) {
      newSuggestions.push({
        type: 'project',
        title: `Add ${3 - currentProjects} More Project${3 - currentProjects > 1 ? 's' : ''}`,
        description: `Having 3+ projects demonstrates hands-on experience. ${targetRole ? `Focus on ${targetRole}-related projects.` : 'Include projects showcasing your technical skills.'}`,
        priority: 'high',
        action: 'Add projects in Build tab',
      });
    } else if (currentProjects < 5) {
      newSuggestions.push({
        type: 'project',
        title: 'Add 1-2 More Projects',
        description: 'More projects = better showcase of skills. Add projects that align with the target role.',
        priority: 'medium',
        action: 'Add projects in Build tab',
      });
    }

    // Skill suggestions based on missing keywords
    if (missingKeywords.length > 0) {
      const missingSkills = missingKeywords.slice(0, 5).filter(kw => 
        !currentSkills.some(skill => skill.toLowerCase().includes(kw.toLowerCase()))
      );
      
      missingSkills.forEach(skill => {
        newSuggestions.push({
          type: 'skill',
          title: `Add Skill: ${skill}`,
          description: `This keyword appears in the job description but is missing from your resume. Adding it will improve ATS score.`,
          priority: 'high',
          action: 'Add in Skills section',
        });
      });
    }

    // Role-specific skill suggestions
    if (targetRole) {
      const roleSkills: Record<string, string[]> = {
        'Software Developer': ['TypeScript', 'Git', 'REST APIs', 'Testing', 'CI/CD'],
        'Data Scientist': ['Pandas', 'NumPy', 'Matplotlib', 'Jupyter', 'SQL'],
        'Frontend Developer': ['React', 'TypeScript', 'CSS', 'Responsive Design', 'UI/UX'],
        'Backend Developer': ['Node.js', 'Databases', 'APIs', 'Security', 'Scalability'],
        'Full Stack Developer': ['React', 'Node.js', 'Databases', 'APIs', 'Deployment'],
        'Machine Learning Engineer': ['TensorFlow', 'PyTorch', 'Scikit-learn', 'MLOps', 'Python'],
      };

      const roleLower = targetRole.toLowerCase();
      const suggestedSkills = Object.entries(roleSkills).find(([role]) => 
        roleLower.includes(role.toLowerCase()) || role.toLowerCase().includes(roleLower)
      )?.[1] || [];

      suggestedSkills
        .filter(skill => !currentSkills.some(s => s.toLowerCase().includes(skill.toLowerCase())))
        .slice(0, 3)
        .forEach(skill => {
          newSuggestions.push({
            type: 'skill',
            title: `Consider Adding: ${skill}`,
            description: `This skill is commonly required for ${targetRole} roles and will strengthen your profile.`,
            priority: 'medium',
            action: 'Add in Skills section',
          });
        });
    }

    // Certification suggestions
    if (targetRole) {
      const certSuggestions: Record<string, string[]> = {
        'Software Developer': ['AWS Certified Developer', 'Google Cloud Certified', 'Docker Certification'],
        'Data Scientist': ['AWS Machine Learning', 'Google Data Analytics', 'TensorFlow Developer'],
      };

      const roleLower = targetRole.toLowerCase();
      const certs = Object.entries(certSuggestions).find(([role]) =>
        roleLower.includes(role.toLowerCase()) || role.toLowerCase().includes(roleLower)
      )?.[1] || [];

      if (certs.length > 0) {
        newSuggestions.push({
          type: 'certification',
          title: 'Consider Relevant Certifications',
          description: `Certifications like ${certs[0]} can boost your profile for ${targetRole} positions.`,
          priority: 'low',
          action: 'Add certifications in Build tab',
        });
      }
    }

    // Keyword optimization
    if (missingKeywords.length > 5) {
      newSuggestions.push({
        type: 'keyword',
        title: 'Optimize Keywords',
        description: `You're missing ${missingKeywords.length} important keywords from the job description. Use AI Optimization to automatically match keywords.`,
        priority: 'high',
        action: 'Click "Optimize with AI"',
      });
    }

    // General recommendations
    if (atsScore && atsScore < 70) {
      newSuggestions.push({
        type: 'achievement',
        title: 'Add Quantifiable Achievements',
        description: 'Add numbers, percentages, and metrics to your project descriptions to improve ATS score.',
        priority: 'high',
        action: 'Enhance projects with metrics',
      });
    }

    setSuggestions(newSuggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }));
  };

  const toggleSuggestion = (index: number) => {
    const newSelected = new Set(selectedSuggestions);
    const key = `suggestion-${index}`;
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedSuggestions(newSelected);
  };

  const handleApplySuggestions = () => {
    toast({
      title: 'Suggestions Saved',
      description: `You can now implement ${selectedSuggestions.size} selected suggestions in the Build tab.`,
    });
    onOpenChange(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'medium':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400';
      case 'low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'project':
        return '📁';
      case 'skill':
        return '💻';
      case 'certification':
        return '🏆';
      case 'keyword':
        return '🔑';
      case 'achievement':
        return '⭐';
      default:
        return '💡';
    }
  };

  if (!targetRole && !jobDescription) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Tailor Your Resume for {targetRole || 'This Role'}
          </DialogTitle>
          <DialogDescription>
            Get personalized suggestions to make your resume stand out for this specific role
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Current Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{atsScore || 'N/A'}/100</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currentProjects}</div>
                  <p className="text-xs text-muted-foreground">Target: 3+</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currentSkills.length}</div>
                  <p className="text-xs text-muted-foreground">Target: 15+</p>
                </CardContent>
              </Card>
            </div>

            {/* Suggestions */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Personalized Suggestions ({suggestions.length})
              </h3>
              
              {suggestions.length === 0 ? (
                <Card>
                  <CardContent className="py-6 text-center text-muted-foreground">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Enter a target role or job description to get tailored suggestions</p>
                  </CardContent>
                </Card>
              ) : (
                suggestions.map((suggestion, index) => {
                  const key = `suggestion-${index}`;
                  const isSelected = selectedSuggestions.has(key);
                  
                  return (
                    <Card
                      key={index}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        isSelected ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => toggleSuggestion(index)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-1">
                            {isSelected ? (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xl">{getTypeIcon(suggestion.type)}</span>
                              <h4 className="font-semibold">{suggestion.title}</h4>
                              <Badge className={getPriorityColor(suggestion.priority)}>
                                {suggestion.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {suggestion.description}
                            </p>
                            {suggestion.action && (
                              <div className="flex items-center gap-1 text-xs text-primary">
                                <ArrowRight className="h-3 w-3" />
                                <span>{suggestion.action}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Missing Keywords */}
            {missingKeywords.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Missing Keywords ({missingKeywords.length})</CardTitle>
                  <CardDescription>
                    These keywords from the job description are missing from your resume
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {missingKeywords.slice(0, 10).map((keyword, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                    {missingKeywords.length > 10 && (
                      <Badge variant="outline" className="text-xs">
                        +{missingKeywords.length - 10} more
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedSuggestions.size > 0
              ? `${selectedSuggestions.size} suggestion${selectedSuggestions.size > 1 ? 's' : ''} selected`
              : 'Select suggestions to implement'}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              onClick={handleApplySuggestions}
              disabled={selectedSuggestions.size === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Apply Selected ({selectedSuggestions.size})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

