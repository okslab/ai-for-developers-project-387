import "@typespec/http";

using TypeSpec.Http;

namespace AppointmentBooking.Owner;

@route("/api/owner/event-types")
@tag("Owner")
@doc("Owner-only event type management. No authentication: the single fixed owner profile is assumed.")
namespace OwnerEventTypes {
  @doc("Create a new event type.")
  @post
  op create(
    @body body: EventTypeCreate,
  ): {
    @statusCode statusCode: 201;
    @body body: EventType;
  };

  @doc("List all event types for the admin panel.")
  @get
  op list(): EventType[];
}

@route("/api/owner/bookings")
@tag("Owner")
@doc("List upcoming meetings across all event types (only bookings with endsAt >= now), enriched with event type name and description.")
@get
op listUpcoming(@query from?: utcDateTime): BookingWithEventType[];
