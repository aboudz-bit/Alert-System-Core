import React, { useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Platform,
  Pressable,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getQueryFn } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";
import { useEmergency } from "@/lib/emergency-context";
import type { Zone, Alert as AlertType } from "@shared/schema";

function StatCard({
  icon,
  label,
  value,
  color,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string | number;
  color: string;
  onPress?: () => void;
}) {
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper style={styles.statCard} onPress={onPress}>
      <View style={[styles.statIconWrap, { backgroundColor: color + "18" }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Wrapper>
  );
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { emergencyMode, isActive: hasEmergency, receiptSummary } = useEmergency();
  const isPrivileged =
    user?.role === "admin" || user?.role === "eco" || user?.role === "supervisor";

  const { data: zones } = useQuery<Zone[]>({
    queryKey: ["/api/zones"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: alerts } = useQuery<AlertType[]>({
    queryKey: ["/api/alerts"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const safeZones = Array.isArray(zones) ? zones : [];
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const activeAlerts = useMemo(
    () => safeAlerts.filter((a) => a.status === "active"),
    [safeAlerts]
  );

  const receiptStats = useMemo(() => {
    if (!receiptSummary) return { total: 0, confirmed: 0, notConfirmed: 0, pending: 0 };
    const confirmed = (receiptSummary.confirmed || []).length;
    const notConfirmed = (receiptSummary.notConfirmed || []).length;
    const total = receiptSummary.total || 0;
    const pending = total - confirmed;
    return { total, confirmed, notConfirmed, pending };
  }, [receiptSummary]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingBottom: Platform.OS === "web" ? 84 + 24 : 120,
        paddingTop: 16,
      }}
    >
      {hasEmergency && emergencyMode ? (
        <View
          style={[
            styles.emergencyCard,
            {
              backgroundColor:
                emergencyMode.type === "blackout" ? "#1C1C1E" : Colors.light.warning,
            },
          ]}
        >
          <Feather
            name={emergencyMode.type === "blackout" ? "moon" : "home"}
            size={20}
            color="#fff"
          />
          <View style={styles.emergencyTextWrap}>
            <Text style={styles.emergencyTitle}>
              {emergencyMode.type === "shelter_in" ? "SHELTER IN PLACE" : "BLACKOUT"} ACTIVE
            </Text>
            <Text style={styles.emergencySubtext}>
              All personnel should follow emergency procedures
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.statusCard}>
          <Feather name="check-circle" size={20} color={Colors.light.success} />
          <View style={styles.emergencyTextWrap}>
            <Text style={styles.statusTitle}>All Clear</Text>
            <Text style={styles.statusSubtext}>No active emergencies</Text>
          </View>
        </View>
      )}

      {isPrivileged && hasEmergency ? (
        <View style={styles.receiptSection}>
          <Text style={styles.sectionTitle}>Receipt Status</Text>
          <View style={styles.receiptBar}>
            <View style={styles.receiptItem}>
              <Text style={[styles.receiptNum, { color: Colors.light.success }]}>
                {receiptStats.confirmed}
              </Text>
              <Text style={styles.receiptLbl}>Confirmed</Text>
            </View>
            <View style={styles.receiptDivider} />
            <View style={styles.receiptItem}>
              <Text style={[styles.receiptNum, { color: Colors.light.danger }]}>
                {receiptStats.notConfirmed}
              </Text>
              <Text style={styles.receiptLbl}>Not Confirmed</Text>
            </View>
            <View style={styles.receiptDivider} />
            <View style={styles.receiptItem}>
              <Text style={[styles.receiptNum, { color: Colors.light.warning }]}>
                {receiptStats.pending}
              </Text>
              <Text style={styles.receiptLbl}>Pending</Text>
            </View>
          </View>
          {receiptStats.total > 0 ? (
            <View style={styles.progressWrap}>
              <View style={styles.progressBg}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.round((receiptStats.confirmed / receiptStats.total) * 100)}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round((receiptStats.confirmed / receiptStats.total) * 100)}% confirmed
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <StatCard
          icon="users"
          label="Total Users"
          value={isPrivileged ? receiptStats.total || "—" : "—"}
          color={Colors.light.tint}
          onPress={isPrivileged ? () => router.push("/(tabs)/users" as any) : undefined}
        />
        <StatCard
          icon="layers"
          label="Zones"
          value={safeZones.length}
          color="#8E8E93"
        />
      </View>

      <View style={styles.statsRow}>
        <StatCard
          icon="alert-triangle"
          label="Active Alerts"
          value={activeAlerts.length}
          color={activeAlerts.length > 0 ? Colors.light.danger : Colors.light.success}
          onPress={() => router.push("/(tabs)/alerts" as any)}
        />
        <StatCard
          icon="shield"
          label="Emergency"
          value={hasEmergency ? "ACTIVE" : "None"}
          color={hasEmergency ? Colors.light.danger : Colors.light.success}
        />
      </View>

      {isPrivileged ? (
        <View style={styles.quickSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            <Pressable
              style={styles.quickBtn}
              onPress={() => router.push("/(tabs)/alerts" as any)}
            >
              <Feather name="bell" size={18} color={Colors.light.tint} />
              <Text style={styles.quickLabel}>Alerts</Text>
            </Pressable>
            <Pressable
              style={styles.quickBtn}
              onPress={() => router.push("/(tabs)/users" as any)}
            >
              <Feather name="users" size={18} color={Colors.light.tint} />
              <Text style={styles.quickLabel}>Users</Text>
            </Pressable>
            <Pressable
              style={styles.quickBtn}
              onPress={() => router.push("/(tabs)/index" as any)}
            >
              <Feather name="map" size={18} color={Colors.light.tint} />
              <Text style={styles.quickLabel}>Zone Map</Text>
            </Pressable>
            <Pressable
              style={styles.quickBtn}
              onPress={() => router.push("/(tabs)/zones" as any)}
            >
              <Feather name="layers" size={18} color={Colors.light.tint} />
              <Text style={styles.quickLabel}>Zones</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {activeAlerts.length > 0 ? (
        <View style={styles.alertSection}>
          <Text style={styles.sectionTitle}>Active Alerts</Text>
          {activeAlerts.map((a) => (
            <View key={a.id} style={styles.alertRow}>
              <View
                style={[
                  styles.severityDot,
                  {
                    backgroundColor:
                      a.severity === "critical"
                        ? Colors.light.critical
                        : a.severity === "high"
                        ? Colors.light.danger
                        : a.severity === "medium"
                        ? Colors.light.warning
                        : Colors.light.success,
                  },
                ]}
              />
              <View style={styles.alertInfo}>
                <Text style={styles.alertTitle}>{a.title}</Text>
                <Text style={styles.alertSeverity}>{a.severity}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 16,
  },
  emergencyCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    padding: 18,
    borderRadius: 14,
    marginBottom: 16,
  },
  emergencyTextWrap: {
    flex: 1,
    gap: 2,
  },
  emergencyTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800" as const,
    letterSpacing: 0.5,
  },
  emergencySubtext: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
  },
  statusCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 14,
    padding: 18,
    borderRadius: 14,
    backgroundColor: Colors.light.surface,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: "700" as const,
    color: Colors.light.success,
  },
  statusSubtext: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  receiptSection: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: 12,
  },
  receiptBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  receiptItem: {
    flex: 1,
    alignItems: "center" as const,
    gap: 2,
  },
  receiptNum: {
    fontSize: 20,
    fontWeight: "700" as const,
  },
  receiptLbl: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: "500" as const,
  },
  receiptDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.light.border,
  },
  progressWrap: {
    gap: 4,
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.border,
    overflow: "hidden" as const,
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.light.success,
  },
  progressText: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: "500" as const,
  },
  statsRow: {
    flexDirection: "row" as const,
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: "center" as const,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.light.textSecondary,
    fontWeight: "500" as const,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.light.text,
  },
  quickSection: {
    marginBottom: 16,
    gap: 10,
  },
  quickGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 10,
  },
  quickBtn: {
    width: "47%" as any,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    backgroundColor: Colors.light.surface,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  quickLabel: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.light.text,
  },
  alertSection: {
    gap: 8,
    marginBottom: 16,
  },
  alertRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    backgroundColor: Colors.light.surface,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  severityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  alertInfo: {
    flex: 1,
    gap: 2,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.light.text,
  },
  alertSeverity: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    textTransform: "capitalize" as const,
  },
});
