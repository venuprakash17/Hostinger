import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit2, X, GraduationCap } from "lucide-react";
import { Education } from "@/hooks/useStudentProfile";
import { useToast } from "@/hooks/use-toast";
import { resumeStorage } from "@/lib/resumeStorage";

interface EducationFormProps {
  education: Education[];
}

export function EducationForm({ education }: EducationFormProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<Education>({
    defaultValues: {
      institution_name: '',
      degree: '',
      field_of_study: '',
      start_date: '',
      end_date: '',
      cgpa_percentage: '',
      relevant_coursework: '',
      is_current: false,
    }
  });

  const { register, handleSubmit, reset, formState: { errors }, watch, setValue } = form;
  const isCurrentEducation = watch("is_current");
  const formValues = watch();

  // Load draft from localStorage when form opens
  useEffect(() => {
    if (isAdding && !editingId) {
      const draft = resumeStorage.load<Education>('education_form');
      if (draft) {
        reset(draft);
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
      const hasData = Object.values(formValues).some(val => 
        val !== '' && val !== null && val !== undefined && val !== false
      );
      if (hasData) {
        resumeStorage.save('education_form', formValues);
      }
    }, 1000); // Save after 1 second of no typing

    return () => clearTimeout(timer);
  }, [formValues, isAdding, editingId]);

  const onSubmit = async (data: Education) => {
    try {
      // Clear draft after successful save
      resumeStorage.clear('education_form');

      // TODO: Save to API endpoint when ready
      // For now, just save to localStorage as "saved" data
      const savedData = {
        ...data,
        id: editingId || `draft_${Date.now()}`,
        start_date: data.start_date ? `${data.start_date}-01` : null,
        end_date: data.end_date && !data.is_current ? `${data.end_date}-01` : null,
      };

      // Save to localStorage as saved entry
      const savedEducation = resumeStorage.load<Education[]>('education_saved') || [];
      if (editingId) {
        const index = savedEducation.findIndex((e: any) => e.id === editingId);
        if (index >= 0) {
          savedEducation[index] = savedData;
        } else {
          savedEducation.push(savedData);
        }
        toast({ title: "Education updated successfully" });
        setEditingId(null);
      } else {
        savedEducation.push(savedData);
        toast({ title: "Education added successfully" });
      }
      
      resumeStorage.save('education_saved', savedEducation);

      reset({
        institution_name: '',
        degree: '',
        field_of_study: '',
        start_date: '',
        end_date: '',
        cgpa_percentage: '',
        relevant_coursework: '',
        is_current: false,
      });
      setIsAdding(false);
      
      // Trigger page refresh to show updated list
      window.dispatchEvent(new Event('resumeDataUpdated'));
    } catch (error: any) {
      toast({
        title: "Error saving education",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (edu: Education) => {
    setEditingId(edu.id!);
    // Format dates back to YYYY-MM for the month input
    const formattedEdu = {
      ...edu,
      start_date: edu.start_date ? edu.start_date.substring(0, 7) : undefined,
      end_date: edu.end_date ? edu.end_date.substring(0, 7) : undefined,
    };
    reset(formattedEdu);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const savedEducation = resumeStorage.load<Education[]>('education_saved') || [];
      const filtered = savedEducation.filter((e: any) => e.id !== id);
      resumeStorage.save('education_saved', filtered);
      
      toast({ title: "Education deleted successfully" });
      window.dispatchEvent(new Event('resumeDataUpdated'));
    } catch (error: any) {
      toast({
        title: "Error deleting education",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    // Clear draft when canceling
    resumeStorage.clear('education_form');
    reset({
      institution_name: '',
      degree: '',
      field_of_study: '',
      start_date: '',
      end_date: '',
      cgpa_percentage: '',
      relevant_coursework: '',
      is_current: false,
    });
  };

  return (
    <Card className="border-2 shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Education</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Your academic background and qualifications</p>
            </div>
          </div>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Education
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Existing education entries */}
        {education.map((edu) => (
          <div key={edu.id} className="p-4 border rounded-lg space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold">{edu.degree} - {edu.field_of_study}</h4>
                <p className="text-sm text-muted-foreground">{edu.institution_name}</p>
                <p className="text-sm text-muted-foreground">
                  {edu.start_date} - {edu.is_current ? "Present" : edu.end_date}
                </p>
                {edu.cgpa_percentage && (
                  <p className="text-sm">CGPA/Percentage: {edu.cgpa_percentage}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEdit(edu)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(edu.id!)}
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
                {editingId ? "Edit Education" : "Add New Education"}
              </h4>
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="institution_name">Institution Name *</Label>
                <Input
                  id="institution_name"
                  {...register("institution_name", { required: "Institution name is required" })}
                  placeholder="e.g., Massachusetts Institute of Technology"
                />
                {errors.institution_name && (
                  <p className="text-sm text-destructive">{errors.institution_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="degree">Degree *</Label>
                <Input
                  id="degree"
                  {...register("degree", { required: "Degree is required" })}
                  placeholder="e.g., Bachelor of Science, Master of Arts, Ph.D."
                />
                {errors.degree && (
                  <p className="text-sm text-destructive">{errors.degree.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="field_of_study">Field of Study / Major</Label>
                <Input
                  id="field_of_study"
                  {...register("field_of_study")}
                  placeholder="e.g., Computer Science, Electrical Engineering, Business Administration"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="month"
                  {...register("start_date")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="month"
                  {...register("end_date")}
                  disabled={isCurrentEducation}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cgpa_percentage">CGPA / Percentage</Label>
                <Input
                  id="cgpa_percentage"
                  {...register("cgpa_percentage")}
                  placeholder="e.g., 3.8/4.0 or 85% or First Class with Distinction"
                />
                <p className="text-xs text-muted-foreground">Optional: Include scale if different from standard</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="relevant_coursework">Relevant Coursework</Label>
              <Textarea
                id="relevant_coursework"
                {...register("relevant_coursework")}
                placeholder="e.g., Data Structures & Algorithms, Database Management Systems, Machine Learning, Software Engineering"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">Optional: List key courses relevant to your career goals</p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_current"
                checked={isCurrentEducation}
                onCheckedChange={(checked) => setValue("is_current", checked as boolean)}
              />
              <Label htmlFor="is_current">Currently studying here</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                {editingId ? "Update Education" : "Add Education"}
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
