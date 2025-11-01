import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentProfile } from "@/hooks/useStudentProfile";

interface PersonalInfoFormProps {
  initialData?: StudentProfile;
  onSave: (data: StudentProfile) => void;
  isSaving?: boolean;
}

export function PersonalInfoForm({ initialData, onSave, isSaving }: PersonalInfoFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<StudentProfile>({
    defaultValues: initialData || {},
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSave)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name *</Label>
              <Input
                id="full_name"
                {...register("full_name", { required: "Full name is required" })}
                placeholder="John Doe"
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
                placeholder="john@example.com"
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
                placeholder="+1 234 567 8900"
              />
              {errors.phone_number && (
                <p className="text-sm text-destructive">{errors.phone_number.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin_profile">LinkedIn Profile</Label>
              <Input
                id="linkedin_profile"
                {...register("linkedin_profile")}
                placeholder="https://linkedin.com/in/johndoe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="github_portfolio">GitHub / Portfolio</Label>
              <Input
                id="github_portfolio"
                {...register("github_portfolio")}
                placeholder="https://github.com/johndoe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_city">Address / City</Label>
              <Input
                id="address_city"
                {...register("address_city")}
                placeholder="San Francisco, CA"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="father_name">Father's Name</Label>
              <Input
                id="father_name"
                {...register("father_name")}
                placeholder="Father's full name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="father_number">Father's Number</Label>
              <Input
                id="father_number"
                {...register("father_number")}
                placeholder="+1 234 567 8900"
              />
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
