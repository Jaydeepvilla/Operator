# User Personas: Organization Management

## Business Owner
### Goals
- Ensure their business looks professional (logo, correct name) to the end customer.
- Manage operating hours so they don't receive unexpected bookings.
### Responsibilities
- Maintain accurate legal and operational data.
### Permissions
- Full Edit access to all Organization fields.
### Pain Points
- Complicated UI for setting up complex business hours (e.g., closed for lunch between 12 and 1).

## Admin / Manager
### Goals
- Keep operational hours up to date (e.g., closing early for a snowstorm).
### Responsibilities
- Updating the Holiday calendar.
### Permissions
- Can edit Business Hours, Address, and Holidays.
- Cannot delete the organization or change the fundamental subscription.
### Pain Points
- Forgetting to add a holiday and dealing with angry customers who booked on a day the clinic is closed.

## AI Receptionist (System Persona)
### Goals
- Answer customer questions accurately.
### Responsibilities
- Read the `businessSettings` table to enforce temporal boundaries.
### Permissions
- Programmatic Read-Only access.
