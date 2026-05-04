import { useEffect, useState } from "react";
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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const logout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/login");
  };

  return (
    <div
      style={{
        ...styles.shell,
        flexDirection: isMobile ? "column" : "row",
      }}
    >
      <aside
        style={{
          ...styles.sidebar,
          width: isMobile ? "100%" : 240,
          padding: isMobile ? "1rem 0" : "1.5rem 0",
        }}
      >
        <div style={styles.brand}>
          <span style={styles.brandName}>Staff Allocation</span>
          {!isMobile && <span style={styles.brandSub}>Staff Allocation</span>}
        </div>
        <nav
          style={{
            ...styles.nav,
            display: isMobile ? "flex" : "block",
            overflowX: isMobile ? "auto" : "visible",
            whiteSpace: isMobile ? "nowrap" : "normal",
            padding: isMobile ? "0.75rem" : "1rem 0",
            gap: isMobile ? 8 : 0,
          }}
        >
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              style={({ isActive }) => ({
                ...styles.navItem,
                ...(isMobile
                  ? {
                      display: "inline-flex",
                      borderRadius: 999,
                      border: isActive
                        ? "1px solid #6c63ff"
                        : "1px solid #1e1e3a",
                      padding: "8px 12px",
                    }
                  : {
                      borderLeft: isActive
                        ? "3px solid #6c63ff"
                        : "3px solid transparent",
                    }),
                ...(isActive ? styles.navActive : {}),
              })}
            >
              <span style={styles.icon}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>
        <button
          style={{
            ...styles.logout,
            margin: isMobile ? "0.5rem 0.75rem 0" : "0 1.25rem",
          }}
          onClick={logout}
        >
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
  shell: { display: "flex", minHeight: "100vh", background: "#0a0a1a" },
  sidebar: {
    background: "#0d0d1f",
    display: "flex",
    flexDirection: "column",
    flexShrink: 0,
    borderRight: "1px solid #1e1e3a",
  },
  brand: { padding: "0 1.25rem 1.5rem", borderBottom: "1px solid #1e1e3a" },
  brandName: { display: "block", color: "#fff", fontWeight: 700, fontSize: 16 },
  brandSub: { display: "block", color: "#a0a0b8", fontSize: 12, marginTop: 2 },
  nav: { flex: 1, padding: "1rem 0" },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "9px 1.25rem",
    color: "#a0a0b8",
    textDecoration: "none",
    fontSize: 14,
    transition: "background .15s, color .15s",
  },
  navActive: { color: "#6c63ff", background: "#1e1e3a" },
  icon: { fontSize: 14, width: 18 },
  logout: {
    padding: "7px",
    fontSize: 13,
    color: "#a0a0b8",
    background: "transparent",
    border: "1px solid #1e1e3a",
    borderRadius: 6,
    cursor: "pointer",
  },
  main: { flex: 1, overflowY: "auto", minWidth: 0, background: "#0a0a1a" },
};
