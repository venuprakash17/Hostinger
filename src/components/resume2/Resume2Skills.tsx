import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { Resume2Data } from '@/pages/Resume2';
import { useState } from 'react';

interface Resume2SkillsProps {
  data: Resume2Data['skills'];
  onUpdate: (skills: Resume2Data['skills']) => void;
}

export function Resume2Skills({ data, onUpdate }: Resume2SkillsProps) {
  const [techInput, setTechInput] = useState('');
  const [softInput, setSoftInput] = useState('');
  const [langInput, setLangInput] = useState('');

  const addSkill = (category: 'technical' | 'soft' | 'languages', skill: string) => {
    if (skill.trim() && !data[category].includes(skill.trim())) {
      onUpdate({
        ...data,
        [category]: [...data[category], skill.trim()],
      });
    }
    if (category === 'technical') setTechInput('');
    if (category === 'soft') setSoftInput('');
    if (category === 'languages') setLangInput('');
  };

  const removeSkill = (category: 'technical' | 'soft' | 'languages', skill: string) => {
    onUpdate({
      ...data,
      [category]: data[category].filter(s => s !== skill),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Skills</CardTitle>
        <CardDescription>
          Add your technical, soft skills, and languages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Technical Skills */}
        <div className="space-y-2">
          <Label>Technical Skills</Label>
          <div className="flex gap-2 flex-wrap mb-2">
            {data.technical.map((skill) => (
              <Badge key={skill} variant="secondary" className="gap-1">
                {skill}
                <button
                  onClick={() => removeSkill('technical', skill)}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={techInput}
              onChange={(e) => setTechInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSkill('technical', techInput);
                }
              }}
              placeholder="e.g., JavaScript, Python, React"
            />
            <button
              onClick={() => addSkill('technical', techInput)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Add
            </button>
          </div>
        </div>

        {/* Soft Skills */}
        <div className="space-y-2">
          <Label>Soft Skills</Label>
          <div className="flex gap-2 flex-wrap mb-2">
            {data.soft.map((skill) => (
              <Badge key={skill} variant="secondary" className="gap-1">
                {skill}
                <button
                  onClick={() => removeSkill('soft', skill)}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={softInput}
              onChange={(e) => setSoftInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSkill('soft', softInput);
                }
              }}
              placeholder="e.g., Leadership, Communication"
            />
            <button
              onClick={() => addSkill('soft', softInput)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Add
            </button>
          </div>
        </div>

        {/* Languages */}
        <div className="space-y-2">
          <Label>Languages</Label>
          <div className="flex gap-2 flex-wrap mb-2">
            {data.languages.map((lang) => (
              <Badge key={lang} variant="secondary" className="gap-1">
                {lang}
                <button
                  onClick={() => removeSkill('languages', lang)}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={langInput}
              onChange={(e) => setLangInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSkill('languages', langInput);
                }
              }}
              placeholder="e.g., English, Spanish"
            />
            <button
              onClick={() => addSkill('languages', langInput)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Add
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

