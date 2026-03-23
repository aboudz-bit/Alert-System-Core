import React from "react";
import { StyleSheet, View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";

export default function ECOScreen() {
  return (
    <View style={styles.container}>
      <Feather name="radio" size={40} color={Colors.light.tabIconDefault} />
      <Text style={styles.title}>ECO Panel</Text>
      <Text style={styles.text}>
        ECO management tools will be available in a future update
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.light.background,
    gap: 12,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.light.text,
  },
  text: {
    fontSize: 14,
    color: Colors.light.textSecondary,
    textAlign: "center" as const,
  },
});
