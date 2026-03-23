import React, { useMemo, useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  SectionList,
  ActivityIndicator,
  Platform,
  Pressable,
  Alert,
} from "react-native";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { getQueryFn, apiRequest, queryClient } from "@/lib/query-client";
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

function AssignmentPanel({
  person,
  zones,
  locations,
  onClose,
}: {
  person: PersonEntry;
  zones: ZoneRef[];
  locations: LocationRef[];
  onClose: () => void;
}) {
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(person.zoneId);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(person.locationId);
  const [saving, setSaving] = useState(false);

  const filteredLocations = useMemo(() => {
    if (!selectedZoneId) return [];
    return (locations || []).filter((l) => l.zoneId === selectedZoneId);
  }, [selectedZoneId, locations]);

  const handleZoneSelect = useCallback((zoneId: string | null) => {
    setSelectedZoneId(zoneId);
    setSelectedLocationId(null);
  }, []);

  const hasChanges =
    selectedZoneId !== person.zoneId || selectedLocationId !== person.locationId;

  const handleSave = useCallback(async () => {
    if (!hasChanges || saving) return;
    setSaving(true);
    try {
      await apiRequest("PATCH", `/api/users/${person.id}/assignment`, {
        zoneId: selectedZoneId,
        locationId: selectedLocationId,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  }, [hasChanges, saving, person.id, selectedZoneId, selectedLocationId, onClose]);

  const handleClear = useCallback(async () => {
    if (saving) return;
    if (!person.zoneId && !person.locationId) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      await apiRequest("PATCH", `/api/users/${person.id}/assignment`, {
        zoneId: null,
        locationId: null,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/people"] });
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to clear";
      Alert.alert("Error", msg);
    } finally {
      setSaving(false);
    }
  }, [saving, person.id, person.zoneId, person.locationId, onClose]);

  const safeZones = zones || [];

  return (
    <View style={styles.assignPanel}>
      <View style={styles.assignHeader}>
        <Text style={styles.assignTitle}>Assign {person.name}</Text>
        <Pressable onPress={onClose} hitSlop={8}>
          <Feather name="x" size={18} color={Colors.light.textSecondary} />
        </Pressable>
      </View>

      <Text style={styles.assignLabel}>Zone</Text>
      <View style={styles.optionList}>
        <Pressable
          style={[styles.optionChip, !selectedZoneId && styles.optionChipActive]}
          onPress={() => handleZoneSelect(null)}
        >
          <Text style={[styles.optionText, !selectedZoneId && styles.optionTextActive]}>
            None
          </Text>
        </Pressable>
        {safeZones.map((z) => (
          <Pressable
            key={z.id}
            style={[styles.optionChip, selectedZoneId === z.id && styles.optionChipActive]}
            onPress={() => handleZoneSelect(z.id)}
          >
            <Text style={[styles.optionText, selectedZoneId === z.id && styles.optionTextActive]}>
              {z.name}
            </Text>
          </Pressable>
        ))}
      </View>

      {selectedZoneId ? (
        <>
          <Text style={styles.assignLabel}>Location</Text>
          <View style={styles.optionList}>
            <Pressable
              style={[styles.optionChip, !selectedLocationId && styles.optionChipActive]}
              onPress={() => setSelectedLocationId(null)}
            >
              <Text style={[styles.optionText, !selectedLocationId && styles.optionTextActive]}>
                None
              </Text>
            </Pressable>
            {filteredLocations.map((l) => (
              <Pressable
                key={l.id}
                style={[styles.optionChip, selectedLocationId === l.id && styles.optionChipActive]}
                onPress={() => setSelectedLocationId(l.id)}
              >
                <Text style={[styles.optionText, selectedLocationId === l.id && styles.optionTextActive]}>
                  {l.name}
                </Text>
              </Pressable>
            ))}
            {filteredLocations.length === 0 ? (
              <Text style={styles.noLocText}>No locations in this zone</Text>
            ) : null}
          </View>
        </>
      ) : null}

      <View style={styles.assignActions}>
        {(person.zoneId || person.locationId) ? (
          <Pressable
            style={[styles.clearBtn, saving && styles.btnDisabled]}
            onPress={handleClear}
            disabled={saving}
          >
            <Text style={styles.clearBtnText}>Clear Assignment</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={[styles.saveBtn, (!hasChanges || saving) && styles.btnDisabled]}
          onPress={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

export default function PeopleScreen() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null);

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
    for (const [title, sectionData] of grouped) {
      result.push({ title, data: sectionData });
    }

    result.sort((a, b) => {
      if (a.title === "Unassigned") return 1;
      if (b.title === "Unassigned") return -1;
      return a.title.localeCompare(b.title);
    });

    return result;
  }, [data]);

  const handleCloseAssign = useCallback(() => {
    setEditingPersonId(null);
  }, []);

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

  const safeZones = data.zones || [];
  const safeLocations = data.locations || [];

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
        renderItem={({ item }) => {
          const isEditing = editingPersonId === item.id;
          return (
            <View>
              <Pressable
                style={[styles.personRow, isAdmin && styles.personRowTappable]}
                onPress={isAdmin ? () => setEditingPersonId(isEditing ? null : item.id) : undefined}
              >
                <View style={styles.personInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.personName}>{item.name}</Text>
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleText}>{roleLabel(item.role)}</Text>
                    </View>
                    {isAdmin ? (
                      <Feather
                        name={isEditing ? "chevron-up" : "chevron-down"}
                        size={14}
                        color={Colors.light.textSecondary}
                      />
                    ) : null}
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
              </Pressable>
              {isAdmin && isEditing ? (
                <AssignmentPanel
                  person={item}
                  zones={safeZones}
                  locations={safeLocations}
                  onClose={handleCloseAssign}
                />
              ) : null}
            </View>
          );
        }}
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
  personRowTappable: {
    cursor: "pointer" as any,
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
  assignPanel: {
    backgroundColor: Colors.light.background,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  assignHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 10,
  },
  assignTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.light.text,
  },
  assignLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: Colors.light.textSecondary,
    marginBottom: 6,
    marginTop: 4,
  },
  optionList: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: 8,
    marginBottom: 10,
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: Colors.light.surface,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  optionChipActive: {
    backgroundColor: Colors.light.tint,
    borderColor: Colors.light.tint,
  },
  optionText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: Colors.light.text,
  },
  optionTextActive: {
    color: "#fff",
  },
  noLocText: {
    fontSize: 12,
    color: Colors.light.textSecondary,
    fontStyle: "italic" as const,
  },
  assignActions: {
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    gap: 10,
    marginTop: 6,
  },
  saveBtn: {
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 64,
    alignItems: "center" as const,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600" as const,
  },
  clearBtn: {
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.light.danger,
  },
  clearBtnText: {
    color: Colors.light.danger,
    fontSize: 13,
    fontWeight: "500" as const,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
