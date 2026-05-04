import { useEffect, useState } from "react";
import { storesApi } from "../api";
import LocationPicker from "../components/LocationPicker";
import { s } from "../styles/common";

const empty = {
  name: "",
  latitude: "",
  longitude: "",
  weekly_delivery_value: "",
  address: "",
};

export default function StoresPage() {
  const [stores, setStores] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await storesApi.list();
      setStores(data.results || data);
    } catch {
      setError("Failed to load stores.");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    const missing = [];
    if (!String(form.name || "").trim()) missing.push("store name");
    if (!String(form.latitude || "").trim()) missing.push("latitude");
    if (!String(form.longitude || "").trim()) missing.push("longitude");
    if (!String(form.weekly_delivery_value || "").trim())
      missing.push("weekly value");

    if (missing.length) {
      setError(`Please provide: ${missing.join(", ")}.`);
      return;
    }

    try {
      const payload = {
        ...form,
        latitude: String(form.latitude).trim(),
        longitude: String(form.longitude).trim(),
        weekly_delivery_value: String(form.weekly_delivery_value).trim(),
      };
      if (editing) {
        await storesApi.update(editing, payload);
      } else {
        await storesApi.create(payload);
      }
      setForm(empty);
      setEditing(null);
      setError("");
      load();
    } catch (e) {
      const data = e.response?.data;
      if (typeof data === "string") {
        setError(data);
        return;
      }
      if (data && typeof data === "object") {
        const first = Object.entries(data)[0];
        if (first) {
          const [field, message] = first;
          setError(
            `${field}: ${Array.isArray(message) ? message[0] : message}`,
          );
          return;
        }
      }
      setError("Failed to save store.");
    }
  };

  const del = async (id) => {
    if (!window.confirm("Remove this store?")) return;
    await storesApi.remove(id);
    load();
  };

  const edit = (store) => {
    setEditing(store.id);
    setForm({
      name: store.name,
      latitude: store.latitude,
      longitude: store.longitude,
      weekly_delivery_value: store.weekly_delivery_value,
    });
  };

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Stores</h1>
      <div style={s.formCard}>
        <h3 style={s.h3}>{editing ? "Edit store" : "Add store"}</h3>
        <div style={s.grid2}>
          <Field
            label="Store name"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            span={2}
          />
          <div style={{ gridColumn: "span 2" }}>
            <LocationPicker
              latitude={form.latitude}
              longitude={form.longitude}
              address={form.address}
              onChange={({ latitude, longitude }) =>
                setForm((f) => ({ ...f, latitude, longitude }))
              }
              onAddressChange={(val) => setForm((f) => ({ ...f, address: val }))}
            />
          </div>
          <Field
            label="Weekly $ value"
            value={form.weekly_delivery_value}
            onChange={(v) => setForm({ ...form, weekly_delivery_value: v })}
            type="number"
          />
        </div>
        {error && <p style={s.error}>{error}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button style={s.btnPrimary} onClick={save}>
            {editing ? "Update" : "Add store"}
          </button>
          {editing && (
            <button
              style={s.btnGhost}
              onClick={() => {
                setForm(empty);
                setEditing(null);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p style={s.muted}>Loading…</p>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {["Store name", "Weekly value", ""].map((h) => (
                  <th key={h} style={s.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stores.map((st) => (
                <tr key={st.id} style={s.tr}>
                  <td style={s.td}>{st.name}</td>
                  <td style={s.td}>
                    ${Number(st.weekly_delivery_value).toLocaleString()}
                  </td>
                  <td style={s.td}>
                    <button style={s.btnSm} onClick={() => edit(st)}>
                      Edit
                    </button>
                    <button
                      style={{ ...s.btnSm, color: "#ef5350" }}
                      onClick={() => del(st.id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", span }) {
  return (
    <div style={span === 2 ? { gridColumn: "span 2" } : {}}>
      <label
        style={{
          fontSize: 12,
          color: "#a0a0b8",
          display: "block",
          marginBottom: 4,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </label>
      <input
        style={{
          width: "100%",
          padding: "7px 10px",
          fontSize: 13,
          background: "#0a0a1a",
          border: "1px solid #1e1e3a",
          borderRadius: 6,
          boxSizing: "border-box",
          color: "#ffffff",
          outline: "none",
        }}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step={type === "number" ? "any" : undefined}
      />
    </div>
  );
}
