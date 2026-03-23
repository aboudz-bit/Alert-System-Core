import React, { useMemo } from "react";
import {
  StyleSheet,
  View,
  Text,
  SectionList,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getQueryFn } from "@/lib/query-client";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface PersonEntry {
  id: string;
  name: string;
  username: string;
  role: string;
  zoneId: string | null;
  locationId: string | null;
  receiptStatus: "confirmed" | "not_confirmed" | null;
  confirmedAt: string | null;
}

interface ZoneRef {
  id: string;
  name: string;
}

interface LocationRef {
  id: string;
  name: string;
  zoneId: string | null;
}

interface PeopleResponse {
  people: PersonEntry[];
  zones: ZoneRef[];
  locations: LocationRef[];
  hasActiveEmergency: boolean;
}

interface GroupedSection {
  title: string;
  data: PersonEntry[];
}

function formatTime(iso: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function roleLabel(role: string): string {
  switch (role) {
    case "admin": return "Admin";
    case "eco": return "ECO";
    case "supervisor": return "Supervisor";
    case "user": return "User";
    default: return role;
  }
}

export default function PeopleScreen() {
  const insets = useSafeAreaInsets();

  const { data, isLoading, error } = useQuery<PeopleResponse>({
    queryKey: ["/api/people"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const sections = useMemo((): GroupedSection[] => {
    if (!data || !data.people) return [];

    const people = data.people || [];
    const zones = data.zones || [];
    const locations = data.locations || [];

    const zoneMap = new Map<string, string>();
    for (const z of zones) {
      zoneMap.set(z.id, z.name);
    }

    const locationMap = new Map<string, LocationRef>();
    for (const l of locations) {
      locationMap.set(l.id, l);
    }

    const locationsByZone = new Map<string, LocationRef[]>();
    for (const l of locations) {
      const zId = l.zoneId || "_unassigned";
      const arr = locationsByZone.get(zId) || [];
      arr.push(l);
      locationsByZone.set(zId, arr);
    }

    const grouped = new Map<string, PersonEntry[]>();

    for (const person of people) {
      let sectionKey: string;

      if (person.zoneId && person.locationId) {
        const zoneName = zoneMap.get(person.zoneId) || "Unknown Zone";
        const loc = locationMap.get(person.locationId);
        const locName = loc ? loc.name : "Unknown Location";
        sectionKey = `${zoneName} › ${locName}`;
      } else if (person.zoneId) {
        const zoneName = zoneMap.get(person.zoneId) || "Unknown Zone";
        sectionKey = `${zoneName} › Unassigned Location`;
      } else {
        sectionKey = "Unassigned";
      }

      const arr = grouped.get(sectionKey) || [];
      arr.push(person);
      grouped.set(sectionKey, arr);
    }

    const result: GroupedSection[] = [];
    for (const [title, data] of grouped) {
      result.push({ title, data });
    }

    result.sort((a, b) => {
      if (a.title === "Unassigned") return 1;
      if (b.title === "Unassigned") return -1;
      return a.title.localeCompare(b.title);
    });

    return result;
  }, [data]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.light.tint} />
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.center}>
        <Feather name="alert-circle" size={32} color={Colors.light.textSecondary} />
        <Text style={styles.errorText}>Could not load people data</Text>
      </View>
    );
  }

  const totalPeople = data.people ? data.people.length : 0;
  const hasEmergency = data.hasActiveEmergency;

  if (totalPeople === 0) {
    return (
      <View style={styles.center}>
        <Feather name="users" size={32} color={Colors.light.textSecondary} />
        <Text style={styles.errorText}>No personnel found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {hasEmergency ? (
        <View style={styles.emergencyInfoBar}>
          <Feather name="alert-triangle" size={14} color={Colors.light.warning} />
          <Text style={styles.emergencyInfoText}>
            Emergency active — showing receipt status
          </Text>
        </View>
      ) : null}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingBottom: Platform.OS === "web" ? 84 + 16 : 100,
          paddingTop: 8,
        }}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Feather name="map-pin" size={14} color={Colors.light.tint} />
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{section.data.length}</Text>
            </View>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.personRow}>
            <View style={styles.personInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.personName}>{item.name}</Text>
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>{roleLabel(item.role)}</Text>
                </View>
              </View>
              {hasEmergency ? (
                <View style={styles.receiptRow}>
                  {item.receiptStatus === "confirmed" ? (
                    <>
                      <Feather name="check-circle" size={13} color={Colors.light.success} />
                      <Text style={[styles.receiptText, { color: Colors.light.success }]}>
                        Confirmed{item.confirmedAt ? ` at ${formatTime(item.confirmedAt)}` : ""}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Feather name="x-circle" size={13} color={Colors.light.danger} />
                      <Text style={[styles.receiptText, { color: Colors.light.danger }]}>
                        Not Confirmed
                      </Text>
                    </>
                  )}
                </View>
              ) : null}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.errorText}>No personnel data available</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  center: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 12,
    padding: 24,
  },
  errorText: {
    fontSize: 15,
    color: Colors.light.textSecondary,
  },
  emergencyInfoBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    backgroundColor: Colors.light.surface,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  emergencyInfoText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.light.warning,
  },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginTop: 8,
    backgroundColor: Colors.light.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700" as const,
    color: Colors.light.text,
  },
  countBadge: {
    backgroundColor: Colors.light.tint,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center" as const,
  },
  countText: {
    fontSize: 11,
    fontWeight: "700" as const,
    color: "#fff",
  },
  personRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.light.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.light.border,
  },
  personInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  personName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.light.text,
  },
  roleBadge: {
    backgroundColor: Colors.light.background,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: Colors.light.textSecondary,
  },
  receiptRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    marginTop: 2,
  },
  receiptText: {
    fontSize: 12,
    fontWeight: "500" as const,
  },
});
