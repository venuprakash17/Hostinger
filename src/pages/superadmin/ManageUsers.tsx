import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Users } from "lucide-react";

export default function ManageUsers() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"super_admin" | "admin" | "faculty">("faculty");
  const [loading, setLoading] = useState(false);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Call edge function to create user with admin privileges
      const { data, error } = await supabase.functions.invoke('create-admin-user', {
        body: { email, password, fullName, role }
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`${role.replace('_', ' ')} account created successfully!`);
        setEmail("");
        setPassword("");
        setFullName("");
        setRole("faculty");
      } else {
        throw new Error(data.error || "Failed to create user");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center gap-2">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Create faculty, admin, and super admin accounts</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create New User
          </CardTitle>
          <CardDescription>
            Add faculty members, college admins, or super admins
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@college.edu"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(value: any) => setRole(value)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="faculty">Faculty</SelectItem>
                  <SelectItem value="admin">College Admin</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create User"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>• Students sign up themselves through the public registration page</p>
          <p>• Faculty, admins, and super admins are created here by super admins</p>
          <p>• Created users can log in immediately with their credentials</p>
          <p>• Users will receive their credentials via the contact information provided</p>
        </CardContent>
      </Card>
    </div>
  );
}
