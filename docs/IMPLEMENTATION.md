# Murshid — implementation status

Private Sites deployment, backed by D1 and private R2. Source is versioned in the hosted Site repository. GitHub source delivery uses the `murshid-mvp` branch in `buyyourtrips/murshid`; the original main branch is retained for review.

Implemented: authenticated owner admin (buyyourtrips@gmail.com), booking creation/editing/status, family traveller records, dated/timed itinerary services, draft/published itinerary, customer layout preview, destination directory with source/verification dates, staff-only/customer-visible documents, booking-linked support, threaded coordinator/traveller replies and resolution, customer email grants and revocation, audit records and printable trip view.

Customer users require BOTH private Site admission and an active booking email grant. Grants send no email. Customer actions cannot modify bookings. Only published trips and customer-visible documents are returned. Customer preview is a layout mode, not authentication or an isolation test.

Not yet implemented: multiple staff roles, separate private document access per adult, automated reminders, offline trip pack, medical profiles, Roam Desk sync, external invitation delivery, AI/voice/avatar, rewards, backup/restore UI. Do not load sensitive individual adult documents into shared family-visible storage.

No synthetic customer records or invented emergency contacts are seeded. Approved logo source assets are not yet supplied to this project; the UI uses plain text branding.

Data model: bookings (trip payload including travellers/services/destination places), booking_access, documents, support_requests, audit_events. Normalize traveller/service records before adding cross-booking reporting or broader integrations. API writes use server-side identity and authorization. Runtime schema is migration-owned.

Acceptance: owner creates booking, edits dates/services, publishes itinerary, uploads file, submits and resolves request. Non-admin tests require separate admitted accounts; complete before customer rollout. Confirm document visibility, revoked access, draft booking denial, denied cross-booking requests, mobile and printable layout, and backup/restore before production use.

## Verification in this update

Actual handlers pass an in-memory D1-compatible SQLite/R2-adapter suite covering booking lifecycle, draft isolation, role denial, cross-booking access, support replies and resolution, staff/customer file visibility, file signature rejection, revocation, invalid date/timezone and cross-origin write denial. Production identity and signed-in browser workflows remain unverified.
