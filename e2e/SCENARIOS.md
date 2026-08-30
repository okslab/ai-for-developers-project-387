# Integration test scenarios (E2E)

This document captures the user scenarios that the Playwright integration tests
verify in a real browser, together with the backend and frontend running against
the shared OpenAPI contract. Scenarios map to the functional requirements in
[`../spec.md`](../spec.md).

Each scenario runs against a fresh backend instance (the backend uses an
in-memory store that is reset on restart), so tests are self-contained and
deterministic. Where a scenario needs an event type, the test creates it through
the owner UI first.

## Scenario S1 — Owner creates an event type (FR-1)

Steps:

1. Owner opens the "Event types" admin page (`/owner`).
2. Owner fills in name, description and duration (minutes).
3. Owner submits the form.
4. The new event type appears in the list of existing event types.

Result: the event type is created and becomes available to guests on the booking
kinds page.

## Scenario S2 — Guest books a free slot (FR-3, FR-4, FR-5)

Steps:

1. Guest opens the booking kinds page (`/`).
2. Guest sees the event type (name, description, duration).
3. Guest selects the event type.
4. The calendar shows free slots within the 14-day booking window.
5. Guest picks a free slot and enters name + email.
6. Guest confirms the booking.
7. A confirmation page ("You're booked!") is shown.

Result: the booking is created and confirmed.

## Scenario S3 — Owner sees the upcoming meeting (FR-2)

Steps:

1. A guest completes a booking for a slot (as in S2).
2. Owner opens the upcoming meetings page (`/owner/bookings`).
3. The booked meeting appears in the list, enriched with the event type name and
   the guest's name and email.

Result: the owner sees the newly booked meeting in the upcoming list.

## Scenario S4 — Booking the same slot twice is rejected (FR-6)

Steps:

1. Two browser pages open the same event type and both select the same free
   slot (the slot is still shown as free on both, since neither has booked yet).
2. The first page confirms the booking and sees the confirmation page.
3. The second page confirms the same slot.
4. The occupancy rule is enforced server-side: the second attempt returns a
   `409` conflict and the UI shows the error message "This time has just been
   taken — please pick another slot."

Result: overlapping bookings are rejected and the conflict is surfaced to the
guest.

## Scenario S5 — Two guests book the same slot at the same moment (FR-6)

Steps:

1. The test creates an event type and fetches its free slots via the API.
2. Two `POST /api/bookings` requests for the *same* slot are fired simultaneously
   (via `Promise.all`) against the real backend.
3. Both requests can pass the free-check before either inserts, so the single
   process must serialize them with its in-memory lock.

Result: exactly one request returns `201` and the other returns `409` — the
slot is never double-booked. This is the automated regression test for the
race-condition issue: with multiple uvicorn workers or replicas (each with its
own store) both requests would return `201`.

## Mapping to functional requirements

| Scenario | FR covered | API endpoints exercised via the UI |
|---|---|---|
| S1 | FR-1 | `POST /api/owner/event-types`, `GET /api/owner/event-types` |
| S2 | FR-3, FR-4, FR-5 | `GET /api/event-types`, `GET /api/event-types/{id}`, `GET /api/event-types/{id}/slots`, `POST /api/bookings` |
| S3 | FR-2 | `GET /api/owner/bookings` |
| S4 | FR-6 | `POST /api/bookings` → `409` |
| S5 | FR-6 | `POST /api/owner/event-types`, `GET /api/event-types/{id}/slots`, `POST /api/bookings` → `201` + `409` |

## Running locally

See `README.md` in this directory for prerequisites and commands.
