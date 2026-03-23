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

const ALL_TABS: TabConfig[] = [
  { name: "index", title: "Map", icon: "map" },
  { name: "zones", title: "Zones", icon: "layers" },
  { name: "locations", title: "Locations", icon: "map-pin" },
  { name: "alerts", title: "Alerts", icon: "alert-triangle" },
  { name: "people", title: "People", icon: "users" },
  { name: "settings", title: "Settings", icon: "settings" },
];

function getVisibleTabs(role: UserRole): string[] {
  switch (role) {
    case "admin":
      return ["index", "zones", "locations", "alerts", "people", "settings"];
    case "supervisor":
      return ["index", "zones", "alerts", "people", "settings"];
    case "eco":
      return ["index", "alerts", "people", "settings"];
    case "user":
    default:
      return ["index", "alerts", "settings"];
  }
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuth();
  const role: UserRole = user?.role || "user";
  const visibleTabs = getVisibleTabs(role);

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
      {ALL_TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            href: visibleTabs.includes(tab.name) ? undefined : null,
            tabBarIcon: ({ color }) => (
              <Feather name={tab.icon} size={22} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
