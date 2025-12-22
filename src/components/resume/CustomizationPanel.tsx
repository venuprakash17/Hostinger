/**
 * Canva-Style Customization Panel
 * Comprehensive customization options while maintaining ATS compliance
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Type, 
  Palette, 
  GripVertical, 
  Eye, 
  EyeOff, 
  Layout, 
  AlignJustify,
  Info,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

export interface CustomizationSettings {
  // Font Settings
  fontFamily: 'Arial' | 'Calibri' | 'Georgia' | 'Times New Roman' | 'Helvetica';
  baseFontSize: number; // 9-12
  headingFontSize: number; // 14-24
  sectionTitleFontSize: number; // 10-14
  
  // Color Settings (ATS-safe colors)
  primaryColor: string; // Headers, borders
  secondaryColor: string; // Text
  accentColor: string; // Links
  
  // Spacing Settings
  lineHeight: number; // 1.2-1.6
  sectionSpacing: number; // 8-16
  paragraphSpacing: number; // 4-12
  marginPadding: number; // 0.5-1.0 inches
  
  // Layout Settings
  headerAlignment: 'left' | 'center';
  sectionTitleStyle: 'underline' | 'bold' | 'both';
  
  // Section Visibility
  visibleSections: {
    summary: boolean;
    education: boolean;
    projects: boolean;
    skills: boolean;
    certifications: boolean;
    achievements: boolean;
    work_experience: boolean;
    extracurricular: boolean;
    hobbies: boolean;
    languages: boolean;
    references: boolean;
  };
}

export const DEFAULT_SETTINGS: CustomizationSettings = {
  fontFamily: 'Helvetica',
  baseFontSize: 10,
  headingFontSize: 20,
  sectionTitleFontSize: 11,
  primaryColor: '#000000',
  secondaryColor: '#333333',
  accentColor: '#0066cc',
  lineHeight: 1.35,
  sectionSpacing: 10,
  paragraphSpacing: 6,
  marginPadding: 0.75,
  headerAlignment: 'center',
  sectionTitleStyle: 'both',
  visibleSections: {
    summary: true,
    education: true,
    projects: true,
    skills: true,
    certifications: true,
    achievements: true,
    work_experience: true,
    extracurricular: true,
    hobbies: true,
    languages: true,
    references: true,
  },
};

interface CustomizationPanelProps {
  settings: CustomizationSettings;
  onSettingsChange: (settings: CustomizationSettings) => void;
}

const ATS_SAFE_FONTS = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Calibri', label: 'Calibri' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Helvetica', label: 'Helvetica' },
] as const;

const ATS_SAFE_COLORS = [
  { name: 'Professional Black', primary: '#000000', secondary: '#333333', accent: '#0066cc' },
  { name: 'Classic Navy', primary: '#1a1a3e', secondary: '#2d2d44', accent: '#0066cc' },
  { name: 'Deep Gray', primary: '#2d2d2d', secondary: '#4a4a4a', accent: '#0066cc' },
  { name: 'Charcoal', primary: '#36454f', secondary: '#4a5568', accent: '#0066cc' },
];

export function CustomizationPanel({ settings, onSettingsChange }: CustomizationPanelProps) {
  const updateSetting = <K extends keyof CustomizationSettings>(
    key: K,
    value: CustomizationSettings[K]
  ) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  const toggleSection = (section: keyof CustomizationSettings['visibleSections']) => {
    updateSetting('visibleSections', {
      ...settings.visibleSections,
      [section]: !settings.visibleSections[section],
    });
  };

  const applyColorScheme = (scheme: typeof ATS_SAFE_COLORS[number]) => {
    updateSetting('primaryColor', scheme.primary);
    updateSetting('secondaryColor', scheme.secondary);
    updateSetting('accentColor', scheme.accent);
  };

  const resetToDefaults = () => {
    onSettingsChange(DEFAULT_SETTINGS);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg">
            <Palette className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Customize Resume</h3>
            <p className="text-xs text-muted-foreground">Canva-style editing</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetToDefaults}
          className="h-7 text-xs"
        >
          <RotateCcw className="h-3 w-3 mr-1" />
          Reset
        </Button>
      </div>

      {/* ATS Compliance Notice */}
      <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200">
        <Info className="h-3 w-3 text-blue-600" />
        <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
          All customization options maintain <strong>ATS compliance</strong>. Fonts, colors, and layouts are optimized for applicant tracking systems.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="fonts" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-9">
          <TabsTrigger value="fonts" className="text-xs">
            <Type className="h-3 w-3 mr-1" />
            Fonts
          </TabsTrigger>
          <TabsTrigger value="colors" className="text-xs">
            <Palette className="h-3 w-3 mr-1" />
            Colors
          </TabsTrigger>
          <TabsTrigger value="spacing" className="text-xs">
            <AlignJustify className="h-3 w-3 mr-1" />
            Spacing
          </TabsTrigger>
          <TabsTrigger value="layout" className="text-xs">
            <Layout className="h-3 w-3 mr-1" />
            Layout
          </TabsTrigger>
        </TabsList>

        {/* Fonts Tab */}
        <TabsContent value="fonts" className="space-y-4 mt-4">
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium mb-2 flex items-center gap-2">
                <Type className="h-3 w-3" />
                Font Family
              </Label>
              <Select
                value={settings.fontFamily}
                onValueChange={(value) => updateSetting('fontFamily', value as CustomizationSettings['fontFamily'])}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ATS_SAFE_FONTS.map((font) => (
                    <SelectItem key={font.value} value={font.value} className="text-xs">
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                ATS-safe fonts ensure your resume is readable by all systems
              </p>
            </div>

            <Separator />

            <div>
              <Label className="text-xs font-medium mb-2">
                Base Font Size: {settings.baseFontSize}pt
              </Label>
              <Slider
                value={[settings.baseFontSize]}
                onValueChange={([value]) => updateSetting('baseFontSize', value)}
                min={9}
                max={12}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>9pt (Compact)</span>
                <span>12pt (Readable)</span>
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium mb-2">
                Heading Font Size: {settings.headingFontSize}pt
              </Label>
              <Slider
                value={[settings.headingFontSize]}
                onValueChange={([value]) => updateSetting('headingFontSize', value)}
                min={14}
                max={24}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>14pt</span>
                <span>24pt</span>
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium mb-2">
                Section Title Size: {settings.sectionTitleFontSize}pt
              </Label>
              <Slider
                value={[settings.sectionTitleFontSize]}
                onValueChange={([value]) => updateSetting('sectionTitleFontSize', value)}
                min={10}
                max={14}
                step={0.5}
                className="w-full"
              />
            </div>
          </div>
        </TabsContent>

        {/* Colors Tab */}
        <TabsContent value="colors" className="space-y-4 mt-4">
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium mb-2">Color Schemes</Label>
              <div className="grid grid-cols-2 gap-2">
                {ATS_SAFE_COLORS.map((scheme) => (
                  <Card
                    key={scheme.name}
                    className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary ${
                      settings.primaryColor === scheme.primary ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => applyColorScheme(scheme)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div
                          className="w-4 h-4 rounded border"
                          style={{ backgroundColor: scheme.primary }}
                        />
                        <span className="text-xs font-medium">{scheme.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <div
                          className="w-6 h-2 rounded"
                          style={{ backgroundColor: scheme.primary }}
                        />
                        <div
                          className="w-6 h-2 rounded"
                          style={{ backgroundColor: scheme.secondary }}
                        />
                        <div
                          className="w-6 h-2 rounded"
                          style={{ backgroundColor: scheme.accent }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-xs font-medium mb-2">Primary Color (Headers & Borders)</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => updateSetting('primaryColor', e.target.value)}
                  className="h-8 w-16 rounded border cursor-pointer"
                />
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {settings.primaryColor}
                </code>
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium mb-2">Secondary Color (Body Text)</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={settings.secondaryColor}
                  onChange={(e) => updateSetting('secondaryColor', e.target.value)}
                  className="h-8 w-16 rounded border cursor-pointer"
                />
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  {settings.secondaryColor}
                </code>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Spacing Tab */}
        <TabsContent value="spacing" className="space-y-4 mt-4">
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium mb-2">
                Line Height: {settings.lineHeight.toFixed(2)}
              </Label>
              <Slider
                value={[settings.lineHeight]}
                onValueChange={([value]) => updateSetting('lineHeight', value)}
                min={1.2}
                max={1.6}
                step={0.05}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Tight (1.2)</span>
                <span>Loose (1.6)</span>
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium mb-2">
                Section Spacing: {settings.sectionSpacing}pt
              </Label>
              <Slider
                value={[settings.sectionSpacing]}
                onValueChange={([value]) => updateSetting('sectionSpacing', value)}
                min={8}
                max={16}
                step={1}
                className="w-full"
              />
            </div>

            <div>
              <Label className="text-xs font-medium mb-2">
                Paragraph Spacing: {settings.paragraphSpacing}pt
              </Label>
              <Slider
                value={[settings.paragraphSpacing]}
                onValueChange={([value]) => updateSetting('paragraphSpacing', value)}
                min={4}
                max={12}
                step={1}
                className="w-full"
              />
            </div>

            <div>
              <Label className="text-xs font-medium mb-2">
                Page Margins: {settings.marginPadding}" ({settings.marginPadding * 72}pt)
              </Label>
              <Slider
                value={[settings.marginPadding]}
                onValueChange={([value]) => updateSetting('marginPadding', value)}
                min={0.5}
                max={1.0}
                step={0.05}
                className="w-full"
              />
            </div>
          </div>
        </TabsContent>

        {/* Layout Tab */}
        <TabsContent value="layout" className="space-y-4 mt-4">
          <div className="space-y-4">
            <div>
              <Label className="text-xs font-medium mb-2">Header Alignment</Label>
              <Select
                value={settings.headerAlignment}
                onValueChange={(value) => updateSetting('headerAlignment', value as 'left' | 'center')}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="center">Centered</SelectItem>
                  <SelectItem value="left">Left Aligned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium mb-2">Section Title Style</Label>
              <Select
                value={settings.sectionTitleStyle}
                onValueChange={(value) => updateSetting('sectionTitleStyle', value as CustomizationSettings['sectionTitleStyle'])}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Bold + Underline</SelectItem>
                  <SelectItem value="bold">Bold Only</SelectItem>
                  <SelectItem value="underline">Underline Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div>
              <Label className="text-xs font-medium mb-3 flex items-center gap-2">
                <Eye className="h-3 w-3" />
                Section Visibility
              </Label>
              <div className="space-y-2">
                {Object.entries(settings.visibleSections).map(([section, visible]) => (
                  <div
                    key={section}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Label
                      htmlFor={`section-${section}`}
                      className="text-xs font-normal cursor-pointer flex-1 capitalize"
                    >
                      {section.replace(/_/g, ' ')}
                    </Label>
                    <div className="flex items-center gap-2">
                      {visible ? (
                        <Eye className="h-3 w-3 text-green-600" />
                      ) : (
                        <EyeOff className="h-3 w-3 text-muted-foreground" />
                      )}
                      <Switch
                        id={`section-${section}`}
                        checked={visible}
                        onCheckedChange={() => toggleSection(section as keyof CustomizationSettings['visibleSections'])}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

