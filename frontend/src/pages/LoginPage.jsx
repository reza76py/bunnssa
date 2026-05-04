import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api";
import rezTecheLogo from "../assets/rezteche-logo.png";

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
    } catch (requestError) {
      const message =
        requestError.response?.data?.detail || "Invalid username or password.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>
          <a
            href="https://rezteche.com"
            target="_blank"
            rel="noreferrer"
            style={styles.logoLink}
          >
            <img src={rezTecheLogo} alt="RezTeche" style={styles.logoImg} />
          </a>
          <span style={styles.logoText}>Staff Allocation System</span>
          <span style={styles.logoSub}>
            Powered by{" "}
            <a
              href="https://rezteche.com"
              target="_blank"
              rel="noreferrer"
              style={styles.poweredLink}
            >
              RezTeche
            </a>
          </span>
          <span style={styles.logoHint}>
            If you have an account, please sign in. Otherwise, register for a
            new account.
          </span>
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
    background: "#0a0a1a",
    padding: "1rem",
  },
  card: {
    background: "#12122a",
    border: "1px solid #1e1e3a",
    borderRadius: 16,
    padding: "2rem",
    width: "min(360px, 100%)",
    boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
  },
  logo: { textAlign: "center", marginBottom: "1.5rem" },
  logoLink: { display: "inline-block", marginBottom: ".75rem" },
  logoImg: { height: 54, width: "auto", objectFit: "contain" },
  logoText: {
    display: "block",
    fontSize: 22,
    fontWeight: 600,
    color: "#ffffff",
  },
  logoSub: { display: "block", fontSize: 13, color: "#a0a0b8", marginTop: 4 },
  poweredLink: { color: "#6c63ff", textDecoration: "none", fontWeight: 600 },
  logoHint: { display: "block", fontSize: 12, color: "#a0a0b8", marginTop: 4 },
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
  meta: { marginTop: 12, fontSize: 13, color: "#a0a0b8", textAlign: "center" },
  link: { color: "#6c63ff", textDecoration: "none", fontWeight: 600 },
};
