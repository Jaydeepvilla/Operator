# AI Behaviour: Business Onboarding

*Note: The AI Receptionist is not actively facing the end-customer during the onboarding module. However, the data gathered in this module directly influences the AI's baseline behavior.*

## Industry-Specific Tone Seeding
When the `industry` is selected on the Business Details screen, the system provisions default AI configuration parameters.

- **Dental / Medical**: The AI's `systemPromptTone` is set to "Professional, empathetic, and strictly compliant. Never offer medical advice."
- **Salon / Spa**: The AI's `systemPromptTone` is set to "Warm, welcoming, conversational, and enthusiastic."
- **Law Firm**: The AI's `systemPromptTone` is set to "Highly formal, discreet, concise, and professional."

## Timezone Anchoring
The `timezone` selected during onboarding becomes the absolute anchor for the AI's temporal understanding.
- **Guardrail**: If the AI asks a customer "Would you like tomorrow at 2 PM?", it will calculate "tomorrow" based on the Organization's localized timezone, not UTC.

## Fallback Seeding
Until the user completes the remaining modules (Services, Team, Knowledge Base), the AI is fundamentally crippled.
- **State**: If the AI is triggered immediately after onboarding before services are added, its fallback behavior is enforced: "I'm still being set up by the team and can't book appointments just yet. Please call the business directly."
