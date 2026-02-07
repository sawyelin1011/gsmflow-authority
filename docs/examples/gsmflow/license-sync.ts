/**
 * License Revocation Sync (Edge Runtime Compatible)
 * 
 * Works with: Cloudflare Workers (Durable Objects), Vercel Edge (Cron), Node.js
 * Copy this to: src/lib/license-sync.ts
 */

import { licenseVerifier } from "./license-verifier";

const AUTHORITY_URL = "https://gsmflow-authority.ylstack02.workers.dev";
const SYNC_INTERVAL = 3600000; // 1 hour

export class LicenseSync {
  private intervalId: any = null;
  private isShuttingDown = false;

  /**
   * Start periodic sync (Node.js/Bun)
   */
  start() {
    console.log("🔄 Starting license revocation sync (every 1 hour)");

    // Check immediately on startup
    this.checkRevocation();

    // Then check every hour
    this.intervalId = setInterval(() => {
      this.checkRevocation();
    }, SYNC_INTERVAL);
  }

  /**
   * Stop periodic sync
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Check revocation status
   */
  private async checkRevocation() {
    if (this.isShuttingDown) return;

    try {
      const licenseInfo = licenseVerifier.getLicenseInfo();
      if (!licenseInfo) {
        console.error("❌ License not loaded, cannot check revocation");
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        `${AUTHORITY_URL}/authority/revocations/sync?license_id=${licenseInfo.license_id}`,
        { signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`⚠️  Revocation check failed: ${response.status}`);
        // Fail open - don't lock on network errors
        return;
      }

      const data = await response.json();

      if (data.revoked) {
        console.error("❌ LICENSE REVOKED");
        console.error(`   Reason: ${data.reason}`);
        console.error(`   Revoked at: ${new Date(data.revoked_at * 1000).toISOString()}`);

        // Graceful shutdown
        this.isShuttingDown = true;
        this.stop();

        // For Node.js/Bun
        if (typeof process !== "undefined") {
          setTimeout(() => {
            console.error("🔒 Shutting down due to license revocation");
            process.exit(1);
          }, 5000);
        }
      } else {
        console.log(`✅ License valid (checked at ${new Date().toISOString()})`);
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.error("⚠️  Revocation check timeout");
      } else {
        console.error("⚠️  Revocation check error:", error.message);
      }
      // Fail open - offline operation is allowed
    }
  }

  /**
   * Manual check (useful for testing or scheduled tasks)
   */
  async checkNow(): Promise<boolean> {
    try {
      const licenseInfo = licenseVerifier.getLicenseInfo();
      if (!licenseInfo) return false;

      const response = await fetch(
        `${AUTHORITY_URL}/authority/revocations/sync?license_id=${licenseInfo.license_id}`,
        { signal: AbortSignal.timeout(5000) }
      );

      if (!response.ok) return false;

      const data = await response.json();
      return !data.revoked;
    } catch {
      return false; // Fail open
    }
  }
}

// Singleton instance
export const licenseSync = new LicenseSync();

/**
 * For Cloudflare Workers with Scheduled Events:
 * 
 * export default {
 *   async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
 *     await licenseSync.checkNow();
 *   }
 * };
 * 
 * Add to wrangler.toml:
 * [triggers]
 * crons = ["0 * * * *"]  # Every hour
 */

/**
 * For Vercel Cron Jobs:
 * 
 * // api/cron/check-license.ts
 * export const config = {
 *   runtime: 'edge',
 * };
 * 
 * export default async function handler(request: Request) {
 *   const isValid = await licenseSync.checkNow();
 *   return Response.json({ valid: isValid });
 * }
 * 
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/check-license",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */

