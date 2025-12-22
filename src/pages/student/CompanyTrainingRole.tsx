import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, FileQuestion, Code2, MessageSquare, Briefcase, Play, CheckCircle2, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/integrations/api/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface PracticeSection {
  id: number;
  role_id: number;
  section_name: string;
  description?: string;
  order_index: number;
  is_active: boolean;
  rounds?: Round[];
}

interface Round {
  id: number;
  practice_section_id: number;
  round_type: 'quiz' | 'coding' | 'gd' | 'interview';
  round_name: string;
  description?: string;
  order_index: number;
  is_active: boolean;
}

interface CompanyRole {
  id: number;
  company_id: number;
  role_name: string;
  description?: string;
  company?: {
    id: number;
    name: string;
    logo_url?: string;
  };
}

export default function CompanyTrainingRole() {
  const { roleId } = useParams<{ roleId: string }>();
  const navigate = useNavigate();
  const [role, setRole] = useState<CompanyRole | null>(null);
  const [sections, setSections] = useState<PracticeSection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (roleId) {
      fetchRoleAndSections(parseInt(roleId));
    }
  }, [roleId]);

  const fetchRoleAndSections = async (id: number) => {
    try {
      setLoading(true);
      const [roleResponse, sectionsResponse] = await Promise.all([
        apiClient.getRole(id),
        apiClient.listPracticeSections(id, true)
      ]);
      
      // Handle role response (should be object, but handle array just in case)
      let roleData: CompanyRole;
      if (Array.isArray(roleResponse)) {
        if (roleResponse.length === 0) {
          throw new Error("Role not found");
        }
        roleData = roleResponse[0] as CompanyRole;
      } else {
        roleData = roleResponse as CompanyRole;
      }
      
      if (!roleData || !roleData.id) {
        throw new Error("Invalid role data received");
      }
      
      setRole(roleData);
      
      // Handle sections response
      let sectionsData: PracticeSection[] = [];
      if (Array.isArray(sectionsResponse)) {
        sectionsData = sectionsResponse;
      } else if (sectionsResponse && typeof sectionsResponse === 'object') {
        if ('data' in sectionsResponse && Array.isArray(sectionsResponse.data)) {
          sectionsData = sectionsResponse.data;
        }
      }
      
      // Fetch rounds for each section
      const sectionsWithRounds = await Promise.all(
        sectionsData.map(async (section: PracticeSection) => {
          try {
            const roundsResponse = await apiClient.listRounds(section.id, undefined, true);
            let rounds: Round[] = [];
            if (Array.isArray(roundsResponse)) {
              rounds = roundsResponse;
            } else if (roundsResponse && typeof roundsResponse === 'object' && 'data' in roundsResponse && Array.isArray(roundsResponse.data)) {
              rounds = roundsResponse.data;
            }
            return { ...section, rounds: rounds || [] };
          } catch (error) {
            console.error(`Error fetching rounds for section ${section.id}:`, error);
            return { ...section, rounds: [] };
          }
        })
      );
      
      setSections(sectionsWithRounds.sort((a, b) => a.order_index - b.order_index));
    } catch (error: any) {
      console.error("Error fetching role and sections:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load practice sections",
        variant: "destructive",
      });
      setRole(null);
      setSections([]);
    } finally {
      setLoading(false);
    }
  };

  const getRoundIcon = (roundType: string) => {
    switch (roundType) {
      case 'quiz': return <FileQuestion className="h-5 w-5" />;
      case 'coding': return <Code2 className="h-5 w-5" />;
      case 'gd': return <MessageSquare className="h-5 w-5" />;
      case 'interview': return <Briefcase className="h-5 w-5" />;
      default: return <Play className="h-5 w-5" />;
    }
  };

  const getRoundTypeColor = (roundType: string) => {
    switch (roundType) {
      case 'quiz': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'coding': return 'bg-purple-500/10 text-purple-600 border-purple-500/20';
      case 'gd': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'interview': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      default: return 'bg-muted';
    }
  };

  const handleRoundClick = (round: Round) => {
    navigate(`/company-training/round/${round.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!role) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Role not found</p>
          <Button onClick={() => navigate('/company-training')} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Company Training
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/company-training')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {role.company?.logo_url && (
              <img 
                src={role.company.logo_url} 
                alt={role.company.name}
                className="h-12 w-12 object-contain rounded"
              />
            )}
            <div>
              <h1 className="text-3xl font-bold">{role.role_name}</h1>
              <p className="text-muted-foreground">{role.company?.name}</p>
            </div>
          </div>
          {role.description && (
            <p className="text-muted-foreground mt-2">{role.description}</p>
          )}
        </div>
      </div>

      {/* Practice Sections */}
      {sections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileQuestion className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
            <p className="text-muted-foreground mb-2">No practice sections available yet</p>
            <p className="text-sm text-muted-foreground">Practice sections will appear here once they are created</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle className="text-xl">{section.section_name}</CardTitle>
                {section.description && (
                  <p className="text-muted-foreground text-sm mt-1">{section.description}</p>
                )}
              </CardHeader>
              <CardContent>
                {section.rounds && section.rounds.length > 0 ? (
                  <div className="space-y-3">
                    {section.rounds
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((round, index) => (
                        <Card
                          key={round.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleRoundClick(round)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 flex-1">
                                <div className={`p-2 rounded-lg ${getRoundTypeColor(round.round_type)}`}>
                                  {getRoundIcon(round.round_type)}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold">{round.round_name}</h3>
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {round.round_type}
                                    </Badge>
                                  </div>
                                  {round.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {round.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="ml-4"
                              >
                                <Play className="h-4 w-4 mr-2" />
                                Start
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Play className="h-8 w-8 mx-auto mb-2 opacity-50 text-muted-foreground" />
                    <p className="text-muted-foreground text-sm">No rounds available in this section yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

