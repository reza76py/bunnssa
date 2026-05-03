import { useEffect, useState } from "react";
import { supervisorsApi } from "../api";
import LocationPicker from "../components/LocationPicker";
import { s } from "../styles/common";

const empty = { name: "", email: "", latitude: "", longitude: "" };

export default function SupervisorsPage() {
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
      const { data } = await supervisorsApi.list();
      setItems(data.results || data);
    } catch {
      setError("Failed to load supervisors.");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    try {
      if (editing) await supervisorsApi.update(editing, form);
      else await supervisorsApi.create(form);
      setForm(empty);
      setEditing(null);
      load();
    } catch {
      setError("Failed to save.");
    }
  };

  const del = async (id) => {
    if (!window.confirm("Remove this supervisor?")) return;
    await supervisorsApi.remove(id);
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
      <h1 style={s.h1}>Supervisors</h1>
      <div style={s.formCard}>
        <h3 style={s.h3}>{editing ? "Edit supervisor" : "Add supervisor"}</h3>
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
              placeholder="supervisor@example.com"
            />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <LocationPicker
              latitude={form.latitude}
              longitude={form.longitude}
              onChange={({ latitude, longitude }) =>
                setForm({ ...form, latitude, longitude })
              }
            />
          </div>
        </div>
        {error && <p style={s.error}>{error}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button style={s.btnPrimary} onClick={save}>
            {editing ? "Update" : "Add supervisor"}
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
                {["Name", "Email", "Latitude", "Longitude", ""].map((h) => (
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
                  <td style={s.td}>{parseFloat(item.latitude).toFixed(4)}</td>
                  <td style={s.td}>{parseFloat(item.longitude).toFixed(4)}</td>
                  <td style={s.td}>
                    <button style={s.btnSm} onClick={() => edit(item)}>
                      Edit
                    </button>
                    <button
                      style={{ ...s.btnSm, color: "#c0392b" }}
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
