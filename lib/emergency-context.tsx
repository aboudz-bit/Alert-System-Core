import React, { createContext, useContext, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/query-client";
import { useAppStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import type { EmergencyMode } from "@shared/schema";

interface ReceiptUser {
  id: string;
  name: string;
  username: string;
  role: string;
  confirmedAt?: string | null;
  responseStatus?: string | null;
  respondedAt?: string | null;
}

interface ReceiptSummary {
  confirmed: ReceiptUser[];
  notConfirmed: ReceiptUser[];
  total: number;
}

interface EmergencyContextValue {
  emergencyMode: EmergencyMode | null;
  isActive: boolean;
  isLoading: boolean;
  activatedAt: string | null;
  receiptSummary: ReceiptSummary | null;
  receiptSummaryLoading: boolean;
}

const EmergencyContext = createContext<EmergencyContextValue>({
  emergencyMode: null,
  isActive: false,
  isLoading: true,
  activatedAt: null,
  receiptSummary: null,
  receiptSummaryLoading: false,
});

export function EmergencyProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const setEmergencyMode = useAppStore((s) => s.setEmergencyMode);

  const isPrivileged =
    user?.role === "admin" || user?.role === "eco" || user?.role === "supervisor";

  const {
    data: modeData,
    isLoading,
    isError,
  } = useQuery<EmergencyMode | null>({
    queryKey: ["/api/emergency/active"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchInterval: 15000,
    enabled: isAuthenticated,
  });

  const emergencyMode =
    modeData && modeData.status === "active" ? modeData : null;
  const emergencyModeId = emergencyMode?.id ?? null;

  useEffect(() => {
    if (!isAuthenticated) {
      setEmergencyMode(null);
    } else if (isError) {
      setEmergencyMode(null);
    } else if (modeData !== undefined) {
      setEmergencyMode(modeData ?? null);
    }
  }, [modeData, isError, isAuthenticated]);

  const { data: receiptSummary, isLoading: receiptSummaryLoading } =
    useQuery<ReceiptSummary>({
      queryKey: ["/api/emergency", emergencyModeId, "receipts", "summary"],
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: 10000,
      enabled: !!emergencyModeId && isPrivileged,
    });

  const activatedAt = emergencyMode?.activatedAt
    ? new Date(emergencyMode.activatedAt).toISOString()
    : null;

  const value: EmergencyContextValue = {
    emergencyMode,
    isActive: !!emergencyMode,
    isLoading,
    activatedAt,
    receiptSummary: receiptSummary ?? null,
    receiptSummaryLoading,
  };

  return (
    <EmergencyContext.Provider value={value}>
      {children}
    </EmergencyContext.Provider>
  );
}

export function useEmergency() {
  return useContext(EmergencyContext);
}
