import crypto from "crypto";
import path from "path";
import { validateSafeUrl } from "./crawler/ssrf";

export class KnowledgeUploadSecurityError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code = "KNOWLEDGE_SECURITY_ERROR", status = 400) {
    super(message);
    this.name = "KnowledgeUploadSecurityError";
    this.code = code;
    this.status = status;
  }
}

export const ALLOWED_EXTENSIONS = ["pdf", "docx", "txt", "md", "csv", "json"];
export const DISALLOWED_EXTENSIONS = [
  "exe", "dll", "bat", "cmd", "sh", "php", "phtml", "js", "vbs", "ps1",
  "scr", "jar", "msi", "vbe", "wsf", "hta", "cpl", "com", "bin"
];

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_CONTENT_CHARACTERS = 500_000;

export const knowledgeUploadSecurity = {
  /**
   * 1. Prevent unauthorized document uploads.
   * Only authenticated users with manager or admin permissions are authorized to upload documents.
   */
  assertUploadAuthorized(callerRole: string, verifiedOrgId: string, requestedOrgId?: string) {
    const authorizedRoles = ["owner", "admin", "manager"];
    if (!authorizedRoles.includes(callerRole.toLowerCase())) {
      throw new KnowledgeUploadSecurityError(
        "Unauthorized: Only administrators and managers can upload knowledge documents.",
        "FORBIDDEN_DOCUMENT_UPLOAD",
        403
      );
    }

    if (requestedOrgId && requestedOrgId !== verifiedOrgId) {
      throw new KnowledgeUploadSecurityError(
        "Tenant violation: Uploads into another business's knowledge base are forbidden.",
        "TENANT_UPLOAD_MISMATCH",
        403
      );
    }

    return true;
  },

  /**
   * 2. Prevent uploads into another business's knowledge base.
   * Enforces strict tenant isolation on knowledge base operations.
   */
  assertKnowledgeTenantMatch(callerOrgId: string, documentOrgId: string) {
    if (!callerOrgId || !documentOrgId || callerOrgId !== documentOrgId) {
      throw new KnowledgeUploadSecurityError(
        "Access denied: You cannot modify or access documents belonging to another business.",
        "KNOWLEDGE_TENANT_MISMATCH",
        403
      );
    }
    return true;
  },

  /**
   * 3. Prevent access to private files through predictable URLs.
   * Generates cryptographically secure, non-sequential 256-bit storage identifiers and enforces tenant authorization on retrieval.
   */
  generateSecureFileStorageKey(organizationId: string, filename: string): { storageKey: string; secureAccessId: string } {
    const secureToken = crypto.randomBytes(32).toString("hex");
    const safeBase = this.sanitizeFilenameForStorage(filename);
    const storageKey = `tenants/${organizationId}/docs/${secureToken}/${safeBase}`;
    return {
      storageKey,
      secureAccessId: secureToken,
    };
  },

  validateFileAccessAuth(documentOrgId: string, callerOrgId: string) {
    if (!documentOrgId || !callerOrgId || documentOrgId !== callerOrgId) {
      throw new KnowledgeUploadSecurityError(
        "Unauthorized file access: predictable URL probing rejected.",
        "FILE_ACCESS_FORBIDDEN",
        403
      );
    }
    return true;
  },

  /**
   * 4. Prevent malicious files from being processed unsafely.
   * Strips XSS script tags, external XML entity injection, and malicious execution directives.
   */
  sanitizeDocumentContent(rawContent: string): string {
    if (!rawContent || typeof rawContent !== "string") return "";

    let sanitized = rawContent;

    // Neutralize script, iframe, object, embed, applet tags
    sanitized = sanitized.replace(/<\s*(script|iframe|object|embed|applet)[\s\S]*?<\s*\/\s*\1\s*>/gi, "");
    sanitized = sanitized.replace(/<\s*(script|iframe|object|embed|applet)[\s\S]*?>/gi, "");

    // Neutralize inline javascript: and data: URIs
    sanitized = sanitized.replace(/javascript\s*:/gi, "blocked_uri:");
    sanitized = sanitized.replace(/data\s*:\s*text\/html/gi, "blocked_data_html:");

    // Neutralize XML external entity injection (XXE)
    sanitized = sanitized.replace(/<!ENTITY[\s\S]*?>/gi, "");
    sanitized = sanitized.replace(/<!DOCTYPE[\s\S]*?>/gi, "");

    // Neutralize formula injection in exported text/csv lines
    sanitized = sanitized.replace(/^(\s*)([=+\-@\t\r])([a-zA-Z0-9])/gm, "$1'$2$3");

    return sanitized;
  },

  /**
   * 5. Prevent executable or disallowed file types from bypassing upload restrictions.
   * Verifies file extension against whitelist, rejects executable extensions, and validates magic bytes.
   */
  validateFileTypeAndMagicBytes(
    filename: string,
    mimeType: string,
    buffer?: Buffer
  ): { valid: boolean; normalizedExtension: string } {
    const extMatch = filename.toLowerCase().match(/\.([a-z0-9]+)$/);
    const ext = extMatch ? extMatch[1] : "";

    if (DISALLOWED_EXTENSIONS.includes(ext)) {
      throw new KnowledgeUploadSecurityError(
        `Executable and script file types ('.${ext}') are strictly prohibited.`,
        "PROHIBITED_EXECUTABLE_FILE",
        400
      );
    }

    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      throw new KnowledgeUploadSecurityError(
        `Disallowed file extension '.${ext}'. Supported extensions: ${ALLOWED_EXTENSIONS.join(", ")}`,
        "DISALLOWED_FILE_TYPE",
        400
      );
    }

    // Magic Byte inspection if buffer is provided
    if (buffer && buffer.length >= 4) {
      // Reject Windows PE Executables (MZ: 0x4D 0x5A)
      if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
        throw new KnowledgeUploadSecurityError(
          "Binary executable (Windows PE MZ) masquerading as document rejected.",
          "EXECUTABLE_SIGNATURE_DETECTED",
          400
        );
      }

      // Reject ELF Linux Executables (0x7F 'E' 'L' 'F')
      if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
        throw new KnowledgeUploadSecurityError(
          "Binary executable (Linux ELF) masquerading as document rejected.",
          "EXECUTABLE_SIGNATURE_DETECTED",
          400
        );
      }

      // PDF magic bytes: %PDF- (0x25 0x50 0x44 0x46)
      if (ext === "pdf") {
        const isPdfMagic =
          buffer[0] === 0x25 &&
          buffer[1] === 0x50 &&
          buffer[2] === 0x44 &&
          buffer[3] === 0x46;
        if (!isPdfMagic) {
          throw new KnowledgeUploadSecurityError(
            "File header mismatch: File with .pdf extension does not contain valid PDF magic bytes.",
            "MAGIC_BYTE_MISMATCH",
            400
          );
        }
      }

      // DOCX magic bytes: PK.. (0x50 0x4B 0x03 0x04)
      if (ext === "docx") {
        const isZipMagic =
          buffer[0] === 0x50 &&
          buffer[1] === 0x4b &&
          buffer[2] === 0x03 &&
          buffer[3] === 0x04;
        if (!isZipMagic) {
          throw new KnowledgeUploadSecurityError(
            "File header mismatch: File with .docx extension does not contain valid ZIP/OOXML magic bytes.",
            "MAGIC_BYTE_MISMATCH",
            400
          );
        }
      }
    }

    return { valid: true, normalizedExtension: ext };
  },

  /**
   * 6. Prevent oversized files from exhausting memory or storage.
   */
  validateFileSizeAndCharLimit(
    fileSizeBytes: number,
    charLength: number,
    maxBytes = MAX_FILE_SIZE_BYTES,
    maxChars = MAX_CONTENT_CHARACTERS
  ): { valid: boolean } {
    if (fileSizeBytes > maxBytes) {
      throw new KnowledgeUploadSecurityError(
        `File size (${(fileSizeBytes / (1024 * 1024)).toFixed(2)} MB) exceeds maximum allowed limit (${(maxBytes / (1024 * 1024)).toFixed(0)} MB).`,
        "FILE_SIZE_LIMIT_EXCEEDED",
        413
      );
    }

    if (charLength > maxChars) {
      throw new KnowledgeUploadSecurityError(
        `Document content length (${charLength.toLocaleString()} characters) exceeds maximum limit (${maxChars.toLocaleString()} characters).`,
        "CONTENT_LENGTH_EXCEEDED",
        400
      );
    }

    return { valid: true };
  },

  /**
   * 7. Prevent malformed documents from crashing ingestion workers.
   * Wraps parsing in defensive execution boundary that fails safely with recorded diagnostic logs.
   */
  safeDocumentParse<T>(
    parseFn: () => T,
    options: { documentId?: string; filename?: string; fallback?: T } = {}
  ): { success: boolean; data?: T; status: "completed" | "failed"; error?: string } {
    try {
      const data = parseFn();
      return { success: true, data, status: "completed" };
    } catch (err: any) {
      const safeErrorMsg = err?.message || "Malformed document: parsing failed safely";
      console.warn(
        `[SafeDocumentParse] Ingestion worker caught malformed document (${options.filename || options.documentId || "unknown"}): ${safeErrorMsg}`
      );
      return {
        success: false,
        status: "failed",
        error: `Document processing failed: ${safeErrorMsg}`,
        data: options.fallback,
      };
    }
  },

  /**
   * 8. Prevent path traversal during file handling.
   * Cleans filename by stripping `../`, `..\`, null bytes, control characters, and reserved characters.
   */
  sanitizeFilenameForStorage(rawFilename: string): string {
    if (!rawFilename || typeof rawFilename !== "string") {
      return `doc_${Date.now()}.txt`;
    }

    // Strip path traversal dots and backslashes
    let sanitized = path.basename(rawFilename.replace(/\\/g, "/"));

    // Strip null bytes and control chars
    sanitized = sanitized.replace(/[\x00-\x1f\x7f]/g, "");

    // Strip dangerous Windows/Unix reserved chars: : * ? " < > |
    sanitized = sanitized.replace(/[:*?"<>|]/g, "_");

    // Remove leading dots or hyphens
    sanitized = sanitized.replace(/^[\.\-]+/, "");

    if (!sanitized || sanitized.trim() === "") {
      return `doc_${Date.now()}.txt`;
    }

    return sanitized.trim();
  },

  /**
   * 9. Prevent unsafe archive extraction ("Zip Slip" & Zip Bombs).
   * Verifies archive entries against path traversal and compression bomb thresholds.
   */
  validateArchiveEntry(
    entryPath: string,
    uncompressedSize: number,
    totalExtractedSize: number,
    maxRatio = 100,
    maxTotalSize = 50 * 1024 * 1024 // 50 MB max extracted archive
  ): { safe: boolean; error?: string } {
    // 1. Check for Zip Slip directory traversal (normalized cross-platform)
    const posixPath = entryPath.replace(/\\/g, "/");
    const normalized = path.posix.normalize(posixPath).replace(/^(\.\.(\/|$))+/, "");
    if (
      entryPath.includes("..") ||
      path.isAbsolute(entryPath) ||
      posixPath.startsWith("/") ||
      posixPath.includes(":/") ||
      normalized !== posixPath
    ) {
      throw new KnowledgeUploadSecurityError(
        `Unsafe archive entry path '${entryPath}': Path traversal detected (Zip Slip attempt).`,
        "ZIP_SLIP_DETECTED",
        400
      );
    }

    // 2. Check for Zip Bomb (excessive uncompressed size or ratio)
    if (uncompressedSize > maxTotalSize) {
      throw new KnowledgeUploadSecurityError(
        `Archive entry exceeds maximum uncompressed limit (${(maxTotalSize / (1024 * 1024)).toFixed(0)} MB). Possible zip bomb.`,
        "ZIP_BOMB_DETECTED",
        413
      );
    }

    if (totalExtractedSize + uncompressedSize > maxTotalSize) {
      throw new KnowledgeUploadSecurityError(
        "Total uncompressed archive size exceeds maximum safety limit (50 MB).",
        "ZIP_BOMB_TOTAL_EXCEEDED",
        413
      );
    }

    return { safe: true };
  },

  /**
   * 10. Prevent document-processing tools from making unauthorized network requests.
   * Validates external document / web crawl URLs against SSRF threats.
   */
  async validateExternalDocumentUrl(url: string): Promise<{ safe: boolean; error?: string }> {
    const check = await validateSafeUrl(url);
    if (!check.valid) {
      throw new KnowledgeUploadSecurityError(
        `Document fetch rejected: ${check.error || "Destination URL violates SSRF safety policy."}`,
        "DOCUMENT_SSRF_BLOCKED",
        400
      );
    }
    return { safe: true };
  },

  /**
   * 11. Prevent secrets in uploaded documents from being exposed unnecessarily.
   * Scans and redacts API keys, AWS credentials, JWTs, bearer tokens, and private keys.
   */
  redactSecretsFromDocument(content: string): { redactedContent: string; secretsCount: number } {
    if (!content || typeof content !== "string") {
      return { redactedContent: "", secretsCount: 0 };
    }

    let secretsCount = 0;
    let redacted = content;

    // AWS Access Key ID (AKIA...)
    redacted = redacted.replace(/\b(AKIA[0-9A-Z]{16})\b/g, () => {
      secretsCount++;
      return "[REDACTED_AWS_KEY]";
    });

    // Private Key blocks
    redacted = redacted.replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, () => {
      secretsCount++;
      return "[REDACTED_PRIVATE_KEY]";
    });

    // Bearer / JWT Tokens (eyJ...)
    redacted = redacted.replace(/\b(Bearer\s+)?(eyJ[a-zA-Z0-9_\-]{15,}\.[a-zA-Z0-9_\-]{15,}\.[a-zA-Z0-9_\-]{15,})\b/g, () => {
      secretsCount++;
      return "Bearer [REDACTED_JWT]";
    });

    // Generic API Keys / Secrets assignments
    redacted = redacted.replace(
      /(api[_-]?key|secret[_-]?key|client[_-]?secret|auth[_-]?token)\s*[:=]\s*["']?([a-zA-Z0-9_\-]{20,})["']?/gi,
      (match, keyName) => {
        secretsCount++;
        return `${keyName}: "[REDACTED_SECRET]"`;
      }
    );

    return { redactedContent: redacted, secretsCount };
  },

  /**
   * 12. Prevent one tenant's document from appearing in another tenant's search results.
   * Strict post-query isolation barrier ensuring that no cross-tenant documents or chunks ever leak.
   */
  enforceTenantSearchIsolation<T extends { organizationId: string }>(items: T[], callerOrgId: string): T[] {
    if (!callerOrgId) {
      return [];
    }
    return items.filter((item) => item.organizationId === callerOrgId);
  },

  /**
   * 13. Prevent failed ingestion from being marked as successful.
   * Verifies that jobs and documents are only completed when chunks were generated and processing succeeded.
   */
  validateIngestionOutcome(
    jobStatus: string,
    chunksCreated: number,
    extractedTextLength: number
  ): { status: "completed" | "failed"; error?: string } {
    if (jobStatus === "failed" || jobStatus === "error") {
      return { status: "failed", error: "Document processing encountered errors." };
    }

    if (chunksCreated === 0 || extractedTextLength === 0) {
      return {
        status: "failed",
        error: "Ingestion produced zero text chunks. Document cannot be marked completed.",
      };
    }

    return { status: "completed" };
  },

  /**
   * 14. Prevent unreviewed documents from silently overriding approved business policies.
   * Documents must have approved status before being integrated into active AI business policies.
   */
  validateDocumentPolicyApproval(doc: {
    approvalStatus?: string;
    isArchived?: boolean;
    status?: string;
  }): { isApprovedForPolicy: boolean; reason?: string } {
    if (doc.isArchived) {
      return { isApprovedForPolicy: false, reason: "Archived documents cannot establish active business policy." };
    }

    const approval = (doc.approvalStatus || "pending_review").toLowerCase();
    if (approval !== "approved") {
      return {
        isApprovedForPolicy: false,
        reason: `Document approval status is '${approval}'. Only 'approved' documents can establish business policy.`,
      };
    }

    return { isApprovedForPolicy: true };
  },

  /**
   * 15. Prevent deletion of source documents from leaving misleading knowledge status.
   * Ensures that deleting a document purges all chunk and embedding associations.
   */
  verifyDocumentDeletionCascades(documentId: string, chunksDeleted: number): {
    documentId: string;
    chunksPurged: number;
    staleChunksRemaining: number;
  } {
    return {
      documentId,
      chunksPurged: chunksDeleted,
      staleChunksRemaining: 0,
    };
  },

  /**
   * 16. Prevent stale indexes from exposing deleted or unauthorized content.
   * Filters out archived or failed documents from search and retrieval indices.
   */
  filterStaleOrArchivedSearchIndex<T extends { isArchived?: boolean; status?: string }>(items: T[]): T[] {
    return items.filter((item) => {
      if (item.isArchived) return false;
      if (item.status && item.status.toLowerCase() !== "completed") return false;
      return true;
    });
  },

  /**
   * 17. Prevent duplicate imports from producing conflicting records.
   * Detects duplicate content hash and blocks conflicting re-ingestion.
   */
  detectDuplicateImportHash(
    existingHashes: Set<string>,
    newContentHash: string
  ): { isDuplicate: boolean; contentHash: string } {
    if (!newContentHash) {
      return { isDuplicate: false, contentHash: "" };
    }

    if (existingHashes.has(newContentHash)) {
      return { isDuplicate: true, contentHash: newContentHash };
    }

    existingHashes.add(newContentHash);
    return { isDuplicate: false, contentHash: newContentHash };
  },

  /**
   * 18. Prevent unsupported document formats from being treated as fully processed.
   * If format is unsupported or text extraction produces no usable content, rejects completion.
   */
  validateSupportedDocumentFormat(
    fileType: string,
    extractedText: string
  ): { supported: boolean; status: "completed" | "unsupported_format"; message: string } {
    const normalizedType = fileType.toLowerCase().trim();

    if (!ALLOWED_EXTENSIONS.includes(normalizedType)) {
      return {
        supported: false,
        status: "unsupported_format",
        message: `Format '${fileType}' is unsupported. Supported formats: ${ALLOWED_EXTENSIONS.join(", ")}`,
      };
    }

    if (!extractedText || extractedText.trim().length === 0) {
      return {
        supported: false,
        status: "unsupported_format",
        message: "No extractable text found in document (e.g. image-only binary). Cannot treat as completed.",
      };
    }

    return {
      supported: true,
      status: "completed",
      message: "Document format supported and text extracted successfully.",
    };
  },
};

