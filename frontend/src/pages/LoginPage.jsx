import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await authApi.login(username, password);
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      navigate("/");
    } catch {
      setError("Invalid username or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <span style={styles.logoText}>Staff Allocation System</span>
          <span style={styles.logoSub}>If you have an account, please sign in. Otherwise, register for a new account.</span>
        </div>
        <form onSubmit={handleLogin}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              style={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <p style={styles.meta}>
            Need an account?{" "}
            <Link to="/register" style={styles.link}>
              Register
            </Link>
          </p>
        </form>
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
    background: "#f5f5f3",
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e5e2",
    borderRadius: 12,
    padding: "2rem",
    width: 360,
  },
  logo: { textAlign: "center", marginBottom: "1.5rem" },
  logoText: {
    display: "block",
    fontSize: 22,
    fontWeight: 600,
    color: "#1a1a18",
  },
  logoSub: { fontSize: 13, color: "#888" },
  field: { marginBottom: "1rem" },
  label: { display: "block", fontSize: 13, color: "#555", marginBottom: 4 },
  input: {
    width: "100%",
    padding: "8px 12px",
    fontSize: 14,
    border: "1px solid #ddd",
    borderRadius: 8,
    boxSizing: "border-box",
    outline: "none",
  },
  error: { color: "#c0392b", fontSize: 13, marginBottom: ".75rem" },
  btn: {
    width: "100%",
    padding: "10px",
    fontSize: 14,
    fontWeight: 600,
    background: "#d32f2f",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
  },
  meta: { marginTop: 12, fontSize: 13, color: "#666", textAlign: "center" },
  link: { color: "#d32f2f", textDecoration: "none", fontWeight: 600 },
};
