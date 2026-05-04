import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { authApi } from "../api";

export default function EmailVerificationPage() {
  const { uid, token } = useParams();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("Verifying your email...");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const verify = async () => {
      setLoading(true);
      try {
        const { data } = await authApi.verifyEmail(uid, token);
        setSuccess(true);
        setMessage(data.detail || "Email verified successfully.");
      } catch (error) {
        setSuccess(false);
        setMessage(
          error.response?.data?.detail ||
            "Verification link is invalid or expired.",
        );
      } finally {
        setLoading(false);
      }
    };

    verify();
  }, [uid, token]);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Email Verification</h1>
        <p
          style={{ ...styles.message, color: success ? "#66bb6a" : "#ef5350" }}
        >
          {message}
        </p>
        {loading ? (
          <p style={styles.meta}>Please wait...</p>
        ) : (
          <p style={styles.meta}>
            Continue to{" "}
            <Link to="/login" style={styles.link}>
              Sign in
            </Link>
          </p>
        )}
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
  },
  card: {
    width: 420,
    background: "#12122a",
    border: "1px solid #1e1e3a",
    borderRadius: 16,
    padding: "2rem",
    textAlign: "center",
    boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
  },
  title: {
    margin: "0 0 1rem",
    fontSize: 24,
    color: "#ffffff",
    fontWeight: 700,
  },
  message: { fontSize: 15, fontWeight: 600, marginBottom: 10 },
  meta: { fontSize: 13, color: "#a0a0b8" },
  link: { color: "#6c63ff", textDecoration: "none", fontWeight: 600 },
};
