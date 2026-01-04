import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { GraduationCap, Plus, Trash2 } from 'lucide-react';
import { Resume2Data } from '@/pages/Resume2';

interface Resume2EducationProps {
  data: Resume2Data['education'];
  onUpdate: (education: Resume2Data['education']) => void;
}

export function Resume2Education({ data, onUpdate }: Resume2EducationProps) {
  const addEducation = () => {
    const newEducation = {
      id: Date.now().toString(),
      degree: '',
      institution: '',
      field: '',
      startDate: '',
      endDate: '',
      isCurrent: false,
      gpa: '',
      description: '',
    };
    onUpdate([...data, newEducation]);
  };

  const removeEducation = (id: string) => {
    onUpdate(data.filter(edu => edu.id !== id));
  };

  const updateEducation = (id: string, updates: Partial<Resume2Data['education'][0]>) => {
    onUpdate(data.map(edu => edu.id === id ? { ...edu, ...updates } : edu));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Education
        </CardTitle>
        <CardDescription>
          Add your educational qualifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((edu) => (
          <Card key={edu.id} className="border-2">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Education Entry</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeEducation(edu.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Degree *</Label>
                  <Input
                    value={edu.degree}
                    onChange={(e) => updateEducation(edu.id, { degree: e.target.value })}
                    placeholder="Bachelor of Science"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Institution *</Label>
                  <Input
                    value={edu.institution}
                    onChange={(e) => updateEducation(edu.id, { institution: e.target.value })}
                    placeholder="University Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Field of Study</Label>
                  <Input
                    value={edu.field}
                    onChange={(e) => updateEducation(edu.id, { field: e.target.value })}
                    placeholder="Computer Science"
                  />
                </div>
                <div className="space-y-2">
                  <Label>GPA/Score</Label>
                  <Input
                    value={edu.gpa}
                    onChange={(e) => updateEducation(edu.id, { gpa: e.target.value })}
                    placeholder="3.8 / 4.0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="month"
                    value={edu.startDate}
                    onChange={(e) => updateEducation(edu.id, { startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>End Date</Label>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`current-${edu.id}`} className="text-xs">Currently studying</Label>
                      <Switch
                        id={`current-${edu.id}`}
                        checked={edu.isCurrent}
                        onCheckedChange={(checked) => updateEducation(edu.id, { isCurrent: checked })}
                      />
                    </div>
                  </div>
                  <Input
                    type="month"
                    value={edu.endDate}
                    onChange={(e) => updateEducation(edu.id, { endDate: e.target.value })}
                    disabled={edu.isCurrent}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Textarea
                  value={edu.description}
                  onChange={(e) => updateEducation(edu.id, { description: e.target.value })}
                  placeholder="Relevant coursework, achievements, honors..."
                  rows={3}
                  className="resize-none"
                />
              </div>
            </CardContent>
          </Card>
        ))}
        <Button onClick={addEducation} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Education
        </Button>
      </CardContent>
    </Card>
  );
}

