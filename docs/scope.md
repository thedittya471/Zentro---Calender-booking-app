# Individual scheduling: release scope

This document defines the first release. It records the proposed product boundaries; unresolved policies below require a decision before their dependent features are implemented.

## Objective and users

Let individual professionals share a booking link and accept one-to-one meetings without exchanging messages to find a time.

- Hosts authenticate, configure their availability and event types, connect Google Calendar, and manage their own bookings.
- Guests view public availability and book without creating an account. Secure management links let them cancel or reschedule their booking.

## Main journey

1. A host signs in, configures their public profile and timezone, and connects Google Calendar.
2. The host sets working hours and creates an active event type.
3. A guest opens the shared link, confirms their timezone, and selects an available date and time.
4. The guest submits their name, email and optional note.
5. The application rechecks availability and creates a reservation, or explains why the selected time is no longer available.
6. Both parties receive confirmation; calendar synchronization and notifications run with recoverable failure handling.
7. The host manages the booking in the dashboard; the guest uses a secure link to cancel or reschedule.

## Included in the first release

| Area                 | Required capabilities                                                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account and profile  | Authentication, logout, public username, display name, biography, timezone, onboarding, account export and deletion                                      |
| Event types          | Title, description, duration, host-scoped slug, location/link, activation and archival                                                                   |
| Availability         | Named schedules, weekly hours, multiple daily windows, date overrides, days off, event-to-schedule assignment                                            |
| Scheduling rules     | Minimum notice, booking horizon, before/after buffers, slot interval and daily booking limit                                                             |
| Public booking       | Responsive accessible booking page, available dates/times, explicit timezone selection, guest details, confirmation and downloadable calendar invitation |
| Booking lifecycle    | Host dashboard, upcoming/past bookings, date/event filters, cancellation and rescheduling                                                                |
| Google Calendar      | Secure connection, calendar selection, busy-time checks, create/update/cancel events, connection health and reconnection                                 |
| Notifications        | Host/guest confirmation, cancellation and reschedule emails, one configurable reminder per event type                                                    |
| Production operation | Durable background work, bounded retries, abuse controls, monitoring, deployment checks, backups and recovery procedures                                 |

One-to-one means one host and one guest per booking. The service supports multiple independent hosts; a host's reservations block conflicting times across all of their event types.

## Excluded from this release

- Team workspaces, organization roles, round-robin and collective scheduling.
- Group events, capacity management and additional attendees.
- Outlook and other calendar providers; automatic video-conference provisioning.
- Payments, subscriptions and paid appointments.
- Custom branding, embeds, customer-facing webhooks and advanced analytics.
- Native mobile applications and full Calendly feature parity.

These exclusions are future scope, not prerequisites for this release. Operational metrics remain included even though customer analytics are excluded.

## Release acceptance criteria

1. A host can configure a valid event and share a working public booking link; a guest can complete booking without an account.
2. Only active, available event types accept bookings. Archived or deactivated links do not expose bookable slots; historical booking details remain accurate after event edits.
3. Available times honor weekly hours, date overrides, timezone/DST rules, duration, notice, horizon, buffers, daily limits and busy periods in selected Google calendars.
4. Concurrent overlapping requests, including across different event types, cannot produce two active reservations for the same host. Daily limits remain enforced under concurrency.
5. Repeated creation requests with the same request identity do not create duplicate bookings. Reusing that identity with changed details is rejected.
6. A stale slot or failed required calendar conflict check rejects a new booking with a clear message rather than accepting an unchecked time.
7. Cancellation releases the reservation. Rescheduling atomically reserves the replacement; a failed replacement keeps the original booking intact.
8. Hosts cannot read or change another host's private data. Guest links authorize only the intended booking actions; expired or revoked links are rejected. Public pages omit guest data and credentials.
9. Calendar and email failures do not lose an accepted reservation. Retryable work survives worker restarts, and synchronization failure is visible to the host. Calendar retries avoid duplicate events; email duplicate-delivery guarantees depend on the selected provider.
10. Canceled or superseded bookings do not trigger pending reminders. Notifications display the correct meeting details and timezone.
11. Booking and dashboard flows work on mobile and with keyboard navigation, with usable validation, loading and error feedback.
12. Critical browser journeys, concurrency and provider-failure checks pass before launch. Backup restoration and safe rollout/rollback are demonstrated against agreed operating targets.

## Decisions required before dependent implementation

| Decision                                                                                                                                                                                                               | Resolve before                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Authentication resolved: Better Auth, Google and email/password, seven-day fixed sessions; see [authentication.md](authentication.md)                                                                                  | Apply the documented policy during authentication integration |
| Username changes: redirect, reserve or retire old links                                                                                                                                                                | Username change implementation                                |
| Daily limit scope/counting, schedule timezone defaults and DST ambiguity handling                                                                                                                                      | Scheduling rules and slot calculation                         |
| Guest-link expiry and cancellation/rescheduling cutoffs                                                                                                                                                                | Guest management links and booking lifecycle                  |
| Calendar recovery resolved: preserve confirmed bookings and pause new bookings until reconnect/review; see [google-calendar.md](google-calendar.md). Google grant isolation and guest invitation behavior remain open. | Calendar integration and deployment                           |
| Reminder timing, email provider and ambiguous email retry policy                                                                                                                                                       | Notifications                                                 |
| Guest-data retention and treatment of future bookings during account deletion                                                                                                                                          | Privacy and account deletion                                  |
| Redis-outage admission policy                                                                                                                                                                                          | Distributed abuse controls                                    |
| Hosting budget, expected traffic, latency targets and recovery objectives                                                                                                                                              | Load verification and production provisioning                 |

Fresh calendar checks reduce external conflicts, but Google Calendar and the application database cannot reserve a time atomically. Direct external calendar changes require an explicit reconciliation policy.
