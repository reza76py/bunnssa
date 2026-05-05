export default function ConfirmModal({ itemName, onConfirm, onCancel }) {
  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        <p style={styles.message}>
          Delete <strong>{itemName}</strong>? This cannot be undone.
        </p>
        <div style={styles.actions}>
          <button style={styles.cancel} onClick={onCancel}>
            Cancel
          </button>
          <button style={styles.delete} onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  card: {
    background: "#12122a",
    border: "1px solid #1e1e3a",
    borderRadius: 12,
    padding: "1.5rem",
    width: "min(380px, 90vw)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
  },
  message: {
    color: "#ffffff",
    fontSize: 15,
    margin: "0 0 1.25rem",
    lineHeight: 1.5,
  },
  actions: {
    display: "flex",
    gap: 10,
    justifyContent: "flex-end",
  },
  cancel: {
    padding: "8px 18px",
    fontSize: 13,
    fontWeight: 600,
    background: "transparent",
    border: "1px solid #1e1e3a",
    borderRadius: 7,
    color: "#a0a0b8",
    cursor: "pointer",
  },
  delete: {
    padding: "8px 18px",
    fontSize: 13,
    fontWeight: 600,
    background: "#ef5350",
    border: "none",
    borderRadius: 7,
    color: "#fff",
    cursor: "pointer",
  },
};
