/**
 * WhatsApp Message Library Type Definitions
 * Based on "WhatsApp Message Library for Operator" (31 Oct 2026 · @Jaydeep)
 */

export type WhatsAppLanguage = "en" | "hi" | "hinglish";

export type WhatsAppIndustry =
  | "salon"
  | "clinic"
  | "spa"
  | "gym"
  | "vet"
  | "auto"
  | "tutor"
  | "photo"
  | "general";

export interface WhatsAppReplyButton {
  id: string;
  title: string; // Max 20 characters per WhatsApp Business API rule
}

export interface WhatsAppListRow {
  id: string;
  title: string; // Max 24 characters per WhatsApp Business API rule
  description?: string; // Max 72 characters
}

export interface WhatsAppListSection {
  title?: string;
  rows: WhatsAppListRow[];
}

export interface WhatsAppFreeReply {
  id: string;
  section: string; // e.g. "2.1", "3.7", "7.1.1"
  name: string;
  category: "service" | "utility" | "care";
  body: string;
  buttons?: WhatsAppReplyButton[]; // Max 3
  listButton?: string; // Max 20 characters
  listTitle?: string;
  listRows?: WhatsAppListRow[];
  listSections?: WhatsAppListSection[]; // Max 10 rows total
  handoverToHuman?: boolean;
  priorityHumanHandover?: boolean;
  hindi?: {
    body: string;
    buttons?: WhatsAppReplyButton[];
    listButton?: string;
  };
  hinglish?: {
    body: string;
    buttons?: WhatsAppReplyButton[];
    listButton?: string;
  };
}

export interface WhatsAppMetaTemplate {
  name: string; // e.g. "op_booking_confirmed_v1"
  category: "UTILITY" | "MARKETING" | "AUTHENTICATION";
  body: string;
  variableNames: string[]; // e.g. ["customer_name", "business_name", "service", "date", "time", "booking_ref"]
  samples: Record<string, string>;
  sample_variables?: Record<string, string>;
  header?: string;
  footer?: string;
  quickReplies?: string[]; // Max 10, max 25 chars each
  quick_replies?: Array<{ label: string }>;
  urlButton?: {
    label: string;
    url: string;
  };
  phoneNumberButton?: {
    label: string;
    phoneNumber: string;
  };
}

export type WhatsAppIntentKey = string;

export interface WhatsAppReplyPayload {
  type: "text" | "interactive_buttons" | "list" | "template";
  body: string;
  buttons?: WhatsAppReplyButton[];
  listRows?: WhatsAppListRow[];
  listSections?: WhatsAppListSection[];
  listButton?: string;
  header?: string;
  footer?: string;
}

export interface WhatsAppTriggerMatch {
  intent: WhatsAppIntentKey;
  confidence: number;
  priority: number;
  isCompound: boolean;
  compoundIntents?: WhatsAppIntentKey[];
}

export interface WhatsAppServiceItem {
  id: string;
  name: string;
  price?: string | null;
  duration?: number | null;
  description?: string | null;
}

export interface WhatsAppVariableContext {
  available_services?: WhatsAppServiceItem[];
  service_list?: string;
  waitlist_position?: number | string;
  hold_mins?: number | string;
  customer_name?: string;
  business_name?: string;
  service?: string;
  staff?: string;
  date?: string;
  time?: string;
  duration?: string;
  price?: string;
  deposit?: string;
  address?: string;
  maps_link?: string;
  phone?: string;
  hours_today?: string;
  booking_ref?: string;
  manage_link?: string;
  payment_link?: string;
  review_link?: string;
  cancel_policy?: string;
  cancel_policy_short?: string;
  hours_week?: string;
  holiday_name?: string;
  next_open?: string;
  parking_info?: string;
  email?: string;
  lowest_price?: string;
  service_description?: string;
  service_note?: string;
  staff_services?: string;
  staff_role?: string;
  deposit_policy?: string;
  deposit_note?: string;
  late_policy?: string;
  noshow_policy?: string;
  refund_policy?: string;
  refund_note?: string;
  walkin_policy?: string;
  payment_methods?: string;
  offers_list?: string;
  requested_service?: string;
  requested_item?: string;
  closest_options?: string;
  website?: string;
  instagram?: string;
  alt_1?: string;
  alt_2?: string;
  alt_3?: string;
  customer_phone?: string;
  hold_minutes?: string | number;
  minutes_left?: string | number;
  grace_until?: string;
  new_date?: string;
  new_time?: string;
  policy_hours?: string | number;
  late_change_policy?: string;
  last_service?: string;
  last_staff?: string;
  min_notice?: string;
  earliest?: string;
  max_advance_days?: string | number;
  owner_name?: string;
  response_time?: string;
  handback_hours?: string | number;
  privacy_link?: string;
  aftercare_text?: string;
  plan_name?: string;
  expiry_date?: string;
  valid_until?: string;
  offer_text?: string;
  max_marketing_per_month?: number;
  // Industry specific variables
  consult_price_note?: string;
  patch_hours?: string | number;
  bridal_note?: string;
  product_answer?: string;
  arrive_early?: string | number;
  bring_list?: string;
  staff_list?: string;
  doctor?: string;
  insurance_note?: string;
  prep_note?: string;
  popular_services?: string;
  staff_preference?: string;
  package_list?: string;
  trial_offer?: string;
  timetable?: string;
  membership_list?: string;
  vaccine_note?: string;
  status_note?: string;
  pickup_note?: string;
  batch_list?: string;
  fee_note?: string;
  delivery_time?: string;
}

export type IntentPriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface TriggerMatch {
  templateId: string;
  priority: IntentPriority;
  intentName: string;
  confidence: number;
  handoverToHuman: boolean;
  priorityHumanHandover: boolean;
  language: WhatsAppLanguage;
  extractedEntities?: Record<string, any>;
}
