"use client";
import { Badge } from "@/components/shared/badge";
import React, { useState } from "react";
import Image from "next/image";
import { Brain, Globe, Network, Check, Shield, Zap, RefreshCw, Layers } from "lucide-react";
import { Button } from "@/components/shared/button";

/* ── Inline SVG Brand Logos ────────────────────────────────────────────────── */

const GoogleLogo = (props: React.SVGProps<SVGSVGElement>) =>
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
 <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
 <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
 <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
 <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
 </svg>;


const MicrosoftLogo = (props: React.SVGProps<SVGSVGElement>) =>
<svg viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
 <path d="M0 0h11v11H0z" fill="#F25022" />
 <path d="M12 0h11v11H12z" fill="#7FBA00" />
 <path d="M0 12h11v11H0z" fill="#00A4EF" />
 <path d="M12 12h11v11H12z" fill="#FFB900" />
 </svg>;


const OpenAiLogo = (props: React.SVGProps<SVGSVGElement>) =>
<svg viewBox="0 0 220 232" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
 <path d="M212.59 95.12a57.27 57.27 0 0 0-4.92-47.05 58 58 0 0 0-62.4-27.79A57.29 57.29 0 0 0 102.06 1a57.94 57.94 0 0 0-55.27 40.14A57.31 57.31 0 0 0 8.5 68.93a58 58 0 0 0 7.13 67.94 57.31 57.31 0 0 0 4.92 47A58 58 0 0 0 83 211.72 57.31 57.31 0 0 0 126.16 231a57.94 57.94 0 0 0 55.27-40.14 57.3 57.3 0 0 0 38.28-27.79 57.92 57.92 0 0 0-7.12-67.95zM126.16 216a42.93 42.93 0 0 1-27.58-10c.34-.19 1-.52 1.38-.77l45.8-26.44a7.43 7.43 0 0 0 3.76-6.51V107.7l19.35 11.17a.67.67 0 0 1 .38.54v53.45A43.14 43.14 0 0 1 126.16 216zm-92.59-39.54a43 43 0 0 1-5.15-28.88c.34.21.94.57 1.36.81l45.81 26.45a7.44 7.44 0 0 0 7.52 0L139 142.52v22.34a.67.67 0 0 1-.27.6l-46.3 26.72a43.14 43.14 0 0 1-58.86-15.77zm-12-100A42.92 42.92 0 0 1 44 57.56V112a7.45 7.45 0 0 0 3.76 6.51l55.9 32.28L84.24 162a.68.68 0 0 1-.65.06L37.3 135.33a43.13 43.13 0 0 1-15.77-58.87zm159 37l-55.9-32.28L144 70a.69.69 0 0 1 .65-.06l46.29 26.73a43.1 43.1 0 0 1-6.66 77.76V120a7.44 7.44 0 0 0-3.74-6.54zm19.27-29c-.34-.21-.94-.57-1.36-.81L152.67 57.2a7.44 7.44 0 0 0-7.52 0l-55.9 32.27V67.14a.73.73 0 0 1 .28-.6l46.29-26.72a43.1 43.1 0 0 1 64 44.65zM78.7 124.3l-19.36-11.17a.73.73 0 0 1-.37-.54V59.14A43.09 43.09 0 0 1 129.64 26c-.34.19-.95.52-1.38.77l-45.8 26.44a7.45 7.45 0 0 0-3.76 6.51zm10.51-22.67l24.9-14.38L139 101.63v28.74l-24.9 14.38-24.9-14.38z" />
 </svg>;


const TwilioLogo = (props: React.SVGProps<SVGSVGElement>) =>
<svg viewBox="-313 376 50 50" fill="#f12e45" xmlns="http://www.w3.org/2000/svg" {...props}>
 <path d="M-288 376c-13.8 0-25 11.2-25 25s11.2 25 25 25 25-11.2 25-25-11.2-25-25-25zm0 43.4c-10.2 0-18.4-8.2-18.4-18.4s8.2-18.4 18.4-18.4 18.4 8.2 18.4 18.4-8.2 18.4-18.4 18.4z" />
 <circle cx="-281.8" cy="394.8" r="5.2" />
 <circle cx="-281.8" cy="407.2" r="5.2" />
 <circle cx="-294.2" cy="407.2" r="5.2" />
 <circle cx="-294.2" cy="394.8" r="5.2" />
 </svg>;


const CalendlyLogo = (props: React.SVGProps<SVGSVGElement>) =>
<svg viewBox="50 40 300 260" xmlns="http://www.w3.org/2000/svg" {...props}>
 <path fill="#006bff" d="M231.58,223.23C220.65,232.93,207,245,182.25,245h-14.8c-17.91,0-34.2-6.51-45.86-18.31-11.39-11.53-17.66-27.31-17.66-44.44V162c0-17.13,6.27-32.91,17.66-44.44,11.66-11.8,27.95-18.3,45.86-18.3h14.8c24.78,0,38.4,12.06,49.33,21.76,11.35,10,21.14,18.74,47.25,18.74a75.11,75.11,0,0,0,11.89-.95l-.09-.23a89.53,89.53,0,0,0-5.49-11.28L267.69,97.07a89.65,89.65,0,0,0-77.64-44.82H155.14A89.65,89.65,0,0,0,77.5,97.07L60.05,127.3a89.67,89.67,0,0,0,0,89.65L77.5,247.18A89.65,89.65,0,0,0,155.14,292h34.91a89.65,89.65,0,0,0,77.64-44.82L285.14,217a89.53,89.53,0,0,0,5.49-11.28l.09-.22a74,74,0,0,0-11.89-1c-26.11,0-35.9,8.69-47.25,18.74" />
 <path fill="#006bff" d="M182.25,117.61h-14.8c-27.26,0-45.17,19.47-45.17,44.39v20.25c0,24.92,17.91,44.39,45.17,44.39h14.8c39.72,0,36.6-40.5,96.58-40.5a91.64,91.64,0,0,1,16.94,1.56,89.54,89.54,0,0,0,0-31.15,92.51,92.51,0,0,1-16.94,1.56c-60,0-56.86-40.5-96.58-40.5" />
 <path fill="#006bff" d="M330.23,202.5a83.62,83.62,0,0,0-34.45-14.81c0,.11,0,.2,0,.3a89.7,89.7,0,0,1-5,17.45,65.58,65.58,0,0,1,28.48,11.73c0,.08-.05.18-.08.27a153.57,153.57,0,1,1,0-90.63c0,.09.05.19.08.27a65.45,65.45,0,0,1-28.48,11.72,90.3,90.3,0,0,1,5,17.47,2.33,2.33,0,0,0,0,.28,83.6,83.6,0,0,0,34.45-14.8c9.82-7.27,7.92-15.48,6.43-20.34a172.13,172.13,0,1,0,0,101.43c1.49-4.86,3.39-13.07-6.43-20.34" />
 <path fill="#0ae8f0" d="M290.72,138.8a74,74,0,0,1-11.89,1c-26.11,0-35.9-8.69-47.24-18.74-10.94-9.7-24.56-21.77-49.34-21.77h-14.8c-17.92,0-34.2,6.51-45.86,18.31-11.39,11.53-17.66,27.31-17.66,44.44v20.25c0,17.13,6.27,32.91,17.66,44.44,11.66,11.8,27.94,18.3,45.86,18.3h14.8c24.78,0,38.4-12.06,49.34-21.76,11.34-10,21.13-18.74,47.24-18.74a75.11,75.11,0,0,1,11.89.95,89,89,0,0,0,5-17.45,2.68,2.68,0,0,0,0-.3,92.51,92.51,0,0,0-16.94-1.55c-60,0-56.86,40.51-96.58,40.51h-14.8c-27.26,0-45.17-19.48-45.17-44.4V162c0-24.92,17.91-44.39,45.17-44.39h14.8c39.72,0,36.6,40.49,96.58,40.49a91.64,91.64,0,0,0,16.94-1.55c0-.09,0-.18,0-.28a90.3,90.3,0,0,0-5-17.47" />
 </svg>;


const StripeLogo = (props: React.SVGProps<SVGSVGElement>) =>
<svg viewBox="0 0 512 214" fill="#6772E5" xmlns="http://www.w3.org/2000/svg" {...props}>
 <path d="M35.982 83.484c0-5.546 4.551-7.68 12.09-7.68 10.808 0 24.461 3.272 35.27 9.103V51.484c-11.804-4.693-23.466-6.542-35.27-6.542C19.2 44.942 0 60.018 0 85.192c0 39.252 54.044 32.995 54.044 49.92 0 6.541-5.688 8.675-13.653 8.675-11.804 0-26.88-4.836-38.827-11.378v33.849c13.227 5.689 26.596 8.106 38.827 8.106 29.582 0 49.92-14.648 49.92-40.106-.142-42.382-54.329-34.845-54.329-50.774zm96.142-66.986l-34.702 7.395-.142 113.92c0 21.05 15.787 36.551 36.836 36.551 11.662 0 20.195-2.133 24.888-4.693V140.8c-4.55 1.849-27.022 8.391-27.022-12.658V77.653h27.022V47.36h-27.022l.142-30.862zm71.112 41.386L200.96 47.36h-30.72v124.444h35.556V87.467c8.39-10.951 22.613-8.96 27.022-7.396V47.36c-4.551-1.707-21.191-4.836-29.582 10.524zm38.257-10.524h35.698v124.444h-35.698V47.36zm0-10.809l35.698-7.68V0l-35.698 7.538V36.55zm109.938 8.391c-13.938 0-22.898 6.542-27.875 11.094l-1.85-8.818h-31.288v165.83l35.555-7.537.143-40.249c5.12 3.698 12.657 8.96 25.173 8.96 25.458 0 48.64-20.48 48.64-65.564-.142-41.245-23.609-63.716-48.498-63.716zm-8.533 97.991c-8.391 0-13.37-2.986-16.782-6.684l-.143-52.765c3.698-4.124 8.818-6.968 16.925-6.968 12.942 0 21.902 14.506 21.902 33.137 0 19.058-8.818 33.28-21.902 33.28zM512 110.08c0-36.409-17.636-65.138-51.342-65.138-33.85 0-54.33 28.73-54.33 64.854 0 42.808 24.179 64.426 58.88 64.426 16.925 0 29.725-3.84 39.396-9.244v-28.445c-9.67 4.836-20.764 7.823-34.844 7.823-13.796 0-26.027-4.836-27.591-21.618h69.547c0-1.85.284-9.245.284-12.658zm-70.258-13.511c0-16.071 9.814-22.756 18.774-22.756 8.675 0 17.92 6.685 17.92 22.756h-36.694z" />
 </svg>;


const RazorpayLogo = (props: React.SVGProps<SVGSVGElement>) =>
<svg viewBox="0 0 127 146" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
 <path d="M54.3828 47.1751L47.2567 73.1251L87.4627 47.0438L61.2088 145.65H87.8565L126.656 0L54.3828 47.1751Z" fill="#3395FF" />
 <path d="M11.0641 104.175L0 145.65H54.6643L77.0364 61.2748L11.0641 104.175Z" fill="#0C2651" className="fill-white" />
 </svg>;


const MetaLogo = (props: React.SVGProps<SVGSVGElement>) =>
<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
 <path d="M17.522 6c-1.748 0-3.324.97-4.322 2.502C12.202 6.97 10.626 6 8.878 6 5.637 6 3 8.687 3 12s2.637 6 5.878 6c1.748 0 3.324-.97 4.322-2.502 1 .16 2.576 1.13 4.322 1.13 3.241 0 5.878-2.687 5.878-6S20.763 6 17.522 6zm-8.644 9.6c-2.028 0-3.678-1.615-3.678-3.6 0-1.985 1.65-3.6 3.678-3.6 2.029 0 3.678 1.615 3.678 3.6 0 1.985-1.649 3.6-3.678 3.6zm8.644 0c-2.029 0-3.678-1.615-3.678-3.6 0-1.985 1.649-3.6 3.678-3.6 2.028 0 3.678 1.615 3.678 3.6 0 1.985-1.65 3.6-3.678 3.6z" fill="#0081FB" />
 </svg>;


const IdentityLogo = (props: React.SVGProps<SVGSVGElement>) =>
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" xmlns="http://www.w3.org/2000/svg" {...props}>
 <path d="M12 2L3 7v6c0 5.52 4.48 10 9 10s9-4.48 9-10V7l-9-5z" strokeLinecap="round" strokeLinejoin="round" className="stroke-indigo-500" />
 <path d="M12 11a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" fill="currentColor" className="fill-indigo-500 text-primary" />
 <path d="M7 16.5c0-2.2 2.2-3.5 5-3.5s5 1.3 5 3.5" strokeLinecap="round" className="stroke-indigo-500" />
 </svg>;


const WhatsAppLogo = (props: React.SVGProps<SVGSVGElement>) =>
<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" {...props}>
 <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.456L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.437 0 9.862-4.424 9.865-9.864.001-2.63-1.019-5.101-2.871-6.956C16.364 1.93 13.91 1.9 12.012 1.9c-5.435 0-9.863 4.424-9.866 9.863-.001 1.762.478 3.487 1.39 5.017l-.936 3.422 3.507-.922zm10.74-6.844c-.267-.134-1.582-.78-1.826-.868-.243-.088-.42-.133-.596.134-.176.268-.68.868-.834 1.046-.153.178-.308.2-.575.067-.267-.134-1.13-.417-2.153-1.331-.795-.71-1.333-1.586-1.49-1.854-.156-.268-.017-.413.117-.547.12-.12.267-.313.4-.469.136-.156.182-.268.272-.446.09-.179.045-.335-.022-.469-.067-.134-.596-1.436-.816-1.97-.215-.518-.432-.448-.597-.456-.153-.008-.33-.009-.507-.009-.176 0-.464.067-.707.335-.243.268-.929.907-.929 2.21 0 1.302.946 2.556 1.078 2.735.132.179 1.86 2.84 4.506 3.98.63.272 1.122.434 1.507.556.634.202 1.21.174 1.666.107.508-.075 1.582-.647 1.803-1.272.221-.625.221-1.161.155-1.272-.066-.112-.243-.178-.51-.312z" fill="#25D366" />
 </svg>;




/* ── Types & Interfaces ────────────────────────────────────────────────────── */

type ViewMode = "integration" | "workflow" | "industry";

interface IntegrationData {
  key: string;
  name: string;
  role: string;
  desc: string;
  logo: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  colorBorder: string;
  colorBg: string;
  x: number;
  y: number;
  // Flow connections mapping
  outlets: string[]; // Outcomes triggered by this integration
  pathTrace: string[]; // Sequential flow text representations
  capabilities: string[];
  benefits: string;
  impact: string;
  useCase: string;
}

interface WorkflowData {
  key: string;
  name: string;
  desc: string;
  path: string[]; // Array of keys (Integrations & Outcomes) active in order
  pathLabels: string[]; // Dynamic titles of stages in data flow
  benefits: string;
  impact: string;
  useCases: string[];
}

interface IndustryData {
  key: string;
  name: string;
  desc: string;
  activeIntegrations: string[];
  activeOutcomes: string[];
  outcomeLabels: string[];
  outcomesDesc: string;
  businessImpact: string;
  dialogExample: string;
}

/* ── Data Configuration ────────────────────────────────────────────────────── */

const INTEGRATIONS: Record<string, IntegrationData> = {
  Google: {
    key: "Google",
    name: "Google Calendar & Meet",
    role: "Calendar Sync Engine",
    desc: "Checks calendar availability in real time, reserves appointment slots, schedules video consulting via Google Meet, and secures booking workflows automatically.",
    logo: GoogleLogo,
    color: "text-primary-500",
    colorBorder: "border-primary-500/20 hover:border-primary-500/50",
    colorBg: "bg-primary-500/5",
    x: 155,
    y: 67,
    outlets: ["Calendar"],
    pathTrace: ["Google Calendar", "Operator Core", "Calendar Booking", "Google Meet Link Generated"],
    capabilities: [
    "Real-time Availability Collison Checks",
    "Dynamic Multi-staff Booking Sync",
    "Automatic Google Meet Coordinate Dispatch"],

    benefits: "Ensures calendar state is updated instantly, eliminating manual bookings and double scheduling entirely.",
    impact: "Eliminates manual scheduling friction by 100% and secures 24/7 calendar filling.",
    useCase: "Client books a consultation on Google Calendar during a voice call with Operator AI."
  },
  Microsoft: {
    key: "Microsoft",
    name: "Microsoft Outlook & Office 365",
    role: "Calendar Sync Engine",
    desc: "Synchronizes appointment slots with Outlook calendars, updates Microsoft Office scheduling queues, and matches bookings for enterprise practices.",
    logo: MicrosoftLogo,
    color: "text-warning-500",
    colorBorder: "border-warning-500/20 hover:border-warning-500/50",
    colorBg: "bg-warning-500/5",
    x: 120,
    y: 96,
    outlets: ["Calendar"],
    pathTrace: ["Outlook Calendar", "Operator Core", "Slot Lock Engine", "Confirmation Despatched"],
    capabilities: [
    "Outlook 365 Round-Robin Scheduling",
    "Encrypted Calendar Availability Scans",
    "Corporate Buffer Time Management"],

    benefits: "Coordinates multi-practitioner schedules simultaneously across separate office coordinates.",
    impact: "Boosts staff calendar efficiency by 34% and synchronizes lead bookings with Microsoft Teams portals.",
    useCase: "A corporate legal advisor's calendar is locked instantly when a prospect registers an intake case."
  },
  OpenAI: {
    key: "OpenAI",
    name: "OpenAI GPT-4o Ingestion",
    role: "LLM Reasoning Core",
    desc: "Utilizes dedicated contextual Large Language Models to read uploaded FAQ sheets, evaluate client sentiments, and guide natural dialogue flow.",
    logo: OpenAiLogo,
    color: "text-success-500",
    colorBorder: "border-success-500/20 hover:border-success-500/50",
    colorBg: "bg-success-500/5",
    x: 197,
    y: 52,
    outlets: ["CRM"],
    pathTrace: ["Context Docs", "OpenAI Reasoning Core", "Intent Evaluation", "Action Dispatcher"],
    capabilities: [
    "Instant FAQ Sheet Context Matching",
    "Structured Dialogue Intent Identification",
    "Multi-sentence Conversational Safety Guardrails"],

    benefits: "Allows the AI core to understand objections and context without scripted limitations.",
    impact: "Achieves a 94.5% caller qualification accuracy rate, with expert accuracy.",
    useCase: "The AI answers complex pricing and insurance copay questions on the fly using stored training sheets."
  },
  Twilio: {
    key: "Twilio",
    name: "Twilio Voice & SMS Core",
    role: "Telephony Stream API",
    desc: "Secures low-latency telephone audio ingestion streams and dispatches SMS alerts, reservation receipts, and follow-up links.",
    logo: TwilioLogo,
    color: "text-destructive",
    colorBorder: "border-error-500/20 hover:border-error-500/50",
    colorBg: "bg-destructive/5",
    x: 242,
    y: 52,
    outlets: ["Alerts"],
    pathTrace: ["Inbound VoIP Call", "Twilio SIP Stream", "Operator Audio Engine", "Confirmation SMS dispatched"],
    capabilities: [
    "Ultra-low latency SIP stream bridges",
    "Automated SMS Notification Triggers",
    "Fallback Telephone Routing Nodes"],

    benefits: "Guarantees crystal clear bidirectional speech transmission with less than 120ms network delay.",
    impact: "Captures 100% of missed calls, converting abandoned ring-outs into live appointments.",
    useCase: "An offline caller dials your number at midnight and immediately schedules a consultation via voice dialogue."
  },
  Calendly: {
    key: "Calendly",
    name: "Calendly API Integration",
    role: "Lead Routing Engine",
    desc: "Interfaces directly with team booking pages, managing round-robin practitioner queues and automated intake buffers.",
    logo: CalendlyLogo,
    color: "text-primary",
    colorBorder: "border-primary/20 hover:border-primary/50",
    colorBg: "bg-primary/5",
    x: 285,
    y: 67,
    outlets: ["Calendar"],
    pathTrace: ["Calendly Link", "Operator Core", "Round-Robin routing", "Assigned Booking Lock"],
    capabilities: [
    "Client-facing Web Widget Triggers",
    "Round-robin Staff Slot Allocation",
    "Custom Cancellation & Rescheduling Links"],

    benefits: "Enables flexible client-controlled rescheduling patterns with zero staff friction.",
    impact: "Cuts down customer booking friction, increasing appointment conversion rates by 22%.",
    useCase: "A salon client changes their hair styling appointment slot directly using a self-serve Calendly link."
  },
  Razorpay: {
    key: "Razorpay",
    name: "Razorpay Payments & Invoicing",
    role: "Payments Core",
    desc: "Collects UPI, Credit Cards, Net Banking, and instant payment links directly inside voice calls and WhatsApp chats.",
    logo: RazorpayLogo,
    color: "text-blue-500",
    colorBorder: "border-blue-500/20 hover:border-blue-500/50",
    colorBg: "bg-blue-500/5",
    x: 97,
    y: 224,
    outlets: ["CRM"],
    pathTrace: ["Payment Prompt", "Razorpay API Checkout", "UPI / QR Code Scan", "CRM ledger verified"],
    capabilities: [
    "Native UPI & QR Code fast checkout",
    "Instant dynamic payment link dispatch via WhatsApp/SMS",
    "Webhook payment verification and automatic invoicing"],

    benefits: "Enables instant booking deposit collection and reduces no-shows to near zero with seamless automated payment capture.",
    impact: "Captures 98%+ on-time booking deposits and automates complete billing reconciliations.",
    useCase: "A client books an appointment and immediately receives an automated Razorpay UPI link on WhatsApp to secure their slot."
  },
  Identity: {
    key: "Identity",
    name: "Identity & Access Manager",
    role: "Identity Manager",
    desc: "Secures client portals, creates user auth profiles during registration, and manages role-based access variables.",
    logo: IdentityLogo,
    color: "text-primary",
    colorBorder: "border-primary/20 hover:border-primary/50",
    colorBg: "bg-primary/5",
    x: 97,
    y: 135,
    outlets: ["CRM"],
    pathTrace: ["User Registration", "JWT Auth node", "Profile created", "Secure CRM profile sync"],
    capabilities: [
    "JSON Web Token (JWT) Session Management",
    "Patient / Client Portal Auth safeguards",
    "HIPAA / SOC2 Auth compliance hooks"],

    benefits: "Ensures sensitive business configurations and client details are shielded under verified login layers.",
    impact: "Guarantees 100% data access control, matching standard SOC2 enterprise criteria.",
    useCase: "A patient logs in securely to view their scheduled treatments and session notes."
  },
  Meta: {
    key: "Meta",
    name: "Meta Messenger Core",
    role: "Omnichannel Gateway",
    desc: "Connects business pages across Facebook and Instagram directories, routing incoming lead messages into the AI core.",
    logo: MetaLogo,
    color: "text-primary-600",
    colorBorder: "border-primary-600/20 hover:border-primary-600/50",
    colorBg: "bg-primary-600/5",
    x: 120,
    y: 263,
    outlets: ["Alerts"],
    pathTrace: ["Instagram Message", "Meta API Hook", "Operator Core Analysis", "Outbound DM dispatch"],
    capabilities: [
    "Instagram DM Automation sync",
    "Facebook Page Inbox integration",
    "Context-retaining multi-conversation scaling"],

    benefits: "Turns casual social media browsers into scheduled consultations instantly inside the chat thread.",
    impact: "Boosts inbound social lead volume by 52% and maintains consistent 24/7 engagement.",
    useCase: "A client asks a salon page about pricing on Instagram and books a haircut inside the DM inbox."
  },
  WhatsApp: {
    key: "WhatsApp",
    name: "WhatsApp Business API",
    role: "Mobile Messaging Core",
    desc: "Establishes a direct mobile messaging bridge on the world's most popular messaging app for real-time customer care.",
    logo: WhatsAppLogo,
    color: "text-success-600",
    colorBorder: "border-success-600/20 hover:border-success-600/50",
    colorBg: "bg-success-600/5",
    x: 155,
    y: 292,
    outlets: ["Alerts"],
    pathTrace: ["WhatsApp Inquiry", "WhatsApp Business Node", "Operator response", "Booking links dispatched"],
    capabilities: [
    "Official Meta WhatsApp Cloud API connectivity",
    "Interactive WhatsApp List & Button dispatch",
    "Automated follow-up reminders and alerts"],

    benefits: "Engages clients directly on their lockscreens, achieving 98% notification read rates.",
    impact: "Cuts down appointment cancellation rates by 4x using direct mobile confirmations.",
    useCase: "A client queries appointment availability, selects a slot from a WhatsApp button, and confirms."
  }
};

/* ── Outcomes Map ──────────────────────────────────────────────────────────── */

interface OutcomeNode {
  name: string;
  role: string;
  x: number;
  y: number;
}

const OUTCOMES: Record<string, OutcomeNode> = {
  Calendar: { name: "Calendar Sync", role: "Google & Outlook Integration", x: 380, y: 100 },
  CRM: { name: "CRM Database", role: "Intake & Profile Records", x: 390, y: 180 },
  Alerts: { name: "Alerts & SMS", role: "Dispatches & Reminders", x: 380, y: 260 }
};

/* ── Workflows Configuration ───────────────────────────────────────────────── */

const WORKFLOWS: WorkflowData[] = [
{
  key: "lead",
  name: "Lead Capture & Qualification",
  desc: "A completely automated sequence that handles incoming social/web leads, evaluates client fit, collects context, and coordinates direct booking calendar locks.",
  path: ["WhatsApp", "OpenAI", "CRM", "Alerts"],
  pathLabels: ["Inbound Message", "LLM Reasoning", "CRM Lead Card", "Staff Alert SMS"],
  benefits: "Qualifies prospects instantly 24/7 without manual vetting cycles.",
  impact: "Increases lead intake response times from hours to under 2 seconds, boosting conversion by 40%.",
  useCases: [
  "Website visitor asks about service pricing",
  "AI asks qualification screening questions",
  "Client fits criteria and schedules discovery call",
  "Lead metadata is uploaded to your practice CRM"]

},
{
  key: "voice",
  name: "Inbound Voice Answering",
  desc: "Streams telephone calls, performs real-time speech transcription, references practice context data, guides the booking, and dispatches confirmation texts.",
  path: ["Twilio", "OpenAI", "Google", "Alerts"],
  pathLabels: ["Ringing Call", "Voice transcription", "Availability scan", "Confirmation SMS"],
  benefits: "Captures and books patients over direct telephone calls outside standard working hours.",
  impact: "Recovers 100% of missed telephone revenue, filling vacant calendar slots instantly.",
  useCases: [
  "Patient dials clinic number at 10:00 PM",
  "Voice AI answers caller with natural tone",
  "Checks live Google/Outlook calendars for empty slots",
  "Dispatches calendar invite and SMS coordinate receipt"]

},
{
  key: "payment",
  name: "Pre-Paid Consultations",
  desc: "Integrates secure payment checkout links inside scheduling flows, protecting staff schedules by collecting pre-payments before calendar slots are blocked.",
  path: ["Razorpay", "Google", "CRM", "Alerts"],
  pathLabels: ["Booking request", "UPI Checkout scan", "Calendar slot lock", "SMS Invoice receipt"],
  benefits: "Enforces upfront deposit collection over chat or call before finalizing scheduling permissions.",
  impact: "Reduces appointment cancellation and no-show margins to under 2%.",
  useCases: [
  "Prospect requests case review session",
  "AI generates and dispatches Razorpay checkout link",
  "Client completes UPI checkout transfer",
  "Calendar slot is automatically confirmed and locked"]

}];


/* ── Industries Configuration ──────────────────────────────────────────────── */

const INDUSTRIES: IndustryData[] = [
{
  key: "dental",
  name: "Dental Clinics",
  desc: "Optimized for booking routine cleanings, triaging dental emergencies, checking insurance copays, and dispatching patient reminders.",
  activeIntegrations: ["Google", "Twilio", "Razorpay", "WhatsApp"],
  activeOutcomes: ["Calendar", "CRM", "Alerts"],
  outcomeLabels: ["Clinic Google Calendar", "Dental CRM (Dentrix/OpenDental)", "SMS Treatment Reminder"],
  outcomesDesc: "Coordinates doctor chairs, syncs clinical databases, and dispatches automated post-care SMS.",
  businessImpact: "Saves 15 hours of front-desk scheduling work weekly and recovers $1,200/week in missed appointments.",
  dialogExample: "\"I need to schedule a root canal review tomorrow...\"➔ AI verifies doctor availability, checks insurance, collects diagnostic fee via Razorpay, and books."
},
{
  key: "medical",
  name: "Medical Practices",
  desc: "Engineered for HIPAA-compliant intake operations, patient portal onboarding, clinic schedule sync, and symptom triage checks.",
  activeIntegrations: ["Microsoft", "Twilio", "Identity", "OpenAI"],
  activeOutcomes: ["Calendar", "CRM"],
  outcomeLabels: ["Outlook Shift Board", "EMR Patient Profile Database"],
  outcomesDesc: "Updates physician shift systems, secures patient records via jwt tokens, and structures intakes.",
  businessImpact: "Triages Patient intakes immediately, cutting down wait times by 80% and maintaining strict HIPAA compliance.",
  dialogExample: "\"Hi, I need to register as a new patient...\"➔ AI qualifies symptoms, registers auth profile with Identity, and matches physician schedule."
},
{
  key: "salon",
  name: "Salons & Med Spas",
  desc: "Designed for stylist selection, treatment deposit capture, social media bookings, and post-service reminders.",
  activeIntegrations: ["Calendly", "Stripe", "Razorpay", "Meta", "WhatsApp"],
  activeOutcomes: ["Calendar", "Alerts"],
  outcomeLabels: ["Stylist Calendly Board", "SMS Style reminder details"],
  outcomesDesc: "Routes bookings across stylist round-robin pools and enforces reservation deposit rules.",
  businessImpact: "Boosts beauty chair utilization rate from 65% to 94% through Instagram DM conversions.",
  dialogExample: "\"Can I book a facial tomorrow at 4pm?\"➔ AI generates deposit checkout, collects card payment, and locks slot."
},
{
  key: "law",
  name: "Law Firms",
  desc: "Vetted for lead qualification, screening case details, booking consultations, and updating firm CRM databases.",
  activeIntegrations: ["Google", "OpenAI", "Identity", "Microsoft"],
  activeOutcomes: ["CRM"],
  outcomeLabels: ["Legal CRM (Clio/Hubspot) intake database"],
  outcomesDesc: "Vets prospective client cases against eligibility guidelines and syncs profiles instantly.",
  businessImpact: "Screens and filters out unqualified cases automatically, saving lawyers 10+ hours weekly.",
  dialogExample: "\"I have a contract dispute case...\"➔ AI gathers details, qualifies case based on practice areas, and syncs dossier to Clio."
},
{
  key: "gym",
  name: "Gyms & Fitness Studios",
  desc: "Built for scheduling trial sessions, enrolling new memberships, managing billing profiles, and sending class reminders.",
  activeIntegrations: ["WhatsApp", "Twilio", "Razorpay", "Identity"],
  activeOutcomes: ["Calendar", "CRM", "Alerts"],
  outcomeLabels: ["Class Booking Grid", "Mindbody CRM Sync", "WhatsApp QR code pass"],
  outcomesDesc: "Registers membership accounts, logs monthly direct-debit schedules, and dispatches alerts.",
  businessImpact: "Increases studio membership signups by 35% through lockscreen SMS follow-up alerts.",
  dialogExample: "\"Can I book a trial yoga class?\"➔ AI registers profile, processes recurring payment checkout, and text-alerts class pass."
}];


/* ── Main Component ────────────────────────────────────────────────────────── */

export function EcosystemViewer() {
  const [viewMode, setViewMode] = useState<ViewMode>("integration");
  const [selectedNode, setSelectedNode] = useState<string>("Google");
  const [activeWorkflow, setActiveWorkflow] = useState<string>("lead");
  const [activeIndustry, setActiveIndustry] = useState<string>("dental");

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    if (mode === "integration") {
      setSelectedNode("Google");
    } else if (mode === "workflow") {
      setActiveWorkflow("lead");
    } else if (mode === "industry") {
      setActiveIndustry("dental");
    }
  };

  /* ── Line Helper Classes ───────────────────────────────────────────────────── */

  const isPathActive = (from: string, to: string) => {
    if (viewMode === "integration") {
      // Integration Mode: Line from active integration to Center (Hub)
      if (to === "Hub" && from === selectedNode) return true;
      // Line from Center (Hub) to matching outcomes
      if (from === "Hub") {
        const nodeData = INTEGRATIONS[selectedNode];
        return nodeData ? nodeData.outlets.includes(to) : false;
      }
    } else if (viewMode === "workflow") {
      // Workflow Mode: Line from integrations inside active workflow path to Center (Hub)
      const workflow = WORKFLOWS.find((w) => w.key === activeWorkflow);
      if (!workflow) return false;

      if (to === "Hub") {
        return workflow.path.includes(from);
      }
      if (from === "Hub") {
        return workflow.path.includes(to);
      }
    } else if (viewMode === "industry") {
      // Industry Mode: Line active for industry integrations
      const industry = INDUSTRIES.find((i) => i.key === activeIndustry);
      if (!industry) return false;

      if (to === "Hub") {
        return industry.activeIntegrations.includes(from);
      }
      if (from === "Hub") {
        return industry.activeOutcomes.includes(to);
      }
    }
    return false;
  };

  const getLineStyles = (from: string, to: string) => {
    const active = isPathActive(from, to);
    if (!active) {
      return {
        stroke: "hsl(var(--foreground)/0.03)",
        strokeWidth: 0.5,
        strokeDasharray: "none",
        className: ""
      };
    }
    // Highlight colors based on integration color traits
    let color = "stroke-primary";
    if (viewMode === "integration" && INTEGRATIONS[selectedNode]) {
      const traitColor = INTEGRATIONS[selectedNode].color;
      if (traitColor.includes("blue")) color = "stroke-blue-500";else
      if (traitColor.includes("orange")) color = "stroke-orange-500";else
      if (traitColor.includes("emerald")) color = "stroke-emerald-500";else
      if (traitColor.includes("red")) color = "stroke-red-500";else
      if (traitColor.includes("indigo")) color = "stroke-indigo-500";else
      if (traitColor.includes("purple")) color = "stroke-purple-500";else
      if (traitColor.includes("sky")) color = "stroke-sky-500";else
      if (traitColor.includes("violet")) color = "stroke-violet-500";
    }
    return {
      stroke: "",
      strokeWidth: 1.5,
      strokeDasharray: "4 4",
      className: `${color} animate-dash`
    };
  };

  // Node highlighting constraints
  const isNodeDimmed = (key: string) => {
    if (viewMode === "integration") {
      return selectedNode !== key;
    }
    if (viewMode === "workflow") {
      const workflow = WORKFLOWS.find((w) => w.key === activeWorkflow);
      return workflow ? !workflow.path.includes(key) : false;
    }
    if (viewMode === "industry") {
      const industry = INDUSTRIES.find((i) => i.key === activeIndustry);
      return industry ? !industry.activeIntegrations.includes(key) : false;
    }
    return false;
  };

  const isOutcomeDimmed = (key: string) => {
    if (viewMode === "integration") {
      const nodeData = INTEGRATIONS[selectedNode];
      return nodeData ? !nodeData.outlets.includes(key) : false;
    }
    if (viewMode === "workflow") {
      const workflow = WORKFLOWS.find((w) => w.key === activeWorkflow);
      return workflow ? !workflow.path.includes(key) : false;
    }
    if (viewMode === "industry") {
      const industry = INDUSTRIES.find((i) => i.key === activeIndustry);
      return industry ? !industry.activeOutcomes.includes(key) : false;
    }
    return false;
  };

  /* ── Render ────────────────────────────────────────────────────────────────── */

  return (
    <div className="mx-auto max-w-6xl w-full select-none space-y-space-8">
 <style>{`
 @keyframes dashMove {
 to { stroke-dashoffset: -16; }
 }
 @keyframes pulseRing {
 0% { transform: scale(0.95); opacity: 0.35; }
 50% { transform: scale(1.05); opacity: 0.6; }
 100% { transform: scale(0.95); opacity: 0.35; }
 }
 .animate-dash {
 animation: dashMove 0.8s linear infinite;
 }
 .animate-pulse-ring {
 animation: pulseRing 3s ease-in-out infinite;
 }
 `}</style>

 {/* View Mode Pill Switcher */}
 <div className="flex justify-center">
 <Badge variant="soft">
 {[
          { id: "integration", label: "View By Integration", icon: <Network className="h-3.5 w-3.5" /> },
          { id: "workflow", label: "View By Workflow", icon: <Zap className="h-3.5 w-3.5" /> },
          { id: "industry", label: "View By Industry", icon: <Layers className="h-3.5 w-3.5" /> }].
          map((mode) =>
          <Button key={mode.id} onClick={() => handleViewModeChange(mode.id as ViewMode)}
          className={`flex items-center gap-space-2 radius-md px-space-4 py-space-2 transition-all duration-base cursor-pointer text-caption ${viewMode === mode.id ?
          "bg-card text-foreground border border-border/80 scale-102" :
          "hover:text-foreground hover:bg-neutral-900/40"} font-medium`
          }>
            
 {mode.icon}
 {mode.label}
 </Button>
          )}
 </Badge>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-6 items-stretch">

 {/* ━━ Left Column: Visual Network Canvas ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
 <div className="lg:col-span-7 relative flex flex-col justify-between border border-border/40 radius-xl bg-card/25 backdrop-blur-md p-space-5 overflow-hidden min-h-full">
 {/* Subtle Grid Dotted Background */}
 <div className="absolute inset-space-0 dot-grid opacity-60 pointer-events-none" />
 <div className="absolute inset-space-0 bg-gradient-to-tr from-primary/[0.03] via-transparent to-transparent pointer-events-none" />

 {/* Mode-Specific Sub-Controllers (Toggles) */}
 <div className="relative z-35 w-full flex items-center justify-between pb-space-3 border-b border-border/10">
 <span className="text-caption uppercase tracking-wider text-muted-foreground font-medium">Interactive Core Blueprint</span>

 {/* Workflow Selectors */}
 {viewMode === "workflow" &&
            <div className="flex gap-space-2">
 {WORKFLOWS.map((wf) =>
              <Button key={wf.key} onClick={() => setActiveWorkflow(wf.key)}
              className={`text-caption px-space-3 py-space-1 radius-md border transition-all cursor-pointer ${activeWorkflow === wf.key ?
              "bg-primary/10 text-primary border-primary/20" :
              "bg-neutral-900/40 border-border/40 text-muted-foreground hover:text-foreground"} font-medium`
              }>
                
 {wf.name.split("")[0]} Flow
 </Button>
              )}
 </div>
            }

 {/* Industry Selectors */}
 {viewMode === "industry" &&
            <div className="flex gap-space-2 flex-wrap justify-end">
 {INDUSTRIES.map((ind) =>
              <Button key={ind.key} onClick={() => setActiveIndustry(ind.key)}
              className={`text-caption px-space-3 py-space-1 radius-md border transition-all cursor-pointer ${activeIndustry === ind.key ?
              "bg-primary/10 text-primary border-primary/20" :
              "bg-neutral-900/40 border-border/40 text-muted-foreground hover:text-foreground"} font-medium`
              }>
                
 {ind.name.split("")[0]}
 </Button>
              )}
 </div>
            }

 {/* Default Hint */}
 {viewMode === "integration" &&
            <Badge>Click nodes to investigate</Badge>
            }
 </div>

 {/* Canvas Wrapper */}
 <div className="relative flex-1 flex justify-center items-center w-full min-h-80">

 {/* SVG Connection Layer */}
 <svg className="absolute inset-space-0 w-full h-full pointer-events-none" viewBox="0 0 500 360">

 {/* Connections: Integrations to Center Hub (220, 180) */}
 {Object.keys(INTEGRATIONS).map((key) => {
                const node = INTEGRATIONS[key];
                const lineProps = getLineStyles(key, "Hub");
                return (
                  <path
                    key={`line-${key}`}
                    d={`M ${node.x} ${node.y} Q ${(node.x + 220) / 2} ${(node.y + 180) / 2} 220 180`}
                    fill="none"
                    stroke={lineProps.stroke || "currentColor"}
                    strokeWidth={lineProps.strokeWidth}
                    strokeDasharray={lineProps.strokeDasharray}
                    className={lineProps.className} />);


              })}

 {/* Connections: Center Hub (220, 180) to Outcome Nodes */}
 {Object.keys(OUTCOMES).map((key) => {
                const node = OUTCOMES[key];
                const lineProps = getLineStyles("Hub", key);
                return (
                  <path
                    key={`line-${key}`}
                    d={`M 220 180 Q ${(220 + node.x) / 2} ${(180 + node.y) / 2} ${node.x} ${node.y}`}
                    fill="none"
                    stroke={lineProps.stroke || "currentColor"}
                    strokeWidth={lineProps.strokeWidth}
                    strokeDasharray={lineProps.strokeDasharray}
                    className={lineProps.className} />);


              })}
 </svg>

 {/* Central Hub Node (Operator Core) */}
 <div
              className="absolute -translate-x-space-1/2 -translate-y-space-1/2 z-30"
              style={{
                left: `${220 / 500 * 100}%`,
                top: `${180 / 360 * 100}%`
              }}>
              
 <div className="relative flex items-center justify-center">
 {/* Visual ripple pulse rings */}
 <div className="absolute w-24 h-24 radius-md border border-primary/20 bg-primary/[0.02] animate-pulse-ring pointer-events-none" />
 <div className="absolute w-32 h-32 radius-md border border-primary/10 bg-transparent animate-pulse pointer-events-none" />

 {/* Rotating accent border */}
 <div className="absolute w-20 h-20 radius-md border border-dashed border-primary/20 animate-spin [animation-duration:16s] pointer-events-none" />

  <div className="relative radius-full border border-primary/30 bg-card/90 backdrop-blur-md text-center transition-all duration-base w-20 h-20 flex flex-col justify-center items-center shadow-xl p-2 select-none overflow-hidden">
  <div className="absolute inset-space-0 radius-full bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.15),transparent_70%)] pointer-events-none" />
  <Image
    src="/logo.png"
    alt="Operator AI Core"
    width={64}
    height={64}
    unoptimized
    className="w-full h-full object-contain relative z-10 drop-shadow-md"
  />
  </div>
 </div>
 </div>

 {/* Left/Top Integration Nodes */}
 {Object.keys(INTEGRATIONS).map((key) => {
              const node = INTEGRATIONS[key];
              const LogoComp = node.logo;
              const isDimmed = isNodeDimmed(key);
              const isActive = viewMode === "integration" && selectedNode === key ||
              viewMode === "workflow" && WORKFLOWS.find((w) => w.key === activeWorkflow)?.path.includes(key) ||
              viewMode === "industry" && INDUSTRIES.find((i) => i.key === activeIndustry)?.activeIntegrations.includes(key);

              let activeBorderClass = "border-primary bg-primary/10 scale-110 ring-2 ring-primary/10 ";
              if (isActive) {
                if (node.color.includes("warning")) {
                  activeBorderClass = "border-warning-500 bg-warning-500/10 scale-110 ring-2 ring-warning-500/15 ";
                } else if (node.color.includes("success")) {
                  activeBorderClass = "border-success-500 bg-success-500/10 scale-110 ring-2 ring-success-500/15 ";
                } else if (node.color.includes("destructive") || node.color.includes("error")) {
                  activeBorderClass = "border-error-500 bg-error-500/10 scale-110 ring-2 ring-error-500/15 ";
                }
              }

              return (
                <div
                  key={key}
                  className="absolute z-40 transition-all duration-base cursor-pointer -translate-x-space-1/2 -translate-y-space-1/2"
                  style={{
                    left: `${node.x / 500 * 100}%`,
                    top: `${node.y / 360 * 100}%`
                  }}
                  onClick={() => {
                    if (viewMode === "integration") setSelectedNode(key);
                  }} tabIndex={0} onKeyDown={() => {}}>
                  
 <div
                    className={`radius-md border p-space-2 bg-neutral-900/90 transition-all duration-base flex items-center justify-center w-10 h-10 ${isActive ?
                    activeBorderClass :
                    isDimmed ?
                    "border-border/30 opacity-30 scale-95" :
                    "border-border/80 hover:border-foreground/30 hover:scale-105"}`
                    }
                    title={node.name}>
                    
 <LogoComp className={`w-5 h-5 transition-colors ${isDimmed ? "opacity-30" : "opacity-100"}`} />
 </div>
 </div>);

            })}

 {/* Right Outcome Nodes */}
 {Object.keys(OUTCOMES).map((key) => {
              const node = OUTCOMES[key];
              const isDimmed = isOutcomeDimmed(key);
              const isActive = viewMode === "integration" && INTEGRATIONS[selectedNode]?.outlets.includes(key) ||
              viewMode === "workflow" && WORKFLOWS.find((w) => w.key === activeWorkflow)?.path.includes(key) ||
              viewMode === "industry" && INDUSTRIES.find((i) => i.key === activeIndustry)?.activeOutcomes.includes(key);

              return (
                <div
                  key={key}
                  className="absolute z-40 transition-all duration-base pointer-events-none -translate-x-space-1/2 -translate-y-space-1/2"
                  style={{
                    left: `${node.x / 500 * 100}%`,
                    top: `${node.y / 360 * 100}%`
                  }}>
                  
 <div
                    className={`radius-lg border px-space-3 py-space-2 bg-neutral-900/90 backdrop-blur-md transition-all duration-base text-center flex flex-col justify-center items-center max-w-32 ${isActive ?
                    "border-success-500/40 bg-success-500/[0.08] ring-1 ring-success-500/20 scale-105 " :
                    isDimmed ?
                    "border-border/30 opacity-30 scale-95" :
                    "border-border/80 hover:border-foreground/20"}`
                    }>
                    
 <span className={`text-caption uppercase tracking-wider transition-colors ${isActive ? "text-success-500" : "text-foreground/80"} font-semibold`}>
 {node.name}
 </span>
 <span className="text-caption text-muted-foreground mt-space-1 leading-tight text-center">
 {node.role}
 </span>
 </div>
 </div>);

            })}
 </div>

 {/* Bottom Indicators bar */}
 <div className="relative z-30 pt-space-3 border-t border-border/10 flex items-center justify-between text-caption text-muted-foreground">
 <span className="flex items-center gap-space-2 font-medium">
 <Shield className="h-3.5 w-3.5 text-primary shrink-0" /> End-to-End Compliance
 </span>
 <span className="flex items-center gap-space-2 font-medium">
 <Zap className="h-3.5 w-3.5 text-success-500 shrink-0" /> Real-time DB Sync Active
 </span>
 </div>

 </div>

 {/* ━━ Right Column: Interactive Details Sidepanel ━━━━━━━━━━━━━━━━━━━━ */}
 <div className="lg:col-span-5 radius-xl border border-[hsl(var(--foreground)/0.06)] bg-card/40 backdrop-blur-md p-space-6 flex flex-col justify-between relative overflow-hidden min-h-full">

 {/* Subtle top light gradient glow */}
 <div className="absolute top-space-0 right-space-0 w-80 h-48 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.04),transparent_60%)] pointer-events-none" />

 {/* VIEW MODE: Integration Detail */}
 {viewMode === "integration" &&
          <div className="space-y-space-5 flex-1 flex flex-col justify-between">

 {/* Header Info */}
 <div className="space-y-space-3">
 <div className="flex items-center gap-space-3">
 <div className="radius-md border border-border bg-card p-space-2 w-10 h-10 flex items-center justify-center">
 {React.createElement(INTEGRATIONS[selectedNode].logo, { className: "w-5 h-5" })}
 </div>
 <div>
 <span className="text-caption uppercase tracking-wider text-primary block font-medium">{INTEGRATIONS[selectedNode].role}</span>
 <h4 className="text-body-md text-foreground leading-tight font-semibold">{INTEGRATIONS[selectedNode].name}</h4>
 </div>
 </div>

 <p className="text-caption text-muted-foreground leading-relaxed">
 {INTEGRATIONS[selectedNode].desc}
 </p>
 </div>

 {/* Data Flow Trace */}
 <div className="space-y-space-3 border-t border-b border-[hsl(var(--foreground)/0.06)] py-space-4 my-space-1">
 <span className="text-caption uppercase tracking-wider text-muted-foreground block font-medium">Diagnostic Data Path</span>
 <div className="flex flex-wrap items-center gap-x-space-3 gap-y-space-3 mt-space-1 text-caption">
 {INTEGRATIONS[selectedNode].pathTrace.map((step, idx, arr) =>
                <React.Fragment key={step}>
 <div className="flex items-center gap-space-2">
 {/* Micro-pulse dot for active step */}
 <span className="relative flex h-2 w-2">
 <span className={`animate-ping absolute inline-flex h-full w-full radius-md opacity-75 ${idx === 0 ? "bg-primary" : idx === arr.length - 1 ? "bg-success-500" : "bg-neutral-400"}`}></span>
 <span className={`relative inline-flex radius-md h-2 w-2 ${idx === 0 ? "bg-primary" : idx === arr.length - 1 ? "bg-success-500" : "bg-neutral-500"}`}></span>
 </span>
 <span className={`px-space-3 py-space-1 radius-md ${idx === 0 ?
                    "bg-primary/10 text-primary border border-primary/20" :
                    idx === arr.length - 1 ?
                    "bg-success-500/10 text-success-500 border border-success-500/20" :
                    "bg-neutral-900/60 border border-border/40 text-foreground/80"}`
                    }>
 {step}
 </span>
 </div>
 {idx < arr.length - 1 &&
                  <div className="h-px w-6 bg-border/20 relative flex items-center justify-center">
 <div className="absolute w-1 h-1 radius-md bg-border/40 animate-pulse" />
 </div>
                  }
 </React.Fragment>
                )}
 </div>
 </div>

 {/* Capabilities & Impact */}
 <div className="space-y-space-4 flex-1">
 <div className="space-y-space-2">
 <span className="text-caption uppercase tracking-wider text-muted-foreground block font-medium">Integration Capabilities</span>
 <ul className="space-y-space-2">
 {INTEGRATIONS[selectedNode].capabilities.map((cap) =>
                  <li key={cap} className="flex items-center gap-space-2 text-caption text-foreground/80">
 <Check className="h-3.5 w-3.5 text-primary shrink-0" />
 {cap}
 </li>
                  )}
 </ul>
 </div>

 <div className="bg-primary/5 border-l-space-2 border-primary border-y border-r border-border/20 radius-lg p-space-4 space-y-space-2">
 <span className="text-caption uppercase tracking-wider text-primary block font-medium">Business Outcomes</span>
 <p className="text-caption text-foreground/90 leading-relaxed font-medium">{INTEGRATIONS[selectedNode].benefits}</p>
 <p className="text-caption text-muted-foreground mt-space-1">{INTEGRATIONS[selectedNode].impact}</p>
 </div>
 </div>

 {/* Use Case */}
 <div className="text-caption text-muted-foreground italic border-t border-[hsl(var(--foreground)/0.04)] pt-space-3">
 <span className="uppercase tracking-wider not-italic text-caption text-foreground/60 mr-space-2 block md:inline font-medium">Example scenario:</span>
 {INTEGRATIONS[selectedNode].useCase}
 </div>

 </div>
          }

 {/* VIEW MODE: Workflow Detail */}
 {viewMode === "workflow" &&
          <div className="space-y-space-5 flex-1 flex flex-col justify-between">

 {/* Header Info */}
 <div className="space-y-space-3">
 <div className="flex items-center gap-space-2">
 <Zap className="h-4.5 w-4.5 text-success-500" />
 <span className="text-caption uppercase tracking-wider text-success-500 font-medium">Automated Workflow Path</span>
 </div>
 <h4 className="text-body-md text-foreground tracking-tight font-semibold">
 {WORKFLOWS.find((w) => w.key === activeWorkflow)?.name}
 </h4>
 <p className="text-caption text-muted-foreground leading-relaxed">
 {WORKFLOWS.find((w) => w.key === activeWorkflow)?.desc}
 </p>
 </div>

 {/* Workflow Flow Steps */}
 <div className="space-y-space-3 border-t border-b border-[hsl(var(--foreground)/0.06)] py-space-4 my-space-1">
 <span className="text-caption uppercase tracking-wider text-muted-foreground block font-medium">Data Ingestion Pipeline</span>
 <div className="flex flex-wrap items-center gap-x-space-3 gap-y-space-3 mt-space-1 text-caption">
 {WORKFLOWS.find((w) => w.key === activeWorkflow)?.pathLabels.map((step, idx, arr) =>
                <React.Fragment key={step}>
 <div className="flex items-center gap-space-2">
 <span className="relative flex h-2 w-2">
 <span className={`animate-ping absolute inline-flex h-full w-full radius-md opacity-75 ${idx === 0 ? "bg-primary" : idx === arr.length - 1 ? "bg-success-500" : "bg-neutral-400"}`}></span>
 <span className={`relative inline-flex radius-md h-2 w-2 ${idx === 0 ? "bg-primary" : idx === arr.length - 1 ? "bg-success-500" : "bg-neutral-500"}`}></span>
 </span>
 <span className={`px-space-3 py-space-1 radius-md ${idx === 0 ?
                    "bg-primary/10 text-primary border border-primary/20" :
                    idx === arr.length - 1 ?
                    "bg-success-500/10 text-success-500 border border-success-500/20" :
                    "bg-neutral-900/60 border border-border/40 text-foreground/80"}`
                    }>
 {step}
 </span>
 </div>
 {idx < arr.length - 1 &&
                  <div className="h-px w-6 bg-border/20 relative flex items-center justify-center">
 <div className="absolute w-1 h-1 radius-md bg-border/40 animate-pulse" />
 </div>
                  }
 </React.Fragment>
                )}
 </div>
 </div>

 {/* Benefits & Impact */}
 <div className="space-y-space-4 flex-1">
 <div className="bg-success-500/5 border-l-space-2 border-success-500 border-y border-r border-border/20 radius-lg p-space-4 space-y-space-2">
 <span className="text-caption uppercase tracking-wider text-success-500 block font-medium">Efficiency Impact</span>
 <p className="text-caption text-foreground/90 leading-relaxed font-medium">
 {WORKFLOWS.find((w) => w.key === activeWorkflow)?.benefits}
 </p>
 <p className="text-caption text-muted-foreground mt-space-1">
 {WORKFLOWS.find((w) => w.key === activeWorkflow)?.impact}
 </p>
 </div>

 <div className="space-y-space-3">
 <span className="text-caption uppercase tracking-wider text-muted-foreground block font-medium">Sequence Use Cases</span>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-space-3">
 {WORKFLOWS.find((w) => w.key === activeWorkflow)?.useCases.map((use, idx) =>
                  <div key={idx} className="flex items-start gap-space-3 p-space-3 bg-neutral-900/40 backdrop-blur-md border border-border/20 radius-lg hover:border-primary/30 transition-all duration-base">
 <Badge className="h-5 w-5 mt-space-1">
 {idx + 1}
 </Badge>
 <span className="text-caption text-muted-foreground leading-relaxed">
 {use}
 </span>
 </div>
                  )}
 </div>
 </div>
 </div>

 </div>
          }

 {/* VIEW MODE: Industry Detail */}
 {viewMode === "industry" &&
          <div className="space-y-space-5 flex-1 flex flex-col justify-between">

 {/* Header Info */}
 <div className="space-y-space-3">
 <div className="flex items-center gap-space-2">
 <Globe className="h-4.5 w-4.5 text-primary" />
 <span className="text-caption uppercase tracking-wider text-primary font-medium">Industry Configuration</span>
 </div>
 <h4 className="text-body-md text-foreground tracking-tight font-semibold">
 {INDUSTRIES.find((i) => i.key === activeIndustry)?.name}
 </h4>
 <p className="text-caption text-muted-foreground leading-relaxed">
 {INDUSTRIES.find((i) => i.key === activeIndustry)?.desc}
 </p>
 </div>

 {/* Active Integration Tags */}
 <div className="space-y-space-3 border-t border-b border-[hsl(var(--foreground)/0.06)] py-space-4 my-space-1">
 <div className="space-y-space-2">
 <span className="text-caption uppercase tracking-wider text-muted-foreground block font-medium">Active Integrations</span>
 <div className="flex flex-wrap gap-space-2">
 {INDUSTRIES.find((i) => i.key === activeIndustry)?.activeIntegrations.map((item) =>
                  <Badge key={item}>
 {item}
 </Badge>
                  )}
 </div>
 </div>
 <div className="space-y-space-2 mt-space-3">
 <span className="text-caption uppercase tracking-wider text-muted-foreground block font-medium">Target Outcomes</span>
 <div className="flex flex-wrap gap-space-2">
 {INDUSTRIES.find((i) => i.key === activeIndustry)?.activeOutcomes.map((item) =>
                  <Badge key={item} variant="success">
 {item}
 </Badge>
                  )}
 </div>
 </div>
 </div>

 {/* Outcomes & Business Impact */}
 <div className="space-y-space-4 flex-1">
 <div className="bg-primary/5 border-l-space-2 border-primary border-y border-r border-border/20 radius-lg p-space-4 space-y-space-2">
 <span className="text-caption uppercase tracking-wider text-primary block font-medium">Business Conversion Impact</span>
 <p className="text-caption text-foreground/90 leading-relaxed font-medium">
 {INDUSTRIES.find((i) => i.key === activeIndustry)?.businessImpact}
 </p>
 <p className="text-caption text-muted-foreground mt-space-1 leading-normal">
 {INDUSTRIES.find((i) => i.key === activeIndustry)?.outcomesDesc}
 </p>
 </div>

 <div className="space-y-space-2">
 <span className="text-caption uppercase tracking-wider text-muted-foreground block font-medium">Real Dialogue Preview</span>
 <div className="text-caption text-foreground/80 font-mono italic leading-relaxed bg-neutral-900/40 backdrop-blur-md border border-border/20 radius-lg p-space-3">
 {INDUSTRIES.find((i) => i.key === activeIndustry)?.dialogExample}
 </div>
 </div>
 </div>

 </div>
          }

 </div>

 </div>

 {/* Trust & Certifications Indicators below ecosystem */}
 <div className="grid grid-cols-2 md:grid-cols-4 gap-space-4 pt-space-4 border-t border-[hsl(var(--foreground)/0.06)]">
 {[
        { label: "100+ Integrations", desc: "Native API connectivity", icon: <Network className="h-4 w-4 text-primary transition-transform duration-base" /> },
        { label: "SOC2 Compliance Ready", desc: "Role based access limits", icon: <Shield className="h-4 w-4 text-success-500 transition-transform duration-base" /> },
        { label: "Real-time Sync", desc: "No booking collisions", icon: <RefreshCw className="h-4 w-4 text-primary-500 transition-transform duration-base" /> },
        { label: "Encrypted Data Rest/Transit", desc: "Completely isolated DB", icon: <Shield className="h-4 w-4 text-primary transition-transform duration-base" /> }].
        map((indicator, idx) =>
        <div key={idx} className="group radius-lg border border-border/20 bg-neutral-900/40 backdrop-blur-md p-space-4 flex items-center gap-space-3 hover:border-primary/30 hover:bg-neutral-900/60 transition-all duration-base">
 <div className="radius-md bg-neutral-800/80 p-space-2 shrink-0 group-hover:bg-primary/5 transition-colors duration-base">
 <div className="transform transition-transform duration-base group-hover:scale-110 group-hover:rotate-6">
 {indicator.icon}
 </div>
 </div>
 <div>
 <p className="text-caption text-foreground leading-tight font-medium">{indicator.label}</p>
 <p className="text-caption text-muted-foreground mt-space-1 leading-normal">{indicator.desc}</p>
 </div>
 </div>
        )}
 </div>

 </div>);

}