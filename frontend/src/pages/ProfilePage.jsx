import { useEffect, useState } from "react";

import { authApi } from "../api";
import { s } from "../styles/common";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await authApi.profile();
        setProfile(data);
      } catch {
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Profile</h1>
      <div style={s.formCard}>
        {loading && <p style={s.muted}>Loading profile…</p>}
        {error && <p style={s.error}>{error}</p>}
        {profile && (
          <div style={{ display: "grid", gap: 12 }}>
            <ProfileRow label="Username" value={profile.username} />
            <ProfileRow label="Email" value={profile.email || "Not set"} />
          </div>
        )}
      </div>
      
    </div>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        paddingBottom: 10,
        borderBottom: "1px solid #1e1e3a",
      }}
    >
      <span style={{ color: "#a0a0b8", fontSize: 13 }}>{label}</span>
      <span style={{ color: "#ffffff", fontWeight: 600 }}>{value}</span>
    </div>
  );
}
