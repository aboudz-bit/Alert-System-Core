import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getApiUrl, queryClient } from "@/lib/query-client";
import { useAppStore } from "@/lib/store";
import { fetch } from "expo/fetch";
import type { UserRole } from "@shared/schema";

interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => ({ success: false }),
  logout: async () => {},
  checkAuth: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/auth/me", baseUrl);
      const res = await fetch(url.toString(), { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/auth/login", baseUrl);
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        queryClient.invalidateQueries();
        return { success: true };
      }
      const errData = await res.json().catch(() => ({ message: "Login failed" }));
      return { success: false, error: errData.message || "Login failed" };
    } catch {
      return { success: false, error: "Network error" };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/auth/logout", baseUrl);
      await fetch(url.toString(), { method: "POST", credentials: "include" });
    } catch {
    } finally {
      setUser(null);
      queryClient.clear();
      const store = useAppStore.getState();
      store.setZones([]);
      store.setLocations([]);
      store.setAlerts([]);
      store.setEmergencyMode(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        logout,
        checkAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
