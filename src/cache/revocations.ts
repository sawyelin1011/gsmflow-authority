/**
 * KV Cache Layer for Revocations
 * Caches revocation lists with TTL for performance
 */

import { Revocation } from '../db/schema';

export class RevocationCache {
  constructor(private kv: KVNamespace, private ttlSeconds: number = 300) {}

  /**
   * Get cached revocation list
   * @returns Promise resolving to array of revocation IDs
   */
  async getCachedRevocations(): Promise<string[]> {
    try {
      const cached = await this.kv.get('revocations', 'json');
      return cached || [];
    } catch (error) {
      // KV might not be available - return empty array
      return [];
    }
  }

  /**
   * Set cached revocation list
   * @param revocations - Array of revocation IDs
   * @returns Promise resolving when cache is set
   */
  async setCachedRevocations(revocations: string[]): Promise<void> {
    try {
      await this.kv.put('revocations', JSON.stringify(revocations), {
        expirationTtl: this.ttlSeconds,
      });
    } catch (error) {
      // KV might not be available - fail silently
      console.error('Failed to set revocation cache:', error);
    }
  }

  /**
   * Invalidate revocation cache
   * @returns Promise resolving when cache is invalidated
   */
  async invalidateCache(): Promise<void> {
    try {
      await this.kv.delete('revocations');
    } catch (error) {
      // KV might not be available - fail silently
      console.error('Failed to invalidate revocation cache:', error);
    }
  }

  /**
   * Check if license is revoked (cached)
   * @param licenseId - License ID to check
   * @returns Promise resolving to boolean
   */
  async isRevoked(licenseId: string): Promise<boolean> {
    const revocations = await this.getCachedRevocations();
    return revocations.includes(licenseId);
  }

  /**
   * Prefetch revocations from database and cache them
   * @param dbRevocations - Array of revocations from database
   * @returns Promise resolving when prefetch is complete
   */
  async prefetchRevocations(dbRevocations: Revocation[]): Promise<void> {
    const revocationIds = dbRevocations.map((r) => r.license_id);
    await this.setCachedRevocations(revocationIds);
  }

  /**
   * Add revocation to cache
   * @param licenseId - License ID to add to revocation cache
   * @returns Promise resolving when cache is updated
   */
  async addRevocation(licenseId: string): Promise<void> {
    const revocations = await this.getCachedRevocations();
    if (!revocations.includes(licenseId)) {
      revocations.push(licenseId);
      await this.setCachedRevocations(revocations);
    }
  }

  /**
   * Remove revocation from cache
   * @param licenseId - License ID to remove from revocation cache
   * @returns Promise resolving when cache is updated
   */
  async removeRevocation(licenseId: string): Promise<void> {
    const revocations = await this.getCachedRevocations();
    const updatedRevocations = revocations.filter((id) => id !== licenseId);
    await this.setCachedRevocations(updatedRevocations);
  }
}