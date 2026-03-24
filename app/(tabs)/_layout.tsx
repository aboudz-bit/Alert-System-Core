import { Tabs } from "expo-router";
import { Platform, StyleSheet, useColorScheme } from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import React from "react";
import Colors from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";
import { useEmergencyAlarm } from "@/hooks/useEmergencyAlarm";
import type { UserRole } from "@shared/schema";

type TabConfig = {
  name: string;
  title: string;
  icon: keyof typeof Feather.glyphMap;
};

const MAIN_TABS: TabConfig[] = [
  { name: "dashboard", title: "Dashboard", icon: "home" },
  { name: "alerts", title: "Alert", icon: "alert-triangle" },
  { name: "users", title: "Users", icon: "users" },
  { name: "index", title: "Zone Map", icon: "map" },
  { name: "more", title: "More", icon: "more-horizontal" },
];

const HIDDEN_TABS: TabConfig[] = [
  { name: "zones", title: "Zones", icon: "layers" },
  { name: "locations", title: "Locations", icon: "map-pin" },
  { name: "permissions", title: "Permissions", icon: "shield" },
  { name: "eco", title: "ECO", icon: "radio" },
  { name: "supervisor", title: "Supervisor", icon: "eye" },
  { name: "settings", title: "Settings", icon: "settings" },
];

const ALL_TABS = [...MAIN_TABS, ...HIDDEN_TABS];

function getVisibleMainTabs(role: UserRole): string[] {
  switch (role) {
    case "admin":
      return ["dashboard", "alerts", "users", "index", "more"];
    case "supervisor":
      return ["dashboard", "alerts", "users", "index", "more"];
    case "eco":
      return ["dashboard", "alerts", "users", "index", "more"];
    case "user":
    default:
      return ["dashboard", "alerts", "index", "more"];
  }
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuth();
  const role: UserRole = user?.role || "user";
  const visibleMainTabs = getVisibleMainTabs(role);

  useEmergencyAlarm();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.light.tint,
        tabBarInactiveTintColor: Colors.light.tabIconDefault,
        headerShown: true,
        tabBarStyle: {
          position: "absolute" as const,
          backgroundColor: Platform.select({
            ios: "transparent",
            android: isDark ? "#000" : "#fff",
            default: "#fff",
          }),
          borderTopWidth: 0,
          elevation: 0,
          height: Platform.OS === "web" ? 84 : undefined,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
      }}
    >
      {ALL_TABS.map((tab) => {
        const isMainTab = MAIN_TABS.some((t) => t.name === tab.name);
        const isVisible = isMainTab && visibleMainTabs.includes(tab.name);

        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.title,
              href: isVisible ? undefined : null,
              tabBarIcon: ({ color }) => (
                <Feather name={tab.icon} size={22} color={color} />
              ),
            }}
          />
        );
      })}
    </Tabs>
  );
}
