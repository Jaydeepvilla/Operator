export interface IdempotencyRecord<T> {
  promise?: Promise<T>;
  result?: T;
  timestamp: number;
}

class IdempotencyManager {
  private cache = new Map<string, IdempotencyRecord<any>>();
  private ttlMs = 12000; // 12 seconds deduplication window

  generateKey(organizationId: string, conversationId: string | undefined, message: string, clientMessageId?: string): string {
    const normMsg = message.trim().toLowerCase();
    if (clientMessageId) {
      return `${organizationId}:${conversationId || "new"}:${clientMessageId}`;
    }
    return `${organizationId}:${conversationId || "new"}:${normMsg}`;
  }

  async execute<T>(
    key: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const now = Date.now();
    const existing = this.cache.get(key);

    // If an in-flight operation exists, wait for it
    if (existing) {
      if (existing.promise) {
        return existing.promise;
      }
      if (existing.result && (now - existing.timestamp) < this.ttlMs) {
        return existing.result;
      }
    }

    // Execute operation and track promise
    const promise = operation();
    this.cache.set(key, { promise, timestamp: now });

    try {
      const result = await promise;
      this.cache.set(key, { result, timestamp: Date.now() });
      
      // Schedule cleanup
      setTimeout(() => {
        this.cache.delete(key);
      }, this.ttlMs);

      return result;
    } catch (error) {
      this.cache.delete(key);
      throw error;
    }
  }
}

export const idempotencyManager = new IdempotencyManager();
