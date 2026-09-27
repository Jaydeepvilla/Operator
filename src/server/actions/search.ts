"use server";

import { requireOrganizationAccess, AuthorizationError } from "@/lib/auth/server";
import { executeGlobalSearch } from "../services/search/global-search";
import { GlobalSearchResponse, SearchOptions } from "@/lib/search/types";

/**
 * Server Action: Performs an authenticated global search across all authorized Operator resources.
 * 
 * SECURITY GUARANTEES:
 * 1. Requires active, valid user session.
 * 2. Requires active, authorized organization context (resolved server-side, never from client input).
 * 3. Sanitizes user search input to prevent SQL wildcard attacks and buffer exhaustion.
 * 4. Never exposes internal stack traces or database connection details to the client.
 */
export async function performGlobalSearchAction(
  query: string,
  options?: SearchOptions
): Promise<GlobalSearchResponse> {
  try {
    const { organizationId } = await requireOrganizationAccess();

    if (!organizationId) {
      return {
        success: false,
        query: query || "",
        totalResults: 0,
        results: {
          contacts: [],
          appointments: [],
          knowledge: [],
          faqs: [],
          services: [],
          calls: [],
          navigation: [],
        },
        error: "Unauthorized: Active organization session required.",
      };
    }

    return await executeGlobalSearch(organizationId, query, options);
  } catch (error: any) {
    if (error instanceof AuthorizationError) {
      return {
        success: false,
        query: query || "",
        totalResults: 0,
        results: {
          contacts: [],
          appointments: [],
          knowledge: [],
          faqs: [],
          services: [],
          calls: [],
          navigation: [],
        },
        error: "Unauthorized: Please sign in to access search.",
      };
    }

    console.error("Unhandled error in performGlobalSearchAction:", error);
    return {
      success: false,
      query: query || "",
      totalResults: 0,
      results: {
        contacts: [],
        appointments: [],
        knowledge: [],
        faqs: [],
        services: [],
        calls: [],
        navigation: [],
      },
      error: "Search service is currently unavailable. Please try again.",
    };
  }
}
