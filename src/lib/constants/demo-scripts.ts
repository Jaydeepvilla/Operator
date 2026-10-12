export interface DemoIndustryScript {
  id: string;
  industry: string;
  businessName: string;
  tagline: string;
  customerProblem: string;
  initialSetup: {
    servicesCount: number;
    staffRoles: string[];
    depositPolicy: string;
    hours: string;
  };
  demoJourney: Array<{
    step: number;
    title: string;
    action: string;
    operatorResponse: string;
    businessValue: string;
  }>;
  businessOutcome: {
    recoveredAppointments: string;
    afterHoursCapture: string;
    manualWorkSavedHours: number;
    noShowReduction: string;
  };
}

export const DEMO_SCRIPTS: DemoIndustryScript[] = [
  {
    id: "salon-spa",
    industry: "Salon & Spa",
    businessName: "Luxe Wellness & Spa",
    tagline: "High-end luxury salon & restorative wellness sanctuary",
    customerProblem:
      "Clients call during busy salon hours or late at night (after 8 PM) wanting specific stylists and treatments. Stylists cannot answer phones mid-treatment, leading to lost $150+ bookings and frequent no-shows.",
    initialSetup: {
      servicesCount: 3,
      staffRoles: ["Master Stylist (Elena)", "Senior Esthetician (Marcus)"],
      depositPolicy: "25% deposit required for balayage and long treatments",
      hours: "Mon-Fri 9:00 AM - 7:00 PM | Sat 10:00 AM - 5:00 PM",
    },
    demoJourney: [
      {
        step: 1,
        title: "After-Hours Inquiry via WhatsApp/Web",
        action: "Client asks: 'Can I get a balayage with Elena this Thursday after 4 PM?'",
        operatorResponse: "Operator checks Elena's Thursday schedule, identifies 4:30 PM opening, explains treatment duration (120 mins).",
        businessValue: "Zero phone tag; client gets instant authoritative response outside salon operating hours.",
      },
      {
        step: 2,
        title: "Deposit Collection & Hold",
        action: "Client confirms time; Operator reserves slot and presents $45 deposit checkout link.",
        operatorResponse: "PostgreSQL advisory lock holds the slot for 15 minutes; payment session generated via Stripe.",
        businessValue: "Eliminates empty chair no-shows; secures commitment before calendar is blocked.",
      },
      {
        step: 3,
        title: "Confirmation & Calendar Sync",
        action: "Payment webhook received; booking transitioned to confirmed.",
        operatorResponse: "Client receives instant SMS with preparation guidelines; Elena's Google Calendar reflects new client.",
        businessValue: "Front desk receptionist saves 15 minutes of manual data entry and payment tracking.",
      },
    ],
    businessOutcome: {
      recoveredAppointments: "24 appointments/month",
      afterHoursCapture: "42% of all new bookings",
      manualWorkSavedHours: 18,
      noShowReduction: "From 16% down to 2%",
    },
  },
  {
    id: "dental-clinic",
    industry: "Dental Clinic",
    businessName: "Apex Dental Care",
    tagline: "Modern family & cosmetic dentistry center",
    customerProblem:
      "Patients call with dental emergencies or insurance questions while receptionists are busy checking in patients. Frustrated callers hang up and call competing clinics.",
    initialSetup: {
      servicesCount: 3,
      staffRoles: ["Dr. Sarah Chen (DDS)", "Hygienist (David Miller)"],
      depositPolicy: "Full upfront reservation hold for whitening; insurance intake for checkups",
      hours: "Mon-Thu 8:00 AM - 5:00 PM | Fri 8:00 AM - 2:00 PM",
    },
    demoJourney: [
      {
        step: 1,
        title: "Emergency Triage & Knowledge Grounding",
        action: "Patient asks: 'I chipped my tooth and am in severe pain, do you have emergency slots?'",
        operatorResponse: "Operator consults Knowledge Base emergency protocol, acknowledges pain, and checks today's reserved emergency buffer slot.",
        businessValue: "Immediate compassionate triage; captures high-urgency restorative patients.",
      },
      {
        step: 2,
        title: "New Patient Intake & Insurance Verification",
        action: "Patient confirms slot; Operator collects dental insurance provider and member ID via conversational form.",
        operatorResponse: "Creates structured contact profile with policy details ready for front-desk eligibility verification.",
        businessValue: "Front desk receives complete patient chart before the patient steps through the door.",
      },
      {
        step: 3,
        title: "Automated Pre-Visit Reminders",
        action: "System queues SMS intake reminder 24 hours prior with parking and X-ray instructions.",
        operatorResponse: "Patient confirms via 1-tap reply 'YES'.",
        businessValue: "Guarantees full operatory chair utilization without manual reminder phone calls.",
      },
    ],
    businessOutcome: {
      recoveredAppointments: "31 appointments/month",
      afterHoursCapture: "38% of emergency intakes",
      manualWorkSavedHours: 24,
      noShowReduction: "From 12% down to 1.5%",
    },
  },
  {
    id: "medical-clinic",
    industry: "Medical Clinic",
    businessName: "Beacon Health Associates",
    tagline: "Comprehensive family medicine & specialist care clinic",
    customerProblem:
      "High volume of routine questions (prescriptions, lab results, clinic hours) overwhelms medical assistants, delaying urgent appointment bookings.",
    initialSetup: {
      servicesCount: 3,
      staffRoles: ["Dr. James Wilson (MD)", "Nurse Practitioner (Rachel Adams)"],
      depositPolicy: "Card hold required for non-insured specialist consultations",
      hours: "Mon-Fri 8:30 AM - 5:30 PM",
    },
    demoJourney: [
      {
        step: 1,
        title: "Routine Policy Filtering",
        action: "Caller asks: 'How do I request a prescription refill and what are your flu shot hours?'",
        operatorResponse: "Operator provides grounded answer from clinic policy document, giving pharmacy routing steps and walk-in flu shot schedule.",
        businessValue: "Deflects 60% of routine non-revenue inquiries without staff involvement.",
      },
      {
        step: 2,
        title: "Annual Physical Scheduling",
        action: "Caller proceeds to schedule annual wellness checkup.",
        operatorResponse: "Operator verifies Dr. Wilson's 45-minute wellness blocks, presents Tuesday 10:15 AM.",
        businessValue: "Matches patient to the exact appropriate clinical slot duration automatically.",
      },
      {
        step: 3,
        title: "Human Escalation on Symptom Red Flags",
        action: "If patient mentions severe chest discomfort or shortness of breath, Operator triggers immediate emergency protocol.",
        operatorResponse: "Operator directs patient to dial 911 immediately and alerts on-duty triage nurse.",
        businessValue: "Clinical safety guardrails protect patient health and practice liability.",
      },
    ],
    businessOutcome: {
      recoveredAppointments: "45 appointments/month",
      afterHoursCapture: "29% of booking volume",
      manualWorkSavedHours: 35,
      noShowReduction: "From 14% down to 3%",
    },
  },
  {
    id: "law-firm-consultant",
    industry: "Law Firm & Consultant",
    businessName: "Vanguard Legal Advisory",
    tagline: "Corporate, commercial litigation & legal advisory practice",
    customerProblem:
      "Prospective high-value clients need rapid initial case evaluations. If an attorney doesn't respond within 30 minutes, prospective clients retain a competing firm.",
    initialSetup: {
      servicesCount: 2,
      staffRoles: ["Partner (Eleanor Vance)", "Associate (Thomas Wright)"],
      depositPolicy: "Paid consultation: $150 upfront fee credited toward retainer",
      hours: "Mon-Fri 9:00 AM - 6:00 PM",
    },
    demoJourney: [
      {
        step: 1,
        title: "Confidential Practice Area Qualification",
        action: "Client asks: 'We have a commercial contract breach dispute with an overseas vendor.'",
        operatorResponse: "Operator confirms practice area match (Business Contract Law), asks standard conflict/deadline check questions.",
        businessValue: "Pre-qualifies leads so senior partners only spend time with qualified corporate prospects.",
      },
      {
        step: 2,
        title: "Paid Consultation Checkout",
        action: "Client selects 45-minute case evaluation; Operator collects $150 fee via secure hosted checkout.",
        operatorResponse: "Client pays via credit card; invoice receipt automatically generated.",
        businessValue: "Filters out casual window-shoppers and monetizes partner evaluation time immediately.",
      },
      {
        step: 3,
        title: "Executive Calendar & NDA Delivery",
        action: "Appointment confirmed; secure video conference link + preliminary intake questionnaire dispatched.",
        operatorResponse: "Partner's calendar blocked with comprehensive case synopsis attached.",
        businessValue: "Converts inbound inquiries into retained clients with zero friction.",
      },
    ],
    businessOutcome: {
      recoveredAppointments: "14 corporate retainers/month",
      afterHoursCapture: "52% of executive inquiries",
      manualWorkSavedHours: 16,
      noShowReduction: "Zero no-shows on paid consultations",
    },
  },
];
