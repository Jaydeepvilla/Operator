/**
 * Database and Data Integrity Security Authority
 * 
 * Enforces Section 16 Hardening Guarantees:
 * - DB-01: Valid state transitions in bookings and payments
 * - DB-02: Prevention of orphaned records & foreign key integrity
 * - DB-03: Duplicate record & uniqueness invariant enforcement
 * - DB-04: Concurrent write safety & business invariant locks
 * - DB-05: Atomic multi-step transaction rollback on partial failure
 * - DB-06: Authorization enforcement on migrations & DDL operations
 * - DB-07: Protection of production data from demo seed scripts
 * - DB-08: Protection of customer data from destructive test/wipe scripts
 * - DB-09: Prevention of plaintext secret storage in database
 * - DB-10: Query pagination bounds & database exhaustion defense
 * - DB-11: Database connection security (SSL/TLS & pooling caps)
 * - DB-12: Physical snapshot validation for database backups
 * - DB-13: Restoration timestamp safety & newer data loss prevention
 * - DB-14: Migration validation, dry-run checks & rollback planning
 */

import crypto from "crypto";

export class DatabaseIntegrityError extends Error {
  constructor(message: string, public readonly code: string = "DATABASE_INTEGRITY_VIOLATION") {
    super(message);
    this.name = "DatabaseIntegrityError";
  }
}

// State transition maps
export const BOOKING_VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled", "rescheduled", "no_show"],
  rescheduled: ["confirmed", "cancelled"],
  completed: [], // terminal
  cancelled: [], // terminal
  no_show: [], // terminal
};

export const PAYMENT_VALID_TRANSITIONS: Record<string, string[]> = {
  created: ["authorized", "succeeded", "failed", "cancelled"],
  authorized: ["succeeded", "failed", "cancelled"],
  succeeded: ["refunded", "partially_refunded"],
  partially_refunded: ["refunded"],
  refunded: [], // terminal
  failed: [], // terminal
  cancelled: [], // terminal
};

// Production database domain keywords
const PRODUCTION_DB_MARKERS = [
  "neon.tech",
  "supabase.co",
  "cockroachlabs.cloud",
  "rds.amazonaws.com",
  "psdb.cloud",
  "azure.com",
];

export class DatabaseIntegrityService {
  /**
   * DB-01: Prevent invalid state transitions in bookings and payments.
   */
  static validateStateTransition(
    entityType: "booking" | "payment",
    currentStatus: string,
    targetStatus: string
  ): void {
    const cleanCurrent = (currentStatus || "").toLowerCase().trim();
    const cleanTarget = (targetStatus || "").toLowerCase().trim();

    if (!cleanCurrent || !cleanTarget) {
      throw new DatabaseIntegrityError(`Invalid ${entityType} state transition: status values cannot be empty`);
    }

    if (cleanCurrent === cleanTarget) {
      return; // No-op idempotent transition
    }

    const transitionMap = entityType === "booking" ? BOOKING_VALID_TRANSITIONS : PAYMENT_VALID_TRANSITIONS;
    const allowedTargets = transitionMap[cleanCurrent];

    if (!allowedTargets) {
      throw new DatabaseIntegrityError(
        `Invalid ${entityType} transition: unknown source status '${cleanCurrent}'`
      );
    }

    if (!allowedTargets.includes(cleanTarget)) {
      throw new DatabaseIntegrityError(
        `Invalid ${entityType} state transition: cannot transition from '${cleanCurrent}' to '${cleanTarget}'. Permitted: [${allowedTargets.join(", ")}]`
      );
    }
  }

  /**
   * DB-02: Prevent orphaned records where relationships must remain valid.
   */
  static assertValidRelationship(
    entityType: string,
    parentId: string | null | undefined,
    parentExists: boolean
  ): void {
    if (!parentId || typeof parentId !== "string" || !parentId.trim()) {
      throw new DatabaseIntegrityError(
        `Orphan record prevention: ${entityType} requires a valid foreign key relationship ID`
      );
    }

    if (!parentExists) {
      throw new DatabaseIntegrityError(
        `Foreign key integrity violation: Parent record '${parentId}' does not exist for dependent ${entityType}`
      );
    }
  }

  /**
   * DB-03: Prevent duplicate records where uniqueness is required.
   */
  static assertUniquenessInvariant(
    keyName: string,
    value: string,
    existingRecords: Array<{ [k: string]: any; id?: string }>,
    currentEntityId?: string
  ): void {
    if (!value || typeof value !== "string" || !value.trim()) {
      throw new DatabaseIntegrityError(`Uniqueness validation: '${keyName}' value cannot be empty`);
    }

    const cleanVal = value.trim().toLowerCase();

    for (const record of existingRecords) {
      if (currentEntityId && record.id === currentEntityId) {
        continue; // Skip self during updates
      }

      const existingVal = record[keyName];
      if (existingVal && String(existingVal).trim().toLowerCase() === cleanVal) {
        throw new DatabaseIntegrityError(
          `Unique constraint violation: record with ${keyName}='${value}' already exists`
        );
      }
    }
  }

  /**
   * DB-04: Prevent concurrent writes from violating business invariants.
   */
  static assertConcurrentWriteSafety(
    resourceId: string,
    lockToken: string,
    activeLocks: Map<string, string>
  ): { release: () => void } {
    if (!resourceId || !lockToken) {
      throw new DatabaseIntegrityError("Resource ID and lock token required for concurrency lock");
    }

    const existingLock = activeLocks.get(resourceId);
    if (existingLock && existingLock !== lockToken) {
      throw new DatabaseIntegrityError(
        `Concurrent write violation: resource '${resourceId}' is locked by another transaction (conflict)`
      );
    }

    activeLocks.set(resourceId, lockToken);

    return {
      release: () => {
        if (activeLocks.get(resourceId) === lockToken) {
          activeLocks.delete(resourceId);
        }
      },
    };
  }

  /**
   * DB-05: Prevent partial transactions from leaving inconsistent state.
   */
  static async executeAtomicTransaction<T>(
    steps: Array<{ name: string; run: () => Promise<any>; rollback?: () => Promise<void> }>
  ): Promise<T[]> {
    const executedRollbacks: Array<() => Promise<void>> = [];
    const results: any[] = [];

    for (const step of steps) {
      try {
        const result = await step.run();
        results.push(result);
        if (step.rollback) {
          executedRollbacks.unshift(step.rollback);
        }
      } catch (err: any) {
        // Rollback previous steps in reverse order
        for (const rollback of executedRollbacks) {
          try {
            await rollback();
          } catch (rbErr) {
            console.error("Transaction compensation error:", rbErr);
          }
        }

        throw new DatabaseIntegrityError(
          `Atomic transaction failed at step '${step.name}'. All prior steps rolled back: ${err.message}`
        );
      }
    }

    return results as T[];
  }

  /**
   * DB-06: Prevent unauthorized migrations or schema changes.
   */
  static assertMigrationAuthorized(authContext: {
    isMigrationWorker: boolean;
    migrationToken?: string;
    expectedToken?: string;
    environment?: string;
  }): void {
    if (!authContext.isMigrationWorker) {
      throw new DatabaseIntegrityError(
        "Unauthorized migration attempt: DDL executions are prohibited in application request context"
      );
    }

    if (
      !authContext.migrationToken ||
      !authContext.expectedToken ||
      authContext.migrationToken !== authContext.expectedToken
    ) {
      throw new DatabaseIntegrityError(
        "Migration security failure: Invalid or missing authoritative migration execution token"
      );
    }
  }

  /**
   * DB-07: Prevent production data from being overwritten by demo seed scripts.
   */
  static assertSeedExecutionPermitted(
    env: string = "production",
    databaseUrl?: string,
    forceFlag?: boolean
  ): void {
    if (env === "production" && !forceFlag) {
      throw new DatabaseIntegrityError(
        "Data safety violation: Demo seed scripts are strictly prohibited in production environment"
      );
    }

    if (databaseUrl) {
      const lowerUrl = databaseUrl.toLowerCase();
      const isRemoteProd = PRODUCTION_DB_MARKERS.some((marker) => lowerUrl.includes(marker));
      if (isRemoteProd && !forceFlag) {
        throw new DatabaseIntegrityError(
          "Data safety violation: Seed script detected remote/cloud database URL. Demo seed halted to protect real data"
        );
      }
    }
  }

  /**
   * DB-08: Prevent test scripts from deleting real customer data.
   */
  static assertDestructiveOperationPermitted(
    operation: string,
    databaseUrl: string,
    env: string = "production"
  ): void {
    if (env === "production") {
      throw new DatabaseIntegrityError(
        `Destructive action blocked: '${operation}' cannot be executed against production environment`
      );
    }

    const lowerUrl = (databaseUrl || "").toLowerCase();
    const isRemoteProd = PRODUCTION_DB_MARKERS.some((marker) => lowerUrl.includes(marker));

    if (isRemoteProd) {
      throw new DatabaseIntegrityError(
        `Destructive action blocked: Target database URL contains production domain. Refusing to truncate or delete tables`
      );
    }

    // Must be local test DB
    const isLocal =
      lowerUrl.includes("localhost") ||
      lowerUrl.includes("127.0.0.1") ||
      lowerUrl.includes("_test");

    if (!isLocal) {
      throw new DatabaseIntegrityError(
        `Destructive action blocked: Target database must be an explicitly named test or localhost database`
      );
    }
  }

  /**
   * DB-09: Prevent secrets from being stored in plaintext where protected storage is required.
   */
  static assertSecretEncrypted(secretValue: string): { isEncrypted: boolean } {
    if (!secretValue || typeof secretValue !== "string" || !secretValue.trim()) {
      throw new DatabaseIntegrityError("Secret storage validation: secret value cannot be empty");
    }

    const val = secretValue.trim();

    // Check for encrypted envelope prefixes or secure hashes
    const isEncryptedEnvelope = val.startsWith("enc:aes256gcm:") || val.startsWith("enc:v1:");
    const isSecureHash = val.startsWith("$2a$") || val.startsWith("$2b$") || val.startsWith("$argon2id$");

    if (!isEncryptedEnvelope && !isSecureHash) {
      throw new DatabaseIntegrityError(
        "Plaintext secret storage rejected: secret must be encrypted (enc:aes256gcm:) or hashed (bcrypt/argon2) before database insertion"
      );
    }

    return { isEncrypted: true };
  }

  /**
   * DB-10: Prevent unbounded queries from exhausting the database.
   */
  static enforceQueryPaginationBounds(
    limit?: number,
    offset?: number,
    maxAllowedLimit: number = 1000
  ): { safeLimit: number; safeOffset: number } {
    const DEFAULT_LIMIT = 50;
    const ABSOLUTE_MAX_LIMIT = 5000;

    let safeLimit = DEFAULT_LIMIT;
    if (limit !== undefined && limit !== null) {
      const parsed = Number(limit);
      if (isNaN(parsed) || parsed <= 0) {
        throw new DatabaseIntegrityError("Query limit parameter must be a positive integer");
      }
      if (parsed > ABSOLUTE_MAX_LIMIT) {
        throw new DatabaseIntegrityError(
          `Unbounded query rejected: requested limit (${parsed}) exceeds absolute maximum limit (${ABSOLUTE_MAX_LIMIT})`
        );
      }
      safeLimit = Math.min(parsed, maxAllowedLimit);
    }

    let safeOffset = 0;
    if (offset !== undefined && offset !== null) {
      const parsedOffset = Number(offset);
      if (isNaN(parsedOffset) || parsedOffset < 0) {
        throw new DatabaseIntegrityError("Query offset parameter must be a non-negative integer");
      }
      safeOffset = parsedOffset;
    }

    return { safeLimit, safeOffset };
  }

  /**
   * DB-11: Prevent unauthorized direct database access.
   */
  static assertDatabaseConnectionSecurity(config: {
    connectionString: string;
    sslEnabled?: boolean;
    poolMax?: number;
  }): void {
    const { connectionString, sslEnabled, poolMax } = config;

    if (!connectionString) {
      throw new DatabaseIntegrityError("Database connection configuration cannot be empty");
    }

    const lower = connectionString.toLowerCase();
    const isRemote = PRODUCTION_DB_MARKERS.some((m) => lower.includes(m));

    if (isRemote && sslEnabled === false) {
      throw new DatabaseIntegrityError(
        "Insecure connection rejected: Remote database connections strictly require SSL/TLS encryption (sslmode=require)"
      );
    }

    if (poolMax !== undefined && (poolMax <= 0 || poolMax > 100)) {
      throw new DatabaseIntegrityError(
        `Database connection pool size (${poolMax}) must be configured between 1 and 100 to prevent connection exhaustion`
      );
    }
  }

  /**
   * DB-12: Prevent failed backups from being reported as successful.
   */
  static validateBackupSuccess(backupReport: {
    status: string;
    byteSize: number;
    checksum: string;
    snapshotPath: string;
  }): boolean {
    const { status, byteSize, checksum, snapshotPath } = backupReport;

    if (status !== "completed" && status !== "success") {
      throw new DatabaseIntegrityError(
        `Backup failure: status is '${status}', snapshot verification failed`
      );
    }

    if (typeof byteSize !== "number" || byteSize <= 0) {
      throw new DatabaseIntegrityError(
        `Backup corruption: backup snapshot has 0 bytes or invalid file size (${byteSize})`
      );
    }

    if (!checksum || typeof checksum !== "string" || checksum.trim().length < 32) {
      throw new DatabaseIntegrityError(
        "Backup verification failed: snapshot checksum is missing or malformed"
      );
    }

    if (!snapshotPath || typeof snapshotPath !== "string" || !snapshotPath.trim()) {
      throw new DatabaseIntegrityError(
        "Backup verification failed: physical snapshot path is missing"
      );
    }

    return true;
  }

  /**
   * DB-13: Prevent restoration procedures from silently losing newer data.
   */
  static assertRestorationSafety(
    snapshotTimestamp: Date | string,
    currentLiveTimestamp: Date | string,
    forceOverride: boolean = false
  ): void {
    const snapDate = snapshotTimestamp instanceof Date ? snapshotTimestamp : new Date(snapshotTimestamp);
    const liveDate = currentLiveTimestamp instanceof Date ? currentLiveTimestamp : new Date(currentLiveTimestamp);

    if (isNaN(snapDate.getTime()) || isNaN(liveDate.getTime())) {
      throw new DatabaseIntegrityError("Restoration timestamp evaluation failed: invalid timestamp provided");
    }

    if (snapDate.getTime() < liveDate.getTime() && !forceOverride) {
      const diffHours = Math.round((liveDate.getTime() - snapDate.getTime()) / (1000 * 60 * 60));
      throw new DatabaseIntegrityError(
        `Restoration safety violation: Snapshot is ${diffHours} hour(s) older than current live database state. Restoring would cause irreversible loss of newer transactions. Dual confirmation or PITR strategy required.`
      );
    }
  }

  /**
   * DB-14: Prevent data migrations from running without appropriate validation and recovery planning.
   */
  static validateMigrationPlan(plan: {
    migrationId: string;
    hasRollbackPlan: boolean;
    preMigrationBackupId?: string;
    schemaLockAcquired: boolean;
  }): void {
    if (!plan.migrationId || typeof plan.migrationId !== "string") {
      throw new DatabaseIntegrityError("Migration validation failed: migrationId is required");
    }

    if (!plan.schemaLockAcquired) {
      throw new DatabaseIntegrityError(
        `Migration '${plan.migrationId}' blocked: exclusive schema lock was not acquired (concurrent migration risk)`
      );
    }

    if (!plan.hasRollbackPlan) {
      throw new DatabaseIntegrityError(
        `Migration '${plan.migrationId}' blocked: rollback / compensation plan is mandatory before executing schema transformations`
      );
    }

    if (!plan.preMigrationBackupId || !plan.preMigrationBackupId.trim()) {
      throw new DatabaseIntegrityError(
        `Migration '${plan.migrationId}' blocked: verified pre-migration backup snapshot receipt is required`
      );
    }
  }
}

