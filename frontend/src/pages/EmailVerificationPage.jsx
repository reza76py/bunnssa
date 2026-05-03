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
          style={{ ...styles.message, color: success ? "#2e7d32" : "#c0392b" }}
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
    background: "#f5f5f3",
  },
  card: {
    width: 420,
    background: "#fff",
    border: "1px solid #e5e5e2",
    borderRadius: 12,
    padding: "2rem",
    textAlign: "center",
  },
  title: { margin: "0 0 1rem", fontSize: 24, color: "#1a1a18" },
  message: { fontSize: 15, fontWeight: 600, marginBottom: 10 },
  meta: { fontSize: 13, color: "#666" },
  link: { color: "#d32f2f", textDecoration: "none", fontWeight: 600 },
};
