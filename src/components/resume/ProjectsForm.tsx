import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit2, X } from "lucide-react";
import { Project } from "@/hooks/useStudentProfile";
import { useToast } from "@/hooks/use-toast";
import { resumeStorage } from "@/lib/resumeStorage";

interface ProjectsFormProps {
  projects: Project[];
}

export function ProjectsForm({ projects }: ProjectsFormProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm<Project>();

  const onSubmit = async (data: Project) => {
    try {
      // Clear draft after successful save
      resumeStorage.clear('projects_form');

      // Convert comma-separated technologies to array if string
      const technologies = Array.isArray(data.technologies_used) 
        ? data.technologies_used 
        : (typeof data.technologies_used === 'string' 
            ? data.technologies_used.split(",").map(t => t.trim()).filter(Boolean)
            : []);

      const projectData = {
        ...data,
        id: editingId || `draft_${Date.now()}`,
        technologies_used: technologies,
        duration_start: data.duration_start ? `${data.duration_start}-01` : null,
        duration_end: data.duration_end ? `${data.duration_end}-01` : null,
      };

      // Save to localStorage
      const savedProjects = resumeStorage.load<Project[]>('projects_saved') || [];
      if (editingId) {
        const index = savedProjects.findIndex((p: any) => p.id === editingId);
        if (index >= 0) {
          savedProjects[index] = projectData;
        } else {
          savedProjects.push(projectData);
        }
        toast({ title: "Project updated successfully" });
        setEditingId(null);
      } else {
        savedProjects.push(projectData);
        toast({ title: "Project added successfully" });
      }
      
      resumeStorage.save('projects_saved', savedProjects);

      reset();
      setIsAdding(false);
      window.dispatchEvent(new Event('resumeDataUpdated'));
    } catch (error: any) {
      toast({
        title: "Error saving project",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (project: Project) => {
    setEditingId(project.id!);
    reset({
      ...project,
      technologies_used: project.technologies_used?.join(", ") as any,
      duration_start: project.duration_start ? project.duration_start.substring(0, 7) : undefined,
      duration_end: project.duration_end ? project.duration_end.substring(0, 7) : undefined,
    });
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const savedProjects = resumeStorage.load<Project[]>('projects_saved') || [];
      const filtered = savedProjects.filter((p: any) => p.id !== id);
      resumeStorage.save('projects_saved', filtered);
      
      toast({ title: "Project deleted successfully" });
      window.dispatchEvent(new Event('resumeDataUpdated'));
    } catch (error: any) {
      toast({
        title: "Error deleting project",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    resumeStorage.clear('projects_form');
    reset();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Projects</CardTitle>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Project
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing projects */}
        {projects.map((project) => (
          <div key={project.id} className="p-4 border rounded-lg space-y-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold">{project.project_title}</h4>
                <p className="text-sm text-muted-foreground">
                  {project.duration_start} - {project.duration_end}
                </p>
                {project.description && (
                  <p className="text-sm mt-2">{project.description}</p>
                )}
                {project.technologies_used && project.technologies_used.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {project.technologies_used.map((tech, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 text-xs bg-primary/10 rounded"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
                {project.role_contribution && (
                  <p className="text-sm mt-2">
                    <span className="font-medium">Role:</span> {project.role_contribution}
                  </p>
                )}
                {project.github_demo_link && (
                  <a
                    href={project.github_demo_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline mt-1 inline-block"
                  >
                    View Project →
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(project)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(project.id!)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}

        {/* Add/Edit form */}
        {isAdding && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold">
                {editingId ? "Edit Project" : "Add New Project"}
              </h4>
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="project_title">Project Title *</Label>
                <Input
                  id="project_title"
                  {...register("project_title", { required: "Project title is required" })}
                  placeholder="e.g., AI-Powered Resume Builder, E-Commerce Platform, Task Management App"
                />
                {errors.project_title && (
                  <p className="text-sm text-destructive">{errors.project_title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration_start">Start Date</Label>
                <Input
                  id="duration_start"
                  type="month"
                  {...register("duration_start")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration_end">End Date</Label>
                <Input
                  id="duration_end"
                  type="month"
                  {...register("duration_end")}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Project Description</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="e.g., Developed a full-stack web application that helps users build ATS-friendly resumes using AI. Implemented real-time collaboration and PDF export features."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">Brief overview of what the project does (2-3 sentences)</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="technologies_used">Technologies & Tools Used</Label>
                <Input
                  id="technologies_used"
                  {...register("technologies_used")}
                  placeholder="e.g., React, Node.js, PostgreSQL, AWS S3, Docker, Jest"
                />
                <p className="text-xs text-muted-foreground">
                  Separate with commas: programming languages, frameworks, databases, tools
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="role_contribution">Your Role & Key Contributions</Label>
                <Textarea
                  id="role_contribution"
                  {...register("role_contribution")}
                  placeholder="e.g., Led frontend development, designed REST APIs, implemented authentication system, optimized database queries resulting in 40% faster load times"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">What you specifically contributed and accomplished</p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="github_demo_link">GitHub Repository / Live Demo URL</Label>
                <Input
                  id="github_demo_link"
                  type="url"
                  {...register("github_demo_link")}
                  placeholder="e.g., https://github.com/username/project-name or https://project-demo.vercel.app"
                />
                <p className="text-xs text-muted-foreground">Optional: Link to code repository or live demo</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                {editingId ? "Update Project" : "Add Project"}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
