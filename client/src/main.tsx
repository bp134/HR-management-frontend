import { UNAUTHED_ERR_MSG } from "@shared/const";
import {
  IMPERSONATION_HEADER,
  IMPERSONATION_QUERY_KEY,
  IMPERSONATION_STORAGE_KEY,
  resolveSafeImpersonationOpenId,
} from "@shared/impersonation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import { trpc } from "./lib/trpc";
import "./index.css";

const queryClient = new QueryClient();

function getImpersonationOpenId() {
  if (typeof window === "undefined") return null;

  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get(IMPERSONATION_QUERY_KEY);

  if (fromQuery === "off") {
    window.localStorage.removeItem(IMPERSONATION_STORAGE_KEY);
    return null;
  }

  const resolvedFromQuery = resolveSafeImpersonationOpenId(fromQuery);
  if (resolvedFromQuery) {
    window.localStorage.setItem(IMPERSONATION_STORAGE_KEY, resolvedFromQuery);
    return resolvedFromQuery;
  }

  return resolveSafeImpersonationOpenId(window.localStorage.getItem(IMPERSONATION_STORAGE_KEY));
}

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
  if (!isUnauthorized) return;

  window.location.href = getLoginUrl();
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        const headers = new Headers(init?.headers ?? {});
        const impersonationOpenId = getImpersonationOpenId();

        if (impersonationOpenId) {
          headers.set(IMPERSONATION_HEADER, impersonationOpenId);
        } else {
          headers.delete(IMPERSONATION_HEADER);
        }

        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
          headers,
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>,
);
