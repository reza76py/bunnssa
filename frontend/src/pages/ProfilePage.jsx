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
            <ProfileRow label="Name" value={profile.name} />
            <ProfileRow label="Username" value={profile.username} />
            <ProfileRow label="Email" value={profile.email || "Not set"} />
            <ProfileRow label="Role" value={profile.role} />
          </div>
        )}
      </div>
      <div style={s.resultCard}>
        <p style={{ margin: 0, color: "#555", fontSize: 13 }}>
          Super admins can create and manage all user accounts from the Django
          admin panel.
        </p>
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
        borderBottom: "1px solid #f0f0ee",
      }}
    >
      <span style={{ color: "#777", fontSize: 13 }}>{label}</span>
      <span style={{ color: "#1a1a18", fontWeight: 600 }}>{value}</span>
    </div>
  );
}
