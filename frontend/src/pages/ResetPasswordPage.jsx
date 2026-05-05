import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { authApi } from "../api";

export default function ResetPasswordPage() {
  const { uid, token } = useParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    if (newPassword !== confirmPassword) {
      setErrors({ confirm_password: "Passwords do not match." });
      return;
    }

    setLoading(true);
    try {
      await authApi.confirmPasswordReset(
        uid,
        token,
        newPassword,
        confirmPassword,
      );
      setSuccess(true);
    } catch (requestError) {
      const data = requestError.response?.data;
      if (data && typeof data === "object") {
        setErrors(data);
      } else {
        setErrors({
          detail: "Something went wrong. The link may have already been used.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Set new password</h1>

        {success ? (
          <>
            <p style={styles.success}>Password updated. You can now log in.</p>
            <p style={styles.meta}>
              <Link to="/login" style={styles.link}>
                Go to sign in
              </Link>
            </p>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={styles.field}>
              <label style={styles.label}>New password</label>
              <input
                style={styles.input}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoFocus
                minLength={8}
              />
              {errors.new_password && (
                <p style={styles.fieldError}>{errors.new_password}</p>
              )}
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Confirm password</label>
              <input
                style={styles.input}
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
              {errors.confirm_password && (
                <p style={styles.fieldError}>{errors.confirm_password}</p>
              )}
            </div>
            {errors.detail && <p style={styles.error}>{errors.detail}</p>}
            <button style={styles.btn} type="submit" disabled={loading}>
              {loading ? "Updating…" : "Update password"}
            </button>
            <p style={styles.meta}>
              <Link to="/login" style={styles.link}>
                Back to sign in
              </Link>
            </p>
          </form>
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
  fieldError: { color: "#ef5350", fontSize: 12, margin: "6px 0 0" },
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
