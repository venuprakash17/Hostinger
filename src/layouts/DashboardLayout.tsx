import { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { authHelpers } from "@/integrations/api/client";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { 
  LayoutDashboard, 
  FileText, 
  Code2, 
  ClipboardCheck, 
  Briefcase, 
  Calendar,
  BarChart3,
  Bell,
  Menu,
  X,
  LogOut,
  User,
  Users,
  School,
  UserCheck,
  FileQuestion,
  Target,
  Building2,
  BookOpen,
  GraduationCap,
  ListChecks,
  Award,
  MessageSquare,
  ArrowUp,
  Ticket,
  Archive,
  RefreshCw,
  Upload,
  Mic
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CodingHeaderSearch } from "@/components/CodingHeaderSearch";
import { useCodingFilters } from "@/contexts/CodingFiltersContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const studentNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: FileText, label: "Resume", path: "/resume" },
  { icon: Code2, label: "Coding Practice", path: "/coding-problems" },
  { icon: Code2, label: "Coding Labs", path: "/coding-labs" },
  { icon: ClipboardCheck, label: "Tests", path: "/tests" },
  { icon: Calendar, label: "Training Sessions", path: "/training-sessions" },
  { icon: Target, label: "Placement Training", path: "/placement-training" },
  { icon: Building2, label: "Company Training", path: "/company-training" },
  { icon: Briefcase, label: "Jobs & Placement", path: "/jobs" },
  { icon: ListChecks, label: "Application Tracker", path: "/applications" },
  { icon: Mic, label: "Mock Interview (AI)", path: "/mock-interview" },
  { icon: MessageSquare, label: "Mock Interviews", path: "/mock-interviews" },
  { icon: Ticket, label: "Hall Tickets", path: "/hall-tickets" },
  // Attendance hidden but settings kept
  // { icon: Calendar, label: "Attendance", path: "/attendance" },
  // { icon: BarChart3, label: "Attendance Analytics", path: "/attendance-analytics" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
];

const facultyNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/faculty/dashboard" },
  { icon: FileQuestion, label: "Manage Quizzes", path: "/faculty/quizzes" },
  { icon: Code2, label: "Coding Labs", path: "/coding-labs" },
  { icon: Code2, label: "Manage Coding Problems", path: "/faculty/coding-problems" },
  // Attendance hidden but settings kept
  // { icon: UserCheck, label: "Mark Attendance", path: "/faculty/attendance" },
  { icon: Bell, label: "Notifications", path: "/admin/notifications" },
  // { icon: BarChart3, label: "Attendance Analytics", path: "/attendance-analytics" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
];

const hodNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/faculty/dashboard" },
  { icon: User, label: "Manage Users", path: "/admin/users" },
  { icon: GraduationCap, label: "Manage Staff", path: "/admin/staff" },
  { icon: BookOpen, label: "Subjects", path: "/admin/subjects" },
  { icon: School, label: "Sections", path: "/admin/sections" },
  { icon: Upload, label: "Bulk Upload Structure", path: "/admin/bulk-upload-academic-structure" },
  { icon: FileQuestion, label: "Manage Quizzes", path: "/faculty/quizzes" },
  { icon: Code2, label: "Coding Labs", path: "/coding-labs" },
  { icon: Code2, label: "Manage Coding Problems", path: "/faculty/coding-problems" },
  // Attendance hidden but settings kept
  // { icon: UserCheck, label: "Mark Attendance", path: "/faculty/attendance" },
  { icon: Bell, label: "Notifications", path: "/admin/notifications" },
  // { icon: BarChart3, label: "Attendance Analytics", path: "/attendance-analytics" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
];

const adminNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
  { icon: User, label: "Manage Users", path: "/admin/users" },
  { icon: GraduationCap, label: "Manage Staff", path: "/admin/staff" },
  { icon: Building2, label: "Departments", path: "/admin/departments" },
  { icon: BookOpen, label: "Subjects", path: "/admin/subjects" },
  // Attendance hidden but settings kept
  // { icon: UserCheck, label: "Manage Attendance", path: "/attendance-analytics" },
  { icon: Briefcase, label: "Jobs & Placement", path: "/admin/jobs" },
  { icon: RefreshCw, label: "Job Aggregation", path: "/admin/job-aggregation" },
  { icon: MessageSquare, label: "Mock Interviews", path: "/admin/mock-interviews" },
  { icon: Bell, label: "Notifications", path: "/admin/notifications" },
  { icon: School, label: "Sections & Faculty", path: "/admin/sections" },
  { icon: Upload, label: "Bulk Upload Structure", path: "/admin/bulk-upload-academic-structure" },
  { icon: FileQuestion, label: "Manage Quizzes", path: "/faculty/quizzes" },
  { icon: Code2, label: "Coding Labs", path: "/coding-labs" },
  { icon: Code2, label: "Manage Coding Problems", path: "/faculty/coding-problems" },
  { icon: BarChart3, label: "Analytics", path: "/analytics" },
];

const superAdminNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/superadmin/dashboard" },
  { icon: School, label: "Manage Colleges", path: "/superadmin/colleges" },
  { icon: Building2, label: "Manage Institutions", path: "/superadmin/institutions" },
  { icon: Users, label: "All Students", path: "/superadmin/all-students" },
  { icon: User, label: "Manage Users", path: "/superadmin/users" },
  { icon: FileQuestion, label: "Global Content", path: "/superadmin/global-content" },
  { icon: Target, label: "Company Training", path: "/superadmin/company-training" },
  { icon: Briefcase, label: "Manage Jobs", path: "/superadmin/jobs" },
  { icon: ArrowUp, label: "Year Promotion", path: "/superadmin/promotions" },
  { icon: Archive, label: "Academic Year Migration", path: "/superadmin/academic-year-migration" },
  { icon: Bell, label: "Notifications", path: "/admin/notifications" },
  { icon: Bell, label: "Announcements", path: "/superadmin/announcements" },
  { icon: Code2, label: "Coding Labs", path: "/coding-labs" },
];

function CodingHeaderSearchWrapper() {
  try {
    const filters = useCodingFilters();
    return (
      <CodingHeaderSearch
        searchQuery={filters.searchQuery}
        onSearchChange={filters.setSearchQuery}
        difficultyFilter={filters.difficultyFilter}
        onDifficultyChange={filters.setDifficultyFilter}
        tagsFilter={filters.tagsFilter}
        onTagsChange={filters.setTagsFilter}
        yearFilter={filters.yearFilter}
        onYearChange={filters.setYearFilter}
        languageFilter={filters.languageFilter}
        onLanguageChange={filters.setLanguageFilter}
        scopeTypeFilter={filters.scopeTypeFilter}
        onScopeTypeChange={filters.setScopeTypeFilter}
        onClearFilters={filters.clearFilters}
      />
    );
  } catch {
    return null;
  }
}

export const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Update document title with user role
  useDocumentTitle();

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const user = await authHelpers.getUser();
        
        if (!user) {
          navigate('/login');
          return;
        }

        // Set email from user object
        setUserEmail(user.email || null);

        // Fetch user profile and roles from API
        try {
          const { apiClient } = await import('@/integrations/api/client');
          
          // Fetch user profile to get name
          try {
            const profile = await apiClient.getCurrentUserProfile();
            setUserName(profile.full_name || null);
            if (!userEmail && profile.email) {
              setUserEmail(profile.email);
            }
          } catch (profileError) {
            console.error('Error fetching user profile:', profileError);
            // Fallback to email if profile fetch fails
            setUserName(user.email?.split('@')[0] || null);
          }
          
          // Fetch user roles
          const roles = await apiClient.getCurrentUserRoles();
          
          if (roles && roles.length > 0) {
            // Get the primary role (first role, or admin/faculty if exists)
            const primaryRole = roles.find(r => r.role === 'admin' || r.role === 'super_admin') 
              || roles.find(r => r.role === 'faculty')
              || roles[0];
            
            setUserRole(primaryRole.role);
          } else {
            // Default to student if no roles found
            setUserRole('student');
          }
        } catch (roleError) {
          console.error('Error fetching user roles:', roleError);
          // Default to student on error
          setUserRole('student');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        navigate('/login');
      }
    };

    fetchUserRole();
    // Only run once on mount, not on every navigate change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    try {
      await authHelpers.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
      navigate('/login');
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const getNavItems = () => {
    switch (userRole) {
      case 'faculty':
        return facultyNavItems;
      case 'hod':
        return hodNavItems; // HODs have their own navigation with Subjects
      case 'admin':
        return adminNavItems;
      case 'super_admin':
        return superAdminNavItems;
      default:
        return studentNavItems;
    }
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Logo />
          </div>

          <CodingHeaderSearchWrapper />

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">My Account</p>
                    {userName && (
                      <p className="text-xs leading-none text-muted-foreground font-normal">
                        {userName}
                      </p>
                    )}
                    {userEmail && (
                      <p className="text-xs leading-none text-muted-foreground font-normal">
                        {userEmail}
                      </p>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:sticky top-16 left-0 z-40 h-[calc(100vh-4rem)] w-64 
            border-r border-border bg-card transition-transform lg:translate-x-0
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          `}
        >
          <nav className="flex flex-col gap-1 p-4">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-sm font-medium
                  transition-colors
                  ${isActive(item.path)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </div>
                {(item as any).comingSoon && (
                  <Badge variant="outline" className="text-xs">
                    Coming Soon
                  </Badge>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 ${location.pathname === '/coding' ? 'p-0 lg:ml-0' : 'p-6 lg:p-8'}`}>
          <Outlet />
        </main>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};
