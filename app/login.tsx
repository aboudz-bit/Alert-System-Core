import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";

const DEMO_ACCOUNTS: { label: string; icon: keyof typeof Feather.glyphMap; username: string; password: string; color: string }[] = [
  { label: "Super Admin", icon: "shield", username: "admin", password: "admin123", color: "#FF3B30" },
  { label: "ECO", icon: "radio", username: "eco1", password: "eco123", color: "#FF9500" },
  { label: "Supervisor", icon: "eye", username: "supervisor1", password: "super123", color: "#5856D6" },
  { label: "User", icon: "user", username: "user1", password: "user123", color: "#34C759" },
];

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const insets = useSafeAreaInsets();

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError("Please enter username and password");
      return;
    }
    setError("");
    setLoading(true);
    const result = await login(username.trim(), password);
    setLoading(false);
    if (!result.success) {
      setError(result.error || "Login failed");
    }
  };

  const fillDemo = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setError("");
  };

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={[styles.container, { paddingTop: topPadding + 40, paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <Feather name="shield" size={40} color={Colors.light.tint} />
        </View>
        <Text style={styles.title}>Emergency Alert</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>
      </View>

      <View style={styles.form}>
        {error ? (
          <View style={styles.errorBox}>
            <Feather name="alert-circle" size={16} color={Colors.light.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Enter username"
            placeholderTextColor="#999"
            testID="username-input"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Enter password"
            placeholderTextColor="#999"
            testID="password-input"
          />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            loading && styles.buttonDisabled,
          ]}
          onPress={handleLogin}
          disabled={loading}
          testID="login-button"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.demoSection}>
        <Text style={styles.demoTitle}>Quick Demo Access</Text>
        <View style={styles.demoGrid}>
          {DEMO_ACCOUNTS.map((acct) => (
            <Pressable
              key={acct.username}
              style={({ pressed }) => [
                styles.demoButton,
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => fillDemo(acct.username, acct.password)}
            >
              <View style={[styles.demoIcon, { backgroundColor: acct.color + "18" }]}>
                <Feather name={acct.icon} size={16} color={acct.color} />
              </View>
              <Text style={styles.demoLabel}>{acct.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: "center" as const,
    marginBottom: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.light.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.light.textSecondary,
  },
  form: {
    gap: 16,
  },
  errorBox: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: "#FFF0F0",
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  errorText: {
    color: Colors.light.danger,
    fontSize: 14,
    flex: 1,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.light.text,
  },
  input: {
    backgroundColor: Colors.light.surface,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
    color: Colors.light.text,
  },
  button: {
    backgroundColor: Colors.light.tint,
    borderRadius: 10,
    padding: 16,
    alignItems: "center" as const,
    marginTop: 8,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600" as const,
  },
  demoSection: {
    marginTop: 32,
    gap: 12,
  },
  demoTitle: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: Colors.light.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
    textAlign: "center" as const,
  },
  demoGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 10,
    justifyContent: "center" as const,
  },
  demoButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: Colors.light.surface,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  demoIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  demoLabel: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: Colors.light.text,
  },
});
