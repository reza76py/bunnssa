import { useEffect, useState } from "react";
import { authApi } from "../api";
import { s } from "../styles/common";

const empty = {
  email: "",
};

export default function SettingsPage() {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await authApi.profile();
      setForm({
        email: data.email || "",
      });
    } catch {
      setError("Failed to load profile settings.");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await authApi.updateProfile({
        email: form.email.trim(),
      });
      setSuccess("Profile settings saved.");
    } catch (e) {
      const data = e.response?.data;
      if (typeof data === "string") {
        setError(data);
      } else if (data && typeof data === "object") {
        const first = Object.entries(data)[0];
        if (first) {
          const [field, message] = first;
          setError(
            `${field}: ${Array.isArray(message) ? message[0] : message}`,
          );
        } else {
          setError("Failed to save profile settings.");
        }
      } else {
        setError("Failed to save profile settings.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={s.page}>
        <p style={s.muted}>Loading settings...</p>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Settings</h1>
      <div style={s.formCard}>
        <h3 style={s.h3}>Profile Settings</h3>
        <div style={s.grid2}>

          <div style={{ gridColumn: "span 2" }}>
            <label style={s.fieldLabel}>Email</label>
            <input
              style={s.input}
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
        </div>

        {error && <p style={{ ...s.error, marginTop: 8 }}>{error}</p>}
        {success && (
          <p style={{ color: "#66bb6a", fontSize: 13, marginTop: 8 }}>
            {success}
          </p>
        )}

        <div style={{ marginTop: 12 }}>
          <button style={s.btnPrimary} onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
