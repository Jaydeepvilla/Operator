# Operator AI Receptionist — Client Demonstration Package

This directory contains the production-grade, client-facing product demonstration package for **Operator AI Receptionist**, built specifically to educate prospective business owners on how to set up their business and automate front-desk operations.

---

## Deliverables in This Directory

| File | Description |
|:---|:---|
| **`operator-client-demo.mp4`** | **Primary Deliverable:** True, live continuous Full-HD 1080p screen recording of the working Operator application (1920×1080, 30 FPS, H.264/AAC, 3m 12s, 6.43 MB). No slideshows, no artificial HUD overlays. |
| **`thumbnail.png`** | High-resolution 1080p preview frame extracted directly from the live recording. |
| **`captions.srt`** | Fully synchronized subtitle track matching the narration timestamps for all 10 scenes. |
| **`demo-script.md`** | Complete voiceover narration script covering all 10 setup and operational stages. |
| **`storyboard.md`** | Scene-by-scene storyboard detailing routes, visual focal points, and animated interactions. |
| **`test-results.md`** | QA verification report confirming 14/14 automated test cases passing. |
| **`product-readiness-report.md`** | Feature verification status, security architecture, and client enablement checklist. |
| **`recording-manifest.json`** | Machine-readable technical manifest with encoding details and scene duration metrics. |

---

## Video Specifications

- **Recording Type:** 100% Native Continuous Playwright Screen Recording (Real Chrome browser with mouse interactions, typing, clicking, and page scrolling)
- **Visual Overlays:** Zero artificial HUD badges / watermark distractions. Pure, native software UI.
- **Resolution:** 1920 × 1080 (Full HD, 1080p)
- **Aspect Ratio:** 16:9
- **Frame Rate:** 30.0 FPS
- **Video Codec:** H.264 / AVC (`libx264`, `yuv420p`)
- **Audio Codec:** AAC (`102 kbps`, 24 kHz mono)
- **Voiceover Engine:** Microsoft Edge Neural TTS (`en-US-ChristopherNeural`)
- **Duration:** 3 minutes 12 seconds (192.07s)
- **File Size:** 6.43 MB
- **Target Business:** Operator Demo Salon (Bandra West, Mumbai • INR ₹ Currency)

---

## What the Client Learns in this Video

1. **Executive Dashboard & Operations (`/dashboard`):** Real-time visibility over live call volume, conversion rates, and front-desk metrics.
2. **Business Setup & Operating Hours (`/onboarding`):** Configuring business profile (Operator Demo Salon, Mumbai) and hours (Tue–Sun, 10 AM–8 PM).
3. **Services Catalog & Pricing (`/services`):** Transparent menu in INR ₹ (Haircut ₹500, Bridal Styling ₹1,200, Facial ₹1,800).
4. **Staff Specialists & Shifts (`/staff`):** Managing stylist schedules (Priya Sharma, Rahul Mehta) and treatment assignments.
5. **AI Receptionist Persona & Policies (`/receptionist`):** Customizing tone, greeting, and enforcing the 2-hour cancellation notice policy.
6. **Website Concierge & Live Preview (`/widget`):** Customizing widget colors, copying embed script, and testing live concierge chat.
7. **Live Booking Demonstration (`/dashboard`):** One-click manual/automated customer booking (Aanya Kapoor, Bridal Styling, Priya Sharma).
8. **Appointments Hub & Calendar Sync (`/appointments`):** Full calendar view of confirmed bookings, stylist filters, and Google Calendar sync.
9. **Daily Operations & Call Analytics (`/dashboard`):** Real-time monitoring of customer activity feed and conversion metrics.
10. **Closing & Call to Action (`/`):** Summary of 24/7 receptionist benefits with NexxTechnologies.

---

## How to Reproduce or Regenerate

To regenerate the video locally from scratch:
```bash
npm run dev
npx tsx scripts/client-demo-generator/continuous-engine.ts
```
