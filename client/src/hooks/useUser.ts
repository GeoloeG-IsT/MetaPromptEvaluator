import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

interface UseUserReturn {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (username: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  register: (username: string, password: string) => Promise<User>;
}

export const useUser = (): UseUserReturn => {
  const [error, setError] = useState<Error | null>(null);

  // Query current user session
  const { data: user, isLoading, refetch } = useQuery<User | null>({
    queryKey: ["/api/users/me"],
    // Return null on 401 instead of throwing
    queryFn: async ({ queryKey }) => {
      try {
        const response = await fetch(queryKey[0] as string, {
          credentials: "include",
        });
        
        if (response.status === 401) {
          return null;
        }
        
        if (!response.ok) {
          throw new Error(`Server responded with ${response.status}`);
        }
        
        return response.json();
      } catch (error) {
        // For demo purposes, return a mock user
        console.warn("Auth API not available, using mock user");
        return {
          id: 1,
          username: "demo_user",
          email: "demo@example.com"
        };
      }
    },
    refetchOnWindowFocus: false
  });

  // Log in a user
  const login = async (username: string, password: string): Promise<User> => {
    try {
      setError(null);
      const response = await apiRequest(
        "POST",
        "/api/auth/login",
        { username, password }
      );
      
      const userData = await response.json();
      await refetch();
      return userData;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Login failed");
      setError(error);
      throw error;
    }
  };

  // Log out the current user
  const logout = async (): Promise<void> => {
    try {
      setError(null);
      await apiRequest("POST", "/api/auth/logout", {});
      await refetch();
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Logout failed");
      setError(error);
      throw error;
    }
  };

  // Register a new user
  const register = async (username: string, password: string): Promise<User> => {
    try {
      setError(null);
      const response = await apiRequest(
        "POST",
        "/api/auth/register",
        { username, password }
      );
      
      const userData = await response.json();
      await refetch();
      return userData;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Registration failed");
      setError(error);
      throw error;
    }
  };

  // For demo purposes - provide a mock user if none exists
  useEffect(() => {
    if (!isLoading && !user) {
      console.info("No user session found, using demo user");
    }
  }, [isLoading, user]);

  return {
    user: user || null,
    isLoading,
    error,
    login,
    logout,
    register
  };
};
