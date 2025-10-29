import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TEST_CREDENTIALS = [
  { email: 'student@test.com', password: 'student123', role: 'Student' },
  { email: 'faculty@test.com', password: 'faculty123', role: 'Faculty' },
  { email: 'admin@test.com', password: 'admin123', role: 'Admin' },
  { email: 'hod@test.com', password: 'hod123', role: 'HOD (Faculty + Dept Head)' },
];

export default function CreateTestAccounts() {
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState(false);

  const handleCreateAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-test-accounts', {
        body: {}
      });

      if (error) throw error;

      toast.success("Test accounts created successfully!");
      setCreated(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to create test accounts");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-xl bg-gradient-primary">
              <Users className="h-10 w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Create Test Accounts</CardTitle>
          <CardDescription>
            Generate test accounts for all roles to test the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!created ? (
            <>
              <div className="text-sm text-muted-foreground space-y-2">
                <p>This will create the following test accounts:</p>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TEST_CREDENTIALS.map((cred, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">{cred.email}</TableCell>
                      <TableCell className="font-mono text-sm">{cred.password}</TableCell>
                      <TableCell>{cred.role}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Button 
                onClick={handleCreateAccounts} 
                disabled={loading}
                className="w-full"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Creating Accounts..." : "Create Test Accounts"}
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-800 dark:text-green-200 font-medium">
                  ✓ Test accounts created successfully!
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Login Credentials:</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Password</TableHead>
                      <TableHead>Role</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {TEST_CREDENTIALS.map((cred, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono text-sm">{cred.email}</TableCell>
                        <TableCell className="font-mono text-sm">{cred.password}</TableCell>
                        <TableCell>{cred.role}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Button 
                onClick={() => window.location.href = '/login'}
                className="w-full"
              >
                Go to Login
              </Button>
            </div>
          )}

          <div className="text-xs text-center text-muted-foreground">
            Note: If accounts already exist, they will be skipped
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
