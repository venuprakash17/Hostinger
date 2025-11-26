import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Edit2, X } from "lucide-react";
import { Skill } from "@/hooks/useStudentProfile";
import { useToast } from "@/hooks/use-toast";
import { resumeStorage } from "@/lib/resumeStorage";
import { SkillsAutocomplete } from "./SkillsAutocomplete";

interface SkillsFormProps {
  skills: Skill[];
}

export function SkillsForm({ skills }: SkillsFormProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const { toast } = useToast();

  const { register, handleSubmit, reset, formState: { errors }, watch, setValue } = useForm<Skill>();
  const formValues = watch();
  const skillsInput = watch("skills");

  // Load draft from localStorage when form opens
  useEffect(() => {
    if (isAdding && !editingId) {
      const draft = resumeStorage.load<Skill>('skills_form');
      if (draft) {
        setSelectedCategory(draft.category || "");
        reset({
          ...draft,
          skills: Array.isArray(draft.skills) 
            ? draft.skills.join(", ") as any 
            : draft.skills,
        });
        toast({
          title: "Draft restored",
          description: "Your previous form data has been restored.",
        });
      }
    }
  }, [isAdding, editingId, reset, toast]);

  // Auto-save draft to localStorage as user types (debounced)
  useEffect(() => {
    if (!isAdding || editingId) return;
    
    const timer = setTimeout(() => {
      const hasData = selectedCategory || skillsInput || 
        Object.values(formValues).some(val => 
          val !== '' && val !== null && val !== undefined
        );
      if (hasData) {
        const skillsArray = typeof skillsInput === 'string' 
          ? skillsInput.split(",").map(s => s.trim()).filter(Boolean)
          : [];
        
        resumeStorage.save('skills_form', {
          category: selectedCategory,
          skills: skillsArray.length > 0 ? skillsArray : skillsInput,
        });
      }
    }, 1000); // Save after 1 second of no typing

    return () => clearTimeout(timer);
  }, [formValues, skillsInput, selectedCategory, isAdding, editingId]);

  const onSubmit = async (data: Skill) => {
    try {
      // Clear draft after successful save
      resumeStorage.clear('skills_form');

      const skillsArray = (typeof data.skills === 'string' 
        ? data.skills.split(",").map(s => s.trim()).filter(Boolean)
        : (Array.isArray(data.skills) ? data.skills : []));

      const skillData: Skill = {
        id: editingId || `skill_${Date.now()}`,
        category: selectedCategory || data.category || "technical",
        skills: skillsArray,
      };

      // Save to localStorage
      const savedSkills = resumeStorage.load<Skill[]>('skills_saved') || [];
      if (editingId) {
        const index = savedSkills.findIndex((s: any) => s.id === editingId);
        if (index >= 0) {
          savedSkills[index] = skillData;
        } else {
          savedSkills.push(skillData);
        }
        toast({ title: "Skills updated successfully" });
        setEditingId(null);
      } else {
        savedSkills.push(skillData);
        toast({ title: "Skills added successfully" });
      }
      
      resumeStorage.save('skills_saved', savedSkills);

      reset();
      setSelectedCategory("");
      setIsAdding(false);
      
      // Trigger page refresh to show updated list
      window.dispatchEvent(new Event('resumeDataUpdated'));
    } catch (error: any) {
      toast({
        title: "Error saving skills",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (skill: Skill) => {
    setEditingId(skill.id!);
    setSelectedCategory(skill.category || "");
    reset({
      ...skill,
      skills: Array.isArray(skill.skills) 
        ? skill.skills.join(", ") as any 
        : skill.skills,
    });
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const savedSkills = resumeStorage.load<Skill[]>('skills_saved') || [];
      const filtered = savedSkills.filter((s: any) => s.id !== id);
      resumeStorage.save('skills_saved', filtered);
      
      toast({ title: "Skills deleted successfully" });
      window.dispatchEvent(new Event('resumeDataUpdated'));
    } catch (error: any) {
      toast({
        title: "Error deleting skills",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setSelectedCategory("");
    // Clear draft when canceling
    resumeStorage.clear('skills_form');
    reset();
  };

  // Merge saved skills from localStorage with props
  const savedSkills = resumeStorage.load<Skill[]>('skills_saved') || [];
  const allSkills = [...skills, ...savedSkills.filter((s: any) => 
    !skills.find((skill: any) => skill.id === s.id)
  )];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Skills</CardTitle>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Skills
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing skills */}
        {allSkills.map((skill) => (
          <div key={skill.id} className="p-4 border rounded-lg space-y-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-semibold capitalize">{skill.category || "Technical"} Skills</h4>
                <div className="flex flex-wrap gap-1 mt-2">
                  {(Array.isArray(skill.skills) ? skill.skills : []).map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 text-xs bg-primary/10 rounded"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(skill)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(skill.id!)}
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
                {editingId ? "Edit Skills" : "Add New Skills"}
              </h4>
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Skill Category *</Label>
                <Select 
                  value={selectedCategory} 
                  onValueChange={(value) => {
                    setSelectedCategory(value);
                    setValue("category", value);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical Skills</SelectItem>
                    <SelectItem value="soft">Soft Skills</SelectItem>
                    <SelectItem value="languages">Languages</SelectItem>
                  </SelectContent>
                </Select>
                {!selectedCategory && (
                  <p className="text-xs text-destructive">Please select a category</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="skills">Skills *</Label>
                <div>
                  <SkillsAutocomplete
                    value={watch("skills") as string || ""}
                    onChange={(value) => {
                      setValue("skills", value as any, { shouldValidate: true });
                    }}
                    category={selectedCategory}
                    placeholder={
                      selectedCategory === "technical" 
                        ? "e.g., Python, React, Node.js, AWS, Docker..."
                        : selectedCategory === "soft"
                        ? "e.g., Leadership, Communication, Problem Solving..."
                        : selectedCategory === "languages"
                        ? "e.g., English (Fluent), Spanish (Intermediate)..."
                        : "Select a category first, then type skills..."
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedCategory 
                    ? "Type to see suggestions, press Enter or comma to add. You can select from suggestions or type your own skills."
                    : "Please select a category above to enable suggestions"}
                </p>
                {errors.skills && (
                  <p className="text-sm text-destructive">{errors.skills.message}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={!selectedCategory}>
                {editingId ? "Update Skills" : "Add Skills"}
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