import React from "react";
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";

function getRoleLabel(role: string): string {
  switch (role) {
    case "admin":
      return "Administrator";
    case "eco":
      return "ECO Officer";
    case "supervisor":
      return "Supervisor";
    case "user":
      return "Staff";
    default:
      return "User";
  }
}

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, {
      paddingBottom: Platform.OS === "web" ? 34 + 84 : insets.bottom + 90,
    }]}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Feather name="user" size={32} color={Colors.light.tint} />
        </View>
        <Text style={styles.name}>{user?.name || "Unknown"}</Text>
        <Text style={styles.username}>@{user?.username || "—"}</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleText}>
            {getRoleLabel(user?.role || "user")}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.infoRow}>
          <Feather name="shield" size={18} color={Colors.light.textSecondary} />
          <Text style={styles.infoLabel}>Role</Text>
          <Text style={styles.infoValue}>
            {getRoleLabel(user?.role || "user")}
          </Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.8 }]}
        onPress={logout}
        testID="logout-button"
      >
        <Feather name="log-out" size={18} color={Colors.light.danger} />
        <Text style={styles.logoutText}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    padding: 16,
    gap: 20,
  },
  profileCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center" as const,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${Colors.light.tint}15`,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 8,
  },
  name: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.light.text,
  },
  username: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
  roleBadge: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: `${Colors.light.tint}15`,
  },
  roleText: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.light.tint,
  },
  section: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.light.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
  },
  infoLabel: {
    fontSize: 15,
    color: Colors.light.text,
    flex: 1,
  },
  infoValue: {
    fontSize: 15,
    color: Colors.light.textSecondary,
  },
  logoutBtn: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    padding: 16,
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.light.danger,
  },
});
