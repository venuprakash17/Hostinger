import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { 
  Target, TrendingUp, FileText, Briefcase, Award, 
  Lightbulb, CheckCircle2, Clock, Calendar, BarChart3,
  GraduationCap, Code2, BookOpen, Star
} from "lucide-react";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { resumeStorage } from "@/lib/resumeStorage";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export function ResumeAnalytics() {
  const { profile, education, projects, skills, certifications, achievements, extracurricular, hobbies } = useStudentProfile();
  
  // Load saved data from localStorage
  const localEducation = useMemo(() => resumeStorage.load('education_saved') || [], []);
  const localProjects = useMemo(() => resumeStorage.load('projects_saved') || [], []);
  const localSkills = useMemo(() => resumeStorage.load('skills_saved') || [], []);
  const localCertifications = useMemo(() => resumeStorage.load('certifications_saved') || [], []);
  const localAchievements = useMemo(() => resumeStorage.load('achievements_saved') || [], []);

  // Merge data
  const allEducation = useMemo(() => {
    const merged = [...education];
    localEducation.forEach((item: any) => {
      if (!merged.find((e: any) => e.id === item.id)) {
        merged.push(item);
      }
    });
    return merged;
  }, [education, localEducation]);

  const allProjects = useMemo(() => {
    const merged = [...projects];
    localProjects.forEach((item: any) => {
      if (!merged.find((p: any) => p.id === item.id)) {
        merged.push(item);
      }
    });
    return merged;
  }, [projects, localProjects]);

  const allSkills = useMemo(() => {
    const merged = [...skills];
    localSkills.forEach((item: any) => {
      if (!merged.find((s: any) => s.id === item.id)) {
        merged.push(item);
      }
    });
    return merged;
  }, [skills, localSkills]);

  // Calculate completeness
  const completeness = useMemo(() => {
    let completed = 0;
    const total = 2; // Only Personal Info and Education are required

    if (profile?.full_name && profile?.email && profile?.phone_number) completed++;
    if (allEducation.length > 0) completed++;

    return Math.round((completed / total) * 100);
  }, [profile, allEducation.length]);

  // Section completion analysis
  const sectionCompletion = useMemo(() => {
    const sections = [
      { name: 'Personal Info', completed: !!(profile?.full_name && profile?.email && profile?.phone_number), required: true },
      { name: 'Education', completed: allEducation.length > 0, required: true },
      { name: 'Projects', completed: allProjects.length > 0, required: false },
      { name: 'Skills', completed: allSkills.length > 0, required: false },
      { name: 'Certifications', completed: (certifications?.length || 0) + localCertifications.length > 0, required: false },
      { name: 'Achievements', completed: (achievements?.length || 0) + localAchievements.length > 0, required: false },
      { name: 'Extracurricular', completed: (extracurricular?.length || 0) > 0, required: false },
      { name: 'Hobbies', completed: (hobbies?.length || 0) > 0, required: false },
    ];

    return sections;
  }, [profile, allEducation, allProjects, allSkills, certifications, achievements, extracurricular, hobbies, localCertifications, localAchievements]);

  // Skills distribution
  const skillsDistribution = useMemo(() => {
    const distribution: Record<string, number> = {};
    
    [...allSkills].forEach((skill: any) => {
      const category = skill.category || 'other';
      const skillList = Array.isArray(skill.skills) 
        ? skill.skills 
        : (typeof skill.skills === 'string' ? skill.skills.split(',').map((s: string) => s.trim()) : []);
      
      distribution[category] = (distribution[category] || 0) + skillList.length;
    });

    return Object.entries(distribution).map(([category, count]) => ({
      category: category.charAt(0).toUpperCase() + category.slice(1),
      count,
    }));
  }, [allSkills]);

  // Project statistics
  const projectStats = useMemo(() => {
    if (allProjects.length === 0) return null;

    const projectsWithTech = allProjects.filter((p: any) => 
      p.technologies_used && (Array.isArray(p.technologies_used) ? p.technologies_used.length > 0 : true)
    ).length;

    const projectsWithMetrics = allProjects.filter((p: any) => {
      const desc = p.description || '';
      return /\d+%|\d+\+|\d+\s*(users|requests|queries)/i.test(desc);
    }).length;

    return {
      total: allProjects.length,
      withTechnologies: projectsWithTech,
      withMetrics: projectsWithMetrics,
      completionRate: Math.round((projectsWithTech / allProjects.length) * 100),
      metricsRate: Math.round((projectsWithMetrics / allProjects.length) * 100),
    };
  }, [allProjects]);

  // Technology usage frequency
  const techUsage = useMemo(() => {
    const techMap: Record<string, number> = {};
    
    allProjects.forEach((project: any) => {
      if (project.technologies_used) {
        const techs = Array.isArray(project.technologies_used) 
          ? project.technologies_used 
          : (typeof project.technologies_used === 'string' ? project.technologies_used.split(',').map((t: string) => t.trim()) : []);
        
        techs.forEach((tech: string) => {
          techMap[tech] = (techMap[tech] || 0) + 1;
        });
      }
    });

    return Object.entries(techMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([tech, count]) => ({ tech, count }));
  }, [allProjects]);

  // Education statistics
  const educationStats = useMemo(() => {
    if (allEducation.length === 0) return null;

    const withCGPA = allEducation.filter((e: any) => e.cgpa_percentage || e.cgpa || e.gpa).length;
    const current = allEducation.filter((e: any) => e.is_current || /present/i.test(e.end_date || e.end || '')).length;

    return {
      total: allEducation.length,
      withCGPA: withCGPA,
      current: current,
      cgpaRate: Math.round((withCGPA / allEducation.length) * 100),
    };
  }, [allEducation]);

  // Calculate estimated ATS score
  const estimatedAtsScore = useMemo(() => {
    let score = 0;

    // Format & Structure (20 points)
    const requiredSections = sectionCompletion.filter(s => s.required && s.completed).length;
    score += (requiredSections / 2) * 20; // 2 required sections

    // Keywords (25 points)
    const totalSkills = allSkills.reduce((sum: number, skill: any) => {
      const skillList = Array.isArray(skill.skills) ? skill.skills : [];
      return sum + skillList.length;
    }, 0);
    score += Math.min(25, (totalSkills / 15) * 25); // Ideal: 15 skills

    // Experience (20 points)
    if (projectStats) {
      score += Math.min(20, (projectStats.withMetrics / projectStats.total) * 20);
    }

    // Skills (15 points)
    score += Math.min(15, (totalSkills / 10) * 15); // Ideal: 10 skills

    // Contact (10 points)
    const hasEmail = !!profile?.email;
    const hasPhone = !!profile?.phone_number;
    const hasLinkedIn = !!profile?.linkedin_profile;
    score += ((hasEmail ? 3 : 0) + (hasPhone ? 3 : 0) + (hasLinkedIn ? 2 : 0)) + 2; // Address optional

    // Readability (10 points)
    score += 10; // Assuming good formatting

    return Math.min(100, Math.round(score));
  }, [profile, sectionCompletion, allSkills, projectStats]);

  // Generate trend data (last 6 months)
  const trendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    const currentMonth = new Date().getMonth();
    
    return months.map((month, idx) => {
      const monthIdx = (currentMonth - (5 - idx) + 12) % 12;
      // Simulate progress - start lower and increase
      const progress = Math.min(100, 40 + (idx * 12) + (estimatedAtsScore - 40) * (idx / 5));
      return {
        month,
        score: Math.round(progress),
        completeness: Math.min(100, 30 + (idx * 14) + (completeness - 30) * (idx / 5)),
      };
    });
  }, [estimatedAtsScore, completeness]);

  // Activity history (from localStorage)
  const activityHistory = useMemo(() => {
    try {
      const history = resumeStorage.load('resume_activity_history') || [];
      return history.slice(-10).reverse(); // Last 10 activities
    } catch {
      return [];
    }
  }, []);

  // Improvement recommendations
  const recommendations = useMemo(() => {
    const recs: string[] = [];

    if (completeness < 100) {
      recs.push('Complete required sections (Personal Info & Education) to unlock resume generation');
    }

    if (allProjects.length === 0) {
      recs.push('Add projects to showcase your technical skills and experience');
    } else if (projectStats && projectStats.metricsRate < 50) {
      recs.push('Add quantifiable metrics to your projects (percentages, numbers, scale)');
    }

    const totalSkills = allSkills.reduce((sum: number, skill: any) => {
      const skillList = Array.isArray(skill.skills) ? skill.skills : [];
      return sum + skillList.length;
    }, 0);

    if (totalSkills < 8) {
      recs.push(`Add more skills (currently ${totalSkills}, aim for 8-15 technical skills)`);
    }

    if (certifications.length + localCertifications.length === 0) {
      recs.push('Add certifications to demonstrate continuous learning');
    }

    if (achievements.length + localAchievements.length === 0) {
      recs.push('Include achievements or awards to stand out from other candidates');
    }

    if (!profile?.linkedin_profile && !profile?.github_portfolio) {
      recs.push('Add LinkedIn or GitHub profile to improve professional presence');
    }

    if (estimatedAtsScore < 70) {
      recs.push(`Improve ATS score from ${estimatedAtsScore}% to 80%+ by adding more details and keywords`);
    }

    return recs.slice(0, 6);
  }, [completeness, allProjects, projectStats, allSkills, certifications, achievements, profile, estimatedAtsScore, localCertifications, localAchievements]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-card border-l-4 border-l-primary">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated ATS Score</p>
                <p className="text-2xl font-bold">{estimatedAtsScore}/100</p>
                <Progress value={estimatedAtsScore} className="h-1 mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-l-4 border-l-green-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500/10">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completeness</p>
                <p className="text-2xl font-bold">{completeness}%</p>
                <Progress value={completeness} className="h-1 mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-l-4 border-l-blue-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Code2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Projects</p>
                <p className="text-2xl font-bold">{allProjects.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {projectStats ? `${projectStats.withMetrics} with metrics` : 'No projects'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card border-l-4 border-l-purple-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Award className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Skills</p>
                <p className="text-2xl font-bold">
                  {allSkills.reduce((sum: number, skill: any) => {
                    const skillList = Array.isArray(skill.skills) ? skill.skills : [];
                    return sum + skillList.length;
                  }, 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {skillsDistribution.length} categories
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* ATS Score & Completeness Trend */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Progress Trend
            </CardTitle>
            <CardDescription>Your resume score and completeness over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#3b82f6" 
                  strokeWidth={2} 
                  name="ATS Score"
                  dot={{ r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="completeness" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  name="Completeness"
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Section Completion */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Section Completion
            </CardTitle>
            <CardDescription>Track which sections are complete</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sectionCompletion.map((section, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {section.completed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        section.required ? (
                          <Clock className="h-4 w-4 text-red-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-500" />
                        )
                      )}
                      <span className="text-sm font-medium">{section.name}</span>
                      {section.required && (
                        <Badge variant="outline" className="text-xs">Required</Badge>
                      )}
                    </div>
                    <Badge variant={section.completed ? "default" : "secondary"}>
                      {section.completed ? "Complete" : "Incomplete"}
                    </Badge>
                  </div>
                  <Progress value={section.completed ? 100 : 0} className="h-1" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Skills Distribution */}
        {skillsDistribution.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Skills Distribution
              </CardTitle>
              <CardDescription>Skills by category</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={skillsDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Technology Usage */}
        {techUsage.length > 0 && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-blue-600" />
                Top Technologies
              </CardTitle>
              <CardDescription>Most used technologies in projects</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={techUsage} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="tech" type="category" width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Project Statistics */}
        {projectStats && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-orange-600" />
                Project Statistics
              </CardTitle>
              <CardDescription>Quality analysis of your projects</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Projects</span>
                      <span className="font-bold">{projectStats.total}</span>
                    </div>
                    <Progress value={100} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>With Technologies</span>
                      <span className="font-bold">{projectStats.withTechnologies}/{projectStats.total}</span>
                    </div>
                    <Progress value={projectStats.completionRate} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>With Metrics</span>
                      <span className="font-bold">{projectStats.withMetrics}/{projectStats.total}</span>
                    </div>
                    <Progress value={projectStats.metricsRate} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Quality Score</span>
                      <span className="font-bold">
                        {Math.round((projectStats.completionRate + projectStats.metricsRate) / 2)}%
                      </span>
                    </div>
                    <Progress value={(projectStats.completionRate + projectStats.metricsRate) / 2} className="h-2" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Education Statistics */}
        {educationStats && (
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-green-600" />
                Education Overview
              </CardTitle>
              <CardDescription>Your academic achievements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-primary/5 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{educationStats.total}</p>
                    <p className="text-sm text-muted-foreground">Total Degrees</p>
                  </div>
                  <div className="text-center p-4 bg-green-500/5 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{educationStats.withCGPA}</p>
                    <p className="text-sm text-muted-foreground">With CGPA</p>
                  </div>
                  <div className="text-center p-4 bg-blue-500/5 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{educationStats.current}</p>
                    <p className="text-sm text-muted-foreground">Ongoing</p>
                  </div>
                  <div className="text-center p-4 bg-purple-500/5 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{educationStats.cgpaRate}%</p>
                    <p className="text-sm text-muted-foreground">CGPA Rate</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="shadow-card border-l-4 border-l-yellow-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              Improvement Recommendations
            </CardTitle>
            <CardDescription>Actionable tips to improve your resume</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm">
                  <Star className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Activity History */}
      {activityHistory.length > 0 && (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your resume activity history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activityHistory.map((activity: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{activity.action || 'Resume activity'}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {activity.timestamp ? new Date(activity.timestamp).toLocaleDateString() : 'Recently'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

