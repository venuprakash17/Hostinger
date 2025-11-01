import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit2, X } from "lucide-react";
import { Project } from "@/hooks/useStudentProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface ProjectsFormProps {
  projects: Project[];
}

export function ProjectsForm({ projects }: ProjectsFormProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors }, setValue, watch } = useForm<Project>();

  const onSubmit = async (data: Project) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Convert comma-separated technologies to array
      const technologies = (data.technologies_used as any as string || "")
        .split(",")
        .map(t => t.trim())
        .filter(Boolean);

      const projectData = {
        ...data,
        technologies_used: technologies,
      };

      if (editingId) {
        const { error } = await supabase
          .from("student_projects")
          .update(projectData)
          .eq("id", editingId)
          .eq("user_id", user.id);

        if (error) throw error;
        toast({ title: "Project updated successfully" });
        setEditingId(null);
      } else {
        const { error } = await supabase
          .from("student_projects")
          .insert({
            user_id: user.id,
            ...projectData,
            display_order: projects.length,
          });

        if (error) throw error;
        toast({ title: "Project added successfully" });
      }

      reset();
      setIsAdding(false);
      queryClient.invalidateQueries({ queryKey: ["studentProjects"] });
    } catch (error: any) {
      toast({
        title: "Error saving project",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (project: Project) => {
    setEditingId(project.id!);
    reset({
      ...project,
      technologies_used: project.technologies_used?.join(", ") as any,
    });
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("student_projects")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Project deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["studentProjects"] });
    } catch (error: any) {
      toast({
        title: "Error deleting project",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
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
                  placeholder="AI Resume Builder"
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
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...register("description")}
                  placeholder="Brief description of the project (2-3 lines)"
                  rows={3}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="technologies_used">Technologies Used</Label>
                <Input
                  id="technologies_used"
                  {...register("technologies_used")}
                  placeholder="Python, React, AWS (comma-separated)"
                />
                <p className="text-xs text-muted-foreground">
                  Separate technologies with commas
                </p>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="role_contribution">Role / Contribution</Label>
                <Textarea
                  id="role_contribution"
                  {...register("role_contribution")}
                  placeholder="What you did in this project"
                  rows={2}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="github_demo_link">GitHub / Demo Link</Label>
                <Input
                  id="github_demo_link"
                  {...register("github_demo_link")}
                  placeholder="https://github.com/username/project"
                />
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
