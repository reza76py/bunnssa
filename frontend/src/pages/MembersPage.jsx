import { useEffect, useState } from "react";
import { membersApi } from "../api";
import LocationPicker from "../components/LocationPicker";
import { s } from "../styles/common";

const empty = { name: "", email: "", latitude: "", longitude: "", address: "" };

export default function MembersPage() {
  const [items, setItems] = useState([]);
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
      const { data } = await membersApi.list();
      setItems(data.results || data);
    } catch {
      setError("Failed to load members.");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    const missing = [];
    if (!String(form.name || "").trim()) missing.push("name");
    if (!String(form.latitude || "").trim()) missing.push("latitude");
    if (!String(form.longitude || "").trim()) missing.push("longitude");

    if (missing.length) {
      setError(`Please provide: ${missing.join(", ")}.`);
      return;
    }

    try {
      const payload = {
        ...form,
        name: String(form.name).trim(),
        email: String(form.email || "").trim(),
        latitude: String(form.latitude).trim(),
        longitude: String(form.longitude).trim(),
      };
      if (editing) await membersApi.update(editing, payload);
      else await membersApi.create(payload);
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
      setError("Failed to save.");
    }
  };

  const del = async (id) => {
    if (!window.confirm("Remove this member?")) return;
    await membersApi.remove(id);
    load();
  };

  const edit = (item) => {
    setEditing(item.id);
    setForm({
      name: item.name,
      email: item.email || "",
      latitude: item.latitude,
      longitude: item.longitude,
    });
  };

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Team members</h1>
      <div style={s.formCard}>
        <h3 style={s.h3}>{editing ? "Edit member" : "Add member"}</h3>
        <div style={s.grid2}>
          <div style={{ gridColumn: "span 2" }}>
            <label style={s.fieldLabel}>Full name</label>
            <input
              style={s.input}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label style={s.fieldLabel}>Email address (optional)</label>
            <input
              style={s.input}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="member@example.com"
            />
          </div>
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
        </div>
        {error && <p style={s.error}>{error}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button style={s.btnPrimary} onClick={save}>
            {editing ? "Update" : "Add member"}
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
                {["Name", "Email", ""].map((h) => (
                  <th key={h} style={s.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={s.tr}>
                  <td style={s.td}>{item.name}</td>
                  <td style={s.td}>
                    {item.email || <span style={s.muted}>—</span>}
                  </td>
                  <td style={s.td}>
                    <button style={s.btnSm} onClick={() => edit(item)}>
                      Edit
                    </button>
                    <button
                      style={{ ...s.btnSm, color: "#ef5350" }}
                      onClick={() => del(item.id)}
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
