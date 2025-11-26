import { databases, DATABASE_ID, account, COLLECTIONS } from './client';
import { ID, Query } from 'appwrite';
import type { Models } from 'appwrite';

// Re-export COLLECTIONS for convenience
export { COLLECTIONS };

/**
 * Helper functions to replace Supabase queries with Appwrite equivalents
 */

// Generic CRUD operations
export const dbHelpers = {
  // SELECT equivalent
  select: async <T = any>(
    collection: string,
    queries?: string[]
  ): Promise<T[]> => {
    try {
      const response = await databases.listDocuments<T>(
        DATABASE_ID,
        collection,
        queries
      );
      return response.documents.map(doc => ({
        ...doc,
        id: doc.$id,
        // Map Appwrite timestamps to ISO strings
        created_at: doc.$createdAt,
        updated_at: doc.$updatedAt,
      }));
    } catch (error) {
      console.error(`Error selecting from ${collection}:`, error);
      throw error;
    }
  },

  // SELECT with filters (equivalent to .eq(), .gt(), etc.)
  selectWithFilters: async <T = any>(
    collection: string,
    filters: {
      eq?: { [key: string]: any };
      ne?: { [key: string]: any };
      gt?: { [key: string]: any };
      gte?: { [key: string]: any };
      lt?: { [key: string]: any };
      lte?: { [key: string]: any };
      in?: { [key: string]: any[] };
      contains?: { [key: string]: any };
    },
    orderBy?: { field: string; direction?: 'asc' | 'desc' }
  ): Promise<T[]> => {
    try {
      const queries: string[] = [];

      // Build queries from filters
      Object.entries(filters.eq || {}).forEach(([key, value]) => {
        queries.push(Query.equal(key, value));
      });
      Object.entries(filters.ne || {}).forEach(([key, value]) => {
        queries.push(Query.notEqual(key, value));
      });
      Object.entries(filters.gt || {}).forEach(([key, value]) => {
        queries.push(Query.greaterThan(key, value));
      });
      Object.entries(filters.gte || {}).forEach(([key, value]) => {
        queries.push(Query.greaterThanEqual(key, value));
      });
      Object.entries(filters.lt || {}).forEach(([key, value]) => {
        queries.push(Query.lessThan(key, value));
      });
      Object.entries(filters.lte || {}).forEach(([key, value]) => {
        queries.push(Query.lessThanEqual(key, value));
      });
      Object.entries(filters.in || {}).forEach(([key, values]) => {
        queries.push(Query.equal(key, values));
      });
      Object.entries(filters.contains || {}).forEach(([key, value]) => {
        queries.push(Query.search(key, value));
      });

      // Add ordering
      if (orderBy) {
        if (orderBy.direction === 'desc') {
          queries.push(Query.orderDesc(orderBy.field));
        } else {
          queries.push(Query.orderAsc(orderBy.field));
        }
      }

      return dbHelpers.select<T>(collection, queries);
    } catch (error) {
      console.error(`Error selecting with filters from ${collection}:`, error);
      throw error;
    }
  },

  // SELECT single (equivalent to .single())
  selectSingle: async <T = any>(
    collection: string,
    documentId: string
  ): Promise<T | null> => {
    try {
      const document = await databases.getDocument<T>(
        DATABASE_ID,
        collection,
        documentId
      );
      return {
        ...document,
        id: document.$id,
        created_at: document.$createdAt,
        updated_at: document.$updatedAt,
      } as T;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      console.error(`Error selecting single from ${collection}:`, error);
      throw error;
    }
  },

  // SELECT maybeSingle (returns null if not found)
  selectMaybeSingle: async <T = any>(
    collection: string,
    queries?: string[]
  ): Promise<T | null> => {
    try {
      const results = await dbHelpers.select<T>(collection, queries);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      return null;
    }
  },

  // INSERT (equivalent to .insert())
  insert: async <T = any>(
    collection: string,
    data: Omit<T, 'id' | 'created_at' | 'updated_at'>
  ): Promise<T> => {
    try {
      const document = await databases.createDocument(
        DATABASE_ID,
        collection,
        ID.unique(),
        data as any
      );
      return {
        ...document,
        id: document.$id,
        created_at: document.$createdAt,
        updated_at: document.$updatedAt,
      } as T;
    } catch (error) {
      console.error(`Error inserting into ${collection}:`, error);
      throw error;
    }
  },

  // UPDATE (equivalent to .update())
  update: async <T = any>(
    collection: string,
    documentId: string,
    data: Partial<T>
  ): Promise<T> => {
    try {
      const document = await databases.updateDocument(
        DATABASE_ID,
        collection,
        documentId,
        data as any
      );
      return {
        ...document,
        id: document.$id,
        created_at: document.$createdAt,
        updated_at: document.$updatedAt,
      } as T;
    } catch (error) {
      console.error(`Error updating ${collection}:`, error);
      throw error;
    }
  },

  // DELETE (equivalent to .delete())
  delete: async (
    collection: string,
    documentId: string
  ): Promise<void> => {
    try {
      await databases.deleteDocument(DATABASE_ID, collection, documentId);
    } catch (error) {
      console.error(`Error deleting from ${collection}:`, error);
      throw error;
    }
  },
};

/**
 * Authentication helpers (Appwrite has built-in auth)
 */
export const authHelpers = {
  // Get current user
  getUser: async () => {
    try {
      return await account.get();
    } catch (error) {
      return null;
    }
  },

  // Sign in with email/password
  signIn: async (email: string, password: string) => {
    try {
      await account.createEmailSession(email, password);
      return await account.get();
    } catch (error) {
      throw error;
    }
  },

  // Sign up
  signUp: async (email: string, password: string, name?: string) => {
    try {
      const userId = ID.unique();
      await account.create(userId, email, password, name);
      // Create session after signup
      await account.createEmailSession(email, password);
      return await account.get();
    } catch (error) {
      throw error;
    }
  },

  // Sign out
  signOut: async () => {
    try {
      await account.deleteSession('current');
    } catch (error) {
      throw error;
    }
  },

  // Get session
  getSession: async () => {
    try {
      return await account.get();
    } catch (error) {
      return null;
    }
  },

  // On auth state change (listen to auth changes)
  onAuthStateChange: (callback: (user: Models.User | null) => void) => {
    // Appwrite doesn't have real-time auth state changes like Supabase
    // You can poll or use event listeners
    // For now, we'll return a cleanup function
    const checkAuth = async () => {
      const user = await authHelpers.getUser();
      callback(user as any);
    };

    checkAuth();
    const interval = setInterval(checkAuth, 1000); // Check every second

    return () => clearInterval(interval);
  },
};

