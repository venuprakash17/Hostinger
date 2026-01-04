import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { User } from 'lucide-react';

interface Resume2PersonalInfoProps {
  data: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
    website: string;
    summary: string;
  };
  onUpdate: (data: Partial<Resume2PersonalInfoProps['data']>) => void;
}

export function Resume2PersonalInfo({ data, onUpdate }: Resume2PersonalInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          Personal Information
        </CardTitle>
        <CardDescription>
          Enter your basic contact information and professional summary
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={data.fullName}
              onChange={(e) => onUpdate({ fullName: e.target.value })}
              placeholder="John Doe"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              value={data.email}
              onChange={(e) => onUpdate({ email: e.target.value })}
              placeholder="john.doe@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={data.phone}
              onChange={(e) => onUpdate({ phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={data.location}
              onChange={(e) => onUpdate({ location: e.target.value })}
              placeholder="City, State"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="linkedin">LinkedIn</Label>
            <Input
              id="linkedin"
              value={data.linkedin}
              onChange={(e) => onUpdate({ linkedin: e.target.value })}
              placeholder="linkedin.com/in/yourprofile"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="github">GitHub</Label>
            <Input
              id="github"
              value={data.github}
              onChange={(e) => onUpdate({ github: e.target.value })}
              placeholder="github.com/yourusername"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="website">Website/Portfolio</Label>
            <Input
              id="website"
              value={data.website}
              onChange={(e) => onUpdate({ website: e.target.value })}
              placeholder="yourwebsite.com"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="summary">Professional Summary</Label>
          <Textarea
            id="summary"
            value={data.summary}
            onChange={(e) => onUpdate({ summary: e.target.value })}
            placeholder="Write a brief professional summary highlighting your key skills and experience..."
            rows={5}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {data.summary.length} characters
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

