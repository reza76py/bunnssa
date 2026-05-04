import { useMemo } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const BRISBANE = [-27.4698, 153.0251];

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export default function LocationPicker({ latitude, longitude, onChange }) {
  const position = useMemo(() => {
    if (
      latitude === "" ||
      longitude === "" ||
      latitude == null ||
      longitude == null
    ) {
      return null;
    }

    return [Number(latitude), Number(longitude)];
  }, [latitude, longitude]);

  const center = position || BRISBANE;

  return (
    <div>
      <label style={styles.label}>Location</label>
      <div style={styles.mapFrame}>
        <MapContainer
          center={center}
          zoom={11}
          style={styles.map}
          scrollWheelZoom
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <MapClickHandler onChange={onChange} />
          <MapViewportSync center={center} />
          {position && <Marker position={position} />}
        </MapContainer>
      </div>
      <div style={styles.coordsBox}>
        {position ? (
          <span>
            Selected coordinates: {Number(latitude).toFixed(6)},{" "}
            {Number(longitude).toFixed(6)}
          </span>
        ) : (
          <span>Click the map to choose a location in Brisbane.</span>
        )}
      </div>
    </div>
  );
}

function MapClickHandler({ onChange }) {
  useMapEvents({
    click(event) {
      onChange({
        latitude: event.latlng.lat.toFixed(6),
        longitude: event.latlng.lng.toFixed(6),
      });
    },
  });

  return null;
}

function MapViewportSync({ center }) {
  const map = useMap();

  map.setView(center);

  return null;
}

const styles = {
  label: {
    fontSize: 12,
    color: "#a0a0b8",
    display: "block",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  mapFrame: {
    border: "1px solid #1e1e3a",
    borderRadius: 10,
    overflow: "hidden",
  },
  map: { height: 300, width: "100%" },
  coordsBox: {
    marginTop: 8,
    padding: "10px 12px",
    fontSize: 12,
    color: "#a0a0b8",
    background: "#0a0a1a",
    border: "1px solid #1e1e3a",
    borderRadius: 8,
  },
};
