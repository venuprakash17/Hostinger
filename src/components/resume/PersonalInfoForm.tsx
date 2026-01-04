import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentProfile } from "@/hooks/useStudentProfile";
import { resumeStorage } from "@/lib/resumeStorage";
import { useToast } from "@/hooks/use-toast";
import { FileText } from "lucide-react";

interface PersonalInfoFormProps {
  initialData?: StudentProfile;
  onSave: (data: StudentProfile) => void;
  isSaving?: boolean;
}

export function PersonalInfoForm({ initialData, onSave, isSaving }: PersonalInfoFormProps) {
  const { toast } = useToast();
  const form = useForm<StudentProfile>({
    defaultValues: initialData || {},
  });
  
  const { register, handleSubmit, formState: { errors }, watch, reset } = form;
  const formValues = watch();

  // Load draft from localStorage on mount
  useEffect(() => {
    const draft = resumeStorage.load<StudentProfile>('personal_info_form');
    if (draft && !initialData) {
      reset(draft);
      toast({
        title: "Draft restored",
        description: "Your previous form data has been restored.",
      });
    } else if (initialData) {
      reset(initialData);
    }
  }, []);

  // Auto-save draft to localStorage (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      const hasData = Object.values(formValues).some(val => 
        val !== '' && val !== null && val !== undefined
      );
      if (hasData) {
        resumeStorage.save('personal_info_form', formValues);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [formValues]);

    return (
      <Card className="border-2 shadow-md hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold">Personal Information</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Your contact details and basic information</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit((data) => {
            resumeStorage.clear('personal_info_form');
            resumeStorage.save('personal_info_saved', data); // Save to localStorage
            onSave(data);
            // Trigger update event to refresh completeness
            window.dispatchEvent(new Event('resumeDataUpdated'));
          })} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                {...register("full_name", { required: "Full name is required" })}
                placeholder="e.g., John Michael Smith"
              />
              {errors.full_name && (
                <p className="text-sm text-destructive">{errors.full_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register("email", { required: "Email is required" })}
                placeholder="e.g., john.smith@email.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone_number">Phone Number *</Label>
              <Input
                id="phone_number"
                {...register("phone_number", { required: "Phone number is required" })}
                placeholder="e.g., +1 (555) 123-4567"
              />
              {errors.phone_number && (
                <p className="text-sm text-destructive">{errors.phone_number.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin_profile">LinkedIn Profile</Label>
              <Input
                id="linkedin_profile"
                type="url"
                {...register("linkedin_profile")}
                placeholder="e.g., https://linkedin.com/in/johnsmith"
              />
              <p className="text-xs text-muted-foreground">Optional: Your LinkedIn profile URL</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="github_portfolio">GitHub / Portfolio</Label>
              <Input
                id="github_portfolio"
                type="url"
                {...register("github_portfolio")}
                placeholder="e.g., https://github.com/johnsmith or https://johnsmith.dev"
              />
              <p className="text-xs text-muted-foreground">Optional: GitHub profile or personal portfolio website</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_city">Address / City</Label>
              <Input
                id="address_city"
                {...register("address_city")}
                placeholder="e.g., New York, NY 10001 or San Francisco, CA"
              />
              <p className="text-xs text-muted-foreground">Optional: City and state, or full address</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="father_name">Father's Name</Label>
              <Input
                id="father_name"
                {...register("father_name")}
                placeholder="e.g., Michael Robert Smith"
              />
              <p className="text-xs text-muted-foreground">Optional: For certain job applications</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="father_number">Father's Contact Number</Label>
              <Input
                id="father_number"
                {...register("father_number")}
                placeholder="e.g., +1 (555) 987-6543"
              />
              <p className="text-xs text-muted-foreground">Optional: Emergency contact number</p>
            </div>
          </div>

          <Button type="submit" disabled={isSaving} className="w-full md:w-auto">
            {isSaving ? "Saving..." : "Save Personal Information"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
