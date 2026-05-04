import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { allocationsApi } from "../api";
import { s } from "../styles/common";

const OSRM_ROUTE = (lng1, lat1, lng2, lat2) =>
  `http://router.project-osrm.org/route/v1/driving/${lng1},${lat1};${lng2},${lat2}?geometries=geojson&overview=full`;

// Fix leaflet default icon issue in CRA
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const storeIcon = L.divIcon({
  className: "",
  html: '<div style="width:14px;height:14px;background:#6c63ff;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>',
  iconAnchor: [7, 7],
});

const supIcon = L.divIcon({
  className: "",
  html: '<div style="width:14px;height:14px;background:#4fc3f7;border:2px solid #fff;border-radius:3px;box-shadow:0 1px 4px rgba(0,0,0,.3)"></div>',
  iconAnchor: [7, 7],
});

const memberIcon = L.divIcon({
  className: "",
  html: '<div style="width:10px;height:10px;background:#66bb6a;border:2px solid #fff;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,.3)"></div>',
  iconAnchor: [5, 5],
});

// Fetch a road-route polyline from OSRM.
// Returns [[lat, lng], ...] — falls back to a straight 2-point line on any error.
async function fetchRoadRoute(lat1, lon1, lat2, lon2) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(OSRM_ROUTE(lon1, lat1, lon2, lat2), {
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error("OSRM HTTP error");
    const data = await res.json();
    if (
      data?.code === "Ok" &&
      data?.routes?.[0]?.geometry?.coordinates?.length
    ) {
      // OSRM returns [lng, lat] — swap to [lat, lng] for Leaflet
      return data.routes[0].geometry.coordinates.map(([lng, lat]) => [
        lat,
        lng,
      ]);
    }
  } catch {}
  return [
    [lat1, lon1],
    [lat2, lon2],
  ]; // straight-line fallback
}

export default function AllocationPage() {
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [running, setRunning] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  // routes keyed by "sup_<assignmentId>" or "mem_<memberAssignmentId>"
  const [routes, setRoutes] = useState({});
  const [routesLoading, setRoutesLoading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  // Fetch all road routes whenever the selected allocation changes
  useEffect(() => {
    if (!selected?.assignments?.length) return;
    let cancelled = false;

    const fetchAll = async () => {
      setRoutesLoading(true);
      const tasks = [];

      for (const a of selected.assignments) {
        const sLat = parseFloat(a.store.latitude);
        const sLng = parseFloat(a.store.longitude);
        const vLat = parseFloat(a.supervisor.latitude);
        const vLng = parseFloat(a.supervisor.longitude);

        tasks.push(
          fetchRoadRoute(vLat, vLng, sLat, sLng).then((path) => [
            `sup_${a.id}`,
            path,
          ]),
        );

        for (const ma of a.member_assignments) {
          const mLat = parseFloat(ma.member.latitude);
          const mLng = parseFloat(ma.member.longitude);
          tasks.push(
            fetchRoadRoute(mLat, mLng, sLat, sLng).then((path) => [
              `mem_${ma.id}`,
              path,
            ]),
          );
        }
      }

      const resolved = await Promise.all(tasks);
      if (!cancelled) {
        setRoutes(Object.fromEntries(resolved));
        setRoutesLoading(false);
      }
    };

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [selected]);

  const load = async () => {
    try {
      const { data } = await allocationsApi.list();
      const list = data.results || data;
      setResults(list);
      if (list.length) setSelected(list[0]);
    } catch {
      setError("Failed to load allocations.");
    }
  };

  const runAlloc = async () => {
    setRunning(true);
    setError("");
    try {
      const { data } = await allocationsApi.run(notes);
      setResults((prev) => [data, ...prev]);
      setSelected(data);
      setNotes("");
    } catch (e) {
      setError(e.response?.data?.error || "Allocation failed.");
    } finally {
      setRunning(false);
    }
  };

  const mapCenter = selected?.assignments?.[0]?.store
    ? [
        parseFloat(selected.assignments[0].store.latitude),
        parseFloat(selected.assignments[0].store.longitude),
      ]
    : [-27.47, 153.02];

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Allocation results</h1>

      <div style={s.formCard}>
        <h3 style={s.h3}>Run new allocation</h3>
        <div style={{ marginBottom: 10 }}>
          <label style={s.fieldLabel}>Notes (optional)</label>
          <input
            style={s.input}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Week 23 allocation"
          />
        </div>
        {error && <p style={s.error}>{error}</p>}
        <button style={s.btnPrimary} onClick={runAlloc} disabled={running}>
          {running ? "Running…" : "Run allocation"}
        </button>
      </div>

      {results.length > 1 && (
        <div style={{ marginBottom: "1rem" }}>
          <label style={s.fieldLabel}>View past allocation</label>
          <select
            style={{ ...s.input, maxWidth: 300 }}
            onChange={(e) => {
              const found = results.find(
                (r) => r.id === parseInt(e.target.value),
              );
              if (found) setSelected(found);
            }}
            value={selected?.id || ""}
          >
            {results.map((r) => (
              <option key={r.id} value={r.id}>
                #{r.id} — {new Date(r.created_at).toLocaleString("en-AU")}{" "}
                {r.notes ? `(${r.notes})` : ""}
              </option>
            ))}
          </select>
        </div>
      )}

      {selected && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 10,
              marginBottom: "1.5rem",
            }}
          >
            <StatCard
              label="Stores selected"
              value={selected.assignments.length}
            />
            <StatCard
              label="Total weekly value"
              value={
                "$" +
                selected.assignments
                  .reduce(
                    (a, x) => a + parseFloat(x.store.weekly_delivery_value),
                    0,
                  )
                  .toLocaleString()
              }
            />
            <StatCard
              label="Members deployed"
              value={selected.assignments.reduce(
                (a, x) => a + x.member_assignments.length,
                0,
              )}
            />
          </div>

          {routesLoading && (
            <p style={{ ...s.muted, marginBottom: "0.5rem" }}>
              Fetching road routes…
            </p>
          )}

          <MapContainer
            center={mapCenter}
            zoom={10}
            style={{
              height: "clamp(260px, 45vh, 380px)",
              borderRadius: 10,
              marginBottom: "1.5rem",
              border: "1px solid #1e1e3a",
            }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
            {selected.assignments.map((a) => {
              const sLat = parseFloat(a.store.latitude);
              const sLng = parseFloat(a.store.longitude);
              const vLat = parseFloat(a.supervisor.latitude);
              const vLng = parseFloat(a.supervisor.longitude);
              const supRoute = routes[`sup_${a.id}`] || [
                [vLat, vLng],
                [sLat, sLng],
              ];
              return (
                <div key={a.id}>
                  <Marker position={[sLat, sLng]} icon={storeIcon}>
                    <Popup>
                      <b>{a.store.name}</b>
                      <br />$
                      {Number(a.store.weekly_delivery_value).toLocaleString()}
                      /wk
                      <br />
                      Supervisor: {a.supervisor.name}
                    </Popup>
                  </Marker>
                  <Marker position={[vLat, vLng]} icon={supIcon}>
                    <Popup>
                      <b>{a.supervisor.name}</b>
                      <br />
                      Assigned to: {a.store.name}
                      <br />
                      {a.supervisor_distance_km} km away
                    </Popup>
                  </Marker>
                  <Polyline
                    positions={supRoute}
                    color="#4fc3f7"
                    weight={2}
                    dashArray="8 5"
                    opacity={0.75}
                  />
                  {a.member_assignments.map((ma) => {
                    const mLat = parseFloat(ma.member.latitude);
                    const mLng = parseFloat(ma.member.longitude);
                    const memRoute = routes[`mem_${ma.id}`] || [
                      [mLat, mLng],
                      [sLat, sLng],
                    ];
                    return (
                      <div key={ma.id}>
                        <Marker position={[mLat, mLng]} icon={memberIcon}>
                          <Popup>
                            <b>{ma.member.name}</b>
                            <br />
                            Assigned to: {a.store.name}
                            <br />
                            {ma.distance_km} km away
                          </Popup>
                        </Marker>
                        <Polyline
                          positions={memRoute}
                          color="#66bb6a"
                          weight={1.5}
                          dashArray="5 4"
                          opacity={0.6}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </MapContainer>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              marginBottom: "1rem",
              fontSize: 12,
              color: "#a0a0b8",
            }}
          >
            <LegendItem color="#6c63ff" label="Selected store" shape="circle" />
            <LegendItem color="#4fc3f7" label="Supervisor" shape="square" />
            <LegendItem color="#66bb6a" label="Team member" shape="circle" />
          </div>

          {selected.assignments.map((a) => (
            <div key={a.id} style={s.resultCard}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <span style={{ fontWeight: 600, fontSize: 15 }}>
                  {a.store.name}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    background: "#1e1e3a",
                    color: "#4fc3f7",
                    padding: "3px 10px",
                    borderRadius: 6,
                  }}
                >
                  ${Number(a.store.weekly_delivery_value).toLocaleString()}/wk
                </span>
              </div>
              <div style={s.resultRow}>
                <span style={{ color: "#a0a0b8" }}>Supervisor</span>
                <span>
                  {a.supervisor.name}{" "}
                  <span style={{ color: "#a0a0b8" }}>
                    ({a.supervisor_distance_km} km)
                  </span>
                </span>
              </div>
              <div style={s.resultRow}>
                <span style={{ color: "#a0a0b8" }}>Members</span>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 6,
                    justifyContent: "flex-end",
                  }}
                >
                  {a.member_assignments.map((ma) => (
                    <span
                      key={ma.id}
                      style={{
                        fontSize: 12,
                        padding: "2px 8px",
                        background: "#0a0a1a",
                        border: "1px solid #1e1e3a",
                        borderRadius: 6,
                        color: "#ffffff",
                      }}
                    >
                      {ma.member.name}{" "}
                      <span style={{ color: "#a0a0b8" }}>
                        {ma.distance_km}km
                      </span>
                    </span>
                  ))}
                  {a.member_assignments.length === 0 && (
                    <span style={{ color: "#a0a0b8", fontSize: 12 }}>
                      None assigned
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </>
      )}

      {results.length === 0 && !running && (
        <p style={s.muted}>
          No allocations yet. Run your first allocation above.
        </p>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div
      style={{
        background: "#12122a",
        border: "1px solid #1e1e3a",
        borderRadius: 10,
        padding: "12px 16px",
      }}
    >
      <div style={{ fontSize: 22, fontWeight: 600, color: "#ffffff" }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "#a0a0b8", marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

function LegendItem({ color, label, shape }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <div
        style={{
          width: 10,
          height: 10,
          background: color,
          borderRadius: shape === "circle" ? "50%" : 2,
        }}
      />
      <span>{label}</span>
    </div>
  );
}
