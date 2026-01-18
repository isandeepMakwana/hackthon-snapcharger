# Add manual location scope + multi-stop trip planning

This ExecPlan is a living document. The sections Progress, Surprises & Discoveries, Decision Log, and Outcomes & Retrospective must be kept up to date as work proceeds.

This plan follows /PLANS.md in the repository root and must be maintained in accordance with that document.

## Purpose / Big Picture

Drivers should be able to plan multi-stop EV trips by manually setting locations in addition to the existing automatic current-location detection. After this change, a driver can search for destinations (city, address, or coordinates), add multiple stops (for example Pune → Gujarat → Indore), visualize the route and nearby charging stations, and see distance/time estimates plus station availability and estimated charging time. The new UI must be mobile-friendly and keep the existing auto-location as the default start point.

## Progress

- [x] (2026-01-16 21:27Z) Draft ExecPlan for location scope + trip planning feature.
- [x] (2026-01-16 22:02Z) Add backend geocoding + route planning endpoints with caching and new response models.
- [x] (2026-01-16 22:02Z) Build trip planning UI and map visualization, wiring it to new backend APIs.
- [x] (2026-01-16 22:06Z) Validate frontend build and document acceptance steps.

## Surprises & Discoveries

None yet.

## Decision Log

- Decision: Use OpenStreetMap Nominatim for forward geocoding and OSRM for routing.
  Rationale: Both are already compatible with the project’s existing Leaflet map usage, require no API keys, and keep implementation lightweight.
  Date/Author: 2026-01-16 / Codex.

- Decision: Use the driver profile vehicle type (2W/4W) to estimate charging time, with a conservative default when profile data is unavailable.
  Rationale: This integrates with the existing profile system without adding new profile fields or migrations.
  Date/Author: 2026-01-16 / Codex.

- Decision: Derive station capacity ports from station power output tiers and report zero available ports when stations are BUSY or OFFLINE.
  Rationale: The current data model does not store charger port counts, so a deterministic tiered estimate provides consistent capacity info without schema changes.
  Date/Author: 2026-01-16 / Codex.

## Outcomes & Retrospective

Trip planning endpoints, caching, and UI were implemented. The frontend build succeeded via Vite, but backend runtime validation still needs a manual run because the new endpoints depend on live HTTP calls to Nominatim and OSRM. The next contributor should verify the backend endpoints with live data and capture route responses in the Artifacts section.

## Context and Orientation

The driver experience lives in frontend/src/features/driver/DriverView.tsx and uses a Leaflet map rendered by frontend/src/features/driver/components/MapCanvas.tsx. Stations are loaded by frontend/src/services/driverService.ts from the backend endpoint in backend/app/api/routes/driver.py, which uses helpers in backend/app/api/utils/stations.py and Pydantic response models in backend/app/models/driver.py and backend/app/models/station.py. The driver config (including default location) is served by /api/driver/config. Driver profile data (vehicle type/model) is served by /api/profile/driver in backend/app/api/routes/profile.py. The host dashboard uses frontend/src/features/host/HostView.tsx and is not part of this trip planner change, but its station cards confirm that images, status, and availability are important UI signals.

“Route planning” here means computing a path between multiple geographic points and returning its total distance/time, plus a polyline for map drawing. “Route stations” are charging stations within a corridor (for example 2–5 km) of that path. “Charging time estimate” is a derived value based on station power and a default battery size per vehicle type.

## Plan of Work

Milestone 1: Backend trip planning APIs and caching.

Create new Pydantic models for location search results, trip planning requests, route summaries, and route station metadata. Add a /api/driver/locations/search endpoint that accepts a query string and returns top search results with a station availability summary (counts by status within a radius). Add a /api/driver/trip/plan endpoint that accepts an ordered list of stops (lat/lng plus label) and an optional vehicleType, calls OSRM for route geometry and distance/time, then filters stations along the route using a corridor distance. Compute estimated charging time per station using station power (parse_power_kw) and a default battery size per vehicle type. Add a small in-memory cache (TTL-based dictionary) keyed by normalized stops + vehicle type to avoid repeated OSRM and station corridor work. Keep the cache optional and safe: if it misses or expires, recompute. The endpoints live in backend/app/api/routes/driver.py, with helpers in a new module backend/app/api/utils/route_planner.py (routing, filtering, and estimates) and backend/app/api/utils/route_cache.py (TTL cache). Ensure response models live in backend/app/models/driver.py or a new backend/app/models/trip.py (either is acceptable but must be clearly referenced).

Milestone 2: Frontend trip planning UI and map integration.

Add a new “Trip Planner” tab to the driver view (next to Discover/My bookings). Build a new component frontend/src/features/driver/components/TripPlannerPanel.tsx that includes a location search input, a list of results with availability counts, and a trip stop list where the user can add, reorder (up/down buttons), and remove stops. The start stop defaults to the current auto-location from driverConfig, with a “Use current location” action to reset. When at least two stops are present, call the new trip plan endpoint and render the route on the map. Extend MapCanvas to accept an optional route polyline and stop markers; when route data is present, fit the map bounds to the route. Add a route summary card showing total distance and duration, plus a list of stations along the route with availability indicators, estimated charging time, and capacity/ports info. Make sure this panel is responsive (stacked layout on mobile) and uses the existing design tokens and colors for availability states.

Milestone 3: Validation and UX polish.

Add loading states and error handling for geocoding and routing. Cache the last planned route in local storage to support quick refresh and smoother navigation. Verify that a multi-stop route displays route line and station markers in the map, and that the driver can add or remove stops without breaking the view. Ensure the Discover tab continues to work without regression.

## Concrete Steps

Work from the repository root.

1) Add backend models and utilities.
   - Edit backend/app/models/driver.py (or create backend/app/models/trip.py) to define the request/response types used by the new endpoints.
   - Add backend/app/api/utils/route_planner.py for routing, polyline decoding, station filtering, and charge-time estimates.
   - Add backend/app/api/utils/route_cache.py for a TTL cache.

2) Add new endpoints to backend/app/api/routes/driver.py.
   - Implement /api/driver/locations/search using Nominatim forward geocoding and station availability counts.
   - Implement /api/driver/trip/plan using OSRM routing, station corridor filtering, and caching.

3) Add frontend services and types.
   - Extend frontend/src/types/driver.ts with trip planning response interfaces.
   - Add API functions to frontend/src/services/driverService.ts or a new tripService.ts.

4) Build the Trip Planner UI.
   - Create frontend/src/features/driver/components/TripPlannerPanel.tsx.
   - Update frontend/src/features/driver/DriverView.tsx to add the new tab and render TripPlannerPanel.
   - Extend frontend/src/features/driver/components/MapCanvas.tsx to accept optional route + stop props and render a polyline with Leaflet.

5) Validate and document.
   - Run the backend and frontend, plan a multi-stop route, and confirm that stations along the route appear with availability indicators and charging time estimates.

## Validation and Acceptance

Start backend and frontend and verify:

- On the Driver dashboard, the Trip Planner tab allows typing a location (city/address/coordinates) and shows search results with availability counts.
- Adding at least two stops triggers a route line on the map and a summary card with total distance and travel time.
- Stations along the route appear both on the map and in a list with availability badges and estimated charging time.
- Switching back to Discover still behaves as before, and the default start stop reflects current auto-location.

Suggested commands (from repo root):

- Backend: python -m uvicorn app.main:app --reload (working directory: backend)
- Frontend: npm run dev (working directory: frontend)

## Idempotence and Recovery

All steps are additive or modifying existing components in-place. If geocoding or routing fails due to network issues, the UI should surface a readable error and allow retry without refreshing. The route cache is in-memory only and safe to clear by restarting the backend server.

## Artifacts and Notes

Include concise logs while testing, for example:

  Trip plan request: stops=3, totalDistanceKm=450.2, totalDurationMin=420
  Route stations found: 7 within 3km corridor

  Frontend build output (vite build):
    ✓ 1757 modules transformed.
    ✓ built in 1.70s

## Interfaces and Dependencies

Backend:

- In backend/app/api/utils/route_cache.py define:

    class RouteCache:
        def get(self, key: str) -> dict | None
        def set(self, key: str, payload: dict, ttl_seconds: int) -> None

- In backend/app/api/utils/route_planner.py define:

    async def geocode_query(query: str, limit: int) -> list[dict]
    async def fetch_osrm_route(stops: list[tuple[float, float]]) -> dict
    def decode_polyline(polyline: str) -> list[tuple[float, float]]
    def stations_along_route(stations: list[Station], route_points: list[tuple[float, float]], corridor_km: float) -> list[dict]
    def estimate_charge_minutes(power_kw: float, vehicle_type: str | None) -> int

- In backend/app/models/driver.py (or trip.py), define request/response models:

    class LocationSearchResult(CamelModel): name: str; lat: float; lng: float; availability: dict
    class TripStopIn(CamelModel): label: str; lat: float; lng: float; source: str
    class TripPlanRequest(CamelModel): stops: list[TripStopIn]; vehicle_type: str | None; corridor_km: float | None
    class TripLegOut(CamelModel): from_label: str; to_label: str; distance_km: float; duration_min: float
    class TripRouteOut(CamelModel): distance_km: float; duration_min: float; polyline: str; bbox: list[float]; legs: list[TripLegOut]
    class RouteStationOut(CamelModel): station: StationOut; distance_to_route_km: float; distance_from_start_km: float; eta_from_start_min: float; estimated_charge_min: int; capacity_ports: int; available_ports: int
    class TripPlanResponse(CamelModel): route: TripRouteOut; stations: list[RouteStationOut]

Frontend:

- In frontend/src/services/driverService.ts add:

    export const searchLocations(query: string): Promise<LocationSearchResult[]>;
    export const planTrip(payload: TripPlanRequest): Promise<TripPlanResponse>;

- In frontend/src/features/driver/components/MapCanvas.tsx add optional props:

    routePolyline?: Array<[number, number]>;
    routeStops?: Array<{ id: string; label: string; lat: number; lng: number; type: 'start' | 'stop' }>;

These dependencies are chosen to minimize new libraries. Use httpx for backend HTTP calls to Nominatim/OSRM and Leaflet for map rendering.

Change note: Initial ExecPlan created on 2026-01-16 to cover manual location scope + multi-stop route planning. Updated on 2026-01-16 after backend and frontend implementations were completed.
Change note: Updated on 2026-01-16 after frontend build validation was run and retrospective notes were added.
