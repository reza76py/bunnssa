import { NavLink, Outlet, useNavigate } from "react-router-dom";

const navItems = [
  { to: "/", label: "Allocation", icon: "◈" },
  { to: "/stores", label: "Stores", icon: "⊞" },
  { to: "/supervisors", label: "Supervisors", icon: "◉" },
  { to: "/members", label: "Members", icon: "○" },
  { to: "/settings", label: "Settings", icon: "⚙" },
  { to: "/profile", label: "Profile", icon: "☰" },
];

export default function Layout() {
  const navigate = useNavigate();
  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/login");
  };

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <span style={styles.brandName}>Bunnings SSA</span>
          <span style={styles.brandSub}>Staff Allocation</span>
        </div>
        <nav style={styles.nav}>
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              style={({ isActive }) => ({
                ...styles.navItem,
                ...(isActive ? styles.navActive : {}),
              })}
            >
              <span style={styles.icon}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <button style={styles.logout} onClick={logout}>
          Sign out
        </button>
      </aside>
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles = {
  shell: { display: "flex", minHeight: "100vh", background: "#f5f5f3" },
  sidebar: {
    width: 220,
    background: "#1a1a18",
    display: "flex",
    flexDirection: "column",
    padding: "1.5rem 0",
    flexShrink: 0,
  },
  brand: { padding: "0 1.25rem 1.5rem", borderBottom: "1px solid #333" },
  brandName: { display: "block", color: "#fff", fontWeight: 700, fontSize: 16 },
  brandSub: { display: "block", color: "#888", fontSize: 12, marginTop: 2 },
  nav: { flex: 1, padding: "1rem 0" },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "9px 1.25rem",
    color: "#aaa",
    textDecoration: "none",
    fontSize: 14,
    transition: "background .15s",
  },
  navActive: { color: "#fff", background: "#2c2c2a" },
  icon: { fontSize: 14, width: 18 },
  logout: {
    margin: "0 1.25rem",
    padding: "7px",
    fontSize: 13,
    color: "#888",
    background: "transparent",
    border: "1px solid #333",
    borderRadius: 6,
    cursor: "pointer",
  },
  main: { flex: 1, overflowY: "auto" },
};
