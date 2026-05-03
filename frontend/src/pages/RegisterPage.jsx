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
    background: "#f5f5f3",
    padding: "1rem",
  },
  card: {
    width: "min(400px, 100%)",
    background: "#fff",
    border: "1px solid #e5e5e2",
    borderRadius: 12,
    padding: "2rem",
  },
  title: { margin: "0 0 1rem", fontSize: 24, color: "#1a1a18" },
  field: { marginBottom: "0.9rem" },
  label: { display: "block", fontSize: 13, color: "#555", marginBottom: 4 },
  input: {
    width: "100%",
    padding: "8px 12px",
    fontSize: 14,
    border: "1px solid #ddd",
    borderRadius: 8,
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    padding: "10px",
    fontSize: 14,
    fontWeight: 600,
    background: "#d32f2f",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    marginTop: 8,
  },
  error: { color: "#c0392b", fontSize: 13, marginBottom: ".75rem" },
  success: { color: "#2e7d32", fontSize: 13, marginBottom: ".75rem" },
  meta: { marginTop: 14, fontSize: 13, color: "#666", textAlign: "center" },
  link: { color: "#d32f2f", textDecoration: "none", fontWeight: 600 },
};
