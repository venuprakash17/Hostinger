/**
 * Example: Migrated useUserRole hook using Appwrite
 * This shows how the hook will look after migration
 */

import { useState, useEffect } from "react";
import { authHelpers, dbHelpers, COLLECTIONS } from "@/integrations/appwrite/helpers";

export function useUserRole() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      const user = await authHelpers.getUser();
      
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // Appwrite query equivalent to Supabase .from().select().eq().single()
        const roles = await dbHelpers.selectWithFilters<{ role: string }>(
          COLLECTIONS.USER_ROLES,
          { eq: { user_id: user.$id } }
        );

        if (roles && roles.length > 0) {
          setUserRole(roles[0].role);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
      }
      
      setLoading(false);
    };

    fetchUserRole();

    // Appwrite auth state change listener
    const unsubscribe = authHelpers.onAuthStateChange(() => {
      fetchUserRole();
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  return { userRole, loading };
}

