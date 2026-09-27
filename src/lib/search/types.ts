export type SearchResourceType =
  | "contact"
  | "appointment"
  | "knowledge"
  | "faq"
  | "service"
  | "call"
  | "navigation";

export interface SearchResultItem {
  id: string;
  type: SearchResourceType;
  title: string;
  description?: string | null;
  metadata?: string | null;
  badge?: string | null;
  href: string;
  timestamp?: string | null;
  relevanceScore?: number;
}

export interface SearchResultsGrouped {
  contacts: SearchResultItem[];
  appointments: SearchResultItem[];
  knowledge: SearchResultItem[];
  faqs: SearchResultItem[];
  services: SearchResultItem[];
  calls: SearchResultItem[];
  navigation: SearchResultItem[];
}

export interface GlobalSearchResponse {
  success: boolean;
  query: string;
  totalResults: number;
  results: SearchResultsGrouped;
  error?: string;
}

export interface SearchOptions {
  limitPerCategory?: number;
  categories?: SearchResourceType[];
}
