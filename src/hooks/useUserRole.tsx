import { useState, useEffect } from "react";
import { authHelpers } from "@/integrations/api/client";

interface UserRole {
  role: string;
  college_id: number | null;
}

export function useUserRole() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    const fetchUserRole = async () => {
      try {
        const user = await authHelpers.getUser();
        
        if (!mounted) return;
        
        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch user roles from API
        try {
          const { apiClient } = await import('@/integrations/api/client');
          const roles = await apiClient.getCurrentUserRoles();
          
          if (mounted && roles && roles.length > 0) {
            setUserRoles(roles);
            // Get the primary role (admin/super_admin takes priority, then HOD, then faculty)
            const primaryRole = roles.find(r => r.role === 'admin' || r.role === 'super_admin') 
              || roles.find(r => r.role === 'hod')
              || roles.find(r => r.role === 'faculty')
              || roles[0];
            
            setUserRole(primaryRole.role);
          }
        } catch (error) {
          console.error('Error fetching user roles:', error);
        }
        
        if (mounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchUserRole();

    return () => {
      mounted = false;
    };
  }, []);

  const isSuperAdmin = userRoles.some(r => r.role === 'super_admin');
  const isAdmin = userRoles.some(r => r.role === 'admin');
  const isHOD = userRoles.some(r => r.role === 'hod');
  const isFaculty = userRoles.some(r => r.role === 'faculty');
  const isStudent = userRoles.some(r => r.role === 'student');

  return { 
    userRole, 
    userRoles,
    loading,
    isSuperAdmin,
    isAdmin,
    isHOD,
    isFaculty,
    isStudent
  };
}
