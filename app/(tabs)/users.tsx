import React, { useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  ActivityIndicator,
  Platform,
  Pressable,
  TextInput,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getQueryFn } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";

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

type StatusFilter = "all" | "confirmed" | "not_confirmed";

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

function roleBadgeColor(role: string): string {
  switch (role) {
    case "admin": return Colors.light.critical;
    case "eco": return Colors.light.tint;
    case "supervisor": return Colors.light.warning;
    default: return Colors.light.tabIconDefault;
  }
}

export default function UsersMonitorScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [search, setSearch] = useState("");
  const [zoneFilter, setZoneFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data, isLoading, error } = useQuery<PeopleResponse>({
    queryKey: ["/api/people"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    refetchInterval: 15000,
  });

  const zoneMap = useMemo(() => {
    const m = new Map<string, string>();
    if (data?.zones) {
      for (const z of data.zones) m.set(z.id, z.name);
    }
    return m;
  }, [data?.zones]);

  const locationMap = useMemo(() => {
    const m = new Map<string, string>();
    if (data?.locations) {
      for (const l of data.locations) m.set(l.id, l.name);
    }
    return m;
  }, [data?.locations]);

  const filteredPeople = useMemo(() => {
    if (!data?.people) return [];
    let list = data.people;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.username.toLowerCase().includes(q)
      );
    }

    if (zoneFilter) {
      list = list.filter((p) => p.zoneId === zoneFilter);
    }

    if (statusFilter !== "all" && data.hasActiveEmergency) {
      list = list.filter((p) => p.receiptStatus === statusFilter);
    }

    return list;
  }, [data, search, zoneFilter, statusFilter]);

  const stats = useMemo(() => {
    if (!data?.people) return { total: 0, confirmed: 0, notConfirmed: 0 };
    const total = data.people.length;
    const confirmed = data.people.filter((p) => p.receiptStatus === "confirmed").length;
    const notConfirmed = data.people.filter((p) => p.receiptStatus === "not_confirmed").length;
    return { total, confirmed, notConfirmed };
  }, [data?.people]);

  const renderPerson = useCallback(
    ({ item }: { item: PersonEntry }) => {
      const zoneName = item.zoneId ? zoneMap.get(item.zoneId) || "Unknown" : "Unassigned";
      const locName = item.locationId ? locationMap.get(item.locationId) || "Unknown" : null;
      const badgeColor = roleBadgeColor(item.role);

      return (
        <View style={styles.personCard}>
          <View style={styles.personTop}>
            <View style={styles.personAvatar}>
              <Text style={styles.personInitial}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.personMeta}>
              <View style={styles.nameRow}>
                <Text style={styles.personName} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={[styles.roleBadge, { backgroundColor: badgeColor + "18" }]}>
                  <Text style={[styles.roleText, { color: badgeColor }]}>
                    {roleLabel(item.role)}
                  </Text>
                </View>
              </View>
              <View style={styles.locationRow}>
                <Feather name="map-pin" size={11} color={Colors.light.textSecondary} />
                <Text style={styles.locationText} numberOfLines={1}>
                  {zoneName}{locName ? ` › ${locName}` : ""}
                </Text>
              </View>
            </View>
          </View>

          {data?.hasActiveEmergency ? (
            <View style={styles.receiptRow}>
              {item.receiptStatus === "confirmed" ? (
                <>
                  <View style={[styles.statusDot, { backgroundColor: Colors.light.success }]} />
                  <Text style={[styles.receiptText, { color: Colors.light.success }]}>
                    Confirmed
                  </Text>
                  {item.confirmedAt ? (
                    <Text style={styles.receiptTime}>{formatTime(item.confirmedAt)}</Text>
                  ) : null}
                </>
              ) : (
                <>
                  <View style={[styles.statusDot, { backgroundColor: Colors.light.danger }]} />
                  <Text style={[styles.receiptText, { color: Colors.light.danger }]}>
                    Not Confirmed
                  </Text>
                </>
              )}
            </View>
          ) : null}
        </View>
      );
    },
    [zoneMap, locationMap, data?.hasActiveEmergency]
  );

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
        <Text style={styles.errorText}>Could not load user data</Text>
      </View>
    );
  }

  const safeZones = data.zones || [];

  return (
    <View style={styles.container}>
      {data.hasActiveEmergency ? (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.total}</Text>
            <Text style={styles.statLbl}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: Colors.light.success }]}>{stats.confirmed}</Text>
            <Text style={styles.statLbl}>Confirmed</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: Colors.light.danger }]}>{stats.notConfirmed}</Text>
            <Text style={styles.statLbl}>Pending</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.searchWrap}>
        <Feather name="search" size={16} color={Colors.light.tabIconDefault} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor={Colors.light.tabIconDefault}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {search.length > 0 ? (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Feather name="x" size={16} color={Colors.light.tabIconDefault} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.filtersRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: null, name: "All Zones" }, ...safeZones]}
          keyExtractor={(item) => item.id || "all"}
          contentContainerStyle={styles.filterChips}
          renderItem={({ item }) => {
            const active = item.id === zoneFilter;
            return (
              <Pressable
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setZoneFilter(item.id)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {item.name}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {data.hasActiveEmergency ? (
        <View style={styles.statusFilters}>
          {(["all", "confirmed", "not_confirmed"] as StatusFilter[]).map((s) => {
            const active = statusFilter === s;
            const label = s === "all" ? "All" : s === "confirmed" ? "Confirmed" : "Pending";
            return (
              <Pressable
                key={s}
                style={[styles.statusChip, active && styles.statusChipActive]}
                onPress={() => setStatusFilter(s)}
              >
                <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <FlatList
        data={filteredPeople}
        keyExtractor={(item) => item.id}
        renderItem={renderPerson}
        contentContainerStyle={{
          paddingBottom: Platform.OS === "web" ? 84 + 16 : 100,
          paddingHorizontal: 16,
          paddingTop: 8,
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Feather name="users" size={28} color={Colors.light.tabIconDefault} />
            <Text style={styles.emptyText}>
              {search || zoneFilter || statusFilter !== "all"
                ? "No users match filters"
                : "No users found"}
            </Text>
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
  statsBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.light.surface,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  statItem: {
    flex: 1,
    alignItems: "center" as const,
    gap: 2,
  },
  statNum: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.light.text,
  },
  statLbl: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: Colors.light.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.light.border,
  },
  searchWrap: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.light.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.light.text,
    padding: 0,
  },
  filtersRow: {
    paddingVertical: 6,
  },
  filterChips: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  chipActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.light.text,
  },
  chipTextActive: {
    color: "#fff",
  },
  statusFilters: {
    flexDirection: "row" as const,
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 6,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  statusChipActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.light.textSecondary,
  },
  statusChipTextActive: {
    color: "#fff",
  },
  personCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
    gap: 8,
  },
  personTop: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 12,
  },
  personAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.light.tint + "18",
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  personInitial: {
    fontSize: 15,
    fontWeight: "700" as const,
    color: Colors.light.tint,
  },
  personMeta: {
    flex: 1,
    gap: 3,
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
    flexShrink: 1,
  },
  roleBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  locationRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    flexShrink: 1,
  },
  receiptRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.light.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  receiptText: {
    fontSize: 13,
    fontWeight: "600" as const,
  },
  receiptTime: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    marginLeft: "auto" as any,
  },
  emptyWrap: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingTop: 60,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.light.textSecondary,
  },
});
