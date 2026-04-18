import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { IMPERSONATION_HEADER, isSafeImpersonationOpenId } from "../../shared/impersonation";
import { getUserByOpenId } from "../db";
import { ENV } from "./env";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

async function resolveImpersonatedUser(
  authenticatedUser: User | null,
  req: CreateExpressContextOptions["req"],
): Promise<User | null> {
  if (ENV.isProduction) return authenticatedUser;
  if (!authenticatedUser || authenticatedUser.role !== "admin") return authenticatedUser;

  const rawHeader = req.header(IMPERSONATION_HEADER) ?? null;
  const impersonationOpenId = typeof rawHeader === "string" ? rawHeader.trim() : null;

  if (!isSafeImpersonationOpenId(impersonationOpenId)) {
    return authenticatedUser;
  }

  const impersonatedUser = await getUserByOpenId(impersonationOpenId);
  return impersonatedUser ?? authenticatedUser;
}

export async function createContext(
  opts: CreateExpressContextOptions,
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }

  user = await resolveImpersonatedUser(user, opts.req);

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
