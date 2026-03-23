import { useEffect, useRef, useCallback } from "react";
import { Platform } from "react-native";
import { Audio } from "expo-av";
import { useAppStore, selectEmergencyMode } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/query-client";
import { useAuth } from "@/lib/auth-context";
import type { EmergencyReceipt } from "@shared/schema";

const ALARM_INTERVAL_MS = 30_000;

export function useEmergencyAlarm() {
  const { user } = useAuth();
  const emergencyMode = useAppStore(selectEmergencyMode);
  const soundRef = useRef<Audio.Sound | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);
  const playTokenRef = useRef(0);

  const emergencyId = emergencyMode?.status === "active" ? emergencyMode.id : null;

  const { data: myReceipt } = useQuery<EmergencyReceipt | null>({
    queryKey: ["/api/emergency", emergencyId, "receipt", "me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: !!emergencyId && !!user,
    refetchInterval: 10000,
  });

  const hasConfirmed = !!myReceipt;

  const unloadSound = useCallback(async () => {
    const s = soundRef.current;
    soundRef.current = null;
    if (s) {
      try { await s.stopAsync(); } catch (_e) {}
      try { await s.unloadAsync(); } catch (_e) {}
    }
  }, []);

  const playAlarm = useCallback(async () => {
    if (!mountedRef.current) return;

    const token = ++playTokenRef.current;

    try {
      await unloadSound();

      if (!mountedRef.current || token !== playTokenRef.current) return;

      if (Platform.OS !== "web") {
        try {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: false,
          });
        } catch (_e) {}
      }

      if (!mountedRef.current || token !== playTokenRef.current) return;

      const { sound } = await Audio.Sound.createAsync(
        require("@/assets/sounds/alarm.wav"),
        { shouldPlay: true, volume: 1.0 }
      );

      if (!mountedRef.current || token !== playTokenRef.current) {
        try { await sound.unloadAsync(); } catch (_e) {}
        return;
      }

      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (!mountedRef.current) return;
        if (status.isLoaded && status.didJustFinish) {
          if (soundRef.current === sound) {
            soundRef.current = null;
          }
          try { sound.unloadAsync(); } catch (_e) {}
        }
      });
    } catch (_e) {}
  }, [unloadSound]);

  const clearInterval_ = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopAll = useCallback(() => {
    playTokenRef.current++;
    clearInterval_();
    unloadSound();
  }, [clearInterval_, unloadSound]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopAll();
    };
  }, []);

  useEffect(() => {
    const shouldAlarm = !!emergencyId && !!user && !hasConfirmed;

    if (!shouldAlarm) {
      stopAll();
      return;
    }

    playAlarm();

    clearInterval_();
    intervalRef.current = setInterval(() => {
      if (!mountedRef.current) {
        clearInterval_();
        return;
      }
      playAlarm();
    }, ALARM_INTERVAL_MS);

    return () => {
      stopAll();
    };
  }, [emergencyId, hasConfirmed, user?.id]);
}
