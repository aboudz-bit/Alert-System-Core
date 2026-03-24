import { fetch } from "expo/fetch";
import { Platform } from "react-native";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

let _loggedApiUrl = false;

/**
 * Gets the base URL for the Express API server.
 *
 * Strategy:
 *  1. Web — use window.location.origin (same origin as the served app).
 *     In production Express serves both the app and the API.
 *     In dev web preview, the Replit proxy routes to the right port.
 *  2. Native — use EXPO_PUBLIC_DOMAIN env var with the port stripped
 *     (the Replit HTTPS proxy handles internal port routing).
 *  3. If nothing is available, fall back to empty string so fetch()
 *     uses a relative path (works when same-origin).
 */
export function getApiUrl(): string {
  let base: string;

  if (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    window.location?.origin &&
    window.location.origin !== "null"
  ) {
    // Web: same-origin — works in production and in Replit web preview
    base = window.location.origin;
  } else if (process.env.EXPO_PUBLIC_DOMAIN) {
    // Native: use the configured domain, strip port suffix
    const host = process.env.EXPO_PUBLIC_DOMAIN.replace(/:\d+$/, "");
    base = `https://${host}`;
  } else {
    // Last resort: relative paths (only works if same-origin)
    base = "";
  }

  if (!_loggedApiUrl) {
    _loggedApiUrl = true;
    console.log(`[API] base URL: ${base || "(relative)"}`);
  }

  return base;
}

/**
 * Build a full URL for an API route.
 * When baseUrl is empty, returns the route as-is (relative fetch).
 */
export function buildApiUrl(route: string): string {
  const base = getApiUrl();
  if (!base) return route;
  return new URL(route, base).toString();
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;

    // Detect HTML error pages (e.g. proxy 404/502) and return a clean message
    if (text.includes("<!DOCTYPE") || text.includes("<html")) {
      throw new Error(
        `${res.status}: Server not reachable. Check that the backend is running.`
      );
    }

    // For JSON error responses, try to extract the message field
    try {
      const parsed = JSON.parse(text);
      if (parsed.message) {
        throw new Error(`${res.status}: ${parsed.message}`);
      }
    } catch {
      // not JSON — fall through
    }

    // Truncate very long text responses
    const truncated = text.length > 200 ? text.slice(0, 200) + "..." : text;
    throw new Error(`${res.status}: ${truncated}`);
  }
}

export async function apiRequest(
  method: string,
  route: string,
  data?: unknown | undefined,
): Promise<Response> {
  const url = buildApiUrl(route);

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const path = queryKey.join("/") as string;
    const url = buildApiUrl(path);

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
