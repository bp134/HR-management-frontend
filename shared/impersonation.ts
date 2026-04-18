export const IMPERSONATION_HEADER = "x-hr-impersonate-openid";
export const IMPERSONATION_QUERY_KEY = "impersonate";
export const IMPERSONATION_STORAGE_KEY = "hr-debug-impersonation";

export const SAFE_IMPERSONATION_USERS = {
  manager: {
    label: "Seeded manager",
    openId: "seed-rls-manager-3",
    email: "marcus.shaw@northstar.test",
  },
  employee: {
    label: "Seeded employee",
    openId: "seed-rls-employee-4",
    email: "hannah.lee@northstar.test",
  },
} as const;

export type SafeImpersonationRole = keyof typeof SAFE_IMPERSONATION_USERS;

export function isSafeImpersonationOpenId(value: string | null | undefined): value is string {
  return Boolean(
    value && Object.values(SAFE_IMPERSONATION_USERS).some(candidate => candidate.openId === value),
  );
}

export function resolveSafeImpersonationOpenId(value: string | null | undefined) {
  if (!value) return null;

  if (value in SAFE_IMPERSONATION_USERS) {
    return SAFE_IMPERSONATION_USERS[value as SafeImpersonationRole].openId;
  }

  if (isSafeImpersonationOpenId(value)) {
    return value;
  }

  return null;
}
