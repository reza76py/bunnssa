import { useState } from "react";
import { Link } from "react-router-dom";

import { authApi } from "../api";

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      await authApi.register(form);
      setSuccess("Please check your email to verify your account");
      setForm({
        username: "",
        email: "",
        first_name: "",
        last_name: "",
        password: "",
      });
    } catch (requestError) {
      const data = requestError.response?.data;
      if (typeof data === "object" && data) {
        const firstError = Object.values(data).flat()[0];
        setError(firstError || "Registration failed.");
      } else {
        setError("Registration failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Create account</h1>
        <form onSubmit={submit}>
          <Field
            label="Username"
            value={form.username}
            onChange={(value) => setForm({ ...form, username: value })}
          />
          <Field
            label="Email"
            type="email"
            value={form.email}
            onChange={(value) => setForm({ ...form, email: value })}
          />
          <Field
            label="First name"
            value={form.first_name}
            onChange={(value) => setForm({ ...form, first_name: value })}
          />
          <Field
            label="Last name"
            value={form.last_name}
            onChange={(value) => setForm({ ...form, last_name: value })}
          />
          <Field
            label="Password"
            type="password"
            value={form.password}
            onChange={(value) => setForm({ ...form, password: value })}
          />
          {error && <p style={styles.error}>{error}</p>}
          {success && <p style={styles.success}>{success}</p>}
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "Creating…" : "Register"}
          </button>
        </form>
        <p style={styles.meta}>
          Already have an account?{" "}
          <Link to="/login" style={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text" }) {
  return (
    <div style={styles.field}>
      <label style={styles.label}>{label}</label>
      <input
        style={styles.input}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={label === "Username" || label === "Password"}
      />
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0a0a1a",
    padding: "1rem",
  },
  card: {
    width: "min(400px, 100%)",
    background: "#12122a",
    border: "1px solid #1e1e3a",
    borderRadius: 16,
    padding: "2rem",
    boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
  },
  title: {
    margin: "0 0 1rem",
    fontSize: 24,
    color: "#ffffff",
    fontWeight: 700,
  },
  field: { marginBottom: "0.9rem" },
  label: {
    display: "block",
    fontSize: 12,
    color: "#a0a0b8",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  input: {
    width: "100%",
    padding: "8px 12px",
    fontSize: 14,
    background: "#0a0a1a",
    border: "1px solid #1e1e3a",
    borderRadius: 8,
    boxSizing: "border-box",
    color: "#ffffff",
    outline: "none",
  },
  button: {
    width: "100%",
    padding: "10px",
    fontSize: 14,
    fontWeight: 600,
    background: "#6c63ff",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    marginTop: 8,
  },
  error: { color: "#ef5350", fontSize: 13, marginBottom: ".75rem" },
  success: { color: "#66bb6a", fontSize: 13, marginBottom: ".75rem" },
  meta: { marginTop: 14, fontSize: 13, color: "#a0a0b8", textAlign: "center" },
  link: { color: "#6c63ff", textDecoration: "none", fontWeight: 600 },
};
