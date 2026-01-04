/**
 * Resume Builder Mode Selector
 * Allows users to choose between AI-Powered and Custom Builder modes
 */

import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Palette, Zap, Wand2, Layers, Download, Eye } from 'lucide-react';

export type ResumeBuilderMode = 'ai-powered' | 'custom';

interface ResumeBuilderModeSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectMode: (mode: ResumeBuilderMode) => void;
  targetRole?: string;
  companyName?: string;
}

export function ResumeBuilderModeSelector({
  open,
  onOpenChange,
  onSelectMode,
  targetRole,
  companyName,
}: ResumeBuilderModeSelectorProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center">
            Choose Your Resume Builder
          </DialogTitle>
          <DialogDescription className="text-center text-base mt-2">
            Select the builder that best fits your needs
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 mt-6">
          {/* AI-Powered Builder */}
          <Card 
            className="relative overflow-hidden border-2 hover:border-primary transition-all duration-300 cursor-pointer group hover:shadow-xl"
            onClick={() => {
              onSelectMode('ai-powered');
              onOpenChange(false);
            }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/20 to-primary/10 rounded-bl-full opacity-50 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl group-hover:scale-110 transition-transform">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    AI-Powered Builder
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                      <Zap className="h-3 w-3 mr-1" />
                      Recommended
                    </Badge>
                  </CardTitle>
                </div>
              </div>
              <CardDescription className="text-base">
                Let AI optimize your resume for the job you're applying to
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg mt-0.5">
                    <Wand2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">AI Optimization</h4>
                    <p className="text-xs text-muted-foreground">
                      Automatically optimizes content for ATS systems and job descriptions
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg mt-0.5">
                    <Layers className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Professional Templates</h4>
                    <p className="text-xs text-muted-foreground">
                      Choose from 5+ ATS-friendly templates designed by experts
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg mt-0.5">
                    <Eye className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Live Preview</h4>
                    <p className="text-xs text-muted-foreground">
                      See your resume in real-time as you make changes
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg mt-0.5">
                    <Download className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Instant Download</h4>
                    <p className="text-xs text-muted-foreground">
                      Download as ATS-safe PDF ready for applications
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary/80"
                  size="lg"
                >
                  <Sparkles className="mr-2 h-5 w-5" />
                  Start with AI Builder
                </Button>
              </div>

              {targetRole && (
                <p className="text-xs text-center text-muted-foreground pt-2">
                  Optimized for: <span className="font-semibold">{targetRole}</span>
                  {companyName && <span> at <span className="font-semibold">{companyName}</span></span>}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Custom Builder */}
          <Card 
            className="relative overflow-hidden border-2 hover:border-primary transition-all duration-300 cursor-pointer group hover:shadow-xl"
            onClick={() => {
              onSelectMode('custom');
              onOpenChange(false);
            }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-bl-full opacity-50 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="relative">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/10 rounded-xl group-hover:scale-110 transition-transform">
                  <Palette className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl font-bold flex items-center gap-2">
                    Custom Builder
                    <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                      <Palette className="h-3 w-3 mr-1" />
                      Advanced
                    </Badge>
                  </CardTitle>
                </div>
              </div>
              <CardDescription className="text-base">
                Full creative control with Canva-style editing capabilities
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-purple-500/10 rounded-lg mt-0.5">
                    <Palette className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Complete Design Freedom</h4>
                    <p className="text-xs text-muted-foreground">
                      Customize every element: fonts, colors, spacing, layout, and more
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-purple-500/10 rounded-lg mt-0.5">
                    <Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Start from Templates</h4>
                    <p className="text-xs text-muted-foreground">
                      Begin with a template or build completely from scratch
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-purple-500/10 rounded-lg mt-0.5">
                    <Eye className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Real-Time Editing</h4>
                    <p className="text-xs text-muted-foreground">
                      Drag, drop, resize, and edit elements with live preview
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-purple-500/10 rounded-lg mt-0.5">
                    <Download className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Export Options</h4>
                    <p className="text-xs text-muted-foreground">
                      Download as PDF, PNG, or continue editing later
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button 
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  size="lg"
                  variant="default"
                >
                  <Palette className="mr-2 h-5 w-5" />
                  Start Custom Builder
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground pt-2">
                Perfect for designers and those who want complete control
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-center text-muted-foreground">
            💡 <strong>Tip:</strong> You can switch between modes anytime. Start with AI-Powered for quick optimization, 
            then switch to Custom Builder for fine-tuning.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

