import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { GraduationCap, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
// Temporarily using API client - TODO: Update all Appwrite calls
import { authHelpers } from "@/integrations/api/client";
import { dbHelpers, COLLECTIONS } from "@/integrations/appwrite/helpers";

export default function Login() {
  const navigate = useNavigate();
  
  // Set title for login page
  useEffect(() => {
    document.title = "Login";
  }, []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    let mounted = true;
    
    const checkUser = async () => {
      // Check if we have a stored token - if not, skip auth check entirely
      const token = localStorage.getItem('access_token');
      if (!token) {
        return; // No token means not logged in, skip all backend calls
      }
      
      // Only attempt auth check if we have a token
      // The auth check will fail silently if backend is down
      try {
        const user = await authHelpers.getUser();
        if (mounted && user) {
          // TODO: Fetch user role from API
          navigate('/dashboard');
        }
      } catch (error) {
        // Silently handle errors - backend may be down or user not logged in
        // This is expected behavior, no need to log or show errors
        if (mounted) {
          // Clear tokens if they're invalid (backend might have restarted)
          // But only if error suggests auth failure, not connection error
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (!errorMessage.includes('Failed to fetch') && !errorMessage.includes('ERR_CONNECTION_REFUSED')) {
            // Likely an auth error, clear tokens
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
          }
        }
      }
    };
    
    checkUser();
    
    return () => {
      mounted = false;
    };
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateByRole = (role: string) => {
    switch(role) {
      case 'super_admin':
        navigate('/superadmin/dashboard');
        break;
      case 'admin':
        navigate('/admin/dashboard');
        break;
      case 'hod':
        navigate('/faculty/dashboard'); // HOD uses faculty dashboard
        break;
      case 'faculty':
        navigate('/faculty/dashboard');
        break;
      default:
        navigate('/dashboard');
    }
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset mounted ref
    mountedRef.current = true;
    
    // Set loading state
    setLoading(true);
    
    // SAFETY: Always clear loading after max 20 seconds (failsafe)
    const failsafeTimeout = setTimeout(() => {
      if (mountedRef.current) {
        console.error('[LOGIN] Failsafe timeout triggered - clearing loading state');
        setLoading(false);
        toast.error("Login timeout. Please try again or check backend connection.");
      }
    }, 20000); // Increased to 20 seconds to match increased API timeout
    
    try {
      // Trim email and validate
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail || !password) {
        clearTimeout(failsafeTimeout);
        setLoading(false);
        toast.error("Please enter both email and password");
        return;
      }

      console.log('[LOGIN] Starting login for:', trimmedEmail);
      
      // Sign in with API - this just sets tokens, doesn't fetch user
      console.log('[LOGIN] Calling authHelpers.signIn...');
      const user = await authHelpers.signIn(trimmedEmail, password);
      
      console.log('[LOGIN] authHelpers.signIn completed, user:', user);
      console.log('[LOGIN] Login API call succeeded, tokens set');
      
      if (!mountedRef.current) {
        clearTimeout(failsafeTimeout);
        return;
      }
      
      // Login succeeded - tokens are set
      // Now fetch roles in a non-blocking way
      let primaryRole = 'student';
      
      // Fetch roles - getCurrentUserRoles has timeout and never throws
      const { apiClient } = await import('@/integrations/api/client');
      
      // Use Promise.race with a safety timeout
      const rolesPromise = apiClient.getCurrentUserRoles();
      const safetyTimeout = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Safety timeout')), 3000)
      );
      
      try {
        const roles = await Promise.race([rolesPromise, safetyTimeout]) as any;
        if (roles && Array.isArray(roles) && roles.length > 0) {
          // Get primary role (admin/faculty takes priority)
          primaryRole = roles.find((r: any) => r.role === 'admin' || r.role === 'super_admin')?.role
            || roles.find((r: any) => r.role === 'faculty')?.role
            || roles.find((r: any) => r.role === 'hod')?.role
            || roles[0].role;
          console.log('[LOGIN] Role detected:', primaryRole);
        } else {
          console.log('[LOGIN] No roles found, using default: student');
        }
      } catch (roleError: any) {
        // Timeout or error - use default role
        console.warn('[LOGIN] Role fetch failed, using default student role:', roleError.message);
      }
      
      if (!mountedRef.current) {
        clearTimeout(failsafeTimeout);
        return;
      }
      
      // CRITICAL: Clear failsafe and loading state FIRST
      clearTimeout(failsafeTimeout);
      setLoading(false);
      
      console.log('[LOGIN] Navigating to role:', primaryRole);
      
      // Show success message
      toast.success("Login successful!");
      
      // Navigate immediately - use setTimeout(0) to ensure state update completes
      setTimeout(() => {
        if (mountedRef.current) {
          navigateByRole(primaryRole);
        }
      }, 0);
      
    } catch (error: any) {
      // CRITICAL: Always clear failsafe and loading
      clearTimeout(failsafeTimeout);
      setLoading(false);
      
      // Handle API errors with user-friendly messages
      const errorMessage = error.message || 'Login failed. Please try again.';
      
      console.error('[LOGIN] Error:', errorMessage, error);
      
      if (errorMessage.includes('timeout') || 
          errorMessage.includes('Failed to fetch') || 
          errorMessage.includes('Failed to connect') ||
          errorMessage.includes('ERR_NETWORK_CHANGED') ||
          errorMessage.includes('network changed')) {
        toast.error("Backend server connection issue. Please check your connection.");
      } else if (error.status === 401 || errorMessage.includes('Invalid email or password') || errorMessage.includes('Unauthorized')) {
        toast.error("Invalid email or password. Please check your credentials.");
      } else if (errorMessage.includes('User not found') || errorMessage.includes('No account')) {
        toast.error("No account found with this email address.");
      } else if (errorMessage.includes('disabled') || errorMessage.includes('Account is disabled') || errorMessage.includes('College account is disabled')) {
        toast.error("Your account or college is disabled. Please contact administrator.");
      } else {
        toast.error(errorMessage);
      }
    } finally {
      // EXTRA SAFETY: Ensure loading is cleared even if something unexpected happens
      clearTimeout(failsafeTimeout);
      if (mountedRef.current) {
        // Use setTimeout to ensure state update happens
        setTimeout(() => {
          setLoading(false);
        }, 0);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="absolute inset-0 bg-gradient-primary opacity-5" />
      
      <Card className="w-full max-w-md shadow-elevated relative z-10">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-xl bg-gradient-primary">
              <GraduationCap className="h-10 w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>Sign in to your SvnaJobs account</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="student" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="student" className="flex flex-col items-center gap-1 py-3">
                <span className="font-medium">Student</span>
                <span className="text-xs text-muted-foreground font-normal">Login as Student</span>
              </TabsTrigger>
              <TabsTrigger value="staff" className="flex flex-col items-center gap-1 py-3">
                <span className="font-medium">Staff</span>
                <span className="text-xs text-muted-foreground font-normal">Faculty / Admin / HOD</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="student" className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Student Login:</strong> Access your dashboard, view jobs, track applications, and manage your profile.
                </p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="student-email">Email Address</Label>
                  <Input
                    id="student-email"
                    type="email"
                    placeholder="student@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="student-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="student-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="mr-2">⏳</span>
                      Signing in...
                    </>
                  ) : (
                    "Sign In as Student"
                  )}
                </Button>

                <div className="text-center">
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      New student?
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/signup")}
                >
                  Create Student Account
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="staff" className="space-y-4">
              <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-3 mb-4">
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  <strong>Staff Login:</strong> For Faculty, College Admins, HODs, and Super Admins. Manage students, content, and system settings.
                </p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="staff-email">Email Address</Label>
                  <Input
                    id="staff-email"
                    type="email"
                    placeholder="faculty@university.edu or admin@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="staff-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="staff-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="mr-2">⏳</span>
                      Signing in...
                    </>
                  ) : (
                    "Sign In as Staff"
                  )}
                </Button>

                <div className="text-center">
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>

                <div className="text-xs text-center text-muted-foreground mt-4">
                  Faculty and admin accounts are created by your administrator
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
