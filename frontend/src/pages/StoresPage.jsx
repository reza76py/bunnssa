import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { storesApi } from "../api";
import LocationPicker from "../components/LocationPicker";
import ConfirmModal from "../components/ConfirmModal";
import { s } from "../styles/common";

const empty = {
  name: "",
  latitude: "",
  longitude: "",
  weekly_delivery_value: "",
  start_date: "",
  end_date: "",
};

const IMPORT_HEADERS = [
  "Store Name",
  "Address",
  "Delivery Value ($)",
  "Start Date",
  "End Date",
];

const IMPORT_STATUS = {
  READY: "ready",
  ADDRESS_ERROR: "address_error",
  DUPLICATE: "duplicate",
};

function parseDateCell(value) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "number") {
    const formatted = XLSX.SSF.format("dd/mm/yyyy", value);
    return parseDDMMYYYYToISO(formatted);
  }
  return parseDDMMYYYYToISO(String(value));
}

function parseDDMMYYYYToISO(raw) {
  const val = String(raw || "").trim();
  if (!val) return "";
  const m = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return "";
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return "";
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeDeliveryValue(value) {
  const cleaned = String(value ?? "")
    .replace(/\$/g, "")
    .replace(/,/g, "")
    .trim();
  return cleaned;
}

async function geocodeAddress(address) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
    address,
  )}&format=json&limit=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.length) return null;
    return {
      latitude: data[0].lat,
      longitude: data[0].lon,
    };
  } catch {
    return null;
  }
}

export default function StoresPage() {
  const [stores, setStores] = useState([]);
  const [form, setForm] = useState(empty);
  const [lastUsedDates, setLastUsedDates] = useState({
    start_date: "",
    end_date: "",
  });
  const [address, setAddress] = useState("");
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmItem, setConfirmItem] = useState(null);
  const [importRows, setImportRows] = useState([]);
  const [importError, setImportError] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importSaving, setImportSaving] = useState(false);
  const fileInputRef = useRef(null);
  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await storesApi.list();
      setStores(data.results || data);
    } catch {
      setError("Failed to load stores.");
    } finally {
      setLoading(false);
    }
  };

  const resetAddForm = (dates = lastUsedDates) => {
    setForm({
      ...empty,
      start_date: dates.start_date || "",
      end_date: dates.end_date || "",
    });
    setAddress("");
    setEditing(null);
  };

  const save = async () => {
    const missing = [];
    if (!String(form.name || "").trim()) missing.push("store name");
    if (!String(form.latitude || "").trim()) missing.push("latitude");
    if (!String(form.longitude || "").trim()) missing.push("longitude");
    if (!String(form.weekly_delivery_value || "").trim())
      missing.push("weekly value");

    if (missing.length) {
      setError(`Please provide: ${missing.join(", ")}.`);
      return;
    }

    try {
      const payload = {
        ...form,
        latitude: String(form.latitude).trim(),
        longitude: String(form.longitude).trim(),
        weekly_delivery_value: String(form.weekly_delivery_value).trim(),
        start_date: form.start_date ? String(form.start_date).trim() : null,
        end_date: form.end_date ? String(form.end_date).trim() : null,
      };
      if (editing) {
        await storesApi.update(editing, payload);
      } else {
        await storesApi.create(payload);
      }
      const nextDates =
        payload.start_date && payload.end_date
          ? {
              start_date: payload.start_date,
              end_date: payload.end_date,
            }
          : lastUsedDates;
      if (payload.start_date && payload.end_date) {
        setLastUsedDates(nextDates);
      }
      resetAddForm(nextDates);
      setError("");
      load();
    } catch (e) {
      const data = e.response?.data;
      if (typeof data === "string") {
        setError(data);
        return;
      }
      if (data && typeof data === "object") {
        const first = Object.entries(data)[0];
        if (first) {
          const [field, message] = first;
          setError(
            `${field}: ${Array.isArray(message) ? message[0] : message}`,
          );
          return;
        }
      }
      setError("Failed to save store.");
    }
  };

  const del = (item) => setConfirmItem(item);

  const confirmDelete = async () => {
    await storesApi.remove(confirmItem.id);
    setConfirmItem(null);
    load();
  };

  const edit = (store) => {
    setEditing(store.id);
    setForm({
      name: store.name,
      latitude: store.latitude,
      longitude: store.longitude,
      weekly_delivery_value: store.weekly_delivery_value,
      start_date: store.start_date || "",
      end_date: store.end_date || "",
    });
  };

  const onPickExcel = () => {
    fileInputRef.current?.click();
  };

  const clearImportPreview = () => {
    setImportRows([]);
    setImportError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSelectFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError("");
    setImportLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const sheetRows = XLSX.utils.sheet_to_json(ws, {
        header: 1,
        defval: "",
      });

      if (!sheetRows.length) {
        setImportError("Selected file is empty.");
        setImportRows([]);
        return;
      }

      const header = sheetRows[0].map((h) => String(h).trim());
      const headerMatches =
        header.length >= IMPORT_HEADERS.length &&
        IMPORT_HEADERS.every((h, idx) => header[idx] === h);
      if (!headerMatches) {
        setImportError(
          "Invalid Excel format. Expected columns: Store Name, Address, Delivery Value ($), Start Date, End Date.",
        );
        setImportRows([]);
        return;
      }

      const existing = new Set(stores.map((st) => String(st.name).trim().toLowerCase()));
      const parsedRows = sheetRows
        .slice(1)
        .map((r) => ({
          name: String(r[0] ?? "").trim(),
          address: String(r[1] ?? "").trim(),
          weekly_delivery_value: normalizeDeliveryValue(r[2]),
          start_date: parseDateCell(r[3]),
          end_date: parseDateCell(r[4]),
        }))
        .filter(
          (r) =>
            r.name ||
            r.address ||
            r.weekly_delivery_value ||
            r.start_date ||
            r.end_date,
        );

      const preview = [];
      for (const row of parsedRows) {
        if (existing.has(row.name.toLowerCase())) {
          preview.push({
            ...row,
            latitude: "",
            longitude: "",
            status: IMPORT_STATUS.DUPLICATE,
            statusText: "Duplicate - will be skipped",
          });
          continue;
        }

        const geo = await geocodeAddress(row.address);
        if (!geo) {
          preview.push({
            ...row,
            latitude: "",
            longitude: "",
            status: IMPORT_STATUS.ADDRESS_ERROR,
            statusText: "Address not found",
          });
          continue;
        }

        preview.push({
          ...row,
          latitude: geo.latitude,
          longitude: geo.longitude,
          status: IMPORT_STATUS.READY,
          statusText: "Ready to import",
        });
      }

      setImportRows(preview);
    } catch {
      setImportError("Failed to parse Excel file.");
      setImportRows([]);
    } finally {
      setImportLoading(false);
    }
  };

  const importValidStores = async () => {
    const validRows = importRows.filter((r) => r.status === IMPORT_STATUS.READY);
    if (!validRows.length) return;

    setImportSaving(true);
    setImportError("");
    try {
      await Promise.all(
        validRows.map((row) =>
          storesApi.create({
            name: row.name,
            latitude: parseFloat(parseFloat(row.latitude).toFixed(6)),
            longitude: parseFloat(parseFloat(row.longitude).toFixed(6)),
            weekly_delivery_value: parseFloat(row.weekly_delivery_value) || 0,
            start_date: row.start_date || null,
            end_date: row.end_date || null,
          }),
        ),
      );
      clearImportPreview();
      load();
    } catch {
      setImportError("Failed to import one or more stores.");
    } finally {
      setImportSaving(false);
    }
  };

  const readyCount = importRows.filter((r) => r.status === IMPORT_STATUS.READY).length;
  const addressErrorCount = importRows.filter(
    (r) => r.status === IMPORT_STATUS.ADDRESS_ERROR,
  ).length;
  const duplicateCount = importRows.filter((r) => r.status === IMPORT_STATUS.DUPLICATE).length;

  return (
    <div style={s.page}>
      <h1 style={s.h1}>Stores</h1>
      <div style={s.formCard}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <h3 style={{ ...s.h3, marginBottom: 0 }}>
            {editing ? "Edit store" : "Add store"}
          </h3>
          {!editing && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={onSelectFile}
                style={{ display: "none" }}
              />
              <button style={s.btnGhost} onClick={onPickExcel} disabled={importLoading || importSaving}>
                {importLoading ? "Reading Excel..." : "Import from Excel"}
              </button>
            </>
          )}
        </div>
        <div style={s.grid2}>
          <Field
            label="Store name"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
            span={2}
          />
          <div style={{ gridColumn: "span 2" }}>
            <LocationPicker
              latitude={form.latitude}
              longitude={form.longitude}
              address={address}
              onChange={({ latitude, longitude }) =>
                setForm((f) => ({ ...f, latitude, longitude }))
              }
              onAddressChange={(val) => setAddress(val)}
            />
          </div>
          <Field
            label="Delivery Value ($)"
            value={form.weekly_delivery_value}
            onChange={(v) => setForm({ ...form, weekly_delivery_value: v })}
            type="number"
            span={2}
          />
          <Field
            label="Start Date"
            value={form.start_date}
            onChange={(v) => setForm({ ...form, start_date: v })}
            type="date"
            span={2}
          />
          <Field
            label="End Date"
            value={form.end_date}
            onChange={(v) => setForm({ ...form, end_date: v })}
            type="date"
            span={2}
          />
        </div>
        {error && <p style={s.error}>{error}</p>}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button style={s.btnPrimary} onClick={save}>
            {editing ? "Update" : "Add store"}
          </button>
          {editing && (
            <button
              style={s.btnGhost}
              onClick={() => {
                resetAddForm();
              }}
            >
              Cancel
            </button>
          )}
        </div>

        {importRows.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <p style={{ margin: "0 0 8px" }}>
              {readyCount} ready to import, {addressErrorCount} address errors, {duplicateCount} duplicates will be skipped
            </p>
            {addressErrorCount > 0 && (
              <p style={{ ...s.error, marginTop: 0 }}>
                Fix the highlighted rows in your Excel file and re-upload
              </p>
            )}
            {importError && <p style={s.error}>{importError}</p>}
            <div style={s.tableWrap}>
              <table style={s.table}>
                <thead>
                  <tr>
                    {[
                      "Store Name",
                      "Address",
                      "Delivery Value ($)",
                      "Start Date",
                      "End Date",
                      "Status",
                    ].map((h) => (
                      <th key={h} style={s.th}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importRows.map((row, idx) => {
                    const bg =
                      row.status === IMPORT_STATUS.READY
                        ? "rgba(102, 187, 106, 0.14)"
                        : row.status === IMPORT_STATUS.ADDRESS_ERROR
                          ? "rgba(239, 83, 80, 0.14)"
                          : "rgba(255, 167, 38, 0.14)";
                    return (
                      <tr key={`${row.name}_${idx}`} style={{ ...s.tr, background: bg }}>
                        <td style={s.td}>{row.name}</td>
                        <td style={s.td}>{row.address}</td>
                        <td style={s.td}>{row.weekly_delivery_value}</td>
                        <td style={s.td}>{row.start_date || "-"}</td>
                        <td style={s.td}>{row.end_date || "-"}</td>
                        <td style={s.td}>{row.statusText}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button
                style={s.btnPrimary}
                onClick={importValidStores}
                disabled={importSaving || readyCount === 0}
              >
                {importSaving ? "Importing..." : "Import Valid Stores"}
              </button>
              <button style={s.btnGhost} onClick={clearImportPreview} disabled={importSaving}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {importRows.length === 0 && importError && <p style={s.error}>{importError}</p>}
      </div>

      {loading ? (
        <p style={s.muted}>Loading…</p>
      ) : (
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                {["Store name", "Delivery value", "Start date", "End date", ""].map((h) => (
                  <th key={h} style={s.th}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stores.map((st) => (
                <tr key={st.id} style={s.tr}>
                  <td style={s.td}>{st.name}</td>
                  <td style={s.td}>
                    ${Number(st.weekly_delivery_value).toLocaleString()}
                  </td>
                  <td style={s.td}>{st.start_date || "-"}</td>
                  <td style={s.td}>{st.end_date || "-"}</td>
                  <td style={s.td}>
                    <button style={s.btnSm} onClick={() => edit(st)}>
                      Edit
                    </button>
                    <button
                      style={{ ...s.btnSm, color: "#ef5350" }}
                      onClick={() => del(st)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {confirmItem && (
        <ConfirmModal
          itemName={confirmItem.name}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmItem(null)}
        />
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", span }) {
  return (
    <div style={span === 2 ? { gridColumn: "span 2" } : {}}>
      <label
        style={{
          fontSize: 12,
          color: "#a0a0b8",
          display: "block",
          marginBottom: 4,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </label>
      <input
        style={{
          width: "100%",
          padding: "7px 10px",
          fontSize: 13,
          background: "#0a0a1a",
          border: "1px solid #1e1e3a",
          borderRadius: 6,
          boxSizing: "border-box",
          color: "#ffffff",
          outline: "none",
        }}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        step={type === "number" ? "any" : undefined}
      />
    </div>
  );
}
