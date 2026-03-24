import { fetch } from "expo/fetch";
import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Gets the base URL for the Express API server.
 * Strips any non-standard port from the domain since the Replit HTTPS proxy
 * routes to the correct internal port via the standard HTTPS port (443).
 * Mobile devices cannot reach internal ports like :5000 directly.
 */
export function getApiUrl(): string {
  let host = process.env.EXPO_PUBLIC_DOMAIN;

  if (!host) {
    throw new Error("EXPO_PUBLIC_DOMAIN is not set");
  }

  // Strip port suffix (e.g. ":5000") — the Replit HTTPS proxy handles routing
  // to the correct internal port. Direct port access only works inside the
  // container, not from external mobile devices.
  const hostWithoutPort = host.replace(/:\d+$/, "");

  const url = new URL(`https://${hostWithoutPort}`);

  return url.href;
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;

    // Detect HTML error pages (e.g. proxy 404) and return a clean message
    // instead of dumping raw HTML into the UI.
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
  const baseUrl = getApiUrl();
  const url = new URL(route, baseUrl);

  const res = await fetch(url.toString(), {
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
    const baseUrl = getApiUrl();
    const url = new URL(queryKey.join("/") as string, baseUrl);

    const res = await fetch(url.toString(), {
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
