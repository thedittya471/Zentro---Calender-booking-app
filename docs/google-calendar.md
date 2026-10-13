# Google Calendar permissions and failure policy

## Integration boundary

Google Calendar authorization is a separate host-initiated flow from [Google sign-in](authentication.md). Email/password hosts can connect Calendar too. Calendar consent does not create a login identity or link an authentication account. Express owns authorization and conflict reads; the worker performs durable calendar writes, as described in [architecture.md](architecture.md).

The user selected this recovery policy: preserve confirmed bookings and pause new bookings for the affected host until reconnect/review. Never automatically move or cancel accepted meetings because access is lost or an external conflict is detected.

## Permissions

Request these Calendar scopes when the host connects, not at sign-in:

| Scope suffix under `https://www.googleapis.com/auth/` | Purpose                                                                           |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| `calendar.calendarlist.readonly`                      | List available calendars and access roles for host selection                      |
| `calendar.events.freebusy`                            | Read busy intervals from accessible selected calendars                            |
| `calendar.events`                                     | Create, inspect, update and delete booking events in a selected writable calendar |

The events scope supports calendars where the host has write access without ownership. The narrower `calendar.events.owned` would exclude that capability. Do not request calendar administration, ACL or full `calendar` access. Google scopes grant broader provider access than a single selected calendar; our server must restrict operations to approved selections and app-created event mappings. See [scope definitions](https://developers.google.com/workspace/calendar/api/auth).

Use `openid` and `email` in the connection flow to identify the consenting Google account through a validated ID token. Bind that Google subject to the authenticated internal host ID; matching email alone does not authorize a connection replacement. Record granted scopes and refuse activation if required permissions are missing.

Select readable calendars for conflict checks and one destination with writer/owner access. Include the destination in conflict checks; never silently drop a selected calendar that becomes inaccessible. Follow calendar-list pagination. See [calendar selection](https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/list).

## OAuth and credentials

Use the server authorization-code flow with offline access, exact registered callback URLs, short-lived single-use state bound to the initiating session, and PKCE through the chosen supported client implementation. Reject callbacks after logout, session expiry or state mismatch. Exchange codes server-side and validate issuer, audience and nonce for ID tokens.

Persist access/refresh tokens encrypted at rest, with keys outside the database and source control. Preserve an existing refresh token when a successful exchange omits a replacement. A first connection without usable offline credentials is incomplete and needs explicit renewed consent. Serialize refresh updates per connection; invalid credentials require reconnect, not an endless retry loop. Never log authorization codes, tokens or callback query strings.

Offline access and token revocation are described in [Google's server OAuth guide](https://developers.google.com/identity/protocols/oauth2/web-server). Revocation is project-wide across OAuth clients; separate client IDs in one project do not guarantee Calendar/sign-in isolation. Deployment must either isolate those grants using separate projects or explicitly handle the resulting sign-in re-consent. Existing application sessions are independent database records. Final project configuration remains a deployment decision.

## Conflict checks and booking admission

Query bounded time ranges using FreeBusy; inspect every requested calendar result even when the HTTP response succeeds. Missing calendar results and per-calendar errors are failed checks, not empty availability. Busy ranges have inclusive starts and exclusive ends. No event titles or unrelated guest details are needed to calculate public slots. See [FreeBusy query](https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query).

Recheck required external availability at submission before the short database admission transaction. Enforce local reservation overlap constraints and daily limits inside that transaction; never hold database locks during Google calls. Unavailable required checks reject creation or replacement without disturbing existing reservations. Cancellation remains available locally during a Google outage, with the calendar operation pending.

External edits can still occur between a Google check and database commit. Do not infer an external conflict merely because a confirmed booking's own Google event appears busy. Reconcile suspected conflicts using known event mappings and relevant provider details. Confirmed bookings retain their local time/status until an explicit host or guest action changes them; direct Google edits are not automatic bidirectional booking updates.

## Error classification

| Condition                                                             | Required behavior                                                                                                                    |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Network timeout, retryable 5xx, quota/rate-limit reason on 403 or 429 | Bounded backoff with jitter and applicable Retry-After; request deadline prevents long synchronous waits; durable writes retry later |
| Expired access token / 401                                            | Refresh once and retry once; persistent failure marks reconnect required                                                             |
| Refresh `invalid_grant`, missing scopes, access denied                | Pause new bookings and show reconnect/review; no repeated blind retries                                                              |
| Selected calendar missing or no longer readable/writable              | Pause new bookings; preserve selections for review rather than ignoring them                                                         |
| Invalid request / non-retryable 400                                   | Record actionable sanitized failure; correct configuration or implementation before replay                                           |
| Duplicate event identifier / 409 on create                            | Fetch the expected event and verify app ownership before treating creation as completed                                              |
| Missing mapped event on update/delete                                 | Reconcile whether removed, inaccessible or already canceled; never treat all 404 responses as successful cancellation                |
| Outdated conditional write / 412                                      | Reload provider state and reconcile booking revision; avoid overwriting a newer state                                                |

Classify provider error reasons as well as HTTP status: not every 403 is transient. See [Google error guidance](https://developers.google.com/workspace/calendar/api/guides/errors).

## Writes and synchronization

Commit the reservation, booking snapshot and calendar job together. Use a provider-valid deterministic event ID, persisted destination calendar ID, booking revision and ownership metadata. After an ambiguous create response, look up that ID before retrying. Update/delete only events mapped to this application's bookings; never modify unrelated calendar entries. See [event creation](https://developers.google.com/workspace/calendar/api/v3/reference/events/insert).

Serialize side effects for a booking and prevent old revisions from overwriting new ones. After reconnection, reconcile pending operations against the latest booking revision, not historical job payloads. Booking status and calendar sync status are separate: a failed write does not invalidate an accepted reservation. Show pending, retrying or action-required synchronization clearly to the host.

Guest calendar invitations and `sendUpdates` behavior must be finalized with notification design before writes ship. Do not assume suppressing provider email is harmless for attendee calendar synchronization; Google documents that risk in the event-creation reference. App booking emails remain required independently.

## Disconnect, reconnect and external conflicts

On disconnect, pause booking admission, disable use of that connection, and attempt provider revocation. Delete local credentials when revocation succeeds. If revocation cannot complete, retain only encrypted credentials for bounded revocation cleanup, deny all other use and surface the unresolved revocation. Do not silently retain an active connection.

Existing Google events and local reservations remain; disconnected calendar updates cannot be promised. Show that limitation before the host confirms disconnect. Local cancellation records the intended external change for review/reconciliation after reconnect. Do not erase event mappings or pending intent merely because credentials are removed.

Reconnect requires authenticated host authorization. Verify account identity, granted scopes, selections and destination access before resuming. Reconnecting a different Google account does not authorize migration of existing calendar events; unresolved mappings remain visible and booking admission stays paused until reviewed. A transient outage pause may clear after a successful required check; an identified external conflict requires explicit resolution/review.

## Verification and launch requirements

Verify consent denial, callback replay, missing scopes, partial FreeBusy errors, all-day busy ranges, access-role loss, concurrent refresh, invalid credentials, ambiguous creates, stale jobs and disconnect/reconnect races. Demonstrate preservation of reservations during outages and failed reschedules. Validate the real Google integration with test calendars before production access.

Enable the Calendar API, configure authorized domains/callbacks and complete Google's applicable consent/verification requirements before public launch. Environment-specific credentials and token encryption keys remain operational prerequisites. This document records the design; no live integration or OAuth configuration has been verified.
