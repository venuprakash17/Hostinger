import { Card, CardContent } from '@/components/ui/card';
import { ResumeTemplate, TEMPLATE_CONFIGS } from '@/lib/resumeitnow/types/templates';
import { Check } from 'lucide-react';

interface Resume2TemplatesProps {
  selectedTemplate: ResumeTemplate;
  onTemplateSelect: (template: ResumeTemplate) => void;
}

const templates: ResumeTemplate[] = [
  'fresher_classic',
  'project_focused',
  'skills_first',
  'internship_focused',
  'minimal_ats',
];

export function Resume2Templates({ selectedTemplate, onTemplateSelect }: Resume2TemplatesProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {templates.map((template) => {
        const config = TEMPLATE_CONFIGS[template];
        const isSelected = selectedTemplate === template;
        
        return (
          <Card
            key={template}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              isSelected ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => onTemplateSelect(template)}
          >
            <CardContent className="p-4">
              <div className="relative">
                <div className="aspect-[8.5/11] bg-gradient-to-br from-primary/10 to-primary/5 rounded border-2 border-border flex items-center justify-center">
                  <div className="text-center p-4">
                    <div className="text-2xl font-bold mb-2">{config.name}</div>
                    <div className="text-xs text-muted-foreground">{config.description}</div>
                  </div>
                </div>
                {isSelected && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                    <Check className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="mt-3 text-center">
                <div className="font-semibold text-sm">{config.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{config.description}</div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

