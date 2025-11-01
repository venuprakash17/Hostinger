import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Hobby {
  id?: string;
  hobby_name: string;
  description: string;
  display_order: number;
}

export function HobbiesForm() {
  const { toast } = useToast();
  const [hobbies, setHobbies] = useState<Hobby[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchHobbies();
  }, []);

  const fetchHobbies = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("hobbies")
        .select("*")
        .eq("user_id", user.id)
        .order("display_order");

      if (error) throw error;
      setHobbies(data || []);
    } catch (error) {
      console.error("Error fetching hobbies:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setHobbies([
      ...hobbies,
      {
        hobby_name: "",
        description: "",
        display_order: hobbies.length,
      },
    ]);
  };

  const handleRemove = async (index: number) => {
    const hobby = hobbies[index];
    if (hobby.id) {
      try {
        const { error } = await supabase
          .from("hobbies")
          .delete()
          .eq("id", hobby.id);

        if (error) throw error;

        toast({
          title: "Hobby deleted",
          description: "Your hobby has been removed successfully.",
        });
      } catch (error) {
        console.error("Error deleting hobby:", error);
        toast({
          title: "Error",
          description: "Failed to delete hobby. Please try again.",
          variant: "destructive",
        });
        return;
      }
    }

    const updatedHobbies = hobbies.filter((_, i) => i !== index);
    setHobbies(updatedHobbies);
  };

  const handleChange = (index: number, field: keyof Hobby, value: string) => {
    const updatedHobbies = [...hobbies];
    updatedHobbies[index] = {
      ...updatedHobbies[index],
      [field]: value,
    };
    setHobbies(updatedHobbies);
  };

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Filter out empty hobbies
      const validHobbies = hobbies.filter(h => h.hobby_name.trim());

      // Delete existing hobbies and insert new ones
      await supabase.from("hobbies").delete().eq("user_id", user.id);

      if (validHobbies.length > 0) {
        const { error } = await supabase.from("hobbies").insert(
          validHobbies.map((hobby, index) => ({
            user_id: user.id,
            hobby_name: hobby.hobby_name,
            description: hobby.description,
            display_order: index,
          }))
        );

        if (error) throw error;
      }

      toast({
        title: "Hobbies saved",
        description: "Your hobbies have been updated successfully.",
      });

      fetchHobbies();
    } catch (error) {
      console.error("Error saving hobbies:", error);
      toast({
        title: "Error",
        description: "Failed to save hobbies. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hobbies & Interests</CardTitle>
        <CardDescription>
          Optional: Add your hobbies and personal interests to showcase your personality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hobbies.map((hobby, index) => (
          <div key={index} className="space-y-3 p-4 border rounded-lg relative">
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-3">
                <div>
                  <Label>Hobby or Interest</Label>
                  <Input
                    placeholder="e.g., Photography, Chess, Blogging"
                    value={hobby.hobby_name}
                    onChange={(e) => handleChange(index, "hobby_name", e.target.value)}
                  />
                </div>
                <div>
                  <Label>Description (Optional)</Label>
                  <Textarea
                    placeholder="Brief description (optional)"
                    value={hobby.description}
                    onChange={(e) => handleChange(index, "description", e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemove(index)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        <div className="flex gap-2">
          <Button onClick={handleAdd} variant="outline" className="flex-1">
            <Plus className="h-4 w-4 mr-2" />
            Add Hobby
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Save Hobbies
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
