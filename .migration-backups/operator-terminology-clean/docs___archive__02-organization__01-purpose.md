# Purpose: Organization Management

## Business Objective
To provide a centralized command center where the business owner defines the foundational parameters of their operation. This ensures the AI Receptionist has absolute clarity on when the business is open, where it is located, and how to contact it.

## Why Module Exists
The AI needs a source of truth for basic queries. When a customer asks "Are you open on Thanksgiving?", the AI must query the Organization's holiday schedule, not hallucinate an answer. Without this module, every business would operate on a hardcoded, generic assumption, which is fatal for SaaS.

## Problem Solved
- Prevents the AI from booking appointments when the clinic is closed.
- Eliminates the need to prompt-engineer the AI with business details (instead, details are structured in the database).
- Provides a white-labelable experience by storing the business logo and name.

## Success Criteria
- An Owner can successfully update their business hours and see the AI instantly refuse to book appointments outside those hours.
- A holiday can be added, and all available slots for that day disappear from the booking engine.

## KPIs
- **Settings Completion Rate**: Percentage of organizations that have uploaded a logo and filled out their physical address.
- **Support Tickets**: Reduction in tickets asking "How do I change my timezone?".
