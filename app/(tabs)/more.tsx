import React from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";

interface MenuItem {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  route: string;
  roles: string[];
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const MENU_SECTIONS: MenuSection[] = [
  {
    title: "Operations",
    items: [
      { key: "people", label: "People", icon: "user-check", route: "/(tabs)/people", roles: ["admin"] },
    ],
  },
  {
    title: "Setup",
    items: [
      { key: "zones", label: "Zones", icon: "layers", route: "/(tabs)/zones", roles: ["admin", "supervisor"] },
      { key: "locations", label: "Locations", icon: "map-pin", route: "/(tabs)/locations", roles: ["admin", "supervisor"] },
    ],
  },
  {
    title: "Administration",
    items: [
      { key: "permissions", label: "Permissions", icon: "shield", route: "/(tabs)/permissions", roles: ["admin"] },
      { key: "eco", label: "ECO", icon: "radio", route: "/(tabs)/eco", roles: ["admin", "eco"] },
      { key: "supervisor", label: "Supervisor", icon: "eye", route: "/(tabs)/supervisor", roles: ["admin", "supervisor"] },
    ],
  },
  {
    title: "Account",
    items: [
      { key: "settings", label: "Settings", icon: "settings", route: "/(tabs)/settings", roles: ["admin", "eco", "supervisor", "user"] },
    ],
  },
];

export default function MoreScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const role = user?.role || "user";

  const visibleSections = MENU_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingBottom: Platform.OS === "web" ? 84 + 24 : 120,
        paddingTop: 16,
      }}
    >
      {visibleSections.map((section) => (
        <View key={section.title} style={styles.sectionWrapper}>
          <Text style={styles.sectionHeader}>{section.title.toUpperCase()}</Text>
          <View style={styles.section}>
            {section.items.map((item, idx) => (
              <Pressable
                key={item.key}
                style={[
                  styles.menuRow,
                  idx === 0 && styles.menuRowFirst,
                  idx === section.items.length - 1 && styles.menuRowLast,
                ]}
                onPress={() => router.push(item.route as any)}
              >
                <View style={styles.menuIconWrap}>
                  <Feather name={item.icon} size={18} color={Colors.light.tint} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Feather name="chevron-right" size={16} color={Colors.light.tabIconDefault} />
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 16,
  },
  sectionWrapper: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.light.tabIconDefault,
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  section: {
    backgroundColor: Colors.light.surface,
    borderRadius: 12,
    overflow: "hidden" as const,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  menuRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
  },
  menuRowFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  menuRowLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.light.background,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500" as const,
    color: Colors.light.text,
  },
});
