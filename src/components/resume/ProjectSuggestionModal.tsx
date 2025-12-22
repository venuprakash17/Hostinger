/**
 * Project Suggestion Modal - AI-powered project suggestions based on role and JD
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Sparkles, Check, X, Plus, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProjectSuggestion {
  project_title: string;
  description: string;
  technologies_used: string[];
  suggested_contributions: string[];
  relevance_score: number;
  reason: string;
}

interface ProjectSuggestionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetRole: string;
  jobDescription?: string;
  companyName?: string;
  currentProjects: any[];
  onAddProjects: (projects: any[]) => void;
}

export function ProjectSuggestionModal({
  open,
  onOpenChange,
  targetRole,
  jobDescription,
  companyName,
  currentProjects,
  onAddProjects,
}: ProjectSuggestionModalProps) {
  const { toast } = useToast();
  const [suggestions, setSuggestions] = useState<ProjectSuggestion[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (open && targetRole) {
      generateSuggestions();
    }
  }, [open, targetRole, jobDescription]);

  const generateSuggestions = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('access_token');
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

      const response = await fetch(`${API_BASE_URL}/resume/suggest-projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          target_role: targetRole,
          job_description: jobDescription || '',
          company_name: companyName || '',
          current_projects_count: currentProjects.length,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      } else {
        // Fallback to basic suggestions
        generateFallbackSuggestions();
      }
    } catch (error) {
      console.error('Error generating project suggestions:', error);
      generateFallbackSuggestions();
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackSuggestions = () => {
    // Generate comprehensive project suggestions based on role
    const roleBasedSuggestions: ProjectSuggestion[] = [];
    const roleLower = targetRole.toLowerCase();
    
    // Software Developer / Full-Stack Developer
    if (roleLower.includes('software') || roleLower.includes('developer') || roleLower.includes('full-stack') || roleLower.includes('fullstack')) {
      roleBasedSuggestions.push({
        project_title: 'E-Commerce Platform with Payment Integration',
        description: 'Build a complete e-commerce platform with product catalog, shopping cart, user authentication, payment gateway integration, and order management system.',
        technologies_used: ['React', 'Node.js', 'Express', 'MongoDB', 'Stripe API', 'JWT', 'REST API'],
        suggested_contributions: [
          'Developed responsive frontend using React with Redux for state management, handling 1000+ products',
          'Implemented secure payment processing using Stripe API, processing transactions with 99.9% success rate',
          'Built RESTful API with Node.js and Express, serving 500+ requests per minute',
          'Designed MongoDB database schema optimizing query performance by 40%',
          'Integrated JWT-based authentication with role-based access control',
          'Deployed application on AWS using Docker and CI/CD pipeline',
          'Implemented real-time order tracking and notification system',
        ],
        relevance_score: 98,
        reason: 'Demonstrates full-stack capabilities, payment integration, and real-world application development',
      });

      roleBasedSuggestions.push({
        project_title: 'Task Management Application with Real-time Collaboration',
        description: 'Create a collaborative task management tool with real-time updates, team workspaces, file sharing, and progress tracking.',
        technologies_used: ['React', 'TypeScript', 'Socket.io', 'Node.js', 'PostgreSQL', 'Redis', 'WebSockets'],
        suggested_contributions: [
          'Built real-time collaboration features using Socket.io, enabling instant updates for 50+ concurrent users',
          'Developed TypeScript-based frontend ensuring type safety and reducing bugs by 30%',
          'Implemented WebSocket connections for live notifications and updates',
          'Designed PostgreSQL database with optimized queries reducing load time by 50%',
          'Integrated Redis for caching, improving response time by 60%',
          'Created RESTful API with comprehensive error handling and validation',
          'Implemented file upload and sharing functionality with cloud storage integration',
        ],
        relevance_score: 95,
        reason: 'Shows real-time application development, WebSocket expertise, and collaborative features',
      });
    }

    // Data Scientist / Data Analyst
    if (roleLower.includes('data') || roleLower.includes('analyst') || roleLower.includes('data science')) {
      roleBasedSuggestions.push({
        project_title: 'Customer Churn Prediction Model',
        description: 'Develop a machine learning model to predict customer churn using historical data, with feature engineering, model evaluation, and business insights dashboard.',
        technologies_used: ['Python', 'Pandas', 'Scikit-learn', 'XGBoost', 'Matplotlib', 'Seaborn', 'Flask', 'SQL'],
        suggested_contributions: [
          'Analyzed dataset of 10,000+ customer records identifying key churn indicators',
          'Engineered 15+ features improving model accuracy from 75% to 88%',
          'Built ensemble model using XGBoost achieving 88% accuracy and 0.85 F1-score',
          'Created interactive dashboard visualizing churn patterns and predictions',
          'Deployed model as REST API using Flask serving 100+ predictions per day',
          'Generated actionable business insights reducing potential churn by 25%',
          'Performed statistical analysis identifying top 5 churn risk factors',
        ],
        relevance_score: 97,
        reason: 'Demonstrates end-to-end data science workflow, ML model deployment, and business impact',
      });

      roleBasedSuggestions.push({
        project_title: 'Sales Analytics Dashboard with Predictive Insights',
        description: 'Build a comprehensive analytics dashboard analyzing sales data, trends, forecasting future sales, and providing actionable insights.',
        technologies_used: ['Python', 'Pandas', 'NumPy', 'Plotly', 'Dash', 'SQL', 'Time Series Analysis'],
        suggested_contributions: [
          'Processed and cleaned 50,000+ sales records from multiple data sources',
          'Created interactive visualizations using Plotly and Dash with 10+ chart types',
          'Developed time series forecasting model predicting sales with 85% accuracy',
          'Built SQL queries optimizing data extraction reducing query time by 70%',
          'Designed automated ETL pipeline processing daily sales data',
          'Identified top-performing products and regions increasing revenue by 15%',
          'Generated weekly reports with actionable recommendations for sales team',
        ],
        relevance_score: 95,
        reason: 'Shows data analysis, visualization, forecasting, and business intelligence skills',
      });
    }

    // Machine Learning / AI Engineer
    if (roleLower.includes('machine learning') || roleLower.includes('ml') || roleLower.includes('ai') || roleLower.includes('artificial intelligence')) {
      roleBasedSuggestions.push({
        project_title: 'Image Classification System using Deep Learning',
        description: 'Develop a deep learning model for image classification using CNN architecture, with data augmentation, model optimization, and web deployment.',
        technologies_used: ['Python', 'TensorFlow', 'Keras', 'OpenCV', 'Flask', 'NumPy', 'Pillow'],
        suggested_contributions: [
          'Built CNN model using TensorFlow achieving 92% accuracy on test dataset',
          'Implemented data augmentation techniques increasing dataset size by 5x',
          'Optimized model reducing inference time from 2s to 0.3s per image',
          'Created web interface using Flask for real-time image classification',
          'Deployed model on cloud infrastructure handling 200+ requests per hour',
          'Applied transfer learning using pre-trained models improving accuracy by 15%',
          'Documented model architecture and training process for reproducibility',
        ],
        relevance_score: 98,
        reason: 'Demonstrates deep learning expertise, CNN architecture, and model deployment',
      });

      roleBasedSuggestions.push({
        project_title: 'Sentiment Analysis API for Social Media',
        description: 'Build a natural language processing system analyzing sentiment from social media posts with real-time processing and visualization.',
        technologies_used: ['Python', 'NLTK', 'Transformers', 'BERT', 'Flask', 'PostgreSQL', 'Redis'],
        suggested_contributions: [
          'Developed NLP pipeline using BERT model achieving 89% sentiment classification accuracy',
          'Processed 10,000+ social media posts in real-time with 95% uptime',
          'Built RESTful API using Flask serving 500+ requests per minute',
          'Implemented caching using Redis reducing API response time by 80%',
          'Created data visualization dashboard showing sentiment trends over time',
          'Optimized model inference reducing processing time from 1s to 0.2s',
          'Deployed scalable system on cloud infrastructure with auto-scaling',
        ],
        relevance_score: 96,
        reason: 'Shows NLP expertise, transformer models, and real-time processing capabilities',
      });
    }

    // Frontend Developer
    if (roleLower.includes('frontend') || roleLower.includes('ui') || roleLower.includes('ux')) {
      roleBasedSuggestions.push({
        project_title: 'Modern Portfolio Website with Interactive Animations',
        description: 'Create a stunning portfolio website with smooth animations, responsive design, dark mode, and performance optimization.',
        technologies_used: ['React', 'TypeScript', 'Framer Motion', 'Tailwind CSS', 'Next.js', 'GSAP'],
        suggested_contributions: [
          'Developed responsive website using React and Next.js with 100% mobile compatibility',
          'Implemented smooth animations using Framer Motion improving user engagement by 40%',
          'Optimized performance achieving 95+ Lighthouse score and <2s load time',
          'Created reusable component library reducing development time by 30%',
          'Integrated dark mode with smooth theme transitions',
          'Implemented SEO optimization increasing organic traffic by 50%',
          'Built contact form with email integration and form validation',
        ],
        relevance_score: 94,
        reason: 'Demonstrates modern frontend skills, animations, and performance optimization',
      });
    }

    // Backend Developer
    if (roleLower.includes('backend') || roleLower.includes('api')) {
      roleBasedSuggestions.push({
        project_title: 'Scalable Microservices Architecture',
        description: 'Design and implement a microservices-based system with API gateway, service discovery, message queue, and containerization.',
        technologies_used: ['Node.js', 'Docker', 'Kubernetes', 'RabbitMQ', 'MongoDB', 'Redis', 'Nginx'],
        suggested_contributions: [
          'Architected microservices system with 5+ independent services',
          'Implemented API gateway handling 1000+ requests per second',
          'Set up Docker containers and Kubernetes orchestration for scalability',
          'Integrated message queue using RabbitMQ for asynchronous processing',
          'Optimized database queries reducing response time by 60%',
          'Implemented caching strategy using Redis improving performance by 70%',
          'Configured load balancing and auto-scaling for high availability',
        ],
        relevance_score: 97,
        reason: 'Shows system design, microservices architecture, and scalability expertise',
      });
    }

    // DevOps / Cloud Engineer
    if (roleLower.includes('devops') || roleLower.includes('cloud') || roleLower.includes('sre')) {
      roleBasedSuggestions.push({
        project_title: 'CI/CD Pipeline with Infrastructure as Code',
        description: 'Build automated CI/CD pipeline with infrastructure provisioning, automated testing, deployment, and monitoring.',
        technologies_used: ['Jenkins', 'GitHub Actions', 'Terraform', 'AWS', 'Docker', 'Kubernetes', 'Prometheus'],
        suggested_contributions: [
          'Designed CI/CD pipeline reducing deployment time from 2 hours to 15 minutes',
          'Implemented Infrastructure as Code using Terraform provisioning AWS resources',
          'Set up automated testing with 90% code coverage',
          'Configured container orchestration using Kubernetes with auto-scaling',
          'Implemented monitoring and alerting using Prometheus and Grafana',
          'Created disaster recovery plan with automated backups',
          'Optimized cloud costs reducing infrastructure expenses by 30%',
        ],
        relevance_score: 96,
        reason: 'Demonstrates DevOps expertise, automation, and cloud infrastructure management',
      });
    }

    // Mobile Developer
    if (roleLower.includes('mobile') || roleLower.includes('android') || roleLower.includes('ios') || roleLower.includes('react native')) {
      roleBasedSuggestions.push({
        project_title: 'Cross-Platform Mobile App with Offline Support',
        description: 'Develop a feature-rich mobile application with offline capabilities, push notifications, and backend integration.',
        technologies_used: ['React Native', 'TypeScript', 'Redux', 'Firebase', 'AsyncStorage', 'REST API'],
        suggested_contributions: [
          'Built cross-platform app using React Native supporting iOS and Android',
          'Implemented offline data synchronization handling 1000+ records',
          'Integrated Firebase for authentication and real-time database',
          'Developed push notification system increasing user engagement by 35%',
          'Optimized app performance reducing load time by 50%',
          'Implemented state management using Redux for complex data flows',
          'Published app on Google Play Store and Apple App Store',
        ],
        relevance_score: 95,
        reason: 'Shows mobile development skills, cross-platform expertise, and app store deployment',
      });
    }

    // Cybersecurity / Security Engineer
    if (roleLower.includes('security') || roleLower.includes('cyber') || roleLower.includes('penetration')) {
      roleBasedSuggestions.push({
        project_title: 'Vulnerability Scanner and Security Assessment Tool',
        description: 'Develop a security tool scanning applications for vulnerabilities, generating reports, and providing remediation recommendations.',
        technologies_used: ['Python', 'OWASP ZAP', 'Nmap', 'SQL Injection Testing', 'XSS Detection', 'Flask'],
        suggested_contributions: [
          'Built automated vulnerability scanner detecting 20+ common security issues',
          'Implemented SQL injection and XSS detection algorithms',
          'Created comprehensive security assessment reports with risk ratings',
          'Developed web interface for scanning and report visualization',
          'Integrated OWASP ZAP API for advanced security testing',
          'Generated actionable remediation recommendations for each vulnerability',
          'Tested 50+ web applications identifying 200+ security vulnerabilities',
        ],
        relevance_score: 97,
        reason: 'Demonstrates security expertise, vulnerability assessment, and security tooling',
      });
    }

    // Add generic suggestions if we don't have role-specific ones
    if (roleBasedSuggestions.length === 0) {
      roleBasedSuggestions.push({
        project_title: 'Professional Portfolio Project',
        description: `Build a comprehensive project showcasing skills relevant to ${targetRole} role with modern technologies, best practices, and real-world application.`,
        technologies_used: ['Modern technologies relevant to role'],
        suggested_contributions: [
          'Implemented core functionality using industry-standard practices and design patterns',
          'Designed scalable architecture supporting future growth and maintenance',
          'Integrated with external APIs and third-party services',
          'Applied version control (Git) and collaboration workflows',
          'Documented code, API, and deployment process comprehensively',
          'Optimized performance and implemented error handling',
          'Deployed application with CI/CD pipeline and monitoring',
        ],
        relevance_score: 85,
        reason: 'Shows professional development practices, technical skills, and project management',
      });

      roleBasedSuggestions.push({
        project_title: 'Open Source Contribution Project',
        description: `Contribute to an open-source project relevant to ${targetRole}, demonstrating collaboration, code quality, and community engagement.`,
        technologies_used: ['Technologies used in the open-source project'],
        suggested_contributions: [
          'Contributed features and bug fixes to open-source project',
          'Participated in code reviews and pull request discussions',
          'Improved documentation and added examples',
          'Fixed critical bugs improving project stability',
          'Added test coverage increasing code quality',
          'Collaborated with maintainers and community members',
          'Received positive feedback and merged contributions',
        ],
        relevance_score: 80,
        reason: 'Demonstrates collaboration, code quality, and community engagement skills',
      });
    }

    // Always add at least 2-3 suggestions
    if (roleBasedSuggestions.length < 2) {
      roleBasedSuggestions.push({
        project_title: 'API Integration and Automation Project',
        description: 'Build a project integrating multiple APIs, automating workflows, and processing data with error handling and logging.',
        technologies_used: ['Python', 'REST API', 'JSON', 'Automation Tools', 'Error Handling'],
        suggested_contributions: [
          'Integrated 5+ external APIs with comprehensive error handling',
          'Automated workflows reducing manual work by 80%',
          'Implemented data processing pipeline handling 1000+ records',
          'Created logging and monitoring system for tracking operations',
          'Built user-friendly interface for configuration and monitoring',
          'Documented API integrations and usage examples',
          'Deployed solution with scheduled automation tasks',
        ],
        relevance_score: 88,
        reason: 'Shows API integration, automation, and problem-solving skills',
      });
    }

    setSuggestions(roleBasedSuggestions);
  };

  const toggleProjectSelection = (index: number) => {
    const newSelected = new Set(selectedProjects);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedProjects(newSelected);
  };

  const handleAddSelectedProjects = async () => {
    if (selectedProjects.size === 0) {
      toast({
        title: 'No Projects Selected',
        description: 'Please select at least one project to add to your resume',
        variant: 'destructive',
      });
      return;
    }

    setIsAdding(true);
    try {
      const projectsToAdd = Array.from(selectedProjects).map(index => {
        const suggestion = suggestions[index];
        return {
          project_title: suggestion.project_title,
          description: suggestion.description,
          technologies_used: suggestion.technologies_used,
          contributions: suggestion.suggested_contributions,
          duration_start: new Date().toISOString().slice(0, 7), // Current month
          duration_end: null,
        };
      });

      onAddProjects(projectsToAdd);
      
      toast({
        title: 'Projects Added!',
        description: `Added ${projectsToAdd.length} project(s) to your resume. Optimize again to see the improvements.`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error adding projects:', error);
      toast({
        title: 'Error',
        description: 'Failed to add projects. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Suggested Projects for {targetRole}
          </DialogTitle>
          <DialogDescription>
            AI-powered project suggestions tailored for {targetRole}{companyName ? ` at ${companyName}` : ''}. 
            Select projects to add them directly to your resume with pre-filled contributions.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3">Generating project suggestions...</span>
          </div>
        ) : suggestions.length === 0 ? (
          <Alert>
            <AlertDescription>
              No suggestions available. Please ensure you've entered a target role.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                {suggestions.map((suggestion, index) => {
                  const isSelected = selectedProjects.has(index);
                  return (
                    <Card
                      key={index}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary border-2 bg-primary/5'
                          : 'hover:border-primary/50'
                      }`}
                      onClick={() => toggleProjectSelection(index)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2">
                              {suggestion.project_title}
                              {isSelected && (
                                <Badge variant="default" className="ml-2">
                                  <Check className="h-3 w-3 mr-1" />
                                  Selected
                                </Badge>
                              )}
                            </CardTitle>
                            <CardDescription className="mt-2">
                              {suggestion.description}
                            </CardDescription>
                          </div>
                          <Badge variant="secondary" className="ml-2">
                            {suggestion.relevance_score}% match
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <p className="text-sm font-medium mb-1">Why this project?</p>
                          <p className="text-sm text-muted-foreground">{suggestion.reason}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">Technologies:</p>
                          <div className="flex flex-wrap gap-2">
                            {suggestion.technologies_used.map((tech, techIdx) => (
                              <Badge key={techIdx} variant="outline">
                                {tech}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-medium mb-2">Suggested Contributions (All will be added):</p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground max-h-32 overflow-y-auto">
                            {suggestion.suggested_contributions.map((contrib, contribIdx) => (
                              <li key={contribIdx}>{contrib}</li>
                            ))}
                          </ul>
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            💡 These contributions will be automatically added to your project. You can edit them later.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="flex flex-col gap-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {selectedProjects.size} project(s) selected
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Projects will be added with all suggested contributions. You can edit them in the Projects section.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleAddSelectedProjects}
                  disabled={selectedProjects.size === 0 || isAdding}
                  className="flex-1 bg-gradient-to-r from-primary to-primary/90"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding Projects...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add {selectedProjects.size} Project{selectedProjects.size !== 1 ? 's' : ''} to Resume
                    </>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

