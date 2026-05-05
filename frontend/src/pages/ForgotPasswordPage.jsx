import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await authApi.requestPasswordReset(email.trim());
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Forgot password</h1>

        {submitted ? (
          <p style={styles.success}>
            If that email exists, a reset link has been sent.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={styles.field}>
              <label style={styles.label}>Email address</label>
              <input
                style={styles.input}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                placeholder="you@example.com"
              />
            </div>
            {error && <p style={styles.error}>{error}</p>}
            <button style={styles.btn} type="submit" disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}

        <p style={styles.meta}>
          <Link to="/login" style={styles.link}>
            Back to sign in
          </Link>
        </p>
      </div>
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
    margin: "0 0 1.25rem",
    fontSize: 24,
    color: "#ffffff",
    fontWeight: 700,
  },
  field: { marginBottom: "1rem" },
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
    outline: "none",
    color: "#ffffff",
  },
  error: { color: "#ef5350", fontSize: 13, marginBottom: ".75rem" },
  success: {
    color: "#66bb6a",
    fontSize: 14,
    lineHeight: 1.6,
    margin: "0 0 1rem",
  },
  btn: {
    width: "100%",
    padding: "10px",
    fontSize: 14,
    fontWeight: 600,
    background: "#6c63ff",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  meta: { marginTop: 14, fontSize: 13, color: "#a0a0b8", textAlign: "center" },
  link: { color: "#6c63ff", textDecoration: "none", fontWeight: 600 },
};
