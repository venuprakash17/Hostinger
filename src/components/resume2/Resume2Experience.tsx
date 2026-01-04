import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Briefcase, Plus, Trash2 } from 'lucide-react';
import { Resume2Data } from '@/pages/Resume2';

interface Resume2ExperienceProps {
  data: Resume2Data['experience'];
  onUpdate: (experience: Resume2Data['experience']) => void;
}

export function Resume2Experience({ data, onUpdate }: Resume2ExperienceProps) {
  const addExperience = () => {
    const newExperience = {
      id: Date.now().toString(),
      jobTitle: '',
      company: '',
      location: '',
      startDate: '',
      endDate: '',
      isCurrent: false,
      description: '',
    };
    onUpdate([...data, newExperience]);
  };

  const removeExperience = (id: string) => {
    onUpdate(data.filter(exp => exp.id !== id));
  };

  const updateExperience = (id: string, updates: Partial<Resume2Data['experience'][0]>) => {
    onUpdate(data.map(exp => exp.id === id ? { ...exp, ...updates } : exp));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Work Experience
        </CardTitle>
        <CardDescription>
          Add your professional work experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((exp) => (
          <Card key={exp.id} className="border-2">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Experience Entry</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeExperience(exp.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Job Title *</Label>
                  <Input
                    value={exp.jobTitle}
                    onChange={(e) => updateExperience(exp.id, { jobTitle: e.target.value })}
                    placeholder="Software Engineer"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Company *</Label>
                  <Input
                    value={exp.company}
                    onChange={(e) => updateExperience(exp.id, { company: e.target.value })}
                    placeholder="Company Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={exp.location}
                    onChange={(e) => updateExperience(exp.id, { location: e.target.value })}
                    placeholder="City, State"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="month"
                    value={exp.startDate}
                    onChange={(e) => updateExperience(exp.id, { startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>End Date</Label>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`current-exp-${exp.id}`} className="text-xs">Current job</Label>
                      <Switch
                        id={`current-exp-${exp.id}`}
                        checked={exp.isCurrent}
                        onCheckedChange={(checked) => updateExperience(exp.id, { isCurrent: checked })}
                      />
                    </div>
                  </div>
                  <Input
                    type="month"
                    value={exp.endDate}
                    onChange={(e) => updateExperience(exp.id, { endDate: e.target.value })}
                    disabled={exp.isCurrent}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  value={exp.description}
                  onChange={(e) => updateExperience(exp.id, { description: e.target.value })}
                  placeholder="Describe your responsibilities and achievements..."
                  rows={5}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Use bullet points or paragraphs to describe your role
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
        <Button onClick={addExperience} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Experience
        </Button>
      </CardContent>
    </Card>
  );
}

