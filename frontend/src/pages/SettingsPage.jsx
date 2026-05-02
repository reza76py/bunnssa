import { useEffect, useState } from "react";
import { authApi } from "../api";
import { s } from "../styles/common";

const empty = {
  email_host: "smtp.gmail.com",
  email_port: 587,
  email_host_user: "",
  email_app_password: "",
  from_name: "Bunnings SSA",
};

export default function SettingsPage() {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await authApi.getEmailSettings();
      setForm({
        email_host: data.email_host || "smtp.gmail.com",
        email_port: data.email_port || 587,
        email_host_user: data.email_host_user || "",
        email_app_password: "",
        from_name: data.from_name || "Bunnings SSA",
      });
      setHasPassword(Boolean(data.has_app_password));
    } catch {
      setError("Failed to load email settings.");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const payload = {
        email_host: form.email_host.trim(),
        email_port: Number(form.email_port),
        email_host_user: form.email_host_user.trim(),
        from_name: form.from_name.trim() || "Bunnings SSA",
      };
      if (form.email_app_password.trim()) {
        payload.email_app_password = form.email_app_password;
      }
      const { data } = await authApi.updateEmailSettings(payload);
      setHasPassword(Boolean(data.has_app_password));
      setForm({ ...form, email_app_password: "" });
      setSuccess("Email settings saved.");
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
      setError("Failed to save email settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div style={s.page}>
        <p style={s.muted}>Loading settings...</p>
      </div>
    );

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Email Settings</h1>
      <div style={s.formCard}>
        <h3 style={s.h3}>Your SMTP Sender Profile</h3>
        <div style={s.grid2}>
          <div>
            <label style={s.fieldLabel}>SMTP Host</label>
            <input
              style={s.input}
              value={form.email_host}
              onChange={(e) => setForm({ ...form, email_host: e.target.value })}
            />
          </div>
          <div>
            <label style={s.fieldLabel}>SMTP Port</label>
            <input
              style={s.input}
              type="number"
              value={form.email_port}
              onChange={(e) => setForm({ ...form, email_port: e.target.value })}
            />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label style={s.fieldLabel}>Gmail Address</label>
            <input
              style={s.input}
              type="email"
              value={form.email_host_user}
              onChange={(e) =>
                setForm({ ...form, email_host_user: e.target.value })
              }
              placeholder="you@gmail.com"
            />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label style={s.fieldLabel}>Gmail App Password</label>
            <input
              style={s.input}
              type="password"
              value={form.email_app_password}
              onChange={(e) =>
                setForm({ ...form, email_app_password: e.target.value })
              }
              placeholder={
                hasPassword
                  ? "Leave blank to keep existing password"
                  : "Paste your 16-char app password"
              }
            />
          </div>
          <div style={{ gridColumn: "span 2" }}>
            <label style={s.fieldLabel}>From Name</label>
            <input
              style={s.input}
              value={form.from_name}
              onChange={(e) => setForm({ ...form, from_name: e.target.value })}
              placeholder="Bunnings SSA"
            />
          </div>
        </div>

        {hasPassword && (
          <p style={{ ...s.muted, marginTop: 8 }}>
            Stored app password is set.
          </p>
        )}
        {error && <p style={{ ...s.error, marginTop: 8 }}>{error}</p>}
        {success && (
          <p style={{ color: "#2e7d32", fontSize: 13, marginTop: 8 }}>
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
