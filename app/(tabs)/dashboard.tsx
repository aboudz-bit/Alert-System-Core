import React from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getQueryFn } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Zone, Alert as AlertType, EmergencyMode } from "@shared/schema";

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: color + "18" }]}>
        <Feather name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const { data: zones } = useQuery<Zone[]>({
    queryKey: ["/api/zones"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: alerts } = useQuery<AlertType[]>({
    queryKey: ["/api/alerts"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const { data: emergency } = useQuery<EmergencyMode | null>({
    queryKey: ["/api/emergency/active"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchInterval: 15000,
  });

  const safeZones = Array.isArray(zones) ? zones : [];
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const activeAlerts = safeAlerts.filter((a) => a.status === "active");
  const hasEmergency = emergency && emergency.status === "active";

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingBottom: Platform.OS === "web" ? 84 + 24 : 120,
        paddingTop: 16,
      }}
    >
      {hasEmergency ? (
        <View
          style={[
            styles.emergencyCard,
            {
              backgroundColor:
                emergency.type === "blackout" ? "#1C1C1E" : Colors.light.warning,
            },
          ]}
        >
          <Feather
            name={emergency.type === "blackout" ? "moon" : "home"}
            size={20}
            color="#fff"
          />
          <View style={styles.emergencyTextWrap}>
            <Text style={styles.emergencyTitle}>
              {emergency.type === "shelter_in" ? "SHELTER IN PLACE" : "BLACKOUT"} ACTIVE
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

      <View style={styles.statsRow}>
        <StatCard
          icon="layers"
          label="Zones"
          value={safeZones.length}
          color={Colors.light.tint}
        />
        <StatCard
          icon="alert-triangle"
          label="Active Alerts"
          value={activeAlerts.length}
          color={activeAlerts.length > 0 ? Colors.light.danger : Colors.light.success}
        />
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Welcome, {user?.name || "User"}</Text>
        <Text style={styles.infoRole}>{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "User"}</Text>
      </View>

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
  statsRow: {
    flexDirection: "row" as const,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: "center" as const,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.light.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: "500" as const,
  },
  infoSection: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.light.text,
  },
  infoRole: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    marginTop: 2,
  },
  alertSection: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.light.text,
    marginBottom: 4,
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
