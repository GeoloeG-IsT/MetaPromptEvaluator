import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<TData = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<TData> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  
  // Handle 204 No Content responses (commonly used for DELETE operations)
  if (res.status === 204) {
    return {} as unknown as TData;
  }
  
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";

export function getQueryFn<TData>(options: {
  on401: UnauthorizedBehavior;
}): QueryFunction<TData> {
  return async ({ queryKey }) => {
    const { on401: unauthorizedBehavior } = options;
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null as any;
    }

    await throwIfResNotOk(res);
    
    // Handle 204 No Content responses
    if (res.status === 204) {
      return {} as unknown as TData;
    }
    
    return await res.json();
  };
}

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
