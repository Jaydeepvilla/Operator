# User Personas: Team Management

## Manager / Admin
### Goals
- Ensure the business is properly staffed for the week.
- Control which employees can access customer data and billing.
### Responsibilities
- Adding new hires to the system.
- Defining which services each staff member is qualified to perform.
- Approving or setting vacation days.
### Permissions
- Full Edit access to all Staff profiles, schedules, and roles.
### Pain Points
- Managing shift swaps or sudden sick leave and scrambling to reschedule affected appointments.

## Staff Member (Practitioner)
### Goals
- See their own schedule clearly.
- Protect their personal time (e.g., blocking out an hour for a dentist appointment).
### Responsibilities
- Showing up for the appointments booked by the AI.
### Permissions
- Can edit their *own* ad-hoc exceptions (if allowed by global rules).
- Cannot edit other staff members' schedules or change their own assigned services.
### Pain Points
- Showing up to work and finding out the receptionist double-booked them, or didn't leave enough time to clean up between clients.

## AI Receptionist (System Persona)
### Goals
- Find the optimal staff member for a requested service.
### Responsibilities
- Intersecting the Staff Schedule with Organization Hours and existing Appointments to generate true availability.
### Permissions
- Programmatic Read-Only access to schedules and exceptions.
