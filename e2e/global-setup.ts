import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { FullConfig } from "@playwright/test";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import { sdk } from "../server/_core/sdk";

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL;
  if (typeof baseURL !== "string" || !baseURL) {
    throw new Error("Playwright baseURL is required for authenticated pilot automation.");
  }

  const ownerOpenId = process.env.OWNER_OPEN_ID;
  if (!ownerOpenId) {
    throw new Error("OWNER_OPEN_ID is required to create authenticated Playwright state.");
  }

  const storageStatePath = resolve("e2e/.auth/admin.json");
  mkdirSync(resolve("e2e/.auth"), { recursive: true });

  const token = await sdk.createSessionToken(ownerOpenId, {
    name: process.env.OWNER_NAME ?? "Pilot Owner",
    expiresInMs: ONE_YEAR_MS,
  });

  writeFileSync(
    storageStatePath,
    JSON.stringify(
      {
        cookies: [
          {
            name: COOKIE_NAME,
            value: token,
            url: baseURL,
            httpOnly: true,
            secure: baseURL.startsWith("https://"),
            sameSite: "Lax",
            expires: Math.floor((Date.now() + ONE_YEAR_MS) / 1000),
          },
        ],
        origins: [],
      },
      null,
      2,
    ),
  );
}
