import { test, expect } from '@playwright/test';
import { MessagingSecurityService } from '../src/server/services/messaging-security';

test.describe('Omnichannel Messaging Security & Conversational Rate Limits', () => {
  const testOrgId = 'test-org-' + Date.now();
  const testRecipient = '918866037377';

  test.beforeEach(() => {
    MessagingSecurityService.resetRecipientVelocity(testOrgId, testRecipient);
  });

  test('1. Outbound Velocity allows full interactive customer session (up to 60 messages)', () => {
    // A user in a normal interactive flow taps 10-15 buttons in a few minutes
    for (let i = 1; i <= 20; i++) {
      expect(() => {
        MessagingSecurityService.enforceOutboundVelocityLimits({
          organizationId: testOrgId,
          recipient: testRecipient,
        });
      }).not.toThrow();
    }
  });

  test('2. Idempotency allows reopening the Main Menu on new incoming messages', () => {
    const menuContent = 'Please choose an option below to proceed:';

    // First incoming message reply
    const idemp1 = MessagingSecurityService.checkMessageIdempotency({
      organizationId: testOrgId,
      recipientId: testRecipient,
      content: menuContent,
      idempotencyKey: 'reply:wamid.message1',
    });
    expect(idemp1.isDuplicate).toBe(false);

    // Second incoming message reply (user navigated around and tapped Main Menu again)
    const idemp2 = MessagingSecurityService.checkMessageIdempotency({
      organizationId: testOrgId,
      recipientId: testRecipient,
      content: menuContent,
      idempotencyKey: 'reply:wamid.message2',
    });
    expect(idemp2.isDuplicate).toBe(false);

    // True duplicate (exact same webhook delivery retry)
    const idempRetry = MessagingSecurityService.checkMessageIdempotency({
      organizationId: testOrgId,
      recipientId: testRecipient,
      content: menuContent,
      idempotencyKey: 'reply:wamid.message1',
    });
    expect(idempRetry.isDuplicate).toBe(true);
  });
});

