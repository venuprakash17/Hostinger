/**
 * Template Selector Component
 * Allows users to choose from Modern, Professional, and Minimal resume templates
 * Inspired by ResumeItNow open-source builder
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ResumeTemplate, TEMPLATE_CONFIGS } from "@/lib/resumeitnow/types/templates";
import { FileText, Briefcase, Sparkles } from "lucide-react";

interface TemplateSelectorProps {
  selectedTemplate: ResumeTemplate;
  onTemplateChange: (template: ResumeTemplate) => void;
}

export function TemplateSelector({ selectedTemplate, onTemplateChange }: TemplateSelectorProps) {
  const templateIcons: Record<ResumeTemplate, typeof FileText> = {
    modern: Sparkles,
    professional: Briefcase,
    minimal: FileText,
    fresher_classic: FileText,
    project_focused: Sparkles,
    skills_first: Briefcase,
    internship_focused: Briefcase,
    minimal_ats: FileText,
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Choose Resume Template
        </CardTitle>
        <CardDescription>
          Select an ATS-friendly template that matches your style. All templates are optimized for applicant tracking systems.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup value={selectedTemplate} onValueChange={(value) => onTemplateChange(value as ResumeTemplate)}>
          <div className="grid gap-4 md:grid-cols-3">
            {Object.values(TEMPLATE_CONFIGS).map((template) => {
              const Icon = templateIcons[template.id];
              const isSelected = selectedTemplate === template.id;
              
              return (
                <div
                  key={template.id}
                  className={`
                    relative flex flex-col items-start space-y-3 p-4 border-2 rounded-lg cursor-pointer transition-all
                    ${isSelected 
                      ? 'border-primary bg-primary/5 shadow-md' 
                      : 'border-border hover:border-primary/50 hover:bg-accent/50'
                    }
                  `}
                  onClick={() => onTemplateChange(template.id)}
                >
                  <div className="flex items-center gap-3 w-full">
                    <RadioGroupItem value={template.id} id={template.id} className="mt-1" />
                    <div className="flex items-center gap-2 flex-1">
                      <Icon className={`h-5 w-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <Label 
                        htmlFor={template.id} 
                        className="cursor-pointer flex-1 font-semibold text-base"
                      >
                        {template.name}
                      </Label>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground pl-8">
                    {template.description}
                  </p>
                  <div className="flex gap-2 pl-8">
                    <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                      ATS Optimized
                    </span>
                    {template.id === 'modern' && (
                      <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">
                        Popular
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}

