"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "@/utils/api";

export type Role = "USER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  role: Role;
  createdAt?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, newUser: User) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAuth = async () => {
    try {
      const token = api.getToken();
      if (token) {
        const res = await api.get<{ success: boolean; data: { user: User } }>("/api/v1/auth/me");
        if (res.success && res.data?.user) {
          setUser(res.data.user);
          setIsLoading(false);
          return;
        }
      }

      // Try silent refresh if no in-memory/localStorage token
      const refreshRes = await api.post<{ success: boolean; data: { user: User; accessToken: string } }>(
        "/api/v1/auth/refresh-token"
      );

      if (refreshRes.success && refreshRes.data) {
        api.setToken(refreshRes.data.accessToken);
        setUser(refreshRes.data.user);
      } else {
        setUser(null);
        api.setToken(null);
      }
    } catch (err) {
      setUser(null);
      api.setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = (token: string, newUser: User) => {
    api.setToken(token);
    setUser(newUser);
  };

  const logout = async () => {
    try {
      await api.post("/api/v1/auth/logout");
    } catch (err) {
      // Ignore network logout errors
    } finally {
      api.setToken(null);
      setUser(null);
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
