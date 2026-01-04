import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Code, Plus, Trash2, X } from 'lucide-react';
import { Resume2Data } from '@/pages/Resume2';
import { useState } from 'react';

interface Resume2ProjectsProps {
  data: Resume2Data['projects'];
  onUpdate: (projects: Resume2Data['projects']) => void;
}

export function Resume2Projects({ data, onUpdate }: Resume2ProjectsProps) {
  const [techInput, setTechInput] = useState<{ [key: string]: string }>({});

  const addProject = () => {
    const newProject = {
      id: Date.now().toString(),
      name: '',
      description: '',
      technologies: [],
      url: '',
      startDate: '',
      endDate: '',
    };
    onUpdate([...data, newProject]);
  };

  const removeProject = (id: string) => {
    onUpdate(data.filter(proj => proj.id !== id));
    setTechInput(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateProject = (id: string, updates: Partial<Resume2Data['projects'][0]>) => {
    onUpdate(data.map(proj => proj.id === id ? { ...proj, ...updates } : proj));
  };

  const addTechnology = (id: string, tech: string) => {
    if (tech.trim()) {
      const project = data.find(p => p.id === id);
      if (project && !project.technologies.includes(tech.trim())) {
        updateProject(id, { technologies: [...project.technologies, tech.trim()] });
      }
      setTechInput(prev => ({ ...prev, [id]: '' }));
    }
  };

  const removeTechnology = (id: string, tech: string) => {
    const project = data.find(p => p.id === id);
    if (project) {
      updateProject(id, { technologies: project.technologies.filter(t => t !== tech) });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Code className="h-5 w-5" />
          Projects
        </CardTitle>
        <CardDescription>
          Showcase your projects and technical work
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((proj) => (
          <Card key={proj.id} className="border-2">
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Project Entry</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeProject(proj.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Project Name *</Label>
                  <Input
                    value={proj.name}
                    onChange={(e) => updateProject(proj.id, { name: e.target.value })}
                    placeholder="E-Commerce Platform"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Project URL</Label>
                  <Input
                    value={proj.url}
                    onChange={(e) => updateProject(proj.id, { url: e.target.value })}
                    placeholder="https://project-demo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="month"
                    value={proj.startDate}
                    onChange={(e) => updateProject(proj.id, { startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="month"
                    value={proj.endDate}
                    onChange={(e) => updateProject(proj.id, { endDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  value={proj.description}
                  onChange={(e) => updateProject(proj.id, { description: e.target.value })}
                  placeholder="Describe your project, technologies used, and key features..."
                  rows={5}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Technologies</Label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {proj.technologies.map((tech) => (
                    <Badge key={tech} variant="secondary" className="gap-1">
                      {tech}
                      <button
                        onClick={() => removeTechnology(proj.id, tech)}
                        className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={techInput[proj.id] || ''}
                    onChange={(e) => setTechInput(prev => ({ ...prev, [proj.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTechnology(proj.id, techInput[proj.id] || '');
                      }
                    }}
                    placeholder="Add technology (e.g., React, Python)"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => addTechnology(proj.id, techInput[proj.id] || '')}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        <Button onClick={addProject} variant="outline" className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          Add Project
        </Button>
      </CardContent>
    </Card>
  );
}

