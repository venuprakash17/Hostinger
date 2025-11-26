import { useEffect } from "react";
import { useUserRole } from "./useUserRole";
import { useLocation } from "react-router-dom";

/**
 * Hook to update document title with user role
 * Format: "SvnaJobs - [Role] - [Page Name]"
 */
export function useDocumentTitle() {
  const { userRole, isSuperAdmin, isAdmin, isHOD, isFaculty, isStudent, loading } = useUserRole();
  const location = useLocation();

  useEffect(() => {
    // Base title
    const baseTitle = "SvnaJobs";
    
    // Get role display name - use simple role names
    let roleDisplay = "";
    if (!loading && userRole) {
      // Map roles to display names - keep Super Admin distinct from Admin
      if (isSuperAdmin) {
        roleDisplay = "Super Admin";
      } else if (isAdmin) {
        roleDisplay = "Admin";
      } else if (isHOD) {
        roleDisplay = "HOD";
      } else if (isFaculty) {
        roleDisplay = "Faculty";
      } else if (isStudent) {
        roleDisplay = "Student";
      } else {
        // Capitalize first letter of role for unknown roles
        roleDisplay = userRole.charAt(0).toUpperCase() + userRole.slice(1);
      }
    }

    // Get page name from path
    const getPageName = (pathname: string): string => {
      // Remove leading slash and split
      const parts = pathname.split('/').filter(Boolean);
      
      if (parts.length === 0) {
        return "Dashboard";
      }

      // Map common routes to readable names
      const routeMap: Record<string, string> = {
        'dashboard': 'Dashboard',
        'superadmin': 'Super Admin',
        'admin': 'Admin',
        'faculty': 'Faculty',
        'student': 'Student',
        'profile': 'Profile',
        'colleges': 'Colleges',
        'users': 'Users',
        'jobs': 'Jobs',
        'companies': 'Companies',
        'quizzes': 'Quizzes',
        'coding-problems': 'Coding Problems',
        'coding-labs': 'Coding Labs',
        'resume': 'Resume',
        'certificates': 'Certificates',
        'analytics': 'Analytics',
        'settings': 'Settings',
      };

      // Get the last meaningful part
      const lastPart = parts[parts.length - 1];
      
      // Check if it's a known route
      if (routeMap[lastPart]) {
        return routeMap[lastPart];
      }

      // Capitalize and format unknown routes
      return lastPart
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    const pageName = getPageName(location.pathname);

    // Build title
    let title = baseTitle;
    if (roleDisplay) {
      title += ` - ${roleDisplay}`;
    }
    if (pageName && pageName !== "Dashboard") {
      title += ` - ${pageName}`;
    } else if (!roleDisplay) {
      title += " - College & Placement Management Platform";
    }

    // Update document title
    document.title = title;
  }, [userRole, isSuperAdmin, isAdmin, isHOD, isFaculty, isStudent, loading, location.pathname]);
}

