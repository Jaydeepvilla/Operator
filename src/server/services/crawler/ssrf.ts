import dns from "dns/promises";
import net from "net";

/**
 * Checks if an IPv4 address is in a private, loopback, link-local, or reserved range.
 */
export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) return true;

  const [b0, b1] = parts;

  // 0.0.0.0/8 (Current network)
  if (b0 === 0) return true;
  // 10.0.0.0/8 (Private RFC 1918)
  if (b0 === 10) return true;
  // 100.64.0.0/10 (Shared Address Space / Carrier-Grade NAT RFC 6598)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;
  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;
  // 169.254.0.0/16 (Link-local / Cloud metadata e.g. AWS 169.254.169.254)
  if (b0 === 169 && b1 === 254) return true;
  // 172.16.0.0/12 (Private RFC 1918)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;
  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (b0 === 192 && b1 === 0 && parts[2] === 0) return true;
  // 192.0.2.0/24 (TEST-NET-1)
  if (b0 === 192 && b1 === 0 && parts[2] === 2) return true;
  // 192.168.0.0/16 (Private RFC 1918)
  if (b0 === 192 && b1 === 168) return true;
  // 198.18.0.0/15 (Benchmarking)
  if (b0 === 198 && (b1 === 18 || b1 === 19)) return true;
  // 198.51.100.0/24 (TEST-NET-2)
  if (b0 === 198 && b1 === 51 && parts[2] === 100) return true;
  // 203.0.113.0/24 (TEST-NET-3)
  if (b0 === 203 && b1 === 0 && parts[2] === 113) return true;
  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
  if (b0 >= 224) return true;

  return false;
}

/**
 * Checks if an IPv6 address is private, loopback, link-local, or documentation.
 */
export function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  // Loopback (::1) and Unspecified (::)
  if (normalized === "::1" || normalized === "::" || normalized === "0000:0000:0000:0000:0000:0000:0000:0001") return true;
  // Link-local (fe80::/10)
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true;
  // Unique local addresses (fc00::/7 - fc00 to fdff)
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  // Documentation prefix (2001:db8::/32)
  if (normalized.startsWith("2001:db8:") || normalized.startsWith("2001:0db8:")) return true;
  // IPv4-mapped IPv6 addresses (::ffff:0:0/96 or ::ffff:a.b.c.d or hex representation like ::ffff:7f00:1)
  if (normalized.startsWith("::ffff:") || normalized.startsWith("0:0:0:0:0:ffff:")) {
    const afterFfff = normalized.replace(/^(::ffff:|0:0:0:0:0:ffff:)/, "");
    if (net.isIPv4(afterFfff)) {
      return isPrivateIPv4(afterFfff);
    }
    // Handle hex representation like 7f00:1 or 7f00:0001
    const hexParts = afterFfff.split(":");
    if (hexParts.length === 2) {
      const h0 = parseInt(hexParts[0], 16);
      const h1 = parseInt(hexParts[1], 16);
      if (!isNaN(h0) && !isNaN(h1)) {
        const b0 = (h0 >> 8) & 0xff;
        const b1 = h0 & 0xff;
        const b2 = (h1 >> 8) & 0xff;
        const b3 = h1 & 0xff;
        return isPrivateIPv4(`${b0}.${b1}.${b2}.${b3}`);
      }
    }
    return true; // Any other ::ffff: address is unsafe/reserved
  }
  // IPv4-compatible IPv6 (deprecated ::a.b.c.d)
  if (normalized.startsWith("::") && normalized.includes(".")) {
    const ipv4Part = normalized.slice(2);
    if (net.isIPv4(ipv4Part)) {
      return isPrivateIPv4(ipv4Part);
    }
  }
  return false;
}

/**
 * Validates a target URL against SSRF threats:
 * 1. Requires http: or https:
 * 2. Blocks loopback, private ranges, link-local (169.254.0.0/16), and IPv6 equivalents
 * 3. Resolves DNS to check destination IPs
 */
export async function validateSafeUrl(rawUrl: string): Promise<{ valid: boolean; error?: string; parsedUrl?: URL }> {
  try {
    const trimmed = rawUrl.trim();
    if (!trimmed) {
      return { valid: false, error: "URL cannot be empty" };
    }

    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      try {
        url = new URL(`https://${trimmed}`);
      } catch {
        return { valid: false, error: "Invalid URL format" };
      }
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { valid: false, error: `Unsupported protocol '${url.protocol}'. Only HTTP and HTTPS are allowed.` };
    }

    let hostname = url.hostname.toLowerCase();
    // Normalize IPv6 enclosed in brackets
    if (hostname.startsWith("[") && hostname.endsWith("]")) {
      hostname = hostname.slice(1, -1);
    }

    // Strictly forbidden cloud metadata and link-local destinations
    if (
      hostname === "169.254.169.254" ||
      hostname.startsWith("169.254.") ||
      hostname === "0.0.0.0"
    ) {
      return { valid: false, error: "Access to private IP or cloud metadata endpoint is forbidden." };
    }

    // Check dangerous hostnames
    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal") ||
      hostname.endsWith(".corp") ||
      hostname.endsWith(".home.arpa")
    ) {
      return { valid: false, error: `Access to local/internal hostname '${hostname}' is forbidden.` };
    }

    // If hostname is directly an IP literal
    if (net.isIP(hostname)) {
      if (net.isIPv4(hostname) && isPrivateIPv4(hostname)) {
        return { valid: false, error: `Access to private IP '${hostname}' is forbidden.` };
      }
      if (net.isIPv6(hostname) && isPrivateIPv6(hostname)) {
        return { valid: false, error: `Access to private IPv6 '${hostname}' is forbidden.` };
      }
    } else {
      // Resolve DNS to verify all resolved IPs
      try {
        const lookupPromise = dns.lookup(hostname, { all: true });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("DNS resolution timed out")), 3500)
        );
        const lookupResults = await Promise.race([lookupPromise, timeoutPromise]);
        for (const record of lookupResults) {
          if (record.family === 4 && isPrivateIPv4(record.address)) {
            return { valid: false, error: `Hostname '${hostname}' resolves to private IP (${record.address}). Access is forbidden.` };
          }
          if (record.family === 6 && isPrivateIPv6(record.address)) {
            return { valid: false, error: `Hostname '${hostname}' resolves to private IPv6 (${record.address}). Access is forbidden.` };
          }
        }
      } catch (dnsErr: any) {
        if (dnsErr.message?.includes("timed out")) {
          return { valid: false, error: `DNS lookup timed out for '${hostname}'` };
        } else {
          return { valid: false, error: `Could not resolve hostname '${hostname}': ${dnsErr.message || "DNS lookup failed"}` };
        }
      }
    }

    return { valid: true, parsedUrl: url };
  } catch (err: any) {
    return { valid: false, error: err?.message || "URL validation failed" };
  }
}

/**
 * Safe fetch with timeout, response size limits, and redirect validation.
 */
export async function safeFetch(
  targetUrl: string,
  options: {
    timeoutMs?: number;
    maxSizeBytes?: number;
    userAgent?: string;
    maxRedirects?: number;
  } = {}
): Promise<{ ok: boolean; status: number; html: string; finalUrl: string; contentType: string }> {
  const timeoutMs = options.timeoutMs ?? 10000;
  const maxSizeBytes = options.maxSizeBytes ?? 5 * 1024 * 1024; // 5 MB
  const userAgent = options.userAgent ?? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  const maxRedirects = options.maxRedirects ?? 5;

  let currentUrl = targetUrl;
  let redirectsCount = 0;

  while (redirectsCount <= maxRedirects) {
    const validation = await validateSafeUrl(currentUrl);
    if (!validation.valid || !validation.parsedUrl) {
      throw new Error(`SSRF validation failed: ${validation.error}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(currentUrl, {
        method: "GET",
        headers: {
          "User-Agent": userAgent,
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "manual", // Handle redirects manually to validate each target URL
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle Redirects
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        if (!location) {
          throw new Error(`Redirect status ${response.status} returned without Location header`);
        }
        redirectsCount++;
        const resolvedRedirectUrl = new URL(location, currentUrl).toString();
        currentUrl = resolvedRedirectUrl;
        continue;
      }

      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          html: "",
          finalUrl: currentUrl,
          contentType: response.headers.get("content-type") || "",
        };
      }

      const contentType = response.headers.get("content-type") || "";
      const contentLengthHeader = response.headers.get("content-length");
      if (contentLengthHeader && parseInt(contentLengthHeader, 10) > maxSizeBytes) {
        throw new Error(`Response size (${contentLengthHeader} bytes) exceeds limit of ${maxSizeBytes} bytes.`);
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > maxSizeBytes) {
        throw new Error(`Downloaded response size exceeds limit of ${maxSizeBytes} bytes.`);
      }

      const html = new TextDecoder("utf-8").decode(arrayBuffer);

      return {
        ok: true,
        status: response.status,
        html,
        finalUrl: currentUrl,
        contentType,
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        throw new Error(`Request to ${currentUrl} timed out after ${timeoutMs}ms`);
      }
      throw err;
    }
  }

  throw new Error(`Exceeded maximum redirect limit of ${maxRedirects}`);
}
