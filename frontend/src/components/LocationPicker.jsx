import { useMemo, useState, useRef } from "react";
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
const NOMINATIM_HEADERS = {
  "User-Agent": "StaffAllocationApp/1.0 (info@rezteche.com)",
};

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export default function LocationPicker({
  latitude,
  longitude,
  onChange,
  onAddressChange,
  address: addressProp = "",
}) {
  const [address, setAddress] = useState(addressProp);
  const [addressError, setAddressError] = useState("");
  const [searching, setSearching] = useState(false);
  // Keep internal address in sync when parent resets the form
  const prevAddressProp = useRef(addressProp);
  if (addressProp !== prevAddressProp.current) {
    prevAddressProp.current = addressProp;
    if (addressProp !== address) setAddress(addressProp);
  }

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

  const reverseGeocode = async (lat, lon) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
        { headers: NOMINATIM_HEADERS }
      );
      const data = await res.json();
      if (data && data.display_name) {
        const trimmed = data.display_name
          .split(",")
          .slice(0, 3)
          .map((p) => p.trim())
          .join(", ");
        setAddress(trimmed);
        setAddressError("");
        if (onAddressChange) onAddressChange(trimmed);
      }
    } catch {
      // silently ignore reverse geocode failures
    }
  };

  const handleMapClick = ({ latitude: lat, longitude: lon }) => {
    onChange({ latitude: lat, longitude: lon });
    reverseGeocode(lat, lon);
  };

  const geocodeAddress = async () => {
    const query = address.trim();
    if (!query) return;
    setSearching(true);
    setAddressError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
        { headers: NOMINATIM_HEADERS }
      );
      const results = await res.json();
      if (results && results.length > 0) {
        const { lat, lon } = results[0];
        onChange({
          latitude: parseFloat(lat).toFixed(6),
          longitude: parseFloat(lon).toFixed(6),
        });
        if (onAddressChange) onAddressChange(query);
      } else {
        setAddressError("Address not found");
      }
    } catch {
      setAddressError("Address not found");
    } finally {
      setSearching(false);
    }
  };

  const handleAddressKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      geocodeAddress();
    }
  };

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
          <MapClickHandler onChange={handleMapClick} />
          <MapViewportSync center={center} />
          {position && <Marker position={position} />}
        </MapContainer>
      </div>

      <div style={{ marginTop: 10 }}>
        <label style={styles.label}>Address</label>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={styles.addressInput}
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setAddressError("");
            }}
            onKeyDown={handleAddressKeyDown}
            placeholder="Type address and press Enter..."
          />
          <button
            type="button"
            style={styles.searchBtn}
            onClick={geocodeAddress}
            disabled={searching}
          >
            {searching ? "…" : "Search"}
          </button>
        </div>
        {addressError && (
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#ef5350" }}>
            {addressError}
          </p>
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
  addressInput: {
    flex: 1,
    background: "#0a0a1a",
    border: "1px solid #1e1e3a",
    color: "#ffffff",
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
    boxSizing: "border-box",
    outline: "none",
  },
  searchBtn: {
    background: "#6c63ff",
    color: "#ffffff",
    border: "none",
    borderRadius: 8,
    padding: "10px 14px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontSize: 14,
    fontWeight: 500,
  },
};
