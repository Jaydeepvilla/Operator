# Business Rules: Organization Management

1. **Global Boundary**: The Organization's Business Hours are the absolute outermost boundary for scheduling. No staff member can be booked for an appointment outside of these hours, even if the staff member's personal schedule claims they are available.
2. **Timezone Anchor**: The `timezone` string defined here dictates how all UTC timestamps in the database are rendered to the business owner, and how the availability engine calculates "Midnight". Changing the timezone does not shift existing appointments (they are anchored in UTC), but it shifts when the business opens/closes relative to UTC.
3. **Holiday Precedence**: A date entered into the Holidays array acts as a global kill-switch for availability on that local date. It supersedes all business hours and staff schedules.
4. **Data Injection**: The Business Name, Phone Number, and Address must be injected into the system prompt of the AI Receptionist at all times so it can answer basic logistical questions without a database lookup.
