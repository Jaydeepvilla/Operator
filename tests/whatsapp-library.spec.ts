import { test, expect } from '@playwright/test';
import {
  matchWhatsAppIntent,
  resolveWhatsAppResponse,
  INTENT_RULES,
} from '../src/server/services/whatsapp/trigger-engine';
import {
  FREE_REPLIES,
  APPROVED_META_TEMPLATES,
  INDUSTRY_ADDONS,
  HINDI_HINGLISH_VARIANTS,
  isInside24HourWindow,
  substituteVariables,
  getWhatsAppReply,
} from '../src/server/services/whatsapp/message-library';
import { WhatsAppVariableContext } from '../src/server/services/whatsapp/types';

test.describe('WhatsApp Message Library for Operator AI — Comprehensive Test Suite', () => {
  const sampleContext: WhatsAppVariableContext = {
    customer_name: 'Priya',
    business_name: 'Glow Salon',
    service: 'Haircut',
    staff: 'Meera',
    date: 'Sat 8 Nov',
    time: '4:30 PM',
    duration: '45 min',
    price: '₹800',
    deposit: '₹200',
    address: '12 MG Road, Pune',
    maps_link: 'https://maps.google.com/?q=12+MG+Road+Pune',
    phone: '+91 98765 43210',
    hours_today: '10 AM to 8 PM',
    hours_week: 'Mon-Sat 10 AM to 8 PM',
    grace_until: '4:45 PM',
    late_policy: 'Please drive safe!',
    booking_ref: 'OP-4821',
    manage_link: 'https://glow.operator.app/manage/OP-4821',
    payment_link: 'https://glow.operator.app/pay/OP-4821',
    review_link: 'https://g.page/r/glow-salon/review',
    cancel_policy: 'Free cancellation up to 24 hours before your slot',
    waitlist_position: 2,
    hold_mins: 15,
  };

  test('1. Section 2: Basics free replies format & limits', () => {
    const greeting = getWhatsAppReply('greeting_new', sampleContext);
    expect(greeting.body).toContain('Glow Salon');
    expect(greeting.buttons?.length).toBeLessThanOrEqual(3);
    for (const b of greeting.buttons || []) {
      expect(b.title.length).toBeLessThanOrEqual(20);
    }

    const menu = getWhatsAppReply('main_menu', sampleContext);
    expect(menu.type).toBe('list');
    expect(menu.listRows?.length).toBeLessThanOrEqual(10);
    for (const row of menu.listRows || []) {
      expect(row.title.length).toBeLessThanOrEqual(24);
    }
  });

  test('2. Section 3: Business Information answers without hallucination', () => {
    const hours = getWhatsAppReply('opening_hours', sampleContext);
    expect(hours.body).toContain('10 AM to 8 PM');

    const address = getWhatsAppReply('location', sampleContext);
    expect(address.body).toContain('12 MG Road, Pune');
    expect(address.body).toContain('https://maps.google.com');

    const price = getWhatsAppReply('service_price', sampleContext);
    expect(price.body).toContain('₹800');

    // Missing price facts fall back to knowledge gap
    const emptyContext: WhatsAppVariableContext = {
      business_name: 'Glow Salon',
    };
    const missingPrice = getWhatsAppReply('service_price', emptyContext);
    expect(missingPrice.body).toContain('ask the team');
  });

  test('3. Section 4: Booking lifecycle replies', () => {
    const late = getWhatsAppReply('booking_running_late', sampleContext);
    expect(late.body).toContain('safe');

    const cancel = getWhatsAppReply('booking_cancel', sampleContext);
    expect(cancel.body).toContain('cancel');
    expect(cancel.buttons?.length).toBeLessThanOrEqual(3);
  });

  test('4. Section 5: Care, Emergencies & Stop opt-outs', () => {
    const em = getWhatsAppReply('emergency', sampleContext);
    expect(em.body).toContain('emergency number'); // Medical emergency guidance

    const stop = getWhatsAppReply('opt_out_stop', sampleContext);
    expect(stop.body).toContain("won't get offers");
  });

  test('5. Section 6: Meta-approved templates have required format and op_* naming', () => {
    expect(APPROVED_META_TEMPLATES.length).toBe(18);
    for (const tmpl of APPROVED_META_TEMPLATES) {
      expect(tmpl.name).toMatch(/^op_[a-z0-9_]+_v1$/);
      expect(tmpl.body.length).toBeLessThanOrEqual(1024);
      if (tmpl.header) {
        expect(tmpl.header.length).toBeLessThanOrEqual(60);
      }
      if (tmpl.footer) {
        expect(tmpl.footer.length).toBeLessThanOrEqual(60);
      }
    }
  });

  test('6. Section 7: Industry Add-ons exist for all 8 supported verticals', () => {
    const industries = ['salon', 'clinic', 'spa', 'gym', 'vet', 'auto', 'tutor', 'photo'];
    for (const ind of industries) {
      expect(INDUSTRY_ADDONS[ind as keyof typeof INDUSTRY_ADDONS]).toBeDefined();
      expect(Object.keys(INDUSTRY_ADDONS[ind as keyof typeof INDUSTRY_ADDONS]).length).toBeGreaterThanOrEqual(1);
    }
  });

  test('7. Section 8: Priority Intent Engine ranks Critical P1 above P6 Greetings', () => {
    // "Hi, I have an emergency bleeding" -> Should resolve to emergency (P1), not greeting (P6)
    const match = matchWhatsAppIntent('Hi, this is an emergency, need doctor');
    expect(match.intent).toBe('emergency');
    expect(match.priority).toBe(1);

    // "Please stop sending messages, cancel booking" -> STOP opt out has priority
    const stopMatch = matchWhatsAppIntent('stop sending me messages');
    expect(stopMatch.intent).toBe('opt_out_stop');
    expect(stopMatch.priority).toBe(1);

    // Handover check
    const talkHuman = matchWhatsAppIntent('I want to speak with a real person please');
    expect(talkHuman.intent).toBe('handover_open');
    expect(talkHuman.priority).toBe(2);
  });

  test('8. Section 8 & 9: Multilingual Hindi & Hinglish intent recognition', () => {
    // Hindi/Hinglish price question
    const priceHindi = matchWhatsAppIntent('haircut ka kitna kharcha hoga?');
    expect(priceHindi.intent).toBe('service_price');

    // Hindi/Hinglish timing question
    const timingHindi = matchWhatsAppIntent('aaj kab tak khula hai?');
    expect(timingHindi.intent).toBe('opening_hours');

    // Hindi/Hinglish running late
    const lateHindi = matchWhatsAppIntent('thoda late ho jaunga traffic me fasa hu');
    expect(lateHindi.intent).toBe('booking_running_late');

    // Hindi/Hinglish cancel
    const cancelHindi = matchWhatsAppIntent('bhai mera appointment cancel kardo');
    expect(cancelHindi.intent).toBe('booking_cancel');
  });

  test('9. Section 10: 24-Hour window tracking & variable substitution', () => {
    const recent = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    expect(isInside24HourWindow(recent)).toBe(true);

    const expired = new Date(Date.now() - 26 * 60 * 60 * 1000); // 26 hours ago
    expect(isInside24HourWindow(expired)).toBe(false);

    // Inside 24h resolves to interactive free reply
    const resInside = resolveWhatsAppResponse('What are your opening hours?', sampleContext, recent);
    expect(resInside.is24HourCompliant).toBe(true);
    expect(resInside.reply.type).toBe('interactive_buttons');
    expect(resInside.reply.body).toContain('10 AM to 8 PM');

    // Outside 24h resolves to approved Meta template
    const resOutside = resolveWhatsAppResponse('Hello', sampleContext, expired);
    expect(resOutside.is24HourCompliant).toBe(false);
    expect(resOutside.reply.type).toBe('template');
  });
});
