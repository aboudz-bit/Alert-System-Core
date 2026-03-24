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
  ScrollView,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getQueryFn } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";
import { useEmergency } from "@/lib/emergency-context";

interface PersonEntry {
  id: string;
  name: string;
  username: string;
  role: string;
  badgeNumber: string | null;
  affiliation: "aramco" | "contractor" | null;
  zoneId: string | null;
  locationId: string | null;
  receiptStatus: "confirmed" | "not_confirmed" | null;
  confirmedAt: string | null;
  responseStatus: "safe" | "need_help" | null;
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
}

type PersonnelStatus = "safe" | "pending" | "need_help" | "no_reply";
type StatusFilter = "all" | "safe" | "pending" | "need_help" | "no_reply";

const STATUS_COLORS: Record<PersonnelStatus, string> = {
  safe: Colors.light.success,
  pending: Colors.light.warning,
  need_help: Colors.light.danger,
  no_reply: Colors.light.tabIconDefault,
};

const STATUS_LABELS: Record<PersonnelStatus, string> = {
  safe: "Safe",
  pending: "Pending",
  need_help: "Need Help",
  no_reply: "No Reply",
};

const STATUS_ICONS: Record<PersonnelStatus, keyof typeof Feather.glyphMap> = {
  safe: "check-circle",
  pending: "clock",
  need_help: "alert-triangle",
  no_reply: "minus-circle",
};

const FILTER_OPTIONS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "safe", label: "Safe" },
  { key: "pending", label: "Pending" },
  { key: "need_help", label: "Need Help" },
  { key: "no_reply", label: "No Reply" },
];

const STATUS_SORT_PRIORITY: Record<PersonnelStatus, number> = {
  need_help: 0,
  pending: 1,
  no_reply: 2,
  safe: 3,
};

const PENDING_WINDOW_MS = 10 * 60 * 1000;

function computeStatus(person: PersonEntry, emergencyActivatedAt: string | null): PersonnelStatus {
  if (person.responseStatus === "need_help") return "need_help";
  if (person.responseStatus === "safe") return "safe";
  if (emergencyActivatedAt) {
    const elapsed = Date.now() - new Date(emergencyActivatedAt).getTime();
    if (elapsed < PENDING_WINDOW_MS) return "pending";
  }
  return "no_reply";
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
  const { isActive: hasEmergency, activatedAt: emergencyActivatedAt } = useEmergency();
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

  const peopleWithStatus = useMemo(() => {
    if (!data?.people) return [];
    return data.people.map((p) => ({
      ...p,
      status: hasEmergency
        ? computeStatus(p, emergencyActivatedAt)
        : null,
    }));
  }, [data?.people, hasEmergency, emergencyActivatedAt]);

  const filteredPeople = useMemo(() => {
    let list = peopleWithStatus;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.username.toLowerCase().includes(q) ||
          (p.badgeNumber && p.badgeNumber.includes(q))
      );
    }

    if (zoneFilter) {
      list = list.filter((p) => p.zoneId === zoneFilter);
    }

    if (statusFilter !== "all" && hasEmergency) {
      list = list.filter((p) => p.status === statusFilter);
    }

    if (hasEmergency) {
      list = [...list].sort((a, b) => {
        const aPri = a.status ? STATUS_SORT_PRIORITY[a.status] : 4;
        const bPri = b.status ? STATUS_SORT_PRIORITY[b.status] : 4;
        if (aPri !== bPri) return aPri - bPri;
        return a.name.localeCompare(b.name);
      });
    }

    return list;
  }, [peopleWithStatus, search, zoneFilter, statusFilter, hasEmergency]);

  const stats = useMemo(() => {
    const all = peopleWithStatus;
    const total = all.length;
    if (!hasEmergency) return { total, safe: 0, pending: 0, needHelp: 0, noReply: 0 };
    const safe = all.filter((p) => p.status === "safe").length;
    const pending = all.filter((p) => p.status === "pending").length;
    const needHelp = all.filter((p) => p.status === "need_help").length;
    const noReply = all.filter((p) => p.status === "no_reply").length;
    return { total, safe, pending, needHelp, noReply };
  }, [peopleWithStatus, hasEmergency]);

  const renderPerson = useCallback(
    ({ item }: { item: (typeof peopleWithStatus)[0] }) => {
      const zoneName = item.zoneId ? zoneMap.get(item.zoneId) || "Unknown" : "Unassigned";
      const locName = item.locationId ? locationMap.get(item.locationId) || "" : "";
      const locationStr = locName ? `${zoneName} / ${locName}` : zoneName;
      const statusColor = item.status ? STATUS_COLORS[item.status] : undefined;
      const statusLabel = item.status ? STATUS_LABELS[item.status] : undefined;
      const statusIcon = item.status ? STATUS_ICONS[item.status] : undefined;
      const badgeColor = roleBadgeColor(item.role);
      const showStatus = hasEmergency;
      const affLabel = item.affiliation === "aramco" ? "Aramco" : item.affiliation === "contractor" ? "Contractor" : null;

      return (
        <View style={[
          styles.personCard,
          showStatus && item.status ? { borderLeftWidth: 4, borderLeftColor: statusColor } : null,
        ]}>
          <View style={styles.cardHeader}>
            <View style={styles.nameSection}>
              <Text style={styles.personName} numberOfLines={1}>{item.name}</Text>
              <View style={styles.metaRow}>
                {item.badgeNumber ? (
                  <Text style={styles.badgeNumber}>Badge {item.badgeNumber}</Text>
                ) : null}
                {affLabel ? (
                  <View style={[styles.affBadge, { backgroundColor: item.affiliation === "aramco" ? "#0066B1" + "18" : Colors.light.tabIconDefault + "18" }]}>
                    <Text style={[styles.affText, { color: item.affiliation === "aramco" ? "#0066B1" : Colors.light.tabIconDefault }]}>{affLabel}</Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={[styles.roleBadge, { backgroundColor: badgeColor + "18" }]}>
              <Text style={[styles.roleText, { color: badgeColor }]}>{roleLabel(item.role)}</Text>
            </View>
          </View>

          <View style={styles.locationRow}>
            <Feather name="map-pin" size={12} color={Colors.light.textSecondary} />
            <Text style={styles.locationText} numberOfLines={1}>{locationStr}</Text>
          </View>

          {showStatus && statusLabel && statusColor && statusIcon ? (
            <View style={[styles.statusRow, { backgroundColor: statusColor + "0D" }]}>
              <Feather name={statusIcon} size={14} color={statusColor} />
              <Text style={[styles.statusLabel, { color: statusColor }]}>{statusLabel}</Text>
              {item.status === "safe" && item.confirmedAt ? (
                <Text style={styles.confirmedTime}>Confirmed {formatTime(item.confirmedAt)}</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      );
    },
    [zoneMap, locationMap, hasEmergency]
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
        <Text style={styles.errorText}>Could not load personnel data</Text>
      </View>
    );
  }

  const safeZones = data.zones || [];

  return (
    <View style={styles.container}>
      {hasEmergency ? (
        <View style={styles.emergencyBanner}>
          <Feather name="alert-triangle" size={14} color="#fff" />
          <Text style={styles.emergencyText}>EMERGENCY ACTIVE — Personnel Status Monitor</Text>
        </View>
      ) : null}

      {hasEmergency ? (
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.total}</Text>
            <Text style={styles.statLbl}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: STATUS_COLORS.safe }]}>{stats.safe}</Text>
            <Text style={styles.statLbl}>Safe</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: STATUS_COLORS.pending }]}>{stats.pending}</Text>
            <Text style={styles.statLbl}>Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: STATUS_COLORS.need_help }]}>{stats.needHelp}</Text>
            <Text style={styles.statLbl}>Need Help</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: STATUS_COLORS.no_reply }]}>{stats.noReply}</Text>
            <Text style={styles.statLbl}>No Reply</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.searchWrap}>
        <Feather name="search" size={16} color={Colors.light.tabIconDefault} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name or badge..."
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChips}
        >
          <Pressable
            style={[styles.chip, zoneFilter === null && styles.chipActive]}
            onPress={() => setZoneFilter(null)}
          >
            <Text style={[styles.chipText, zoneFilter === null && styles.chipTextActive]}>
              All Zones
            </Text>
          </Pressable>
          {safeZones.map((z) => (
            <Pressable
              key={z.id}
              style={[styles.chip, zoneFilter === z.id && styles.chipActive]}
              onPress={() => setZoneFilter(z.id)}
            >
              <Text style={[styles.chipText, zoneFilter === z.id && styles.chipTextActive]}>
                {z.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {hasEmergency ? (
        <View style={styles.statusFilters}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusChipsRow}
          >
            {FILTER_OPTIONS.map((opt) => {
              const active = statusFilter === opt.key;
              const dotColor = opt.key !== "all" ? STATUS_COLORS[opt.key] : undefined;
              return (
                <Pressable
                  key={opt.key}
                  style={[styles.statusChip, active && styles.statusChipActive]}
                  onPress={() => setStatusFilter(opt.key)}
                >
                  {dotColor ? (
                    <View style={[styles.statusDot, { backgroundColor: dotColor }]} />
                  ) : null}
                  <Text style={[styles.statusChipText, active && styles.statusChipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.resultCount}>
        <Text style={styles.resultText}>
          {filteredPeople.length} {filteredPeople.length === 1 ? "person" : "personnel"}
        </Text>
      </View>

      <FlatList
        data={filteredPeople}
        keyExtractor={(item) => item.id}
        renderItem={renderPerson}
        contentContainerStyle={{
          paddingBottom: Platform.OS === "web" ? 84 + 16 : 100,
          paddingHorizontal: 16,
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Feather name="users" size={28} color={Colors.light.tabIconDefault} />
            <Text style={styles.emptyText}>
              {search || zoneFilter || statusFilter !== "all"
                ? "No personnel match filters"
                : "No personnel found"}
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
  emergencyBanner: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
    backgroundColor: Colors.light.danger,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  emergencyText: {
    fontSize: 12,
    fontWeight: "700" as const,
    color: "#fff",
    letterSpacing: 0.5,
  },
  statsBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: Colors.light.surface,
    paddingVertical: 12,
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
    fontSize: 10,
    fontWeight: "600" as const,
    color: Colors.light.textSecondary,
    textTransform: "uppercase" as const,
    letterSpacing: 0.5,
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
    paddingBottom: 6,
  },
  statusChipsRow: {
    paddingHorizontal: 16,
    gap: 8,
  },
  statusChip: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    paddingHorizontal: 12,
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
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.light.textSecondary,
  },
  statusChipTextActive: {
    color: "#fff",
  },
  resultCount: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },
  resultText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontWeight: "500" as const,
  },
  personCard: {
    backgroundColor: Colors.light.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  cardHeader: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    justifyContent: "space-between" as const,
    gap: 8,
  },
  nameSection: {
    flex: 1,
    gap: 2,
  },
  metaRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    flexWrap: "wrap" as const,
  },
  affBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  affText: {
    fontSize: 10,
    fontWeight: "600" as const,
  },
  personName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.light.text,
  },
  badgeNumber: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: Colors.light.textSecondary,
  },
  roleBadge: {
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "600" as const,
  },
  locationRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    marginTop: 6,
  },
  locationText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
    flexShrink: 1,
  },
  statusRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: "700" as const,
  },
  confirmedTime: {
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
