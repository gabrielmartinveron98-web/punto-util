import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Package, Plus, Search, ArrowDownCircle, ArrowUpCircle, AlertTriangle,
  Camera, X, Edit3, Trash2, BarChart3, ScanLine, Gift, BookOpen, Blocks,
  ChevronDown, Check, History, TrendingUp, AlertCircle, Loader2,
  Wallet, Receipt, CalendarDays, MinusCircle, ShoppingBag, PackageX, ArrowRightLeft,
  Globe, ShoppingCart, Settings, MessageCircle, Minus, ImageOff, ArrowLeft, Tag, Printer,
  Download, Upload, ShieldCheck, FileSpreadsheet, Lock, ClipboardCheck, Truck, StickyNote, Copy,
  Banknote, CreditCard, Smartphone, Star, Users, UserPlus, Wallet2, RotateCcw,
  ClipboardList, ScanBarcode, KeyRound, LogOut, ChevronRight, TrendingDown, Layers
} from "lucide-react";

/* ----------------------------------------------------------------------
   Tokens de diseño
   Paleta: papel crema cálido + tinta azul + acento coral
   Tipografía: Fraunces (display, con carácter) + Inter (cuerpo/UI)
---------------------------------------------------------------------- */
const BRAND_NAME = "Punto Útil"; // Cambiá este nombre para renombrar toda la app de una vez

const COLORS = {
  paper: "#FFFBF5",
  paperDeep: "#FCEFEF",
  ink: "#2B2342",
  inkSoft: "#6B6280",
  coral: "#E63E8C",      // fucsia — color principal / acciones
  coralSoft: "#FBD6E8",
  teal: "#00A89D",       // turquesa — entradas / positivo
  tealSoft: "#CDF1ED",
  gold: "#F5B700",       // amarillo — acentos / destacados
  goldSoft: "#FDEBB0",
  line: "#F0DDE7",
  white: "#FFFFFF",
  danger: "#D6336C",
};

const DEFAULT_CATEGORIES = [
  { id: "jugueteria",   name: "Juguetería",   color: "#E63E8C", softColor: "#FBD6E8", subgroups: [] },
  { id: "regaleria",    name: "Regalería",    color: "#F5B700", softColor: "#FDEBB0", subgroups: [] },
  { id: "libreria",     name: "Librería",     color: "#00A89D", softColor: "#CDF1ED", subgroups: [] },
  { id: "descartables", name: "Descartables", color: "#22A06B", softColor: "#C3EDD8", subgroups: [] },
];
function buildCategoryMeta(cats) {
  const m = {};
  for (const c of (cats || [])) m[c.name] = { color: c.color, soft: c.softColor || c.color + "33", subgroups: c.subgroups || [] };
  return m;
}
const CategoryContext = React.createContext({ categoryList: DEFAULT_CATEGORIES, categoryMeta: buildCategoryMeta(DEFAULT_CATEGORIES), categoryNames: DEFAULT_CATEGORIES.map(c=>c.name) });
const useCat = () => React.useContext(CategoryContext);

const OUT_REASONS = {
  venta: { label: "Venta", icon: ShoppingBag, color: COLORS.teal },
  rotura: { label: "Rotura", icon: PackageX, color: COLORS.danger },
  perdida: { label: "Pérdida", icon: AlertTriangle, color: COLORS.danger },
  uso_interno: { label: "Uso interno", icon: ArrowRightLeft, color: COLORS.gold },
  otro: { label: "Otro", icon: MinusCircle, color: COLORS.inkSoft },
};
const OUT_REASON_KEYS = Object.keys(OUT_REASONS);

const PAYMENT_METHODS = {
  efectivo: { label: "Efectivo", icon: Banknote },
  tarjeta: { label: "Tarjeta", icon: CreditCard },
  transferencia: { label: "Transferencia", icon: ArrowRightLeft },
  mercadopago: { label: "Mercado Pago", icon: Smartphone },
  fiado: { label: "Fiado", icon: Users },
  otro: { label: "Otro", icon: MinusCircle },
};
const PAYMENT_METHOD_KEYS = Object.keys(PAYMENT_METHODS);

const EXPENSE_CATEGORIES = ["Alquiler", "Servicios", "Sueldos", "Impuestos", "Insumos", "Otro"];

// Fechas clave de temporada en Argentina. month es 1-indexado.
const SEASON_DATES = [
  { key: "reyes", label: "Día de Reyes", month: 1, day: 6, leadDays: 25 },
  { key: "vuelta-cole", label: "Vuelta al cole", month: 2, day: 25, leadDays: 35 },
  { key: "dia-padre", label: "Día del Padre", month: 6, day: 15, leadDays: 21 },
  { key: "dia-nino", label: "Día del Niño", month: 8, day: 17, leadDays: 30 },
  { key: "dia-madre", label: "Día de la Madre", month: 10, day: 19, leadDays: 25 },
  { key: "navidad", label: "Navidad", month: 12, day: 25, leadDays: 35 },
];

function nextOccurrence(month, day) {
  const now = new Date();
  let year = now.getFullYear();
  let date = new Date(year, month - 1, day);
  if (date < new Date(now.toDateString())) {
    date = new Date(year + 1, month - 1, day);
  }
  return date;
}

function getSeasonAlerts() {
  const today = new Date(new Date().toDateString());
  return SEASON_DATES.map((s) => {
    const date = nextOccurrence(s.month, s.day);
    const daysUntil = Math.round((date - today) / 86400000);
    return { ...s, date, daysUntil, active: daysUntil <= s.leadDays };
  }).sort((a, b) => a.daysUntil - b.daysUntil);
}

function uid(prefix = "id") {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function genBarcode() {
  let code = "2"; // prefijo interno para no chocar con códigos reales
  for (let i = 0; i < 11; i++) code += Math.floor(Math.random() * 10);
  return code;
}

function formatMoney(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" }) +
    " " + d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
}

/* ----------------------------------------------------------------------
   Exportación de datos — descarga de archivos en el navegador
---------------------------------------------------------------------- */
function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function downloadCanvasAsPNG(canvas, filename) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, "image/png");
}

function drawLabelsToCanvas(products, brandName) {
  const cols = 3;
  const cardW = 280, cardH = 160, gap = 16, pad = 24;
  const rows = Math.ceil(products.length / cols);
  const canvas = document.createElement("canvas");
  canvas.width = pad * 2 + cols * cardW + (cols - 1) * gap;
  canvas.height = pad * 2 + rows * cardH + (rows - 1) * gap;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  products.forEach((p, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = pad + col * (cardW + gap);
    const y = pad + row * (cardH + gap);

    ctx.strokeStyle = "#cccccc";
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, cardW, cardH);
    ctx.setLineDash([]);

    ctx.fillStyle = "#2B2342";
    ctx.textAlign = "center";
    ctx.font = "600 20px sans-serif";
    wrapText(ctx, p.name, x + cardW / 2, y + 50, cardW - 32, 26);

    ctx.font = "700 32px serif";
    ctx.fillStyle = "#E63E8C";
    ctx.fillText(formatMoney(p.price), x + cardW / 2, y + 110);

    ctx.font = "11px sans-serif";
    ctx.fillStyle = "#999999";
    ctx.fillText(brandName.toUpperCase(), x + cardW / 2, y + cardH - 16);
  });

  return canvas;
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let lines = [];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines = lines.slice(0, 2);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
}

function drawReceiptToCanvas(sale, storeName) {
  const width = 380, padX = 24;
  const lineH = 26;
  const height = 90 + sale.items.length * lineH + (sale.paymentMethod ? 110 : 90);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#111111";
  ctx.textAlign = "center";
  ctx.font = "700 18px monospace";
  ctx.fillText(storeName.toUpperCase(), width / 2, 36);
  ctx.font = "12px monospace";
  ctx.fillStyle = "#444444";
  ctx.fillText(formatDate(sale.date), width / 2, 56);

  ctx.strokeStyle = "#999999";
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(padX, 70);
  ctx.lineTo(width - padX, 70);
  ctx.stroke();

  let y = 70 + lineH;
  ctx.textAlign = "left";
  ctx.font = "13px monospace";
  ctx.fillStyle = "#111111";
  sale.items.forEach((item) => {
    const label = `${item.qty} x ${item.name}`;
    const price = formatMoney(item.qty * item.unitPrice);
    ctx.textAlign = "left";
    ctx.fillText(label.length > 28 ? label.slice(0, 28) + "…" : label, padX, y);
    ctx.textAlign = "right";
    ctx.fillText(price, width - padX, y);
    y += lineH;
  });

  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(padX, y);
  ctx.lineTo(width - padX, y);
  ctx.stroke();
  ctx.setLineDash([]);
  y += lineH + 4;

  ctx.font = "700 16px monospace";
  ctx.textAlign = "left";
  ctx.fillText("TOTAL", padX, y);
  ctx.textAlign = "right";
  ctx.fillText(formatMoney(sale.total), width - padX, y);
  y += lineH;

  if (sale.paymentMethod) {
    ctx.font = "12px monospace";
    ctx.fillStyle = "#444444";
    ctx.textAlign = "center";
    const label = PAYMENT_METHODS[sale.paymentMethod]?.label || sale.paymentMethod;
    ctx.fillText(`Pago: ${label}`, width / 2, y);
    y += lineH * 0.7;
  }

  ctx.font = "11px monospace";
  ctx.fillStyle = "#444444";
  ctx.textAlign = "center";
  ctx.fillText("¡Gracias por tu compra!", width / 2, y + 6);

  return canvas;
}

function csvEscape(value) {
  const s = value === null || value === undefined ? "" : String(value);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCSV(rows) {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
}

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function exportBackupJSON(products, movements, expenses, storeConfig, onExported) {
  const payload = { products, movements, expenses, storeConfig, exportedAt: new Date().toISOString() };
  downloadFile(`respaldo-${BRAND_NAME.toLowerCase().replace(/\s+/g, "-")}-${todayStamp()}.json`, JSON.stringify(payload, null, 2), "application/json");
  if (onExported) onExported(new Date().toISOString());
}

const BACKUP_REMINDER_DAYS = 7;

function daysSinceBackup(lastBackupDate) {
  if (!lastBackupDate) return Infinity;
  return Math.floor((Date.now() - new Date(lastBackupDate).getTime()) / 86400000);
}

function exportInventoryCSV(products) {
  const rows = [
    ["Nombre", "Categoría", "Código de barras", "Costo", "Precio", "Stock", "Stock mínimo"],
    ...products.map((p) => [p.name, p.category, p.barcode, p.cost, p.price, p.stock, p.minStock]),
  ];
  downloadFile(`inventario-${todayStamp()}.csv`, toCSV(rows), "text/csv;charset=utf-8");
}

function exportSalesCSV(movements, products) {
  const productById = {};
  for (const p of products) productById[p.id] = p;
  const sales = movements.filter((m) => m.type === "out" && m.reason === "venta");
  const rows = [
    ["Fecha", "Producto", "Cantidad", "Precio unitario", "Total", "Nota"],
    ...sales.map((m) => {
      const p = productById[m.productId];
      return [
        formatDate(m.date),
        p ? p.name : "(producto eliminado)",
        m.qty,
        m.unitPrice ?? "",
        (m.unitPrice || 0) * m.qty,
        m.note || "",
      ];
    }),
  ];
  downloadFile(`ventas-${todayStamp()}.csv`, toCSV(rows), "text/csv;charset=utf-8");
}

function exportExpensesCSV(expenses) {
  const rows = [
    ["Fecha", "Categoría", "Monto", "Detalle"],
    ...expenses.map((e) => [formatDate(e.date), e.category, e.amount, e.note || ""]),
  ];
  downloadFile(`gastos-${todayStamp()}.csv`, toCSV(rows), "text/csv;charset=utf-8");
}

function parseBackupFile(text) {
  const data = JSON.parse(text);
  if (!data || !Array.isArray(data.products)) {
    throw new Error("El archivo no tiene el formato esperado de un respaldo.");
  }
  return {
    products: data.products,
    movements: Array.isArray(data.movements) ? data.movements : [],
    expenses: Array.isArray(data.expenses) ? data.expenses : [],
    storeConfig: data.storeConfig || null,
  };
}

/* ----------------------------------------------------------------------
   Importación de productos desde CSV (Excel / Google Sheets)
---------------------------------------------------------------------- */
function parseCSV(text) {
  // Parser simple de CSV que respeta comillas y comas dentro de campos.
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  // Normalizar saltos de línea y quitar BOM si lo hubiera (común en exports de Excel)
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (inQuotes) {
      if (c === '"') {
        if (clean[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

// Encabezados aceptados (en minúsculas, sin tildes) para cada columna reconocida.
const IMPORT_COLUMN_ALIASES = {
  name: ["nombre", "producto", "name"],
  category: ["categoria", "category", "rubro"],
  barcode: ["codigo de barras", "codigo", "barcode"],
  cost: ["costo", "cost"],
  price: ["precio", "price", "precio de venta"],
  stock: ["stock", "cantidad", "stock inicial"],
  minStock: ["stock minimo", "minimo", "stock min"],
  supplier: ["proveedor", "supplier"],
};

function normalizeHeader(h) {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // quita tildes
}

function mapHeaders(headerRow) {
  const map = {}; // índice de columna -> campo interno
  headerRow.forEach((h, idx) => {
    const norm = normalizeHeader(h);
    for (const [field, aliases] of Object.entries(IMPORT_COLUMN_ALIASES)) {
      if (aliases.includes(norm)) {
        map[idx] = field;
        break;
      }
    }
  });
  return map;
}

function parseImportCSV(text, existingProducts) {
  const rows = parseCSV(text);
  if (rows.length < 2) {
    throw new Error("El archivo está vacío o no tiene filas de datos además del encabezado.");
  }
  const headerMap = mapHeaders(rows[0]);
  if (!Object.values(headerMap).includes("name")) {
    throw new Error('No se encontró una columna de "Nombre". Revisá que la primera fila tenga los encabezados.');
  }

  const barcodeIndex = {};
  existingProducts.forEach((p) => { if (p.barcode) barcodeIndex[p.barcode] = p; });

  const toCreate = [];
  const toUpdate = [];
  const skipped = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const entry = {};
    Object.entries(headerMap).forEach(([idx, field]) => {
      entry[field] = (cells[Number(idx)] || "").trim();
    });
    if (!entry.name) { skipped.push({ row: i + 1, reason: "sin nombre" }); continue; }

    const parsed = {
      name: entry.name,
      category: entry.category || '',
      barcode: entry.barcode || "",
      cost: Number(entry.cost) || 0,
      price: Number(entry.price) || 0,
      stock: Number(entry.stock) || 0,
      minStock: Number(entry.minStock) || 0,
      supplier: entry.supplier || "",
    };

    const existing = parsed.barcode && barcodeIndex[parsed.barcode];
    if (existing) {
      toUpdate.push({ id: existing.id, ...parsed });
    } else {
      toCreate.push(parsed);
    }
  }

  return { toCreate, toUpdate, skipped, totalRows: rows.length - 1 };
}

/* ----------------------------------------------------------------------
   Capa de almacenamiento (persistente vía localStorage, con fallback)
---------------------------------------------------------------------- */
const STORE_KEY = "inventario-data-v1";

async function loadData() {
  try {
    const res = await localStorage.get(STORE_KEY, false);
    if (res && res.value) return JSON.parse(res.value);
  } catch (e) {
    /* clave inexistente la primera vez */
  }
  return null;
}

async function saveData(data) {
  try {
    await localStorage.set(STORE_KEY, JSON.stringify(data), false);
    return true;
  } catch (e) {
    console.error("Error guardando datos", e);
    return false;
  }
}

function seedData() {
  const now = new Date().toISOString();
  const products = [
    { id: uid("p"), name: "Muñeca articulada 30cm", category: "Juguetería", barcode: genBarcode(), cost: 4200, price: 8900, stock: 14, minStock: 5, imageUrl: "", supplier: "Distribuidora Juguetex", createdAt: now },
    { id: uid("p"), name: "Auto a friccion metal", category: "Juguetería", barcode: genBarcode(), cost: 1800, price: 3900, stock: 3, minStock: 6, imageUrl: "", supplier: "Distribuidora Juguetex", createdAt: now },
    { id: uid("p"), name: "Vela aromática lavanda", category: "Regalería", barcode: genBarcode(), cost: 1500, price: 3200, stock: 22, minStock: 8, imageUrl: "", supplier: "Aromas del Sur", createdAt: now },
    { id: uid("p"), name: "Taza cerámica frase", category: "Regalería", barcode: genBarcode(), cost: 2100, price: 4500, stock: 2, minStock: 5, imageUrl: "", supplier: "Cerámica Andina", createdAt: now },
    { id: uid("p"), name: "Cuaderno A5 tapa dura", category: "Librería", barcode: genBarcode(), cost: 900, price: 2100, stock: 30, minStock: 10, imageUrl: "", supplier: "Papelera Norte", createdAt: now },
    { id: uid("p"), name: "Set lapices de colores x12", category: "Librería", barcode: genBarcode(), cost: 1200, price: 2600, stock: 4, minStock: 8, imageUrl: "", supplier: "Papelera Norte", createdAt: now },
  ];
  const movements = products.map((p) => ({
    id: uid("m"), productId: p.id, type: "in", qty: p.stock, note: "Carga inicial", date: now,
  }));

  // Algunas ventas de ejemplo en los últimos días para que los reportes no arranquen vacíos
  const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
  const sample = [
    { p: products[0], qty: 2, day: 1 },
    { p: products[2], qty: 4, day: 1 },
    { p: products[4], qty: 5, day: 2 },
    { p: products[1], qty: 1, day: 3 },
    { p: products[5], qty: 2, day: 4 },
  ];
  for (const s of sample) {
    movements.push({
      id: uid("m"), productId: s.p.id, type: "out", reason: "venta",
      qty: s.qty, unitPrice: s.p.price, note: "", date: daysAgo(s.day),
    });
    s.p.stock -= s.qty;
  }

  const expenses = [
    { id: uid("e"), category: "Alquiler", amount: 180000, note: "Alquiler del local", date: daysAgo(5) },
    { id: uid("e"), category: "Servicios", amount: 32000, note: "Luz y wifi", date: daysAgo(3) },
  ];

  const storeConfig = {
    storeName: BRAND_NAME,
    whatsappNumber: "5491100000000", // EJEMPLO — reemplazar por el número real del negocio (con código de país, sin + ni espacios)
    welcomeMessage: "Hola, te quería hacer este pedido:",
    lastBackupDate: null,
    logoUrl: "",
    categories: DEFAULT_CATEGORIES,
  };

  return { products, movements, expenses, storeConfig };
}

/* ----------------------------------------------------------------------
   Error Boundary — evita que un error de render deje la pantalla
   "congelada" sin ningún aviso; muestra un mensaje claro en su lugar.
---------------------------------------------------------------------- */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("Error capturado por ErrorBoundary:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: 14, padding: 24, background: "#FFFBF5", textAlign: "center",
          fontFamily: "system-ui, sans-serif",
        }}>
          <AlertCircle size={36} color="#D6336C" />
          <div style={{ fontSize: 17, fontWeight: 700, color: "#2B2342" }}>Ocurrió un error inesperado</div>
          <div style={{ fontSize: 13, color: "#6B6280", maxWidth: 320 }}>
            {this.state.error.message || "Error desconocido"}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              border: "none", background: "#2B2342", color: "#fff", padding: "10px 18px",
              borderRadius: 9, fontSize: 13.5, fontWeight: 700, cursor: "pointer",
            }}
          >
            Volver a intentar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ----------------------------------------------------------------------
   App
---------------------------------------------------------------------- */
export default function AppWithBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

function App() {
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [storeConfig, setStoreConfig] = useState({ storeName: BRAND_NAME, whatsappNumber: "5491100000000", welcomeMessage: "Hola, te quería hacer este pedido:", lastBackupDate: null, logoUrl: "", categories: DEFAULT_CATEGORIES });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState("inventory"); // inventory | reports | accounting | store
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [productModal, setProductModal] = useState(null); // null | {} | product
  const [movementModal, setMovementModal] = useState(null); // null | {type, product}
  const [historyModal, setHistoryModal] = useState(null); // null | product
  const [expenseModal, setExpenseModal] = useState(null); // null | {} | expense
  const [saleModal, setSaleModal] = useState(false);
  const [storeSettingsModal, setStoreSettingsModal] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [labelsModal, setLabelsModal] = useState(false);
  const [importModal, setImportModal] = useState(false);
  const [importProductsModal, setImportProductsModal] = useState(false);
  const [closeDayModal, setCloseDayModal] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerTarget, setScannerTarget] = useState(null); // "movement-lookup" | "product-form"
  const [toast, setToast] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmDeleteExpense, setConfirmDeleteExpense] = useState(null);
  const [customerModal, setCustomerModal] = useState(null);
  const [confirmDeleteCustomer, setConfirmDeleteCustomer] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);

  const saveTimeout = useRef(null);

  // Carga inicial
  useEffect(() => {
    (async () => {
      const data = await loadData();
      if (data && data.products) {
        setProducts(data.products);
        setMovements(data.movements || []);
        setExpenses(data.expenses || []);
        setCustomers(data.customers || []);
        setStoreConfig(data.storeConfig || { storeName: BRAND_NAME, whatsappNumber: "5491100000000", welcomeMessage: "Hola, te quería hacer este pedido:", lastBackupDate: null, logoUrl: "", categories: DEFAULT_CATEGORIES });
      } else {
        const seed = seedData();
        setProducts(seed.products);
        setMovements(seed.movements);
        setExpenses(seed.expenses);
        setCustomers(seed.customers || []);
        setStoreConfig(seed.storeConfig);
        await saveData(seed);
      }
      setLoading(false);
    })();
  }, []);

  // Guardado con debounce cada vez que cambian los datos
  useEffect(() => {
    if (loading) return;
    setSaving(true);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      await saveData({ products, movements, expenses, customers, storeConfig });
      setSaving(false);
    }, 500);
    return () => clearTimeout(saveTimeout.current);
  }, [products, movements, expenses, customers, storeConfig, loading]);

  function showToast(message, kind = "ok") {
    setToast({ message, kind, id: Date.now() });
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  /* ---------------- Derivados ---------------- */
  const filteredProducts = useMemo(() => {
    let list = products;
    if (categoryFilter !== "Todas") list = list.filter((p) => p.category === categoryFilter);
    if (lowStockOnly) list = list.filter((p) => p.stock <= p.minStock);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.barcode.includes(q) ||
          (p.supplier && p.supplier.toLowerCase().includes(q)) ||
          (p.notes && p.notes.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [products, categoryFilter, lowStockOnly, search]);

  const lowStockProducts = useMemo(() => products.filter((p) => p.stock <= p.minStock), [products]);
  const hasSeasonAlert = useMemo(() => getSeasonAlerts().some((s) => s.active), []);
  const needsBackupReminder = daysSinceBackup(storeConfig.lastBackupDate) >= BACKUP_REMINDER_DAYS;
  const categoryList = React.useMemo(() => storeConfig.categories && storeConfig.categories.length ? storeConfig.categories : DEFAULT_CATEGORIES, [storeConfig.categories]);
  const categoryMeta = React.useMemo(() => buildCategoryMeta(categoryList), [categoryList]);
  const categoryNames = React.useMemo(() => categoryList.map(c => c.name), [categoryList]);

  const stats = useMemo(() => {
    const totalUnits = products.reduce((s, p) => s + p.stock, 0);
    const totalValueCost = products.reduce((s, p) => s + p.stock * p.cost, 0);
    const totalValuePrice = products.reduce((s, p) => s + p.stock * p.price, 0);
    return { totalUnits, totalValueCost, totalValuePrice, totalSkus: products.length };
  }, [products]);

  const topMoved = useMemo(() => {
    const byProduct = {};
    for (const m of movements) {
      if (m.type !== "out") continue;
      byProduct[m.productId] = (byProduct[m.productId] || 0) + m.qty;
    }
    return Object.entries(byProduct)
      .map(([productId, qty]) => ({ product: products.find((p) => p.id === productId), qty }))
      .filter((x) => x.product)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6);
  }, [movements, products]);

  /* ---------------- Acciones ---------------- */
  function findByBarcode(code) {
    return products.find((p) => p.barcode === code.trim());
  }

  function upsertProduct(data) {
    try {
      if (data.id) {
        setProducts((prev) => prev.map((p) => (p.id === data.id ? { ...p, ...data } : p)));
        showToast("Producto actualizado");
      } else {
        const newProduct = {
          id: uid("p"),
          name: data.name,
          category: data.category,
          barcode: data.barcode || genBarcode(),
          cost: Number(data.cost) || 0,
          price: Number(data.price) || 0,
          wholesalePrice: data.wholesalePrice !== "" ? Number(data.wholesalePrice) : undefined,
          stock: Number(data.stock) || 0,
          minStock: Number(data.minStock) || 0,
          imageUrl: data.imageUrl || "",
          supplier: data.supplier || "",
          subgroup: data.subgroup || "",
          isFavorite: false,
          notes: data.notes || "",
          createdAt: new Date().toISOString(),
        };
        setProducts((prev) => [...prev, newProduct]);
        if (newProduct.stock > 0) {
          setMovements((prev) => [
            { id: uid("m"), productId: newProduct.id, type: "in", qty: newProduct.stock, note: "Alta de producto", date: new Date().toISOString() },
            ...prev,
          ]);
        }
        showToast("Producto creado");
      }
      setProductModal(null);
    } catch (err) {
      showToast(`Error al guardar: ${err.message}`, "error");
      console.error("Error en upsertProduct:", err);
    }
  }

  function deleteProduct(id) {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    setMovements((prev) => prev.filter((m) => m.productId !== id));
    setConfirmDelete(null);
    showToast("Producto eliminado", "warn");
  }

  function duplicateProduct(product) {
    const copy = {
      ...product,
      id: uid("p"),
      name: `${product.name} (copia)`,
      barcode: genBarcode(),
      stock: 0,
      isFavorite: false,
      createdAt: new Date().toISOString(),
    };
    setProducts((prev) => [...prev, copy]);
    showToast("Producto duplicado — editalo para ajustar nombre, color, talle, etc.");
    setProductModal(copy);
  }

  function toggleFavorite(productId) {
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, isFavorite: !p.isFavorite } : p)));
  }

  function registerMovement(product, type, qty, extra) {
    const amount = Number(qty);
    if (!amount || amount <= 0) return;
    if (type === "out" && amount > product.stock) {
      showToast("No hay suficiente stock para esa salida", "error");
      return;
    }
    setProducts((prev) =>
      prev.map((p) =>
        p.id === product.id ? { ...p, stock: type === "in" ? p.stock + amount : p.stock - amount } : p
      )
    );
    const movement = {
      id: uid("m"), productId: product.id, type, qty: amount,
      note: (extra && extra.note) || "", date: new Date().toISOString(),
    };
    if (type === "out") {
      movement.reason = (extra && extra.reason) || "venta";
      if (movement.reason === "venta") {
        movement.unitPrice = extra && extra.unitPrice !== undefined ? Number(extra.unitPrice) : product.price;
        movement.paymentMethod = (extra && extra.paymentMethod) || "efectivo";
      }
    }
    setMovements((prev) => [movement, ...prev]);
    showToast(type === "in" ? "Entrada registrada" : "Salida registrada");
    setMovementModal(null);
    if (type === "out" && movement.reason === "venta") {
      setLastSale({
        date: movement.date,
        items: [{ name: product.name, qty: movement.qty, unitPrice: movement.unitPrice }],
        total: movement.unitPrice * movement.qty,
        paymentMethod: movement.paymentMethod,
      });
    }
  }

  function upsertExpense(data) {
    if (data.id) {
      setExpenses((prev) => prev.map((e) => (e.id === data.id ? { ...e, ...data, amount: Number(data.amount) || 0 } : e)));
      showToast("Gasto actualizado");
    } else {
      setExpenses((prev) => [
        { id: uid("e"), category: data.category, amount: Number(data.amount) || 0, note: data.note || "", date: data.date || new Date().toISOString() },
        ...prev,
      ]);
      showToast("Gasto registrado");
    }
    setExpenseModal(null);
  }

  function deleteExpense(id) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    setConfirmDeleteExpense(null);
    showToast("Gasto eliminado", "warn");
  }

  function registerSale(lines, paymentMethod, customerId) {
    // lines: [{ product, qty, unitPrice }]
    const validLines = lines.filter((l) => l.qty > 0);
    if (validLines.length === 0) return;

    const overSold = validLines.find((l) => l.qty > l.product.stock);
    if (overSold) {
      showToast(`No hay suficiente stock de "${overSold.product.name}"`, "error");
      return;
    }

    const now = new Date().toISOString();
    setProducts((prev) =>
      prev.map((p) => {
        const line = validLines.find((l) => l.product.id === p.id);
        return line ? { ...p, stock: p.stock - line.qty } : p;
      })
    );
    const newMovements = validLines.map((l) => ({
      id: uid("m"), productId: l.product.id, type: "out", reason: "venta",
      qty: l.qty, unitPrice: l.unitPrice, note: "Venta (caja)", date: now,
      paymentMethod: paymentMethod || "efectivo",
      customerId: paymentMethod === "fiado" ? customerId : undefined,
    }));
    setMovements((prev) => [...newMovements, ...prev]);

    const total = validLines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
    showToast(paymentMethod === "fiado" ? `Venta fiada: ${formatMoney(total)}` : `Venta registrada: ${formatMoney(total)}`);
    setSaleModal(false);
    setLastSale({
      date: now,
      items: validLines.map((l) => ({ name: l.product.name, qty: l.qty, unitPrice: l.unitPrice })),
      total,
      paymentMethod: paymentMethod || "efectivo",
    });
  }

  function upsertCustomer(data) {
    if (data.id) {
      setCustomers((prev) => prev.map((c) => (c.id === data.id ? { ...c, ...data } : c)));
      showToast("Cliente actualizado");
    } else {
      const newCustomer = {
        id: uid("c"), name: data.name, phone: data.phone || "", notes: data.notes || "",
        createdAt: new Date().toISOString(),
      };
      setCustomers((prev) => [...prev, newCustomer]);
      showToast("Cliente agregado");
      return newCustomer;
    }
  }

  function deleteCustomer(id) {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    showToast("Cliente eliminado", "warn");
  }

  function registerDebtPayment(customerId, amount, note) {
    const payment = {
      id: uid("pay"), customerId, amount: Number(amount), note: note || "", date: new Date().toISOString(),
    };
    setMovements((prev) => [{ ...payment, type: "debt-payment" }, ...prev]);
    showToast(`Pago registrado: ${formatMoney(amount)}`);
  }

  function restoreBackup(data) {
    setProducts(data.products);
    setMovements(data.movements);
    setExpenses(data.expenses);
    if (data.storeConfig) setStoreConfig(data.storeConfig);
    setImportModal(false);
    showToast("Respaldo restaurado correctamente");
  }

  function applyProductImport(result) {
    const now = new Date().toISOString();
    const created = result.toCreate.map((p) => ({
      id: uid("p"),
      ...p,
      barcode: p.barcode || genBarcode(),
      imageUrl: "",
      notes: "",
      createdAt: now,
    }));
    setProducts((prev) => {
      let next = [...prev, ...created];
      result.toUpdate.forEach((upd) => {
        next = next.map((p) => (p.id === upd.id ? { ...p, ...upd } : p));
      });
      return next;
    });
    const newMovements = created
      .filter((p) => p.stock > 0)
      .map((p) => ({ id: uid("m"), productId: p.id, type: "in", qty: p.stock, note: "Importado desde planilla", date: now }));
    if (newMovements.length) setMovements((prev) => [...newMovements, ...prev]);

    setImportProductsModal(false);
    showToast(`Importación lista: ${created.length} nuevos, ${result.toUpdate.length} actualizados`);
  }

  if (loading) {
    return (
      <div style={{ ...sx.app, alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={28} style={{ color: COLORS.coral, animation: "spin 1s linear infinite" }} />
        <GlobalStyle />
      </div>
    );
  }

  return (
    <CategoryContext.Provider value={{ categoryList, categoryMeta, categoryNames }}>
    <div style={sx.app}>
      <GlobalStyle />
      <Header saving={saving} view={view} setView={setView} lowCount={lowStockProducts.length} hasSeasonAlert={hasSeasonAlert || needsBackupReminder} onNewSale={() => setSaleModal(true)} onCloseDay={() => setCloseDayModal(true)} storeConfig={storeConfig} />

      {view === "inventory" && (
        <main style={sx.main}>
          <Toolbar
            search={search} setSearch={setSearch}
            categoryFilter={categoryFilter} setCategoryFilter={setCategoryFilter}
            lowStockOnly={lowStockOnly} setLowStockOnly={setLowStockOnly}
            lowCount={lowStockProducts.length}
            onAdd={() => setProductModal({})}
            onScan={() => { setScannerTarget("lookup"); setScannerOpen(true); }}
            selectMode={selectMode}
            onToggleSelectMode={() => { setSelectMode((v) => !v); setSelectedIds([]); }}
          />

          <StatRow stats={stats} />

          {filteredProducts.length === 0 ? (
            <EmptyState
              hasProducts={products.length > 0}
              onAdd={() => setProductModal({})}
            />
          ) : (
            <div style={sx.grid}>
              {filteredProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  selectMode={selectMode}
                  selected={selectedIds.includes(p.id)}
                  onToggleSelect={() =>
                    setSelectedIds((prev) =>
                      prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                    )
                  }
                  onIn={() => setMovementModal({ type: "in", product: p })}
                  onOut={() => setMovementModal({ type: "out", product: p })}
                  onEdit={() => setProductModal(p)}
                  onDelete={() => setConfirmDelete(p)}
                  onHistory={() => setHistoryModal(p)}
                  onDuplicate={() => duplicateProduct(p)}
                  onToggleFavorite={() => toggleFavorite(p.id)}
                />
              ))}
            </div>
          )}

          {selectMode && selectedIds.length > 0 && (
            <button onClick={() => setLabelsModal(true)} style={sx.labelsFab}>
              <Tag size={17} />
              Imprimir {selectedIds.length} etiqueta{selectedIds.length === 1 ? "" : "s"}
            </button>
          )}
        </main>
      )}

      {view === "reports" && (
        <ReportsView
          stats={stats} products={products} movements={movements}
          lowStockProducts={lowStockProducts} topMoved={topMoved}
          storeConfig={storeConfig}
          onGoToBackup={() => setView("accounting")}
        />
      )}

      {view === "accounting" && (
        <AccountingView
          products={products}
          movements={movements}
          expenses={expenses}
          storeConfig={storeConfig}
          onAddExpense={() => setExpenseModal({})}
          onEditExpense={(e) => setExpenseModal(e)}
          onDeleteExpense={(e) => setConfirmDeleteExpense(e)}
          onImportBackup={() => setImportModal(true)}
          onBackupExported={(date) => setStoreConfig((cfg) => ({ ...cfg, lastBackupDate: date }))}
          onImportProducts={() => setImportProductsModal(true)}
        />
      )}

      {view === "store" && (
        <StoreView
          products={products}
          storeConfig={storeConfig}
          onOpenSettings={() => setStoreSettingsModal(true)}
        />
      )}

      {view === "settings" && (
        <SettingsView
          storeConfig={storeConfig}
          onSave={(cfg) => { setStoreConfig(cfg); showToast("Configuración guardada"); }}
          onOpenStoreSettings={() => setStoreSettingsModal(true)}
        />
      )}

      {view === "customers" && (
        <CustomersView
          customers={customers}
          movements={movements}
          onAddCustomer={() => setCustomerModal({})}
          onEditCustomer={(c) => setCustomerModal(c)}
          onDeleteCustomer={(c) => setConfirmDeleteCustomer(c)}
          onRegisterPayment={(c) => setPaymentModal(c)}
        />
      )}

      {productModal !== null && (
        <ProductModal
          initial={productModal}
          onClose={() => setProductModal(null)}
          onSave={upsertProduct}
          onScanRequest={() => { setScannerTarget("product-form"); setScannerOpen(true); }}
        />
      )}

      {movementModal && (
        <MovementModal
          data={movementModal}
          onClose={() => setMovementModal(null)}
          onConfirm={(qty, extra) => registerMovement(movementModal.product, movementModal.type, qty, extra)}
        />
      )}

      {historyModal && (
        <HistoryModal
          product={historyModal}
          movements={movements.filter((m) => m.productId === historyModal.id)}
          onClose={() => setHistoryModal(null)}
          onReprint={(sale) => setLastSale(sale)}
        />
      )}

      {expenseModal !== null && (
        <ExpenseModal
          initial={expenseModal}
          onClose={() => setExpenseModal(null)}
          onSave={upsertExpense}
        />
      )}

      {saleModal && (
        <SaleModal
          products={products}
          customers={customers}
          onClose={() => setSaleModal(false)}
          onConfirm={registerSale}
          onScanRequest={() => { setScannerTarget("sale"); setScannerOpen(true); }}
        />
      )}

      {storeSettingsModal && (
        <StoreSettingsModal
          initial={storeConfig}
          onClose={() => setStoreSettingsModal(false)}
          onSave={(cfg) => { setStoreConfig(cfg); setStoreSettingsModal(false); showToast("Configuración de tienda guardada"); }}
        />
      )}

      {labelsModal && (
        <LabelsModal
          products={products.filter((p) => selectedIds.includes(p.id))}
          onClose={() => setLabelsModal(false)}
        />
      )}

      {importModal && (
        <ImportBackupModal
          onClose={() => setImportModal(false)}
          onConfirm={restoreBackup}
        />
      )}

      {importProductsModal && (
        <ImportProductsModal
          products={products}
          onClose={() => setImportProductsModal(false)}
          onConfirm={applyProductImport}
        />
      )}

      {closeDayModal && (
        <CloseDayModal
          products={products}
          movements={movements}
          expenses={expenses}
          onClose={() => setCloseDayModal(false)}
        />
      )}

      {lastSale && (
        <ReceiptModal
          sale={lastSale}
          storeConfig={storeConfig}
          onClose={() => setLastSale(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Eliminar producto"
          message={`¿Seguro que querés eliminar "${confirmDelete.name}"? También se borrará su historial de movimientos.`}
          confirmLabel="Eliminar"
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => deleteProduct(confirmDelete.id)}
        />
      )}

      {confirmDeleteExpense && (
        <ConfirmModal
          title="Eliminar gasto"
          message={`¿Seguro que querés eliminar el gasto "${confirmDeleteExpense.category}" de ${formatMoney(confirmDeleteExpense.amount)}?`}
          confirmLabel="Eliminar"
          onCancel={() => setConfirmDeleteExpense(null)}
          onConfirm={() => deleteExpense(confirmDeleteExpense.id)}
        />
      )}

      {customerModal !== null && (
        <CustomerModal
          initial={customerModal}
          onClose={() => setCustomerModal(null)}
          onSave={(data) => { upsertCustomer(data); setCustomerModal(null); }}
        />
      )}

      {confirmDeleteCustomer && (
        <ConfirmModal
          title="Eliminar cliente"
          message={`¿Seguro que querés eliminar a "${confirmDeleteCustomer.name}"? Esto no borra sus ventas fiadas anteriores, solo la ficha del cliente.`}
          confirmLabel="Eliminar"
          onCancel={() => setConfirmDeleteCustomer(null)}
          onConfirm={() => { deleteCustomer(confirmDeleteCustomer.id); setConfirmDeleteCustomer(null); }}
        />
      )}

      {paymentModal && (
        <DebtPaymentModal
          customer={paymentModal}
          movements={movements}
          onClose={() => setPaymentModal(null)}
          onConfirm={(amount, note) => { registerDebtPayment(paymentModal.id, amount, note); setPaymentModal(null); }}
        />
      )}

      {scannerOpen && (
        <ScannerModal
          onClose={() => setScannerOpen(false)}
          onResult={(code) => {
            setScannerOpen(false);
            if (scannerTarget === "lookup") {
              const found = findByBarcode(code);
              if (found) {
                setSearch(found.barcode);
                showToast(`Encontrado: ${found.name}`);
              } else {
                showToast("No se encontró ningún producto con ese código", "warn");
              }
            } else if (scannerTarget === "product-form") {
              window.__inv_scanned_barcode = code;
              window.dispatchEvent(new CustomEvent("barcode-scanned", { detail: code }));
            } else if (scannerTarget === "sale") {
              window.dispatchEvent(new CustomEvent("barcode-scanned-sale", { detail: code }));
            }
          }}
        />
      )}

      {toast && <Toast toast={toast} />}
    </div>
    </CategoryContext.Provider>
  );
}

/* ----------------------------------------------------------------------
   Header
---------------------------------------------------------------------- */
function Header({ saving, view, setView, lowCount, hasSeasonAlert, onNewSale, onCloseDay, storeConfig }) {
  return (
    <header style={sx.header}>
      <div style={sx.headerInner}>
        <div style={sx.brand}>
          <div style={sx.brandMark}>
            {storeConfig.logoUrl ? (
              <img src={storeConfig.logoUrl} alt="Logo" style={sx.brandLogo} />
            ) : (
              <Package size={20} color={COLORS.white} />
            )}
          </div>
          <div>
            <div style={sx.brandTitle}>{storeConfig.storeName || BRAND_NAME}</div>
            <div style={sx.brandSub}>Inventario y mercadería</div>
          </div>
        </div>

        <button onClick={onNewSale} style={sx.newSaleBtn}>
          <ShoppingBag size={16} /> Nueva venta
        </button>

        <button onClick={onCloseDay} style={sx.closeDayBtn} title="Cierre de caja del día">
          <ClipboardCheck size={16} /> Cierre del día
        </button>

        <nav style={sx.nav}>
          <button
            onClick={() => setView("inventory")}
            style={{ ...sx.navBtn, ...(view === "inventory" ? sx.navBtnActive : {}) }}
          >
            <Package size={16} /> Inventario
          </button>
          <button
            onClick={() => setView("accounting")}
            style={{ ...sx.navBtn, ...(view === "accounting" ? sx.navBtnActive : {}) }}
          >
            <Wallet size={16} /> Contabilidad
          </button>
          <button
            onClick={() => setView("reports")}
            style={{ ...sx.navBtn, ...(view === "reports" ? sx.navBtnActive : {}) }}
          >
            <BarChart3 size={16} /> Reportes
            {lowCount > 0 && <span style={sx.navBadge}>{lowCount}</span>}
            {lowCount === 0 && hasSeasonAlert && <span style={sx.navDot} />}
          </button>
          <button
            onClick={() => setView("store")}
            style={{ ...sx.navBtn, ...(view === "store" ? sx.navBtnActive : {}) }}
          >
            <Globe size={16} /> Ver tienda
          </button>
          <button
            onClick={() => setView("customers")}
            style={{ ...sx.navBtn, ...(view === "customers" ? sx.navBtnActive : {}) }}
          >
            <Users size={16} /> Clientes
          </button>
          <button
            onClick={() => setView("settings")}
            style={{ ...sx.navBtn, ...(view === "settings" ? sx.navBtnActive : {}) }}
          >
            <Settings size={16} /> Configuración
          </button>
        </nav>

        <div style={sx.saveIndicator}>
          {saving ? (
            <>
              <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} />
              Guardando
            </>
          ) : (
            <>
              <Check size={13} />
              Guardado
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* ----------------------------------------------------------------------
   Toolbar
---------------------------------------------------------------------- */
function Toolbar({ search, setSearch, categoryFilter, setCategoryFilter, lowStockOnly, setLowStockOnly, lowCount, onAdd, onScan, selectMode, onToggleSelectMode }) {
  const { categoryList, categoryMeta } = useCat();
  return (
    <div style={sx.toolbar}>
      <div style={sx.searchBox}>
        <Search size={16} color={COLORS.inkSoft} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, código o proveedor..."
          style={sx.searchInput}
        />
        {search && (
          <button onClick={() => setSearch("")} style={sx.searchClear} aria-label="Limpiar búsqueda">
            <X size={14} />
          </button>
        )}
      </div>

      <button onClick={onScan} style={sx.scanBtn} title="Escanear código de barras">
        <ScanLine size={17} />
      </button>

      <button
        onClick={onToggleSelectMode}
        style={{ ...sx.scanBtn, background: selectMode ? COLORS.ink : COLORS.white, color: selectMode ? COLORS.white : COLORS.ink }}
        title="Seleccionar para imprimir etiquetas"
      >
        <Tag size={17} />
      </button>

      <div style={sx.chipRow}>
        <Chip active={categoryFilter === "Todas"} onClick={() => setCategoryFilter("Todas")} color={COLORS.ink}>
          Todas
        </Chip>
        {categoryList.map((cat) => {
          const c = cat.name;
          const meta = categoryMeta[c] || { color: "#999", soft: "#eee" };
          return (
            <Chip key={c} active={categoryFilter === c} onClick={() => setCategoryFilter(c)} color={meta.color}>
              {c}
            </Chip>
          );
        })}
        <Chip
          active={lowStockOnly}
          onClick={() => setLowStockOnly((v) => !v)}
          color={COLORS.danger}
          icon={<AlertTriangle size={12} />}
        >
          Stock bajo {lowCount > 0 ? `(${lowCount})` : ""}
        </Chip>
      </div>

      {selectMode ? (
        <div style={sx.selectModeHint}>Tocá los productos para seleccionarlos</div>
      ) : (
        <button onClick={onAdd} style={sx.addBtn}>
          <Plus size={16} /> Nuevo producto
        </button>
      )}
    </div>
  );
}

function Chip({ active, onClick, color, children, icon }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...sx.chip,
        borderColor: active ? color : COLORS.line,
        background: active ? color : COLORS.white,
        color: active ? COLORS.white : COLORS.inkSoft,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

/* ----------------------------------------------------------------------
   Stat row
---------------------------------------------------------------------- */
function StatRow({ stats }) {
  const items = [
    { label: "Productos distintos", value: stats.totalSkus },
    { label: "Unidades en stock", value: stats.totalUnits },
    { label: "Valor al costo", value: formatMoney(stats.totalValueCost) },
    { label: "Valor a precio venta", value: formatMoney(stats.totalValuePrice) },
  ];
  return (
    <div style={sx.statRow}>
      {items.map((it) => (
        <div key={it.label} style={sx.statCard}>
          <div style={sx.statValue}>{it.value}</div>
          <div style={sx.statLabel}>{it.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------------
   Product Card
---------------------------------------------------------------------- */
function ProductCard({ product, onIn, onOut, onEdit, onDelete, onHistory, onDuplicate, onToggleFavorite, selectMode, selected, onToggleSelect }) {
  const { categoryMeta } = useCat();
  const meta = categoryMeta[product.category] || { color: COLORS.ink, soft: COLORS.line };
  const low = product.stock <= product.minStock;

  if (selectMode) {
    return (
      <button
        onClick={onToggleSelect}
        style={{
          ...sx.card, ...sx.cardSelectable,
          borderColor: selected ? COLORS.coral : COLORS.line,
          background: selected ? COLORS.coralSoft : COLORS.white,
        }}
      >
        <div style={sx.cardTop}>
          <div style={{ ...sx.catBadge, background: meta.soft, color: meta.color }}>
            {product.category}
          </div>
          <div style={{ ...sx.checkCircle, background: selected ? COLORS.coral : COLORS.white, borderColor: selected ? COLORS.coral : COLORS.line }}>
            {selected && <Check size={13} color={COLORS.white} />}
          </div>
        </div>
        <div style={sx.cardName}>{product.name}</div>
      {product.subgroup && <div style={{ fontSize: 11, color: COLORS.inkSoft, fontStyle: "italic", marginBottom: 2 }}>{product.subgroup}</div>}
        <div style={sx.cardBarcode}>{product.barcode}</div>
        <div style={sx.cardMetrics}>
          <div>
            <div style={sx.cardMetricLabel}>Stock</div>
            <div style={{ ...sx.cardMetricValue, color: low ? COLORS.danger : COLORS.ink }}>{product.stock}</div>
          </div>
          <div>
            <div style={sx.cardMetricLabel}>Precio</div>
            <div style={sx.cardMetricValue}>{formatMoney(product.price)}</div>
            {product.wholesalePrice > 0 && <div style={{ fontSize: 11, color: COLORS.inkSoft }}>May: {formatMoney(product.wholesalePrice)}</div>}
          </div>
        </div>
      </button>
    );
  }

  return (
    <div style={{ ...sx.card, borderColor: low ? COLORS.danger : COLORS.line }}>
      <div style={sx.cardTop}>
        <div style={{ ...sx.catBadge, background: meta.soft, color: meta.color }}>
          {product.category}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {low && (
            <div style={sx.lowBadge}>
              <AlertTriangle size={12} /> Stock bajo
            </div>
          )}
          <button
            onClick={onToggleFavorite}
            style={{ ...sx.favoriteBtn, color: product.isFavorite ? COLORS.gold : COLORS.line }}
            title={product.isFavorite ? "Quitar de favoritos" : "Marcar como favorito (venta rápida)"}
          >
            <Star size={16} fill={product.isFavorite ? COLORS.gold : "none"} />
          </button>
        </div>
      </div>

      <div style={sx.cardName}>{product.name}</div>
      {product.subgroup && <div style={{ fontSize: 11, color: COLORS.inkSoft, fontStyle: "italic", marginBottom: 2 }}>{product.subgroup}</div>}
      <div style={sx.cardBarcode}>{product.barcode}</div>
      {product.supplier && (
        <div style={sx.cardSupplier}>
          <Truck size={11} /> {product.supplier}
        </div>
      )}
      {product.notes && (
        <div style={sx.cardNotes} title={product.notes}>
          <StickyNote size={11} /> {product.notes}
        </div>
      )}

      <div style={sx.cardMetrics}>
        <div>
          <div style={sx.cardMetricLabel}>Stock</div>
          <div style={{ ...sx.cardMetricValue, color: low ? COLORS.danger : COLORS.ink }}>{product.stock}</div>
        </div>
        <div>
          <div style={sx.cardMetricLabel}>Mínimo</div>
          <div style={sx.cardMetricValue}>{product.minStock}</div>
        </div>
        <div>
          <div style={sx.cardMetricLabel}>Precio</div>
          <div style={sx.cardMetricValue}>{formatMoney(product.price)}</div>
        </div>
      </div>

      <div style={sx.cardActions}>
        <button onClick={onIn} style={{ ...sx.iconBtn, color: COLORS.teal }} title="Registrar entrada">
          <ArrowDownCircle size={17} />
        </button>
        <button onClick={onOut} style={{ ...sx.iconBtn, color: COLORS.coral }} title="Registrar salida">
          <ArrowUpCircle size={17} />
        </button>
        <button onClick={onHistory} style={sx.iconBtn} title="Ver historial">
          <History size={17} />
        </button>
        <button onClick={onEdit} style={sx.iconBtn} title="Editar">
          <Edit3 size={16} />
        </button>
        <button onClick={onDuplicate} style={sx.iconBtn} title="Duplicar (para variantes de color, talle, etc.)">
          <Copy size={15} />
        </button>
        <button onClick={onDelete} style={{ ...sx.iconBtn, color: COLORS.danger }} title="Eliminar">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------
   Empty state
---------------------------------------------------------------------- */
function EmptyState({ hasProducts, onAdd }) {
  return (
    <div style={sx.empty}>
      <Package size={34} color={COLORS.line} />
      <div style={sx.emptyTitle}>
        {hasProducts ? "Ningún producto coincide con el filtro" : "Todavía no cargaste productos"}
      </div>
      <div style={sx.emptyText}>
        {hasProducts
          ? "Probá cambiar la búsqueda o el filtro de categoría."
          : "Empezá agregando el primer producto de tu local."}
      </div>
      {!hasProducts && (
        <button onClick={onAdd} style={sx.addBtn}>
          <Plus size={16} /> Agregar producto
        </button>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------
   Modal genérico (overlay)
---------------------------------------------------------------------- */
function ModalShell({ onClose, children, width = 440 }) {
  return (
    <div style={sx.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...sx.modal, maxWidth: width }}>{children}</div>
    </div>
  );
}

/* ----------------------------------------------------------------------
   Product Modal (crear / editar)
---------------------------------------------------------------------- */
function ProductModal({ initial, onClose, onSave, onScanRequest }) {
  const isEdit = !!initial.id;
  const { categoryList, categoryMeta } = useCat();
  const [form, setForm] = useState({
    id: initial.id || null,
    name: initial.name || "",
    category: initial.category || '',
    barcode: initial.barcode || "",
    cost: initial.cost ?? "",
    price: initial.price ?? "",
    wholesalePrice: initial.wholesalePrice ?? "",
    stock: initial.stock ?? ",
    minStock: initial.minStock ?? "",
    imageUrl: initial.imageUrl || "",
    supplier: initial.supplier || "",
    notes: initial.notes || "",
    subgroup: initial.subgroup || "",
  });
  const [errors, setErrors] = useState({});
  const [imageError, setImageError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const formTopRef = useRef(null);

  useEffect(() => {
    function handler(e) {
      setForm((f) => ({ ...f, barcode: e.detail }));
    }
    window.addEventListener("barcode-scanned", handler);
    return () => window.removeEventListener("barcode-scanned", handler);
  }, []);

  function update(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    try {
      const errs = {};
      if (!form.name.trim()) errs.name = "Ingresá un nombre";
      if (form.price !== "" && Number(form.price) < 0) errs.price = "El precio no puede ser negativo";
      if (form.cost !== "" && Number(form.cost) < 0) errs.cost = "El costo no puede ser negativo";
      if (form.stock !== "" && Number(form.stock) < 0) errs.stock = "El stock no puede ser negativo";
      if (Object.keys(errs).length) {
        setErrors(errs);
        if (formTopRef.current) formTopRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      onSave(form);
    } catch (err) {
      setErrors({ general: `Error inesperado: ${err.message}` });
      console.error("Error en handleSubmit de ProductModal:", err);
    }
  }

  const errorList = Object.values(errors);

  return (
    <ModalShell onClose={onClose} width={480}>
      <div style={sx.modalHeader}>
        <div style={sx.modalTitle}>{isEdit ? "Editar producto" : "Nuevo producto"}</div>
        <button onClick={onClose} style={sx.modalClose}><X size={18} /></button>
      </div>

      <div ref={formTopRef} />
      {errorList.length > 0 && (
        <div style={sx.errorBanner}>
          <AlertCircle size={15} />
          <span>{errorList.join(" · ")}</span>
        </div>
      )}

      <div style={sx.form}>
        <Field label="Nombre del producto" error={errors.name}>
          <input
            autoFocus
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            style={sx.input}
            placeholder="Ej: Muñeca articulada 30cm"
          />
        </Field>

        <Field label="Categoría">
          <div style={sx.segmented}>
            {categoryList.map((cat) => {
              const c = cat.name;
              const meta = categoryMeta[c] || { color: '#999', soft: '#eee' };
              const active = form.category === c;
              return (
                <button
                  type="button"
                  key={c}
                  onClick={() => update("category", c)}
                  style={{
                    ...sx.segmentBtn,
                    background: active ? meta.color : "transparent",
                    color: active ? COLORS.white : COLORS.inkSoft,
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Código de barras">
          <div style={sx.barcodeRow}>
            <input
              value={form.barcode}
              onChange={(e) => update("barcode", e.target.value)}
              style={{ ...sx.input, flex: 1 }}
              placeholder="Se genera uno si lo dejás vacío"
            />
            <button type="button" onClick={onScanRequest} style={sx.scanInlineBtn} title="Escanear">
              <Camera size={16} />
            </button>
          </div>
        </Field>

        <Field label="Foto del producto (opcional, para la tienda online)">
          <div style={sx.productImageRow}>
            {form.imageUrl && (
              <div style={sx.productImagePreview}>
                <img src={form.imageUrl} alt="Vista previa" style={sx.productImagePreviewImg} />
                <button
                  type="button"
                  onClick={() => update("imageUrl", "")}
                  style={sx.productImageRemove}
                  title="Quitar foto"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <div style={sx.productImageActions}>
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                style={sx.btnGhost}
              >
                <Camera size={14} style={{ marginRight: 6 }} />
                Tomar foto con la cámara
              </button>
              <input
                value={form.imageUrl && form.imageUrl.startsWith("data:") ? "" : form.imageUrl}
                onChange={(e) => update("imageUrl", e.target.value)}
                style={sx.input}
                placeholder="...o pegá una URL de imagen (https://...)"
              />
            </div>
          </div>
          {imageError && (
            <div style={{ ...sx.errorBanner, marginTop: 8 }}>
              <AlertCircle size={15} />
              <span>{imageError}</span>
            </div>
          )}
        </Field>

        <Field label="Proveedor (solo uso interno, no se muestra al cliente)">
          <input
            value={form.supplier}
            onChange={(e) => update("supplier", e.target.value)}
            style={sx.input}
            placeholder="Ej: Distribuidora Juguetex"
          />
        </Field>

        <Field label="Notas internas (opcional, solo para vos)">
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            style={{ ...sx.input, minHeight: 64, resize: "vertical", fontFamily: "inherit" }}
            placeholder="Ej: viene en 3 colores, este es el rojo. El cliente X siempre pregunta por este."
          />
        </Field>

        <div style={sx.row2}>
          <Field label="Costo">
            <input
              type="number" min="0" step="1"
              value={form.cost}
              onChange={(e) => update("cost", e.target.value)}
              style={sx.input}
              placeholder="0"
            />
          </Field>
          <Field label="Precio de venta">
            <input
              type="number" min="0" step="1"
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
              style={sx.input}
              placeholder="0"
            />
          </Field>
        </div>

        <div style={sx.row2}>
          <Field label={isEdit ? "Stock actual" : "Stock inicial"}>
            <input
              type="number" min="0" step="1"
              value={form.stock}
              onChange={(e) => update("stock", e.target.value)}
              style={sx.input}
              placeholder="0"
            />
          </Field>
          <Field label="Stock mínimo">
            <input
              type="number" min="0" step="1"
              value={form.minStock}
              onChange={(e) => update("minStock", e.target.value)}
              style={sx.input}
              placeholder="0"
            />
          </Field>
        </div>

        {isEdit && (
          <div style={sx.hint}>
            Para sumar o restar stock usá las flechas de entrada / salida en la tarjeta del producto — así queda
            registrado en el historial.
          </div>
        )}

        <div style={sx.modalActions}>
          <button type="button" onClick={onClose} style={sx.btnGhost}>Cancelar</button>
          <button type="button" onClick={handleSubmit} style={sx.btnPrimary}>{isEdit ? "Guardar cambios" : "Crear producto"}</button>
        </div>
      </div>

      {cameraOpen && (
        <PhotoCaptureModal
          onClose={() => setCameraOpen(false)}
          onCapture={(dataUrl) => { update("imageUrl", dataUrl); setCameraOpen(false); }}
        />
      )}
    </ModalShell>
  );
}

function Field({ label, error, children }) {
  return (
    <label style={sx.field}>
      <span style={sx.fieldLabel}>{label}</span>
      {children}
      {error && <span style={sx.fieldError}>{error}</span>}
    </label>
  );
}

/* ----------------------------------------------------------------------
   Movement Modal (entrada / salida)
---------------------------------------------------------------------- */
function MovementModal({ data, onClose, onConfirm }) {
  const { type, product } = data;
  const isIn = type === "in";
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("venta");
  const [unitPrice, setUnitPrice] = useState(product.price);
  const [paymentMethod, setPaymentMethod] = useState("efectivo");

  function submit(e) {
    e.preventDefault();
    if (isIn) {
      onConfirm(qty, { note });
    } else {
      onConfirm(qty, {
        note, reason,
        unitPrice: reason === "venta" ? unitPrice : undefined,
        paymentMethod: reason === "venta" ? paymentMethod : undefined,
      });
    }
  }

  const resultStock = isIn
    ? product.stock + (Number(qty) || 0)
    : product.stock - (Number(qty) || 0);

  const saleTotal = (Number(qty) || 0) * (Number(unitPrice) || 0);

  return (
    <ModalShell onClose={onClose} width={420}>
      <div style={sx.modalHeader}>
        <div style={{ ...sx.modalTitle, color: isIn ? COLORS.teal : COLORS.coral }}>
          {isIn ? <ArrowDownCircle size={19} /> : <ArrowUpCircle size={19} />}
          {isIn ? "Entrada de mercadería" : "Salida de mercadería"}
        </div>
        <button onClick={onClose} style={sx.modalClose}><X size={18} /></button>
      </div>

      <div style={sx.movementProduct}>{product.name}</div>
      <div style={sx.movementCurrentStock}>Stock actual: <b>{product.stock}</b> unidades</div>

      <div style={sx.form}>
        <Field label="Cantidad">
          <input
            autoFocus
            type="number" min="1" step="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            style={sx.input}
          />
        </Field>

        {!isIn && (
          <Field label="Motivo de la salida">
            <div style={sx.segmented}>
              {OUT_REASON_KEYS.map((key) => {
                const meta = OUT_REASONS[key];
                const active = reason === key;
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setReason(key)}
                    style={{
                      ...sx.segmentBtn,
                      display: "flex", alignItems: "center", gap: 5,
                      background: active ? meta.color : "transparent",
                      color: active ? COLORS.white : COLORS.inkSoft,
                    }}
                  >
                    <meta.icon size={13} /> {meta.label}
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        {!isIn && reason === "venta" && (
          <Field label="Precio de venta unitario (editable, ej. por descuento)">
            <input
              type="number" min="0" step="1"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              style={sx.input}
            />
          </Field>
        )}

        {!isIn && reason === "venta" && (
          <Field label="Medio de pago">
            <div style={sx.segmented}>
              {PAYMENT_METHOD_KEYS.map((key) => {
                const meta = PAYMENT_METHODS[key];
                const active = paymentMethod === key;
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setPaymentMethod(key)}
                    style={{
                      ...sx.segmentBtn,
                      display: "flex", alignItems: "center", gap: 5,
                      background: active ? COLORS.ink : "transparent",
                      color: active ? COLORS.white : COLORS.inkSoft,
                    }}
                  >
                    <meta.icon size={13} /> {meta.label}
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        <Field label={isIn ? "Motivo (opcional, ej: compra a proveedor)" : "Nota (opcional)"}>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={sx.input}
            placeholder={isIn ? "Compra, devolución..." : "Detalle adicional..."}
          />
        </Field>

        <div style={{
          ...sx.resultPreview,
          color: resultStock < 0 ? COLORS.danger : COLORS.ink,
        }}>
          Stock resultante: <b>{resultStock < 0 ? "—" : resultStock}</b> unidades
          {resultStock < 0 && " (no hay suficiente stock)"}
          {!isIn && reason === "venta" && resultStock >= 0 && (
            <div style={{ marginTop: 4 }}>Total de la venta: <b>{formatMoney(saleTotal)}</b></div>
          )}
        </div>

        <div style={sx.modalActions}>
          <button type="button" onClick={onClose} style={sx.btnGhost}>Cancelar</button>
          <button
            type="button"
            onClick={submit}
            style={{ ...sx.btnPrimary, background: isIn ? COLORS.teal : COLORS.coral }}
            disabled={resultStock < 0}
          >
            Confirmar {isIn ? "entrada" : "salida"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ----------------------------------------------------------------------
   Sale Modal — "caja registradora": agregar varios productos y cobrar todo junto
---------------------------------------------------------------------- */
function SaleModal({ products, customers, onClose, onConfirm, onScanRequest, onAddCustomer }) {
  const { categoryMeta: saleMeta } = useCat();
  const [query, setQuery] = useState("");
  const [lines, setLines] = useState([]); // [{ product, qty, unitPrice }]
  const [paymentMethod, setPaymentMethod] = useState("efectivo");
  const [customerId, setCustomerId] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    function handler(e) {
      addByBarcode(e.detail);
    }
    window.addEventListener("barcode-scanned-sale", handler);
    return () => window.removeEventListener("barcode-scanned-sale", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, lines]);

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => p.stock > 0 && (p.name.toLowerCase().includes(q) || p.barcode.includes(q)))
      .slice(0, 6);
  }, [query, products]);

  const favorites = useMemo(
    () => products.filter((p) => p.isFavorite && p.stock > 0).slice(0, 10),
    [products]
  );

  function addProduct(product) {
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map((l) => (l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...prev, { product, qty: 1, unitPrice: product.price, isWholesale: false }];
    });
    setQuery("");
    if (inputRef.current) inputRef.current.focus();
  }

  function addByBarcode(code) {
    const found = products.find((p) => p.barcode === code.trim());
    if (found) {
      if (found.stock <= 0) return;
      addProduct(found);
    }
  }

  function updateQty(productId, qty) {
    const n = Math.max(0, Number(qty) || 0);
    setLines((prev) =>
      prev
        .map((l) => (l.product.id === productId ? { ...l, qty: Math.min(n, l.product.stock) } : l))
        .filter((l) => l.qty > 0)
    );
  }

  function updatePrice(productId, price) {
    setLines((prev) => prev.map((l) => (l.product.id === productId ? { ...l, unitPrice: Number(price) || 0 } : l)));
  }

  function removeLine(productId) {
    setLines((prev) => prev.filter((l) => l.product.id !== productId));
  }

  function toggleWholesale(productId) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.product.id !== productId) return l;
        const goWholesale = !l.isWholesale && l.product.wholesalePrice > 0;
        return { ...l, isWholesale: goWholesale, unitPrice: goWholesale ? l.product.wholesalePrice : l.product.price };
      })
    );
  }

  const total = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const totalUnits = lines.reduce((s, l) => s + l.qty, 0);

  function handleConfirm() {
    onConfirm(lines, paymentMethod, paymentMethod === "fiado" ? customerId : undefined);
  }

  const needsCustomer = paymentMethod === "fiado" && !customerId;

  return (
    <ModalShell onClose={onClose} width={520}>
      <div style={sx.modalHeader}>
        <div style={sx.modalTitle}><ShoppingBag size={18} /> Nueva venta</div>
        <button onClick={onClose} style={sx.modalClose}><X size={18} /></button>
      </div>

      {favorites.length > 0 && (
        <div style={sx.favoritesGrid}>
          {favorites.map((p) => (
            <button key={p.id} onClick={() => addProduct(p)} style={sx.favoriteChip}>
              <Star size={11} fill={COLORS.gold} color={COLORS.gold} />
              <span style={sx.favoriteChipName}>{p.name}</span>
              <span style={sx.favoriteChipPrice}>{formatMoney(p.price)}</span>
            </button>
          ))}
        </div>
      )}

      <div style={sx.saleSearchRow}>
        <div style={sx.searchBox}>
          <Search size={16} color={COLORS.inkSoft} />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar producto por nombre o código..."
            style={sx.searchInput}
          />
        </div>
        <button onClick={onScanRequest} style={sx.scanBtn} title="Escanear código de barras">
          <ScanLine size={17} />
        </button>
      </div>

      {matches.length > 0 && (
        <div style={sx.saleMatches}>
          {matches.map((p) => {
            const meta = (saleMeta || {})[p.category] || { color: "#999", soft: "#eee" };
            return (
              <button key={p.id} onClick={() => addProduct(p)} style={sx.saleMatchRow}>
                <div style={{ ...sx.catBadge, background: meta.soft, color: meta.color, flexShrink: 0 }}>
                  {p.category}
                </div>
                <span style={sx.saleMatchName}>{p.name}</span>
                <span style={sx.saleMatchStock}>{p.stock} en stock</span>
                <span style={sx.saleMatchPrice}>{formatMoney(p.price)}</span>
              </button>
            );
          })}
        </div>
      )}

      <div style={sx.saleLines}>
        {lines.length === 0 ? (
          <div style={sx.emptyText}>Buscá o escaneá productos para agregarlos a la venta.</div>
        ) : (
          lines.map((l) => (
            <div key={l.product.id} style={{ ...sx.saleLineRow, flexWrap: "wrap", gap: 6 }}>
              <div style={{ ...sx.saleLineName, flex: "1 1 100%" }}>
                {l.product.name}
                {l.product.wholesalePrice > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleWholesale(l.product.id)}
                    style={{
                      marginLeft: 8, fontSize: 11, padding: "2px 7px", borderRadius: 6, border: "none", cursor: "pointer",
                      background: l.isWholesale ? COLORS.teal : COLORS.line,
                      color: l.isWholesale ? COLORS.white : COLORS.inkSoft,
                      fontWeight: 600,
                    }}
                  >
                    {l.isWholesale ? "May ✓" : "May"}
                  </button>
                )}
              </div>
              <input
                type="number" min="1" max={l.product.stock} step="1"
                value={l.qty}
                onChange={(e) => updateQty(l.product.id, e.target.value)}
                style={sx.saleQtyInput}
              />
              <input
                type="number" min="0" step="1"
                value={l.unitPrice}
                onChange={(e) => updatePrice(l.product.id, e.target.value)}
                style={sx.salePriceInput}
              />
              <div style={sx.saleLineSubtotal}>{formatMoney(l.qty * l.unitPrice)}</div>
              <button onClick={() => removeLine(l.product.id)} style={sx.saleRemoveBtn} title="Quitar">
                <X size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {lines.length > 0 && (
        <>
          <div style={sx.paymentMethodLabel}>Medio de pago</div>
          <div style={sx.segmented}>
            {PAYMENT_METHOD_KEYS.map((key) => {
              const meta = PAYMENT_METHODS[key];
              const active = paymentMethod === key;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setPaymentMethod(key)}
                  style={{
                    ...sx.segmentBtn,
                    display: "flex", alignItems: "center", gap: 5,
                    background: active ? COLORS.ink : "transparent",
                    color: active ? COLORS.white : COLORS.inkSoft,
                  }}
                >
                  <meta.icon size={13} /> {meta.label}
                </button>
              );
            })}
          </div>

          {paymentMethod === "fiado" && (
            <div style={{ marginTop: 10 }}>
              <div style={sx.paymentMethodLabel}>Cliente</div>
              {customers.length === 0 ? (
                <div style={sx.hint}>
                  Todavía no cargaste ningún cliente. Andá a la pestaña Clientes para agregar uno antes de fiar una venta.
                </div>
              ) : (
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  style={sx.input}
                >
                  <option value="">Elegí un cliente...</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div style={sx.saleFootRow}>
            <span style={sx.saleFootLabel}>{lines.length} producto(s) · {totalUnits} unidad(es)</span>
            <span style={sx.saleFootTotal}>{formatMoney(total)}</span>
          </div>
        </>
      )}

      <div style={sx.modalActions}>
        <button type="button" onClick={onClose} style={sx.btnGhost}>Cancelar</button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={lines.length === 0 || needsCustomer}
          style={{ ...sx.btnPrimary, background: COLORS.coral, opacity: (lines.length === 0 || needsCustomer) ? 0.5 : 1 }}
        >
          {paymentMethod === "fiado" ? "Confirmar venta fiada" : "Confirmar venta"} — {formatMoney(total)}
        </button>
      </div>
    </ModalShell>
  );
}

/* ----------------------------------------------------------------------
   History Modal
---------------------------------------------------------------------- */
function HistoryModal({ product, movements, onClose, onReprint }) {
  const sorted = [...movements].sort((a, b) => new Date(b.date) - new Date(a.date));
  return (
    <ModalShell onClose={onClose} width={460}>
      <div style={sx.modalHeader}>
        <div style={sx.modalTitle}><History size={18} /> Historial</div>
        <button onClick={onClose} style={sx.modalClose}><X size={18} /></button>
      </div>
      <div style={sx.movementProduct}>{product.name}</div>

      <div style={sx.historyList}>
        {sorted.length === 0 && <div style={sx.emptyText}>Todavía no hay movimientos registrados.</div>}
        {sorted.map((m) => {
          const reasonMeta = m.reason ? OUT_REASONS[m.reason] : null;
          const isSale = m.type === "out" && m.reason === "venta" && m.unitPrice !== undefined;
          return (
            <div key={m.id} style={sx.historyItem}>
              <div style={{
                ...sx.historyIcon,
                color: m.type === "in" ? COLORS.teal : COLORS.coral,
                background: m.type === "in" ? COLORS.tealSoft : COLORS.coralSoft,
              }}>
                {m.type === "in" ? <ArrowDownCircle size={15} /> : <ArrowUpCircle size={15} />}
              </div>
              <div style={sx.historyInfo}>
                <div style={sx.historyTop}>
                  <span>
                    {m.type === "in" ? "Entrada" : reasonMeta ? reasonMeta.label : "Salida"} de {m.qty} u.
                  </span>
                  <span style={sx.historyDate}>{formatDate(m.date)}</span>
                </div>
                {isSale && (
                  <div style={sx.historyNote}>
                    {formatMoney(m.unitPrice)} c/u · Total {formatMoney(m.unitPrice * m.qty)}
                    {m.paymentMethod && ` · ${PAYMENT_METHODS[m.paymentMethod]?.label || m.paymentMethod}`}
                  </div>
                )}
                {m.note && <div style={sx.historyNote}>{m.note}</div>}
                {isSale && (
                  <button
                    onClick={() => onReprint({
                      date: m.date,
                      items: [{ name: product.name, qty: m.qty, unitPrice: m.unitPrice }],
                      total: m.unitPrice * m.qty,
                      paymentMethod: m.paymentMethod,
                    })}
                    style={sx.reprintBtn}
                  >
                    <Printer size={12} /> Imprimir ticket
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}

/* ----------------------------------------------------------------------
   Confirm Modal
---------------------------------------------------------------------- */
function ConfirmModal({ title, message, confirmLabel, onCancel, onConfirm }) {
  return (
    <ModalShell onClose={onCancel} width={380}>
      <div style={sx.modalHeader}>
        <div style={{ ...sx.modalTitle, color: COLORS.danger }}>
          <AlertCircle size={18} /> {title}
        </div>
        <button onClick={onCancel} style={sx.modalClose}><X size={18} /></button>
      </div>
      <div style={sx.confirmMessage}>{message}</div>
      <div style={sx.modalActions}>
        <button onClick={onCancel} style={sx.btnGhost}>Cancelar</button>
        <button onClick={onConfirm} style={{ ...sx.btnPrimary, background: COLORS.danger }}>{confirmLabel}</button>
      </div>
    </ModalShell>
  );
}

/* ----------------------------------------------------------------------
   Expense Modal (crear / editar gasto)
---------------------------------------------------------------------- */
function ExpenseModal({ initial, onClose, onSave }) {
  const isEdit = !!initial.id;
  const [form, setForm] = useState({
    id: initial.id || null,
    category: initial.category || EXPENSE_CATEGORIES[0],
    amount: initial.amount ?? "",
    note: initial.note || "",
    date: initial.date ? initial.date.slice(0, 10) : new Date().toISOString().slice(0, 10),
  });
  const [error, setError] = useState("");

  function update(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (form.amount === "" || Number(form.amount) <= 0) {
      setError("Ingresá un monto válido");
      return;
    }
    onSave({ ...form, date: new Date(form.date).toISOString() });
  }

  return (
    <ModalShell onClose={onClose} width={420}>
      <div style={sx.modalHeader}>
        <div style={sx.modalTitle}><Receipt size={18} /> {isEdit ? "Editar gasto" : "Nuevo gasto"}</div>
        <button onClick={onClose} style={sx.modalClose}><X size={18} /></button>
      </div>

      <div style={sx.form}>
        <Field label="Categoría">
          <div style={sx.segmented}>
            {EXPENSE_CATEGORIES.map((c) => {
              const active = form.category === c;
              return (
                <button
                  type="button"
                  key={c}
                  onClick={() => update("category", c)}
                  style={{
                    ...sx.segmentBtn,
                    background: active ? COLORS.ink : "transparent",
                    color: active ? COLORS.white : COLORS.inkSoft,
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Monto" error={error}>
          <input
            autoFocus
            type="number" min="0" step="1"
            value={form.amount}
            onChange={(e) => update("amount", e.target.value)}
            style={sx.input}
            placeholder="0"
          />
        </Field>

        <Field label="Fecha">
          <input
            type="date"
            value={form.date}
            onChange={(e) => update("date", e.target.value)}
            style={sx.input}
          />
        </Field>

        <Field label="Detalle (opcional)">
          <input
            value={form.note}
            onChange={(e) => update("note", e.target.value)}
            style={sx.input}
            placeholder="Ej: alquiler de junio"
          />
        </Field>

        <div style={sx.modalActions}>
          <button type="button" onClick={onClose} style={sx.btnGhost}>Cancelar</button>
          <button type="button" onClick={handleSubmit} style={sx.btnPrimary}>{isEdit ? "Guardar cambios" : "Registrar gasto"}</button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ----------------------------------------------------------------------
   Import Backup Modal — restaurar desde un archivo de respaldo JSON
---------------------------------------------------------------------- */
function ImportBackupModal({ onClose, onConfirm }) {
  const [pending, setPending] = useState(null); // datos parseados, esperando confirmación
  const [error, setError] = useState("");

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = parseBackupFile(reader.result);
        setPending(data);
        setError("");
      } catch (err) {
        setError("No se pudo leer el archivo. Asegurate de elegir un respaldo exportado desde esta misma app.");
        setPending(null);
      }
    };
    reader.onerror = () => setError("No se pudo leer el archivo.");
    reader.readAsText(file);
  }

  if (pending) {
    return (
      <ModalShell onClose={onClose} width={420}>
        <div style={sx.modalHeader}>
          <div style={{ ...sx.modalTitle, color: COLORS.danger }}>
            <AlertCircle size={18} /> Confirmar restauración
          </div>
          <button onClick={onClose} style={sx.modalClose}><X size={18} /></button>
        </div>
        <div style={sx.confirmMessage}>
          Este archivo contiene <b>{pending.products.length}</b> productos, <b>{pending.movements.length}</b> movimientos
          y <b>{pending.expenses.length}</b> gastos. Al restaurar, se va a <b>reemplazar todo</b> lo que tenés
          cargado ahora en la app — esta acción no se puede deshacer. Si tenés dudas, cancelá y hacé primero un
          respaldo de tus datos actuales.
        </div>
        <div style={sx.modalActions}>
          <button type="button" onClick={onClose} style={sx.btnGhost}>Cancelar</button>
          <button type="button" onClick={() => onConfirm(pending)} style={{ ...sx.btnPrimary, background: COLORS.danger }}>
            Sí, reemplazar todo
          </button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose} width={420}>
      <div style={sx.modalHeader}>
        <div style={sx.modalTitle}><Upload size={18} /> Restaurar respaldo</div>
        <button onClick={onClose} style={sx.modalClose}><X size={18} /></button>
      </div>
      <div style={sx.hint}>
        Elegí un archivo de respaldo (.json) que hayas descargado antes con "Respaldo completo". Al restaurarlo se
        reemplazan todos los datos actuales de la app.
      </div>
      {error && (
        <div style={{ ...sx.errorBanner, marginTop: 12 }}>
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}
      <label style={{ ...sx.btnGhost, width: "100%", marginTop: 14, justifyContent: "center", display: "flex", position: "relative", cursor: "pointer" }}>
        <Upload size={15} style={{ marginRight: 6 }} /> Elegir archivo de respaldo
        <input type="file" accept="application/json" onChange={handleFileChange} style={sx.hiddenFileInput} />
      </label>
      <div style={sx.modalActions}>
        <button type="button" onClick={onClose} style={sx.btnGhost}>Cancelar</button>
      </div>
    </ModalShell>
  );
}

/* ----------------------------------------------------------------------
   Import Products Modal — importar/actualizar productos desde CSV
   (exportado desde Excel o Google Sheets)
---------------------------------------------------------------------- */
function ImportProductsModal({ products, onClose, onConfirm }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseImportCSV(reader.result, products);
        if (parsed.toCreate.length === 0 && parsed.toUpdate.length === 0) {
          setError("No se encontró ninguna fila válida para importar. Revisá que el archivo tenga al menos una columna 'Nombre'.");
          setResult(null);
        } else {
          setResult(parsed);
          setError("");
        }
      } catch (err) {
        setError(err.message || "No se pudo leer el archivo.");
        setResult(null);
      }
    };
    reader.onerror = () => setError("No se pudo leer el archivo.");
    reader.readAsText(file);
  }

  if (result) {
    return (
      <ModalShell onClose={onClose} width={460}>
        <div style={sx.modalHeader}>
          <div style={sx.modalTitle}><FileSpreadsheet size={18} /> Confirmar importación</div>
          <button onClick={onClose} style={sx.modalClose}><X size={18} /></button>
        </div>

        <div style={sx.confirmMessage}>
          Se leyeron <b>{result.totalRows}</b> filas. Se van a crear <b>{result.toCreate.length}</b> productos
          nuevos{result.toUpdate.length > 0 && <> y actualizar <b>{result.toUpdate.length}</b> existentes (por
          coincidencia de código de barras)</>}.
          {result.skipped.length > 0 && (
            <> Se omitieron {result.skipped.length} fila{result.skipped.length === 1 ? "" : "s"} sin nombre.</>
          )}
        </div>

        {result.toCreate.length > 0 && (
          <>
            <div style={sx.closeDaySubtitle}>Se van a crear</div>
            <div style={{ ...sx.historyList, maxHeight: 180 }}>
              {result.toCreate.slice(0, 20).map((p, i) => (
                <div key={i} style={sx.closeDayItemRow}>
                  <span style={sx.saleLineName}>{p.name}</span>
                  <span style={sx.closeDayItemQty}>{p.category}</span>
                  <span style={sx.saleLineSubtotal}>{formatMoney(p.price)}</span>
                </div>
              ))}
              {result.toCreate.length > 20 && (
                <div style={sx.emptyText}>...y {result.toCreate.length - 20} más.</div>
              )}
            </div>
          </>
        )}

        <div style={sx.modalActions}>
          <button type="button" onClick={onClose} style={sx.btnGhost}>Cancelar</button>
          <button type="button" onClick={() => onConfirm(result)} style={sx.btnPrimary}>
            Confirmar importación
          </button>
        </div>
      </ModalShell>
    );
  }

  return (
    <ModalShell onClose={onClose} width={440}>
      <div style={sx.modalHeader}>
        <div style={sx.modalTitle}><FileSpreadsheet size={18} /> Importar desde planilla</div>
        <button onClick={onClose} style={sx.modalClose}><X size={18} /></button>
      </div>
      <div style={sx.hint}>
        Subí un archivo CSV exportado desde Excel o Google Sheets (Archivo → Descargar → Valores separados por
        comas). La primera fila debe tener encabezados como: <b>Nombre, Categoría, Código de barras, Costo,
        Precio, Stock, Stock mínimo, Proveedor</b> (no hace falta tener todas las columnas, solo "Nombre" es
        obligatoria). Si el código de barras coincide con uno existente, se actualiza ese producto en vez de
        crear uno repetido.
      </div>
      {error && (
        <div style={{ ...sx.errorBanner, marginTop: 12 }}>
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}
      <label style={{ ...sx.btnGhost, width: "100%", marginTop: 14, justifyContent: "center", display: "flex", position: "relative", cursor: "pointer" }}>
        <Upload size={15} style={{ marginRight: 6 }} /> Elegir archivo CSV
        <input type="file" accept=".csv,text/csv" onChange={handleFileChange} style={sx.hiddenFileInput} />
      </label>
      <div style={sx.modalActions}>
        <button type="button" onClick={onClose} style={sx.btnGhost}>Cancelar</button>
      </div>
    </ModalShell>
  );
}

/* ----------------------------------------------------------------------
   Close Day Modal — cierre de caja diario (ritual de fin de jornada)
---------------------------------------------------------------------- */
function CloseDayModal({ products, movements, expenses, onClose }) {
  const today = useMemo(() => {
    const now = new Date();
    return { dateStr: now.toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long" }) };
  }, []);

  const productById = useMemo(() => {
    const map = {};
    for (const p of products) map[p.id] = p;
    return map;
  }, [products]);

  const todaySales = useMemo(
    () => movements.filter((m) => m.type === "out" && m.reason === "venta" && inPeriod(m.date, "today")),
    [movements]
  );
  const todayLosses = useMemo(
    () => movements.filter((m) => m.type === "out" && (m.reason === "rotura" || m.reason === "perdida") && inPeriod(m.date, "today")),
    [movements]
  );
  const todayExpenses = useMemo(() => expenses.filter((e) => inPeriod(e.date, "today")), [expenses]);

  const summary = useMemo(() => {
    let revenue = 0, cogs = 0, units = 0;
    const byProduct = {};
    for (const m of todaySales) {
      const p = productById[m.productId];
      const price = m.unitPrice !== undefined ? m.unitPrice : (p ? p.price : 0);
      revenue += price * m.qty;
      cogs += (p ? p.cost : 0) * m.qty;
      units += m.qty;
      if (p) {
        byProduct[p.id] = byProduct[p.id] || { name: p.name, qty: 0, total: 0 };
        byProduct[p.id].qty += m.qty;
        byProduct[p.id].total += price * m.qty;
      }
    }
    const expensesTotal = todayExpenses.reduce((s, e) => s + e.amount, 0);
    const lossValue = todayLosses.reduce((s, m) => {
      const p = productById[m.productId];
      return s + (p ? p.cost : 0) * m.qty;
    }, 0);
    const grossProfit = revenue - cogs;
    const netProfit = grossProfit - expensesTotal;
    const items = Object.values(byProduct).sort((a, b) => b.total - a.total);
    return { revenue, cogs, grossProfit, expensesTotal, netProfit, units, lossValue, items, salesCount: todaySales.length };
  }, [todaySales, todayExpenses, todayLosses, productById]);

  return (
    <ModalShell onClose={onClose} width={460}>
      <div style={sx.modalHeader}>
        <div style={sx.modalTitle}><ClipboardCheck size={18} /> Cierre del día</div>
        <button onClick={onClose} style={sx.modalClose}><X size={18} /></button>
      </div>
      <div style={sx.closeDayDate}>{today.dateStr}</div>

      <div style={sx.closeDayBigRow}>
        <div style={sx.closeDayBigCard}>
          <div style={sx.closeDayBigValue}>{formatMoney(summary.revenue)}</div>
          <div style={sx.closeDayBigLabel}>Vendido hoy</div>
        </div>
        <div style={sx.closeDayBigCard}>
          <div style={{ ...sx.closeDayBigValue, color: summary.netProfit >= 0 ? COLORS.teal : COLORS.danger }}>
            {formatMoney(summary.netProfit)}
          </div>
          <div style={sx.closeDayBigLabel}>Ganancia neta del día</div>
        </div>
      </div>

      <div style={sx.summaryList}>
        <div style={sx.summaryRow}><span>Operaciones de venta</span><b>{summary.salesCount}</b></div>
        <div style={sx.summaryRow}><span>Unidades vendidas</span><b>{summary.units}</b></div>
        <div style={sx.summaryRow}><span>Ganancia bruta</span><b>{formatMoney(summary.grossProfit)}</b></div>
        <div style={sx.summaryRow}><span>Gastos de hoy</span><b>{formatMoney(summary.expensesTotal)}</b></div>
        {summary.lossValue > 0 && (
          <div style={sx.summaryRow}>
            <span style={{ color: COLORS.danger }}>Pérdida por roturas/mermas</span>
            <b style={{ color: COLORS.danger }}>{formatMoney(summary.lossValue)}</b>
          </div>
        )}
      </div>

      {summary.items.length > 0 && (
        <>
          <div style={sx.closeDaySubtitle}>Qué se vendió hoy</div>
          <div style={sx.historyList}>
            {summary.items.map((item, i) => (
              <div key={i} style={sx.closeDayItemRow}>
                <span style={sx.saleLineName}>{item.name}</span>
                <span style={sx.closeDayItemQty}>{item.qty} u.</span>
                <span style={sx.saleLineSubtotal}>{formatMoney(item.total)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {summary.salesCount === 0 && (
        <div style={sx.emptyText}>Todavía no se registró ninguna venta hoy.</div>
      )}

      <div style={sx.modalActions}>
        <button type="button" onClick={onClose} style={sx.btnPrimary}>Cerrar</button>
      </div>
    </ModalShell>
  );
}

/* ----------------------------------------------------------------------
   Receipt Modal — ticket de venta imprimible (pensado para impresora
   térmica angosta de 58/80mm, pero también imprime bien en hoja normal)
---------------------------------------------------------------------- */
function ReceiptModal({ sale, storeConfig, onClose }) {
  function handlePrint() {
    window.print();
  }

  function handleDownload() {
    const canvas = drawReceiptToCanvas(sale, storeConfig.storeName);
    downloadCanvasAsPNG(canvas, `ticket-${todayStamp()}.png`);
  }

  return (
    <div style={sx.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={sx.receiptModalShell}>
        <div className="no-print" style={sx.modalHeader}>
          <div style={{ ...sx.modalTitle, color: COLORS.teal }}>
            <Check size={18} /> Venta confirmada
          </div>
          <button onClick={onClose} style={sx.modalClose}><X size={18} /></button>
        </div>

        <div className="receipt-print-area" style={sx.receiptPaper}>
          <div style={sx.receiptStoreName}>{storeConfig.storeName}</div>
          <div style={sx.receiptDate}>{formatDate(sale.date)}</div>
          <div style={sx.receiptDivider} />
          {sale.items.map((item, i) => (
            <div key={i} style={sx.receiptLine}>
              <div style={sx.receiptItemName}>{item.qty} x {item.name}</div>
              <div style={sx.receiptItemPrice}>{formatMoney(item.qty * item.unitPrice)}</div>
            </div>
          ))}
          <div style={sx.receiptDivider} />
          <div style={sx.receiptTotalLine}>
            <span>TOTAL</span>
            <span>{formatMoney(sale.total)}</span>
          </div>
          {sale.paymentMethod && (
            <div style={sx.receiptPayment}>
              Pago: {PAYMENT_METHODS[sale.paymentMethod]?.label || sale.paymentMethod}
            </div>
          )}
          <div style={sx.receiptFooter}>¡Gracias por tu compra!</div>
        </div>

        <div className="no-print" style={sx.modalActions}>
          <button type="button" onClick={onClose} style={sx.btnGhost}>Cerrar</button>
          <button type="button" onClick={handleDownload} style={sx.btnPrimary}>
            <Download size={15} style={{ marginRight: 6 }} /> Descargar ticket como imagen
          </button>
        </div>
        <div className="no-print" style={{ ...sx.modalActions, marginTop: 4 }}>
          <button type="button" onClick={handlePrint} style={{ ...sx.btnGhost, fontSize: 12, padding: "8px 14px" }}>
            <Printer size={13} style={{ marginRight: 5 }} /> Probar imprimir directo (si tu navegador lo soporta)
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------
   Labels Modal — etiquetas imprimibles (nombre + precio)
---------------------------------------------------------------------- */
function LabelsModal({ products, onClose }) {
  function handlePrint() {
    window.print();
  }

  function handleDownload() {
    const canvas = drawLabelsToCanvas(products, BRAND_NAME);
    downloadCanvasAsPNG(canvas, `etiquetas-${todayStamp()}.png`);
  }

  return (
    <div style={sx.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={sx.labelsModalShell}>
        <div className="no-print" style={sx.modalHeader}>
          <div style={sx.modalTitle}><Tag size={18} /> Etiquetas para imprimir</div>
          <button onClick={onClose} style={sx.modalClose}><X size={18} /></button>
        </div>

        <div className="no-print" style={sx.hint}>
          {products.length} etiqueta{products.length === 1 ? "" : "s"} lista{products.length === 1 ? "" : "s"}.
          Si "Imprimir" no abre nada en tu dispositivo, usá "Descargar como imagen" y compartila a tu app de
          impresión, o imprimila desde Google Fotos / Drive.
        </div>

        <div className="labels-print-area" style={sx.labelsGrid}>
          {products.map((p) => (
            <div key={p.id} className="label-item" style={sx.labelItem}>
              <div style={sx.labelName}>{p.name}</div>
              <div style={sx.labelPrice}>{formatMoney(p.price)}</div>
              <div style={sx.labelBrand}>{BRAND_NAME}</div>
            </div>
          ))}
        </div>

        <div className="no-print" style={sx.modalActions}>
          <button type="button" onClick={onClose} style={sx.btnGhost}>Cerrar</button>
          <button type="button" onClick={handleDownload} style={sx.btnPrimary}>
            <Download size={15} style={{ marginRight: 6 }} /> Descargar como imagen
          </button>
        </div>
        <div className="no-print" style={{ ...sx.modalActions, marginTop: 4 }}>
          <button type="button" onClick={handlePrint} style={{ ...sx.btnGhost, fontSize: 12, padding: "8px 14px" }}>
            <Printer size={13} style={{ marginRight: 5 }} /> Probar imprimir directo (si tu navegador lo soporta)
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------
   Photo Capture Modal — captura de foto vía cámara (getUserMedia), como
   alternativa a <input type="file"> que algunos navegadores embebidos
   bloquean sin avisar.
---------------------------------------------------------------------- */
function PhotoCaptureModal({ onClose, onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [status, setStatus] = useState("starting"); // starting | ready | unsupported | error

  useEffect(() => {
    let cancelled = false;
    async function start() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus("unsupported");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("ready");
      } catch (e) {
        setStatus("error");
      }
    }
    start();
    return () => {
      cancelled = true;
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function takePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    onCapture(dataUrl);
  }

  return (
    <ModalShell onClose={onClose} width={420}>
      <div style={sx.modalHeader}>
        <div style={sx.modalTitle}><Camera size={18} /> Tomar foto</div>
        <button onClick={onClose} style={sx.modalClose}><X size={18} /></button>
      </div>

      {status === "ready" || status === "starting" ? (
        <div style={sx.scannerVideoWrap}>
          <video ref={videoRef} style={sx.scannerVideo} muted playsInline />
          {status === "starting" && (
            <div style={sx.scannerOverlayText}>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Iniciando cámara...
            </div>
          )}
        </div>
      ) : (
        <div style={sx.scannerFallback}>
          {status === "unsupported"
            ? "Tu navegador no soporta el acceso a la cámara. Probá pegando una URL de imagen en su lugar."
            : "No se pudo acceder a la cámara. Revisá los permisos en la configuración del navegador, o pegá una URL de imagen en su lugar."}
        </div>
      )}

      <div style={sx.modalActions}>
        <button type="button" onClick={onClose} style={sx.btnGhost}>Cancelar</button>
        <button type="button" onClick={takePhoto} style={sx.btnPrimary} disabled={status !== "ready"}>
          <Camera size={15} style={{ marginRight: 6 }} /> Capturar foto
        </button>
      </div>
    </ModalShell>
  );
}

/* ----------------------------------------------------------------------
   Scanner Modal — usa cámara via getUserMedia + BarcodeDetector si existe,
   con fallback de ingreso manual.
---------------------------------------------------------------------- */
function ScannerModal({ onClose, onResult }) {
  const videoRef = useRef(null);
  const [manual, setManual] = useState("");
  const [status, setStatus] = useState("starting"); // starting | scanning | unsupported | error
  const streamRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!("BarcodeDetector" in window)) {
        setStatus("unsupported");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("scanning");
        const detector = new window.BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"],
        });
        const tick = async () => {
          if (cancelled) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes && codes.length > 0) {
              onResult(codes[0].rawValue);
              return;
            }
          } catch (e) {
            /* frame no listo, seguimos */
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e) {
        setStatus("error");
      }
    }
    start();

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);

  function submitManual(e) {
    e.preventDefault();
    if (manual.trim()) onResult(manual.trim());
  }

  return (
    <ModalShell onClose={onClose} width={420}>
      <div style={sx.modalHeader}>
        <div style={sx.modalTitle}><ScanLine size={18} /> Escanear código</div>
        <button onClick={onClose} style={sx.modalClose}><X size={18} /></button>
      </div>

      {status === "scanning" || status === "starting" ? (
        <div style={sx.scannerVideoWrap}>
          <video ref={videoRef} style={sx.scannerVideo} muted playsInline />
          <div style={sx.scannerFrame} />
          {status === "starting" && (
            <div style={sx.scannerOverlayText}>
              <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Iniciando cámara...
            </div>
          )}
        </div>
      ) : (
        <div style={sx.scannerFallback}>
          {status === "unsupported"
            ? "Tu navegador no soporta lectura de cámara automática. Si tenés un lector de código de barras USB, podés escanear directamente acá abajo (funciona como un teclado)."
            : "No se pudo acceder a la cámara. Revisá los permisos o ingresá el código manualmente, o usá un lector USB."}
        </div>
      )}

      <div style={{ ...sx.form, marginTop: 14 }}>
        <Field label="O ingresá / escaneá el código acá">
          <input
            autoFocus={status !== "scanning"}
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            style={sx.input}
            placeholder="Código de barras"
          />
        </Field>
        <div style={sx.modalActions}>
          <button type="button" onClick={onClose} style={sx.btnGhost}>Cancelar</button>
          <button type="button" onClick={submitManual} style={sx.btnPrimary}>Usar código</button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ----------------------------------------------------------------------
   Accounting view — ventas, costos, ganancia y gastos
---------------------------------------------------------------------- */
const PERIODS = [
  { key: "today", label: "Hoy" },
  { key: "week", label: "Esta semana" },
  { key: "month", label: "Este mes" },
  { key: "all", label: "Todo" },
];

function inPeriod(dateIso, period) {
  const d = new Date(dateIso);
  const now = new Date();
  if (period === "today") {
    return d.toDateString() === now.toDateString();
  }
  if (period === "week") {
    const weekAgo = new Date(now.getTime() - 7 * 86400000);
    return d >= weekAgo;
  }
  if (period === "month") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  return true; // "all"
}

function AccountingView({ products, movements, expenses, storeConfig, onAddExpense, onEditExpense, onDeleteExpense, onImportBackup, onBackupExported, onImportProducts }) {
  const [period, setPeriod] = useState("month");

  const productById = useMemo(() => {
    const map = {};
    for (const p of products) map[p.id] = p;
    return map;
  }, [products]);

  const periodSales = useMemo(
    () => movements.filter((m) => m.type === "out" && m.reason === "venta" && inPeriod(m.date, period)),
    [movements, period]
  );
  const periodLosses = useMemo(
    () => movements.filter((m) => m.type === "out" && (m.reason === "rotura" || m.reason === "perdida") && inPeriod(m.date, period)),
    [movements, period]
  );
  const periodExpenses = useMemo(
    () => expenses.filter((e) => inPeriod(e.date, period)),
    [expenses, period]
  );

  const totals = useMemo(() => {
    let revenue = 0, cogs = 0, units = 0;
    for (const m of periodSales) {
      const product = productById[m.productId];
      const price = m.unitPrice !== undefined ? m.unitPrice : (product ? product.price : 0);
      revenue += price * m.qty;
      cogs += (product ? product.cost : 0) * m.qty;
      units += m.qty;
    }
    const grossProfit = revenue - cogs;
    const totalExpenses = periodExpenses.reduce((s, e) => s + e.amount, 0);
    const netProfit = grossProfit - totalExpenses;
    const lossValue = periodLosses.reduce((s, m) => {
      const product = productById[m.productId];
      return s + (product ? product.cost : 0) * m.qty;
    }, 0);
    const avgTicket = periodSales.length ? revenue / periodSales.length : 0;
    return { revenue, cogs, grossProfit, totalExpenses, netProfit, units, lossValue, avgTicket, salesCount: periodSales.length };
  }, [periodSales, periodExpenses, periodLosses, productById]);

  // Serie diaria para el gráfico (últimos 14 días o todo el mes según período)
  const dailySeries = useMemo(() => {
    const days = period === "today" ? 1 : period === "week" ? 7 : 14;
    const buckets = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      buckets.push({ key: d.toDateString(), label: d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }), total: 0 });
    }
    const map = {};
    buckets.forEach((b) => (map[b.key] = b));
    for (const m of movements) {
      if (m.type !== "out" || m.reason !== "venta") continue;
      const key = new Date(m.date).toDateString();
      if (!map[key]) continue;
      const product = productById[m.productId];
      const price = m.unitPrice !== undefined ? m.unitPrice : (product ? product.price : 0);
      map[key].total += price * m.qty;
    }
    return buckets;
  }, [movements, productById, period]);
  const maxDaily = Math.max(1, ...dailySeries.map((d) => d.total));

  const expensesByCategory = useMemo(() => {
    const map = {};
    for (const e of periodExpenses) map[e.category] = (map[e.category] || 0) + e.amount;
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [periodExpenses]);

  const sortedExpenses = useMemo(
    () => [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 12),
    [expenses]
  );

  return (
    <main style={sx.main}>
      <div style={sx.periodRow}>
        {PERIODS.map((p) => (
          <Chip key={p.key} active={period === p.key} onClick={() => setPeriod(p.key)} color={COLORS.ink}>
            {p.label}
          </Chip>
        ))}
      </div>

      <div style={sx.statRow}>
        <div style={sx.statCard}>
          <div style={sx.statValue}>{formatMoney(totals.revenue)}</div>
          <div style={sx.statLabel}>Ventas ({totals.units} u. · {totals.salesCount} operaciones)</div>
        </div>
        <div style={sx.statCard}>
          <div style={{ ...sx.statValue, color: COLORS.teal }}>{formatMoney(totals.grossProfit)}</div>
          <div style={sx.statLabel}>Ganancia bruta (venta − costo merc.)</div>
        </div>
        <div style={sx.statCard}>
          <div style={sx.statValue}>{formatMoney(totals.totalExpenses)}</div>
          <div style={sx.statLabel}>Gastos generales</div>
        </div>
        <div style={sx.statCard}>
          <div style={{ ...sx.statValue, color: totals.netProfit >= 0 ? COLORS.teal : COLORS.danger }}>
            {formatMoney(totals.netProfit)}
          </div>
          <div style={sx.statLabel}>Ganancia neta</div>
        </div>
      </div>

      <div style={sx.reportsGrid}>
        <section style={{ ...sx.panel, gridColumn: "1 / -1" }}>
          <div style={sx.panelTitle}><TrendingUp size={16} /> Evolución de ventas</div>
          <div style={sx.chartWrap}>
            {dailySeries.map((d) => (
              <div key={d.key} style={sx.chartCol} title={`${d.label}: ${formatMoney(d.total)}`}>
                <div style={sx.chartBarTrack}>
                  <div style={{ ...sx.chartBarFill, height: `${(d.total / maxDaily) * 100}%` }} />
                </div>
                <div style={sx.chartLabel}>{d.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={sx.panel}>
          <div style={sx.panelTitle}><Wallet size={16} /> Resumen del período</div>
          <div style={sx.summaryList}>
            <div style={sx.summaryRow}><span>Ticket promedio</span><b>{formatMoney(totals.avgTicket)}</b></div>
            <div style={sx.summaryRow}><span>Costo de mercadería vendida</span><b>{formatMoney(totals.cogs)}</b></div>
            <div style={sx.summaryRow}>
              <span style={{ color: COLORS.danger }}>Pérdida por roturas/mermas</span>
              <b style={{ color: COLORS.danger }}>{formatMoney(totals.lossValue)}</b>
            </div>
          </div>
        </section>

        <section style={sx.panel}>
          <div style={sx.panelTitle}><Receipt size={16} /> Gastos por categoría</div>
          {expensesByCategory.length === 0 ? (
            <div style={sx.emptyText}>No hay gastos registrados en este período.</div>
          ) : (
            <div style={sx.summaryList}>
              {expensesByCategory.map(([cat, amount]) => (
                <div key={cat} style={sx.summaryRow}><span>{cat}</span><b>{formatMoney(amount)}</b></div>
              ))}
            </div>
          )}
        </section>

        <section style={{ ...sx.panel, gridColumn: "1 / -1" }}>
          <div style={sx.panelTitleRow}>
            <div style={sx.panelTitle}><CalendarDays size={16} /> Gastos registrados</div>
            <button onClick={onAddExpense} style={sx.addBtnSmall}>
              <Plus size={14} /> Nuevo gasto
            </button>
          </div>
          {sortedExpenses.length === 0 ? (
            <div style={sx.emptyText}>Todavía no registraste ningún gasto. Sumá alquiler, servicios, sueldos, etc.</div>
          ) : (
            <div style={sx.expenseList}>
              {sortedExpenses.map((e) => (
                <div key={e.id} style={sx.expenseRow}>
                  <div style={sx.expenseCat}>{e.category}</div>
                  <div style={sx.expenseNote}>{e.note}</div>
                  <div style={sx.expenseDate}>{formatDate(e.date)}</div>
                  <div style={sx.expenseAmount}>{formatMoney(e.amount)}</div>
                  <div style={sx.expenseActions}>
                    <button onClick={() => onEditExpense(e)} style={sx.iconBtn} title="Editar">
                      <Edit3 size={14} />
                    </button>
                    <button onClick={() => onDeleteExpense(e)} style={{ ...sx.iconBtn, color: COLORS.danger }} title="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={{ ...sx.panel, gridColumn: "1 / -1" }}>
          <div style={sx.panelTitle}><Download size={16} /> Exportar y respaldo</div>
          <div style={sx.lastBackupNote}>
            {storeConfig.lastBackupDate
              ? `Último respaldo descargado: ${formatDate(storeConfig.lastBackupDate)}`
              : "Todavía no descargaste ningún respaldo completo."}
          </div>
          <div style={sx.exportGrid}>
            <button onClick={() => exportBackupJSON(products, movements, expenses, storeConfig, onBackupExported)} style={sx.exportCard}>
              <ShieldCheck size={18} color={COLORS.teal} />
              <div>
                <div style={sx.exportCardTitle}>Respaldo completo</div>
                <div style={sx.exportCardDesc}>Descarga todo (productos, ventas, gastos) en un archivo para guardar o restaurar después.</div>
              </div>
            </button>
            <button onClick={() => exportInventoryCSV(products)} style={sx.exportCard}>
              <FileSpreadsheet size={18} color={COLORS.gold} />
              <div>
                <div style={sx.exportCardTitle}>Inventario a Excel/CSV</div>
                <div style={sx.exportCardDesc}>Lista completa de productos con stock y precios.</div>
              </div>
            </button>
            <button onClick={() => exportSalesCSV(movements, products)} style={sx.exportCard}>
              <FileSpreadsheet size={18} color={COLORS.coral} />
              <div>
                <div style={sx.exportCardTitle}>Ventas a Excel/CSV</div>
                <div style={sx.exportCardDesc}>Historial de todas las ventas registradas.</div>
              </div>
            </button>
            <button onClick={() => exportExpensesCSV(expenses)} style={sx.exportCard}>
              <FileSpreadsheet size={18} color={COLORS.inkSoft} />
              <div>
                <div style={sx.exportCardTitle}>Gastos a Excel/CSV</div>
                <div style={sx.exportCardDesc}>Listado de todos los gastos registrados.</div>
              </div>
            </button>
            <button onClick={onImportBackup} style={{ ...sx.exportCard, borderStyle: "dashed" }}>
              <Upload size={18} color={COLORS.inkSoft} />
              <div>
                <div style={sx.exportCardTitle}>Restaurar respaldo</div>
                <div style={sx.exportCardDesc}>Reemplaza los datos actuales por los de un archivo de respaldo guardado antes.</div>
              </div>
            </button>
            <button onClick={onImportProducts} style={{ ...sx.exportCard, borderStyle: "dashed" }}>
              <FileSpreadsheet size={18} color={COLORS.teal} />
              <div>
                <div style={sx.exportCardTitle}>Importar productos desde Excel/Sheets</div>
                <div style={sx.exportCardDesc}>Subí un CSV para crear o actualizar varios productos a la vez.</div>
              </div>
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

/* ----------------------------------------------------------------------
   Store View — catálogo público con carrito y pedido por WhatsApp
---------------------------------------------------------------------- */
function buildWhatsAppMessage(cart, products, storeConfig) {
  const lines = cart.map((item) => {
    const p = products.find((pr) => pr.id === item.productId);
    if (!p) return null;
    return `• ${item.qty} x ${p.name} — ${formatMoney(p.price * item.qty)}`;
  }).filter(Boolean);
  const total = cart.reduce((s, item) => {
    const p = products.find((pr) => pr.id === item.productId);
    return s + (p ? p.price * item.qty : 0);
  }, 0);
  const text = `${storeConfig.welcomeMessage}\n\n${lines.join("\n")}\n\nTotal: ${formatMoney(total)}`;
  return text;
}

function StoreView({ products, storeConfig, onOpenSettings }) {
  const { categoryList: storeCatList, categoryMeta: storeMeta } = useCat();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas");
  const [cart, setCart] = useState([]); // [{productId, qty}]
  const [cartOpen, setCartOpen] = useState(false);

  const available = useMemo(() => products.filter((p) => p.stock > 0), [products]);

  const filtered = useMemo(() => {
    let list = available;
    if (categoryFilter !== "Todas") list = list.filter((p) => p.category === categoryFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [available, categoryFilter, search]);

  function addToCart(product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map((i) => (i.productId === product.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { productId: product.id, qty: 1 }];
    });
  }

  function changeQty(productId, delta) {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.productId !== productId) return i;
          const product = products.find((p) => p.id === productId);
          const max = product ? product.stock : 99;
          return { ...i, qty: Math.min(max, Math.max(0, i.qty + delta)) };
        })
        .filter((i) => i.qty > 0)
    );
  }

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => {
    const p = products.find((pr) => pr.id === i.productId);
    return s + (p ? p.price * i.qty : 0);
  }, 0);

  function checkoutWhatsApp() {
    const message = buildWhatsAppMessage(cart, products, storeConfig);
    const url = `https://wa.me/${storeConfig.whatsappNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  }

  return (
    <main style={sx.main}>
      <div style={sx.storeHeader}>
        <div>
          <div style={sx.storeName}>{storeConfig.storeName}</div>
          <div style={sx.storeSubtitle}>Catálogo y pedidos por WhatsApp</div>
        </div>
        <button onClick={onOpenSettings} style={sx.storeSettingsBtn} title="Configurar tienda">
          <Settings size={15} /> Configurar
        </button>
      </div>

      <div style={sx.toolbar}>
        <div style={sx.searchBox}>
          <Search size={16} color={COLORS.inkSoft} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar productos..."
            style={sx.searchInput}
          />
        </div>
        <div style={sx.chipRow}>
          <Chip active={categoryFilter === "Todas"} onClick={() => setCategoryFilter("Todas")} color={COLORS.ink}>Todas</Chip>
          {storeCatList.map((cat) => (
            <Chip key={cat.name} active={categoryFilter === cat.name} onClick={() => setCategoryFilter(cat.name)} color={cat.color}>{cat.name}</Chip>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={sx.emptyText}>No hay productos disponibles con ese filtro.</div>
      ) : (
        <div style={sx.storeGrid}>
          {filtered.map((p) => {
            const meta = (saleMeta || {})[p.category] || { color: "#999", soft: "#eee" };
            const inCart = cart.find((i) => i.productId === p.id);
            return (
              <div key={p.id} style={sx.storeCard}>
                <div style={sx.storeImageWrap}>
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} style={sx.storeImage} />
                  ) : (
                    <div style={{ ...sx.storeImagePlaceholder, background: meta.soft, color: meta.color }}>
                      <Package size={30} />
                    </div>
                  )}
                </div>
                <div style={sx.storeCardBody}>
                  <div style={{ ...sx.catBadge, background: meta.soft, color: meta.color, alignSelf: "flex-start" }}>
                    {p.category}
                  </div>
                  <div style={sx.storeCardName}>{p.name}</div>
                  <div style={sx.storeCardPrice}>{formatMoney(p.price)}</div>

                  {inCart ? (
                    <div style={sx.storeQtyRow}>
                      <button onClick={() => changeQty(p.id, -1)} style={sx.storeQtyBtn}><Minus size={14} /></button>
                      <span style={sx.storeQtyValue}>{inCart.qty}</span>
                      <button onClick={() => changeQty(p.id, 1)} style={sx.storeQtyBtn} disabled={inCart.qty >= p.stock}><Plus size={14} /></button>
                    </div>
                  ) : (
                    <button onClick={() => addToCart(p)} style={sx.storeAddBtn}>
                      <Plus size={14} /> Agregar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {cartCount > 0 && !cartOpen && (
        <button onClick={() => setCartOpen(true)} style={sx.cartFab}>
          <ShoppingCart size={18} />
          <span>{cartCount} en el carrito</span>
          <span style={sx.cartFabTotal}>{formatMoney(cartTotal)}</span>
        </button>
      )}

      {cartOpen && (
        <CartDrawer
          cart={cart}
          products={products}
          onClose={() => setCartOpen(false)}
          onChangeQty={changeQty}
          onCheckout={checkoutWhatsApp}
          total={cartTotal}
        />
      )}
    </main>
  );
}

function CartDrawer({ cart, products, onClose, onChangeQty, onCheckout, total }) {
  return (
    <div style={sx.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={sx.cartDrawer}>
        <div style={sx.modalHeader}>
          <div style={sx.modalTitle}><ShoppingCart size={18} /> Tu pedido</div>
          <button onClick={onClose} style={sx.modalClose}><X size={18} /></button>
        </div>

        <div style={sx.saleLines}>
          {cart.map((item) => {
            const p = products.find((pr) => pr.id === item.productId);
            if (!p) return null;
            return (
              <div key={item.productId} style={sx.cartItemRow}>
                <div style={sx.saleLineName}>{p.name}</div>
                <div style={sx.storeQtyRow}>
                  <button onClick={() => onChangeQty(item.productId, -1)} style={sx.storeQtyBtn}><Minus size={13} /></button>
                  <span style={sx.storeQtyValue}>{item.qty}</span>
                  <button onClick={() => onChangeQty(item.productId, 1)} style={sx.storeQtyBtn} disabled={item.qty >= p.stock}><Plus size={13} /></button>
                </div>
                <div style={sx.saleLineSubtotal}>{formatMoney(p.price * item.qty)}</div>
              </div>
            );
          })}
        </div>

        <div style={sx.saleFootRow}>
          <span style={sx.saleFootLabel}>Total</span>
          <span style={sx.saleFootTotal}>{formatMoney(total)}</span>
        </div>

        <button onClick={onCheckout} style={sx.whatsappBtn}>
          <MessageCircle size={18} /> Finalizar pedido por WhatsApp
        </button>
        <div style={sx.cartHint}>Se abrirá WhatsApp con tu pedido ya armado, listo para enviar.</div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------
   Store Settings Modal
---------------------------------------------------------------------- */
function StoreSettingsModal({ initial, onClose, onSave }) {
  const [form, setForm] = useState({ ...initial });

  function update(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave(form);
  }

  return (
    <ModalShell onClose={onClose} width={440}>
      <div style={sx.modalHeader}>
        <div style={sx.modalTitle}><Settings size={18} /> Configurar tienda</div>
        <button onClick={onClose} style={sx.modalClose}><X size={18} /></button>
      </div>

      <div style={sx.form}>
        <Field label="Nombre del negocio">
          <input
            value={form.storeName}
            onChange={(e) => update("storeName", e.target.value)}
            style={sx.input}
          />
        </Field>

        <Field label="WhatsApp del negocio (código de país + número, sin + ni espacios)">
          <input
            value={form.whatsappNumber}
            onChange={(e) => update("whatsappNumber", e.target.value.replace(/[^0-9]/g, ""))}
            style={sx.input}
            placeholder="Ej: 5491122334455"
          />
        </Field>
        <div style={sx.hint}>
          Este es un número de ejemplo hasta que lo cambies. Formato: código de país + código de área sin el 0 +
          número, todo junto y sin espacios (ej. Argentina: 54 9 11 2233-4455 → 5491122334455).
        </div>

        <Field label="Mensaje de inicio del pedido">
          <input
            value={form.welcomeMessage}
            onChange={(e) => update("welcomeMessage", e.target.value)}
            style={sx.input}
          />
        </Field>

        <div style={sx.modalActions}>
          <button type="button" onClick={onClose} style={sx.btnGhost}>Cancelar</button>
          <button type="button" onClick={handleSubmit} style={sx.btnPrimary}>Guardar</button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ----------------------------------------------------------------------
   Settings View — configuración general: nombre, logo, accesos
---------------------------------------------------------------------- */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function SettingsView({ storeConfig, onSave, onOpenStoreSettings }) {
  const [storeName, setStoreName] = useState(storeConfig.storeName || "");
  const [logoUrl, setLogoUrl] = useState(storeConfig.logoUrl || "");
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [catForm, setCatForm] = useState(null);
  const [localCats, setLocalCats] = useState(storeConfig.categories || DEFAULT_CATEGORIES);

  function handleLogoCapture(dataUrl) {
    setLogoUrl(dataUrl);
    setCameraOpen(false);
  }

  function handleSaveName() {
    onSave({ ...storeConfig, storeName, logoUrl });
  }

  function handleRemoveLogo() {
    setLogoUrl("");
    onSave({ ...storeConfig, storeName, logoUrl: "" });
  }

  const hasChanges = storeName !== storeConfig.storeName || logoUrl !== storeConfig.logoUrl;

  return (
    <main style={sx.main}>
      <div style={sx.settingsHeader}>
        <div style={sx.settingsTitle}>Configuración</div>
        <div style={sx.settingsSubtitle}>Personalizá el nombre y la imagen de tu negocio</div>
      </div>

      <div style={sx.reportsGrid}>
        <section style={{ ...sx.panel, gridColumn: "1 / -1" }}>
          <div style={sx.panelTitle}><Package size={16} /> Identidad del negocio</div>

          <div style={sx.settingsLogoRow}>
            <div style={sx.settingsLogoPreview}>
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" style={sx.settingsLogoImg} />
              ) : (
                <Package size={28} color={COLORS.inkSoft} />
              )}
            </div>
            <div style={sx.settingsLogoActions}>
              <button type="button" onClick={() => setCameraOpen(true)} style={sx.btnGhost}>
                <Camera size={14} style={{ marginRight: 6 }} />
                {logoUrl ? "Cambiar logo" : "Tomar foto del logo"}
              </button>
              {logoUrl && (
                <button type="button" onClick={handleRemoveLogo} style={{ ...sx.btnGhost, color: COLORS.danger }}>
                  Quitar
                </button>
              )}
            </div>
          </div>
          {error && (
            <div style={{ ...sx.errorBanner, marginTop: 10 }}>
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}
          <div style={sx.hint}>
            El logo aparece en el encabezado de la app. Funciona mejor una imagen cuadrada, de buen tamaño y poco peso.
          </div>

          <div style={{ marginTop: 16 }}>
            <Field label="Nombre del negocio">
              <input
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                style={sx.input}
                placeholder="Ej: Punto Útil"
              />
            </Field>
          </div>

          {hasChanges && (
            <div style={sx.modalActions}>
              <button type="button" onClick={handleSaveName} style={sx.btnPrimary}>Guardar cambios</button>
            </div>
          )}
        </section>

        <section style={{ ...sx.panel, gridColumn: "1 / -1" }}>
          <div style={sx.panelTitle}><Globe size={16} /> Tienda online</div>
          <div style={sx.hint}>
            Número de WhatsApp y mensaje de pedido de la tienda pública.
          </div>
          <div style={sx.modalActions}>
            <button type="button" onClick={onOpenStoreSettings} style={sx.btnGhost}>
              <Settings size={14} style={{ marginRight: 6 }} /> Abrir configuración de la tienda
            </button>
          </div>
        </section>
      </div>


        {/* ── Gestión de rubros ── */}
        <section style={{ ...sx.panel, gridColumn: "1 / -1", marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={sx.panelTitle}><Layers size={16} /> Rubros y subgrupos</div>
            <button type="button" onClick={() => setCatForm({ id: null, name: "", color: "#E63E8C", softColor: "#FBD6E8", subgroups: [] })} style={sx.addBtnSmall}>
              <Plus size={14} /> Nuevo rubro
            </button>
          </div>

          {catForm && (
            <div style={{ background: COLORS.paperDeep, borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 10 }}>
                <Field label="Nombre del rubro">
                  <input value={catForm.name} onChange={e => setCatForm(f => ({...f, name: e.target.value}))} style={sx.input} placeholder="Ej: Descartables" />
                </Field>
                <Field label="Color">
                  <input type="color" value={catForm.color} onChange={e => setCatForm(f => ({...f, color: e.target.value, softColor: e.target.value + "33"}))} style={{ ...sx.input, height: 42, padding: 4, cursor: "pointer", width: 60 }} />
                </Field>
              </div>
              <Field label="Subgrupos (uno por línea, opcional)">
                <textarea
                  value={(catForm.subgroups || []).join("\n")}
                  onChange={e => setCatForm(f => ({...f, subgroups: e.target.value.split("\n").map(s => s.trim()).filter(Boolean)}))}
                  style={{ ...sx.input, minHeight: 70, resize: "vertical", fontFamily: "inherit" }}
                  placeholder={"Platos\nVasos\nCubiertos"}
                />
              </Field>
              <div style={sx.modalActions}>
                <button type="button" onClick={() => setCatForm(null)} style={sx.btnGhost}>Cancelar</button>
                <button type="button" onClick={() => {
                  if (!catForm.name.trim()) return;
                  if (catForm.id) {
                    setLocalCats(prev => prev.map(c => c.id === catForm.id ? {...c, ...catForm} : c));
                  } else {
                    setLocalCats(prev => [...prev, {...catForm, id: "cat_" + Date.now()}]);
                  }
                  setCatForm(null);
                }} style={sx.btnPrimary}>Guardar rubro</button>
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {localCats.map(cat => (
              <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: 10, background: COLORS.paperDeep, borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ width: 18, height: 18, borderRadius: 5, background: cat.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.ink }}>{cat.name}</div>
                  {cat.subgroups && cat.subgroups.length > 0 && (
                    <div style={{ fontSize: 12, color: COLORS.inkSoft }}>{cat.subgroups.join(" · ")}</div>
                  )}
                </div>
                <button type="button" onClick={() => setCatForm({...cat})} style={sx.iconBtn}><Edit3 size={14} /></button>
                <button type="button" onClick={() => setLocalCats(prev => prev.filter(c => c.id !== cat.id))} style={{ ...sx.iconBtn, color: COLORS.danger }}><Trash2 size={14} /></button>
              </div>
            ))}
          </div>

          <div style={sx.modalActions}>
            <button type="button" onClick={() => {
              onSave({ ...storeConfig, storeName, logoUrl, categories: localCats });
            }} style={sx.btnPrimary}>Guardar todos los cambios</button>
          </div>
        </section>

      {cameraOpen && (
        <PhotoCaptureModal
          onClose={() => setCameraOpen(false)}
          onCapture={handleLogoCapture}
        />
      )}
    </main>
  );
}

/* ----------------------------------------------------------------------
   Customers View — clientes con cuenta corriente / fiado
---------------------------------------------------------------------- */
function getCustomerBalance(customerId, movements) {
  let debt = 0;
  let paid = 0;
  for (const m of movements) {
    if (m.type === "out" && m.reason === "venta" && m.paymentMethod === "fiado" && m.customerId === customerId) {
      debt += (m.unitPrice || 0) * m.qty;
    }
    if (m.type === "debt-payment" && m.customerId === customerId) {
      paid += m.amount;
    }
  }
  return debt - paid;
}

function CustomersView({ customers, movements, onAddCustomer, onEditCustomer, onDeleteCustomer, onRegisterPayment }) {
  const [search, setSearch] = useState("");

  const customersWithBalance = useMemo(() => {
    return customers
      .map((c) => ({ ...c, balance: getCustomerBalance(c.id, movements) }))
      .filter((c) => !search.trim() || c.name.toLowerCase().includes(search.trim().toLowerCase()))
      .sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name, "es"));
  }, [customers, movements, search]);

  const totalDebt = customersWithBalance.reduce((s, c) => s + Math.max(0, c.balance), 0);

  return (
    <main style={sx.main}>
      <div style={sx.settingsHeader}>
        <div style={sx.settingsTitle}>Clientes</div>
        <div style={sx.settingsSubtitle}>Cuentas corrientes y ventas fiadas</div>
      </div>

      <div style={sx.statRow}>
        <div style={sx.statCard}>
          <div style={sx.statValue}>{customers.length}</div>
          <div style={sx.statLabel}>Clientes cargados</div>
        </div>
        <div style={sx.statCard}>
          <div style={{ ...sx.statValue, color: totalDebt > 0 ? COLORS.danger : COLORS.teal }}>
            {formatMoney(totalDebt)}
          </div>
          <div style={sx.statLabel}>Total adeudado (fiado)</div>
        </div>
      </div>

      <div style={sx.toolbar}>
        <div style={sx.searchBox}>
          <Search size={16} color={COLORS.inkSoft} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar cliente..."
            style={sx.searchInput}
          />
        </div>
        <button onClick={onAddCustomer} style={sx.addBtn}>
          <UserPlus size={16} /> Nuevo cliente
        </button>
      </div>

      {customersWithBalance.length === 0 ? (
        <div style={sx.empty}>
          <Users size={34} color={COLORS.line} />
          <div style={sx.emptyTitle}>
            {customers.length === 0 ? "Todavía no cargaste clientes" : "Ningún cliente coincide con la búsqueda"}
          </div>
          <div style={sx.emptyText}>
            {customers.length === 0 && "Agregalos para poder fiarles ventas y llevar el control de lo que te deben."}
          </div>
        </div>
      ) : (
        <div style={sx.customerList}>
          {customersWithBalance.map((c) => (
            <div key={c.id} style={sx.customerRow}>
              <div style={sx.customerInfo}>
                <div style={sx.customerName}>{c.name}</div>
                {c.phone && <div style={sx.customerPhone}>{c.phone}</div>}
              </div>
              <div style={{ ...sx.customerBalance, color: c.balance > 0 ? COLORS.danger : COLORS.teal }}>
                {c.balance > 0 ? `Debe ${formatMoney(c.balance)}` : "Sin deuda"}
              </div>
              <div style={sx.customerActions}>
                {c.balance > 0 && (
                  <button onClick={() => onRegisterPayment(c)} style={{ ...sx.iconBtn, color: COLORS.teal }} title="Registrar pago">
                    <Wallet2 size={16} />
                  </button>
                )}
                <button onClick={() => onEditCustomer(c)} style={sx.iconBtn} title="Editar">
                  <Edit3 size={16} />
                </button>
                <button onClick={() => onDeleteCustomer(c)} style={{ ...sx.iconBtn, color: COLORS.danger }} title="Eliminar">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

function CustomerModal({ initial, onClose, onSave }) {
  const isEdit = !!initial.id;
  const [form, setForm] = useState({
    id: initial.id || null,
    name: initial.name || "",
    phone: initial.phone || "",
    notes: initial.notes || "",
  });
  const [error, setError] = useState("");

  function update(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      setError("Ingresá un nombre");
      return;
    }
    onSave(form);
  }

  return (
    <ModalShell onClose={onClose} width={420}>
      <div style={sx.modalHeader}>
        <div style={sx.modalTitle}><Users size={18} /> {isEdit ? "Editar cliente" : "Nuevo cliente"}</div>
        <button onClick={onClose} style={sx.modalClose}><X size={18} /></button>
      </div>

      {error && (
        <div style={sx.errorBanner}>
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      <div style={sx.form}>
        <Field label="Nombre">
          <input
            autoFocus
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            style={sx.input}
            placeholder="Ej: Juan Pérez"
          />
        </Field>
        <Field label="Teléfono (opcional)">
          <input
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            style={sx.input}
            placeholder="Ej: 11 2233-4455"
          />
        </Field>
        <Field label="Notas (opcional)">
          <input
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            style={sx.input}
            placeholder="Ej: paga los viernes"
          />
        </Field>

        <div style={sx.modalActions}>
          <button type="button" onClick={onClose} style={sx.btnGhost}>Cancelar</button>
          <button type="button" onClick={handleSubmit} style={sx.btnPrimary}>{isEdit ? "Guardar cambios" : "Agregar cliente"}</button>
        </div>
      </div>
    </ModalShell>
  );
}

function DebtPaymentModal({ customer, movements, onClose, onConfirm }) {
  const balance = getCustomerBalance(customer.id, movements);
  const [amount, setAmount] = useState(balance);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    const n = Number(amount);
    if (!n || n <= 0) {
      setError("Ingresá un monto válido");
      return;
    }
    onConfirm(n, note);
  }

  return (
    <ModalShell onClose={onClose} width={400}>
      <div style={sx.modalHeader}>
        <div style={{ ...sx.modalTitle, color: COLORS.teal }}><Wallet2 size={18} /> Registrar pago</div>
        <button onClick={onClose} style={sx.modalClose}><X size={18} /></button>
      </div>

      <div style={sx.movementProduct}>{customer.name}</div>
      <div style={sx.movementCurrentStock}>Debe actualmente: <b>{formatMoney(balance)}</b></div>

      {error && (
        <div style={{ ...sx.errorBanner, marginTop: 10 }}>
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      <div style={sx.form}>
        <Field label="Monto a registrar como pagado">
          <input
            type="number" min="0" step="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={sx.input}
          />
        </Field>
        <Field label="Nota (opcional)">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={sx.input}
            placeholder="Ej: pago parcial en efectivo"
          />
        </Field>

        <div style={sx.modalActions}>
          <button type="button" onClick={onClose} style={sx.btnGhost}>Cancelar</button>
          <button type="button" onClick={handleSubmit} style={{ ...sx.btnPrimary, background: COLORS.teal }}>
            Confirmar pago
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

/* ----------------------------------------------------------------------
   Reports view
---------------------------------------------------------------------- */
const STALE_DAYS = 30;

function getStaleProducts(products, movements) {
  const now = new Date();
  const lastSaleByProduct = {};
  for (const m of movements) {
    if (m.type !== "out" || m.reason !== "venta") continue;
    const d = new Date(m.date);
    if (!lastSaleByProduct[m.productId] || d > lastSaleByProduct[m.productId]) {
      lastSaleByProduct[m.productId] = d;
    }
  }
  return products
    .filter((p) => p.stock > 0)
    .map((p) => {
      const lastSale = lastSaleByProduct[p.id] || null;
      const daysSince = lastSale ? Math.floor((now - lastSale) / 86400000) : null;
      const daysSinceCreated = Math.floor((now - new Date(p.createdAt)) / 86400000);
      const isStale = lastSale ? daysSince >= STALE_DAYS : daysSinceCreated >= STALE_DAYS;
      return { product: p, lastSale, daysSince: lastSale ? daysSince : daysSinceCreated, isStale };
    })
    .filter((x) => x.isStale)
    .sort((a, b) => b.daysSince - a.daysSince);
}

function ReportsView({ stats, products, movements, lowStockProducts, topMoved, storeConfig, onGoToBackup }) {
  const { categoryList: repCatList, categoryMeta: repMeta } = useCat();
  const byCategory = repCatList.map((cat) => { const c = cat.name;
    const list = products.filter((p) => p.category === c);
    return {
      category: c,
      units: list.reduce((s, p) => s + p.stock, 0),
      value: list.reduce((s, p) => s + p.stock * p.price, 0),
      skus: list.length,
    };
  });
  const maxUnits = Math.max(1, ...byCategory.map((c) => c.units));
  const maxMoved = Math.max(1, ...topMoved.map((t) => t.qty));

  const seasonAlerts = useMemo(() => getSeasonAlerts(), []);
  const activeSeasonAlerts = seasonAlerts.filter((s) => s.active);
  const staleProducts = useMemo(() => getStaleProducts(products, movements), [products, movements]);
  const staleValue = staleProducts.reduce((s, x) => s + x.product.stock * x.product.cost, 0);
  const backupDaysSince = daysSinceBackup(storeConfig.lastBackupDate);
  const showBackupReminder = backupDaysSince >= BACKUP_REMINDER_DAYS;

  return (
    <main style={sx.main}>
      <StatRow stats={stats} />

      {showBackupReminder && (
        <button onClick={onGoToBackup} style={sx.backupReminderBanner}>
          <ShieldCheck size={18} color={COLORS.inkSoft} />
          <span style={sx.backupReminderText}>
            {storeConfig.lastBackupDate
              ? `Hace ${backupDaysSince} días que no descargás un respaldo. Tocá para hacerlo ahora.`
              : "Todavía no descargaste ningún respaldo de seguridad. Tocá para hacerlo ahora."}
          </span>
        </button>
      )}

      {activeSeasonAlerts.length > 0 && (
        <div style={sx.seasonBanner}>
          <CalendarDays size={18} color={COLORS.gold} />
          <div style={sx.seasonBannerText}>
            {activeSeasonAlerts.map((s) => (
              <span key={s.key} style={sx.seasonBannerItem}>
                <b>{s.label}</b> en {s.daysUntil === 0 ? "hoy" : `${s.daysUntil} día${s.daysUntil === 1 ? "" : "s"}`}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={sx.reportsGrid}>
        <section style={sx.panel}>
          <div style={sx.panelTitle}><Package size={16} /> Stock por categoría</div>
          <div style={sx.barList}>
            {byCategory.map((c) => {
              const meta = (repMeta || {})[c.category] || { color: "#999", soft: "#eee" };
              return (
                <div key={c.category} style={sx.barRow}>
                  <div style={sx.barLabel}>{c.category}</div>
                  <div style={sx.barTrack}>
                    <div style={{ ...sx.barFill, width: `${(c.units / maxUnits) * 100}%`, background: meta.color }} />
                  </div>
                  <div style={sx.barValue}>{c.units} u. · {formatMoney(c.value)}</div>
                </div>
              );
            })}
          </div>
        </section>

        <section style={sx.panel}>
          <div style={sx.panelTitle}><TrendingUp size={16} /> Más vendidos / movidos</div>
          {topMoved.length === 0 ? (
            <div style={sx.emptyText}>Todavía no hay salidas registradas.</div>
          ) : (
            <div style={sx.barList}>
              {topMoved.map(({ product, qty }) => {
                const meta = (repMeta || {})[product.category] || { color: "#999", soft: "#eee" };
                return (
                  <div key={product.id} style={sx.barRow}>
                    <div style={sx.barLabel} title={product.name}>{product.name}</div>
                    <div style={sx.barTrack}>
                      <div style={{ ...sx.barFill, width: `${(qty / maxMoved) * 100}%`, background: meta.color }} />
                    </div>
                    <div style={sx.barValue}>{qty} u.</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section style={{ ...sx.panel, gridColumn: "1 / -1" }}>
          <div style={sx.panelTitle}><CalendarDays size={16} color={COLORS.gold} /> Próximas fechas clave</div>
          <div style={sx.seasonList}>
            {seasonAlerts.map((s) => (
              <div key={s.key} style={{ ...sx.seasonRow, opacity: s.active ? 1 : 0.55 }}>
                <div style={{ ...sx.seasonDot, background: s.active ? COLORS.gold : COLORS.line }} />
                <div style={sx.seasonName}>{s.label}</div>
                <div style={sx.seasonDate}>
                  {s.date.toLocaleDateString("es-AR", { day: "2-digit", month: "long" })}
                </div>
                <div style={{ ...sx.seasonDays, color: s.active ? COLORS.danger : COLORS.inkSoft }}>
                  {s.daysUntil === 0 ? "Es hoy" : `Faltan ${s.daysUntil} días`}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ ...sx.panel, gridColumn: "1 / -1" }}>
          <div style={sx.panelTitle}>
            <AlertCircle size={16} color={COLORS.danger} /> Mercadería sin movimiento (30+ días)
          </div>
          {staleProducts.length === 0 ? (
            <div style={sx.emptyText}>Todo tu stock tuvo ventas en los últimos 30 días. Buen ritmo.</div>
          ) : (
            <>
              <div style={sx.staleSummary}>
                {staleProducts.length} producto{staleProducts.length === 1 ? "" : "s"} estancado{staleProducts.length === 1 ? "" : "s"} ·{" "}
                <b>{formatMoney(staleValue)}</b> inmovilizados al costo
              </div>
              <div style={sx.lowList}>
                {staleProducts.map(({ product, daysSince, lastSale }) => {
                  const meta = (repMeta || {})[product.category] || { color: "#999", soft: "#eee" };
                  return (
                    <div key={product.id} style={sx.lowRow}>
                      <div style={{ ...sx.catBadge, background: meta.soft, color: meta.color }}>
                        {product.category}
                      </div>
                      <div style={sx.lowName}>{product.name}</div>
                      <div style={sx.lowStockVal}>
                        {lastSale ? `${daysSince} días sin venta` : "Nunca se vendió"} · {product.stock} u. en stock
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </section>

        <section style={{ ...sx.panel, gridColumn: "1 / -1" }}>
          <div style={sx.panelTitle}><AlertTriangle size={16} color={COLORS.danger} /> Productos con stock bajo — para reponer</div>
          {lowStockProducts.length === 0 ? (
            <div style={sx.emptyText}>Todo en orden — ningún producto está por debajo de su mínimo.</div>
          ) : (
            <div style={sx.lowList}>
              {lowStockProducts.map((p) => {
                const meta = (saleMeta || {})[p.category] || { color: "#999", soft: "#eee" };
                return (
                  <div key={p.id} style={sx.lowRow}>
                    <div style={{ ...sx.catBadge, background: meta.soft, color: meta.color }}>
                      {p.category}
                    </div>
                    <div style={sx.lowName}>
                      {p.name}
                      {p.supplier && <span style={sx.lowSupplier}><Truck size={11} /> {p.supplier}</span>}
                    </div>
                    <div style={sx.lowStockVal}>
                      <span style={{ color: COLORS.danger, fontWeight: 700 }}>{p.stock}</span> / mín. {p.minStock}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* ----------------------------------------------------------------------
   Toast
---------------------------------------------------------------------- */
function Toast({ toast }) {
  const colors = {
    ok: COLORS.teal,
    warn: COLORS.gold,
    error: COLORS.danger,
  };
  return (
    <div style={{ ...sx.toast, borderColor: colors[toast.kind] || COLORS.teal }}>
      <div style={{ ...sx.toastDot, background: colors[toast.kind] || COLORS.teal }} />
      {toast.message}
    </div>
  );
}

/* ----------------------------------------------------------------------
   Estilos globales (fuentes, scrollbar, animaciones, focus visible)
---------------------------------------------------------------------- */
function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap');
      * { box-sizing: border-box; }
      body { margin: 0; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      @keyframes toastIn { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }
      input:focus, button:focus, textarea:focus {
        outline: 2px solid ${COLORS.coral};
        outline-offset: 1px;
      }
      input::placeholder { color: #9CA3AF; }
      @media (prefers-reduced-motion: reduce) {
        * { animation-duration: 0.01ms !important; }
      }
      ::-webkit-scrollbar { width: 10px; height: 10px; }
      ::-webkit-scrollbar-thumb { background: ${COLORS.line}; border-radius: 8px; }
      ::-webkit-scrollbar-track { background: transparent; }

      @media print {
        body * { visibility: hidden; }
        .labels-print-area, .labels-print-area * { visibility: visible; }
        .labels-print-area {
          position: absolute; top: 0; left: 0; width: 100%;
          display: grid !important; grid-template-columns: repeat(3, 1fr) !important;
          gap: 8px !important; padding: 10px !important;
        }
        .label-item { border: 1px dashed #999 !important; break-inside: avoid; }

        .receipt-print-area, .receipt-print-area * { visibility: visible; }
        .receipt-print-area {
          position: absolute; top: 0; left: 0;
          width: 80mm !important; max-width: 80mm !important;
          padding: 4mm !important; margin: 0 !important;
          box-shadow: none !important; border: none !important;
        }
        @page { size: 80mm auto; margin: 0; }

        .no-print { display: none !important; }
      }
    `}</style>
  );
}

/* ----------------------------------------------------------------------
   sx — estilos
---------------------------------------------------------------------- */
const sx = {
  app: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: COLORS.paper,
    fontFamily: "'Inter', system-ui, sans-serif",
    color: COLORS.ink,
  },
  header: {
    position: "sticky",
    top: 0,
    zIndex: 20,
    background: COLORS.paper,
    borderBottom: `1px solid ${COLORS.line}`,
  },
  headerInner: {
    maxWidth: 1180,
    margin: "0 auto",
    padding: "14px 20px",
    display: "flex",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  brand: { display: "flex", alignItems: "center", gap: 10, marginRight: "auto" },
  brandMark: {
    width: 38, height: 38, borderRadius: 10,
    background: `linear-gradient(135deg, ${COLORS.coral}, ${COLORS.gold})`,
    display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0, overflow: "hidden",
  },
  brandLogo: { width: "100%", height: "100%", objectFit: "cover" },
  brandTitle: {
    fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 19, lineHeight: 1.1, color: COLORS.ink,
  },
  brandSub: { fontSize: 12, color: COLORS.inkSoft, marginTop: 2 },
  nav: { display: "flex", gap: 6, background: COLORS.paperDeep, padding: 4, borderRadius: 11 },
  navBtn: {
    display: "flex", alignItems: "center", gap: 6,
    border: "none", background: "transparent", color: COLORS.inkSoft,
    fontFamily: "inherit", fontSize: 13.5, fontWeight: 600,
    padding: "8px 13px", borderRadius: 8, cursor: "pointer",
    position: "relative",
  },
  navBtnActive: { background: COLORS.white, color: COLORS.ink, boxShadow: "0 1px 2px rgba(0,0,0,0.06)" },
  navBadge: {
    background: COLORS.danger, color: COLORS.white, fontSize: 10, fontWeight: 700,
    borderRadius: 999, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center",
    padding: "0 4px",
  },
  saveIndicator: {
    display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: COLORS.inkSoft,
  },
  main: { maxWidth: 1180, margin: "0 auto", padding: "20px 20px 60px", width: "100%", flex: 1 },
  toolbar: {
    display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16,
  },
  searchBox: {
    display: "flex", alignItems: "center", gap: 8,
    background: COLORS.white, border: `1px solid ${COLORS.line}`, borderRadius: 10,
    padding: "9px 12px", flex: "1 1 220px", minWidth: 200,
  },
  searchInput: {
    border: "none", outline: "none", background: "transparent", flex: 1,
    fontFamily: "inherit", fontSize: 14, color: COLORS.ink,
  },
  searchClear: { border: "none", background: "transparent", cursor: "pointer", color: COLORS.inkSoft, display: "flex" },
  scanBtn: {
    border: `1px solid ${COLORS.line}`, background: COLORS.white, color: COLORS.ink,
    width: 38, height: 38, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", flexShrink: 0,
  },
  chipRow: { display: "flex", gap: 7, flexWrap: "wrap", flex: "1 1 100%", order: 3 },
  chip: {
    display: "flex", alignItems: "center", gap: 5,
    border: "1px solid", borderRadius: 999, padding: "6px 12px",
    fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
    whiteSpace: "nowrap",
  },
  addBtn: {
    display: "flex", alignItems: "center", gap: 7,
    background: COLORS.ink, color: COLORS.white, border: "none",
    padding: "10px 16px", borderRadius: 10, fontSize: 14, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
  },
  statRow: {
    display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12, marginBottom: 22,
  },
  statCard: {
    background: COLORS.white, border: `1px solid ${COLORS.line}`, borderRadius: 12,
    padding: "14px 16px",
  },
  statValue: { fontFamily: "'Fraunces', serif", fontSize: 23, fontWeight: 700, color: COLORS.ink },
  statLabel: { fontSize: 12, color: COLORS.inkSoft, marginTop: 3 },
  grid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 14,
  },
  card: {
    background: COLORS.white, border: "1.5px solid", borderRadius: 14,
    padding: 16, display: "flex", flexDirection: "column", gap: 10,
  },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 },
  catBadge: {
    display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700,
    padding: "4px 9px", borderRadius: 999,
  },
  lowBadge: {
    display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700,
    color: COLORS.danger,
  },
  favoriteBtn: {
    border: "none", background: "transparent", display: "flex", alignItems: "center",
    justifyContent: "center", cursor: "pointer", padding: 2, flexShrink: 0,
  },
  cardName: { fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 16.5, color: COLORS.ink, lineHeight: 1.25 },
  cardBarcode: { fontSize: 11.5, color: COLORS.inkSoft, fontFamily: "monospace", letterSpacing: 0.5 },
  cardSupplier: { display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: COLORS.inkSoft },
  cardNotes: {
    display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: COLORS.inkSoft,
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  cardMetrics: { display: "flex", gap: 18, paddingTop: 4, borderTop: `1px solid ${COLORS.paperDeep}` },
  cardMetricLabel: { fontSize: 10.5, color: COLORS.inkSoft, marginBottom: 2 },
  cardMetricValue: { fontSize: 15, fontWeight: 700, color: COLORS.ink },
  cardActions: { display: "flex", gap: 4, marginTop: 2, flexWrap: "wrap" },
  iconBtn: {
    border: "none", background: COLORS.paperDeep, color: COLORS.inkSoft,
    width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
  },
  empty: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
    padding: "60px 20px", textAlign: "center",
  },
  emptyTitle: { fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 600, color: COLORS.ink },
  emptyText: { fontSize: 13.5, color: COLORS.inkSoft, maxWidth: 340 },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(31,42,68,0.45)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50,
  },
  modal: {
    background: COLORS.paper, borderRadius: 16, padding: 22, width: "100%",
    maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(31,42,68,0.3)",
    border: `1px solid ${COLORS.line}`,
  },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  modalTitle: {
    fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 18, color: COLORS.ink,
    display: "flex", alignItems: "center", gap: 8,
  },
  modalClose: {
    border: "none", background: COLORS.paperDeep, width: 30, height: 30, borderRadius: 8,
    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: COLORS.inkSoft,
  },
  form: { display: "flex", flexDirection: "column", gap: 13 },
  field: { display: "flex", flexDirection: "column", gap: 5 },
  fieldLabel: { fontSize: 12.5, fontWeight: 600, color: COLORS.inkSoft },
  fieldError: { fontSize: 11.5, color: COLORS.danger },
  errorBanner: {
    display: "flex", alignItems: "center", gap: 8,
    background: COLORS.coralSoft, color: COLORS.danger, border: `1px solid ${COLORS.danger}`,
    borderRadius: 9, padding: "10px 12px", fontSize: 13, fontWeight: 600, marginBottom: 14,
  },
  input: {
    border: `1px solid ${COLORS.line}`, borderRadius: 9, padding: "10px 12px",
    fontFamily: "inherit", fontSize: 14, background: COLORS.white, color: COLORS.ink,
  },
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  segmented: { display: "flex", gap: 6, flexWrap: "wrap" },
  segmentBtn: {
    border: `1px solid ${COLORS.line}`, borderRadius: 9, padding: "8px 12px",
    fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  },
  barcodeRow: { display: "flex", gap: 8 },
  scanInlineBtn: {
    border: `1px solid ${COLORS.line}`, background: COLORS.white, borderRadius: 9,
    width: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: COLORS.ink,
  },
  hint: { fontSize: 12, color: COLORS.inkSoft, background: COLORS.paperDeep, padding: "9px 11px", borderRadius: 9 },
  modalActions: { display: "flex", justifyContent: "flex-end", gap: 9, marginTop: 6 },
  btnGhost: {
    border: `1px solid ${COLORS.line}`, background: "transparent", color: COLORS.inkSoft,
    padding: "10px 16px", borderRadius: 9, fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  },
  hiddenFileInput: {
    position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
    fontSize: 100, opacity: 0, cursor: "pointer", margin: 0, padding: 0, border: "none",
    zIndex: 2,
  },
  btnPrimary: {
    border: "none", background: COLORS.ink, color: COLORS.white,
    padding: "10px 18px", borderRadius: 9, fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
  },
  movementProduct: { fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600, color: COLORS.ink, marginBottom: 3 },
  movementCurrentStock: { fontSize: 13, color: COLORS.inkSoft, marginBottom: 14 },
  resultPreview: { fontSize: 13.5, background: COLORS.paperDeep, padding: "9px 11px", borderRadius: 9 },
  historyList: { display: "flex", flexDirection: "column", gap: 8, maxHeight: 360, overflowY: "auto" },
  historyItem: { display: "flex", gap: 10, alignItems: "flex-start" },
  historyIcon: { width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  historyInfo: { flex: 1, borderBottom: `1px solid ${COLORS.paperDeep}`, paddingBottom: 8 },
  historyTop: { display: "flex", justifyContent: "space-between", fontSize: 13.5, fontWeight: 600, color: COLORS.ink, gap: 8 },
  historyDate: { fontSize: 11.5, color: COLORS.inkSoft, fontWeight: 500, whiteSpace: "nowrap" },
  historyNote: { fontSize: 12.5, color: COLORS.inkSoft, marginTop: 2 },
  confirmMessage: { fontSize: 14, color: COLORS.inkSoft, lineHeight: 1.5, marginBottom: 18 },
  scannerVideoWrap: {
    position: "relative", borderRadius: 12, overflow: "hidden", background: "#000",
    aspectRatio: "4/3", display: "flex", alignItems: "center", justifyContent: "center",
  },
  scannerVideo: { width: "100%", height: "100%", objectFit: "cover" },
  scannerFrame: {
    position: "absolute", inset: "20% 12%", border: `2.5px solid ${COLORS.coral}`,
    borderRadius: 10, boxShadow: "0 0 0 2000px rgba(0,0,0,0.25)",
  },
  scannerOverlayText: {
    position: "absolute", color: COLORS.white, fontSize: 13, display: "flex", alignItems: "center", gap: 8,
  },
  scannerFallback: { fontSize: 13.5, color: COLORS.inkSoft, lineHeight: 1.5, background: COLORS.paperDeep, padding: 14, borderRadius: 10 },
  reportsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  panel: { background: COLORS.white, border: `1px solid ${COLORS.line}`, borderRadius: 14, padding: 18 },
  panelTitle: {
    fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 15.5, color: COLORS.ink,
    display: "flex", alignItems: "center", gap: 7, marginBottom: 14,
  },
  barList: { display: "flex", flexDirection: "column", gap: 11 },
  barRow: { display: "grid", gridTemplateColumns: "110px 1fr auto", gap: 10, alignItems: "center" },
  barLabel: { fontSize: 12.5, color: COLORS.ink, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  barTrack: { height: 8, background: COLORS.paperDeep, borderRadius: 999, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 999 },
  barValue: { fontSize: 12, color: COLORS.inkSoft, whiteSpace: "nowrap" },
  lowList: { display: "flex", flexDirection: "column", gap: 8 },
  lowRow: { display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: `1px solid ${COLORS.paperDeep}` },
  lowName: { fontSize: 13.5, fontWeight: 600, color: COLORS.ink, flex: 1 },
  lowSupplier: { display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: COLORS.inkSoft, marginTop: 2, fontWeight: 400 },
  lowStockVal: { fontSize: 13, color: COLORS.inkSoft },
  toast: {
    position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)",
    background: COLORS.ink, color: COLORS.white, padding: "11px 18px", borderRadius: 11,
    fontSize: 13.5, fontWeight: 600, display: "flex", alignItems: "center", gap: 9,
    boxShadow: "0 10px 30px rgba(31,42,68,0.3)", border: "1.5px solid", zIndex: 60,
    animation: "toastIn 0.25s ease",
  },
  toastDot: { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },

  periodRow: { display: "flex", gap: 7, marginBottom: 16, flexWrap: "wrap" },
  panelTitleRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  addBtnSmall: {
    display: "flex", alignItems: "center", gap: 5,
    background: COLORS.ink, color: COLORS.white, border: "none",
    padding: "7px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 600,
    cursor: "pointer", fontFamily: "inherit",
  },
  summaryList: { display: "flex", flexDirection: "column", gap: 10 },
  summaryRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    fontSize: 13.5, color: COLORS.inkSoft, paddingBottom: 9, borderBottom: `1px solid ${COLORS.paperDeep}`,
  },
  chartWrap: {
    display: "flex", alignItems: "flex-end", gap: 6, height: 140, paddingTop: 6,
    overflowX: "auto",
  },
  chartCol: { display: "flex", flexDirection: "column", alignItems: "center", flex: "1 0 auto", minWidth: 22, height: "100%" },
  chartBarTrack: { flex: 1, width: 14, display: "flex", alignItems: "flex-end", background: COLORS.paperDeep, borderRadius: 4, overflow: "hidden" },
  chartBarFill: { width: "100%", background: `linear-gradient(180deg, ${COLORS.coral}, ${COLORS.gold})`, borderRadius: "4px 4px 0 0", minHeight: 2 },
  chartLabel: { fontSize: 9.5, color: COLORS.inkSoft, marginTop: 5, whiteSpace: "nowrap" },
  expenseList: { display: "flex", flexDirection: "column", gap: 2 },
  expenseRow: {
    display: "grid", gridTemplateColumns: "110px 1fr 120px 100px auto",
    gap: 10, alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${COLORS.paperDeep}`,
  },
  expenseCat: { fontSize: 12.5, fontWeight: 700, color: COLORS.ink },
  expenseNote: { fontSize: 12.5, color: COLORS.inkSoft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  expenseDate: { fontSize: 11.5, color: COLORS.inkSoft },
  expenseAmount: { fontSize: 13, fontWeight: 700, color: COLORS.ink, textAlign: "right" },
  expenseActions: { display: "flex", gap: 4 },

  newSaleBtn: {
    display: "flex", alignItems: "center", gap: 7,
    background: COLORS.coral, color: COLORS.white, border: "none",
    padding: "9px 15px", borderRadius: 10, fontSize: 13.5, fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
    boxShadow: "0 2px 8px rgba(226,100,59,0.35)",
  },
  saleSearchRow: { display: "flex", gap: 8, marginBottom: 10 },
  favoritesGrid: { display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  favoriteChip: {
    display: "flex", alignItems: "center", gap: 6,
    border: `1px solid ${COLORS.goldSoft}`, background: COLORS.goldSoft, borderRadius: 999,
    padding: "6px 11px", cursor: "pointer", fontFamily: "inherit",
  },
  favoriteChipName: { fontSize: 12, fontWeight: 700, color: COLORS.ink, maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  favoriteChipPrice: { fontSize: 11, color: COLORS.inkSoft },
  saleMatches: {
    display: "flex", flexDirection: "column", gap: 4, marginBottom: 14,
    background: COLORS.white, border: `1px solid ${COLORS.line}`, borderRadius: 10, padding: 6,
    maxHeight: 220, overflowY: "auto",
  },
  saleMatchRow: {
    display: "flex", alignItems: "center", gap: 10, padding: "8px 9px", borderRadius: 8,
    border: "none", background: "transparent", cursor: "pointer", textAlign: "left", width: "100%",
    fontFamily: "inherit",
  },
  saleMatchName: { fontSize: 13, fontWeight: 600, color: COLORS.ink, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  saleMatchStock: { fontSize: 11.5, color: COLORS.inkSoft, whiteSpace: "nowrap" },
  saleMatchPrice: { fontSize: 12.5, fontWeight: 700, color: COLORS.ink, whiteSpace: "nowrap" },
  saleLines: { display: "flex", flexDirection: "column", gap: 8, maxHeight: 260, overflowY: "auto", marginBottom: 4 },
  saleLineRow: {
    display: "grid", gridTemplateColumns: "1fr 52px 76px 86px 28px",
    gap: 8, alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${COLORS.paperDeep}`,
  },
  saleLineName: { fontSize: 13, fontWeight: 600, color: COLORS.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  saleQtyInput: {
    border: `1px solid ${COLORS.line}`, borderRadius: 7, padding: "6px 6px", textAlign: "center",
    fontFamily: "inherit", fontSize: 13, background: COLORS.white, color: COLORS.ink,
  },
  salePriceInput: {
    border: `1px solid ${COLORS.line}`, borderRadius: 7, padding: "6px 6px", textAlign: "right",
    fontFamily: "inherit", fontSize: 13, background: COLORS.white, color: COLORS.ink,
  },
  saleLineSubtotal: { fontSize: 13, fontWeight: 700, color: COLORS.ink, textAlign: "right" },
  saleRemoveBtn: {
    border: "none", background: COLORS.paperDeep, color: COLORS.inkSoft,
    width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
  },
  saleFootRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    background: COLORS.paperDeep, borderRadius: 10, padding: "11px 14px", marginTop: 10,
  },
  saleFootLabel: { fontSize: 12.5, color: COLORS.inkSoft },
  paymentMethodLabel: { fontSize: 12, fontWeight: 700, color: COLORS.inkSoft, marginTop: 12, marginBottom: 6 },
  saleFootTotal: { fontFamily: "'Fraunces', serif", fontSize: 19, fontWeight: 700, color: COLORS.ink },

  storeHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 10, flexWrap: "wrap" },
  storeName: { fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 22, color: COLORS.ink },
  storeSubtitle: { fontSize: 12.5, color: COLORS.inkSoft, marginTop: 2 },
  storeSettingsBtn: {
    display: "flex", alignItems: "center", gap: 6,
    border: `1px solid ${COLORS.line}`, background: COLORS.white, color: COLORS.inkSoft,
    padding: "8px 13px", borderRadius: 9, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  },
  storeGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14, paddingBottom: 80 },
  storeCard: {
    background: COLORS.white, border: `1px solid ${COLORS.line}`, borderRadius: 14, overflow: "hidden",
    display: "flex", flexDirection: "column",
  },
  storeImageWrap: { aspectRatio: "1/1", width: "100%", background: COLORS.paperDeep },
  storeImage: { width: "100%", height: "100%", objectFit: "cover", display: "block" },
  storeImagePlaceholder: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" },
  storeCardBody: { padding: 12, display: "flex", flexDirection: "column", gap: 7 },
  storeCardName: { fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 14.5, color: COLORS.ink, lineHeight: 1.25 },
  storeCardPrice: { fontSize: 15, fontWeight: 700, color: COLORS.ink },
  storeAddBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
    border: "none", background: COLORS.ink, color: COLORS.white,
    padding: "8px 0", borderRadius: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
  },
  storeQtyRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 10 },
  storeQtyBtn: {
    border: `1px solid ${COLORS.line}`, background: COLORS.white, color: COLORS.ink,
    width: 26, height: 26, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
  },
  storeQtyValue: { fontSize: 13.5, fontWeight: 700, color: COLORS.ink, minWidth: 18, textAlign: "center" },
  cartFab: {
    position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
    display: "flex", alignItems: "center", gap: 10,
    background: COLORS.ink, color: COLORS.white, border: "none",
    padding: "13px 20px", borderRadius: 999, fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
    boxShadow: "0 10px 30px rgba(31,42,68,0.35)", zIndex: 40,
  },
  cartFabTotal: { background: "rgba(255,255,255,0.18)", padding: "3px 9px", borderRadius: 999 },
  cartDrawer: {
    background: COLORS.paper, borderRadius: 16, padding: 22, width: "100%", maxWidth: 440,
    maxHeight: "85vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(31,42,68,0.3)",
    border: `1px solid ${COLORS.line}`,
  },
  cartItemRow: { display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${COLORS.paperDeep}` },
  whatsappBtn: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    border: "none", background: "#3FA66B", color: COLORS.white,
    padding: "13px 16px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
    width: "100%", marginTop: 14,
  },
  cartHint: { fontSize: 11.5, color: COLORS.inkSoft, textAlign: "center", marginTop: 8 },

  navDot: {
    position: "absolute", top: 4, right: 4, width: 7, height: 7, borderRadius: "50%", background: COLORS.gold,
  },
  selectModeHint: { fontSize: 12.5, color: COLORS.inkSoft, fontStyle: "italic" },
  cardSelectable: {
    border: "1.5px solid", cursor: "pointer", textAlign: "left", fontFamily: "inherit", width: "100%",
  },
  checkCircle: {
    width: 22, height: 22, borderRadius: "50%", border: "2px solid",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  labelsFab: {
    position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
    display: "flex", alignItems: "center", gap: 9,
    background: COLORS.coral, color: COLORS.white, border: "none",
    padding: "13px 22px", borderRadius: 999, fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
    boxShadow: "0 10px 30px rgba(230,62,140,0.4)", zIndex: 40,
  },

  seasonBanner: {
    display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
    background: COLORS.goldSoft, border: `1px solid ${COLORS.gold}`, borderRadius: 12,
    padding: "11px 16px", marginBottom: 18,
  },
  seasonBannerText: { display: "flex", gap: 14, flexWrap: "wrap", fontSize: 13, color: COLORS.ink },
  seasonBannerItem: { whiteSpace: "nowrap" },
  seasonList: { display: "flex", flexDirection: "column", gap: 9 },
  seasonRow: {
    display: "grid", gridTemplateColumns: "10px 1fr auto auto", gap: 12, alignItems: "center",
    padding: "8px 0", borderBottom: `1px solid ${COLORS.paperDeep}`,
  },
  seasonDot: { width: 8, height: 8, borderRadius: "50%" },
  seasonName: { fontSize: 13.5, fontWeight: 600, color: COLORS.ink },
  seasonDate: { fontSize: 12.5, color: COLORS.inkSoft, textTransform: "capitalize" },
  seasonDays: { fontSize: 12.5, fontWeight: 700, whiteSpace: "nowrap" },
  staleSummary: {
    fontSize: 13, color: COLORS.inkSoft, background: COLORS.paperDeep, borderRadius: 9,
    padding: "9px 12px", marginBottom: 12,
  },

  labelsModalShell: {
    background: COLORS.paper, borderRadius: 16, padding: 22, width: "100%", maxWidth: 560,
    maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(31,42,68,0.3)",
    border: `1px solid ${COLORS.line}`,
  },
  labelsGrid: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 10 },
  labelItem: {
    border: `1.5px dashed ${COLORS.line}`, borderRadius: 10, padding: "14px 12px",
    display: "flex", flexDirection: "column", gap: 4, alignItems: "center", textAlign: "center",
    background: COLORS.white,
  },
  labelName: { fontSize: 13, fontWeight: 700, color: COLORS.ink, lineHeight: 1.25 },
  labelPrice: { fontFamily: "'Fraunces', serif", fontSize: 18, fontWeight: 700, color: COLORS.coral },
  labelBrand: { fontSize: 9.5, color: COLORS.inkSoft, letterSpacing: 0.5, textTransform: "uppercase" },

  closeDayBtn: {
    display: "flex", alignItems: "center", gap: 7,
    background: COLORS.white, color: COLORS.ink, border: `1.5px solid ${COLORS.ink}`,
    padding: "9px 15px", borderRadius: 10, fontSize: 13.5, fontWeight: 700,
    cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
  },
  closeDayDate: { fontSize: 13, color: COLORS.inkSoft, textTransform: "capitalize", marginBottom: 14 },
  closeDayBigRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 },
  closeDayBigCard: { background: COLORS.paperDeep, borderRadius: 12, padding: "14px 16px", textAlign: "center" },
  closeDayBigValue: { fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: COLORS.ink },
  closeDayBigLabel: { fontSize: 11.5, color: COLORS.inkSoft, marginTop: 3 },
  closeDaySubtitle: { fontSize: 12.5, fontWeight: 700, color: COLORS.inkSoft, marginTop: 16, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 },
  closeDayItemRow: {
    display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, alignItems: "center",
    padding: "7px 0", borderBottom: `1px solid ${COLORS.paperDeep}`, fontSize: 13,
  },
  closeDayItemQty: { fontSize: 12, color: COLORS.inkSoft, whiteSpace: "nowrap" },

  exportGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 },
  exportCard: {
    display: "flex", alignItems: "flex-start", gap: 10, textAlign: "left",
    border: `1.5px solid ${COLORS.line}`, borderRadius: 12, padding: "13px 14px",
    background: COLORS.white, cursor: "pointer", fontFamily: "inherit",
  },
  exportCardTitle: { fontSize: 13, fontWeight: 700, color: COLORS.ink, marginBottom: 3 },
  exportCardDesc: { fontSize: 11.5, color: COLORS.inkSoft, lineHeight: 1.4 },
  lastBackupNote: { fontSize: 12, color: COLORS.inkSoft, marginBottom: 14 },

  backupReminderBanner: {
    display: "flex", alignItems: "center", gap: 10, width: "100%",
    background: COLORS.paperDeep, border: `1px solid ${COLORS.line}`, borderRadius: 12,
    padding: "11px 16px", marginBottom: 14, cursor: "pointer", textAlign: "left", fontFamily: "inherit",
  },
  backupReminderText: { fontSize: 13, color: COLORS.inkSoft, fontWeight: 600 },

  receiptModalShell: {
    background: COLORS.paper, borderRadius: 16, padding: 22, width: "100%", maxWidth: 380,
    maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(31,42,68,0.3)",
    border: `1px solid ${COLORS.line}`,
  },
  receiptPaper: {
    background: COLORS.white, border: `1px solid ${COLORS.line}`, borderRadius: 8,
    padding: "18px 16px", fontFamily: "'Courier New', monospace", color: "#111",
  },
  receiptStoreName: { fontSize: 15, fontWeight: 700, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.5 },
  receiptDate: { fontSize: 11.5, textAlign: "center", marginTop: 4, color: "#444" },
  receiptDivider: { borderTop: "1px dashed #999", margin: "10px 0" },
  receiptLine: { display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12.5, padding: "3px 0" },
  receiptItemName: { flex: 1 },
  receiptItemPrice: { whiteSpace: "nowrap" },
  receiptTotalLine: { display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, padding: "4px 0" },
  receiptFooter: { fontSize: 11, textAlign: "center", marginTop: 12, color: "#444" },
  receiptPayment: { fontSize: 11.5, textAlign: "center", color: "#444", marginTop: 4 },
  reprintBtn: {
    display: "flex", alignItems: "center", gap: 5, marginTop: 6,
    border: `1px solid ${COLORS.line}`, background: COLORS.white, color: COLORS.inkSoft,
    fontSize: 11, fontWeight: 600, padding: "4px 9px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit",
  },

  settingsHeader: { marginBottom: 18 },
  settingsTitle: { fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: 22, color: COLORS.ink },
  settingsSubtitle: { fontSize: 12.5, color: COLORS.inkSoft, marginTop: 2 },
  settingsLogoRow: { display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" },
  settingsLogoPreview: {
    width: 72, height: 72, borderRadius: 14, background: COLORS.paperDeep,
    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0,
    border: `1px solid ${COLORS.line}`,
  },
  settingsLogoImg: { width: "100%", height: "100%", objectFit: "cover" },
  settingsLogoActions: { display: "flex", gap: 8, flexWrap: "wrap" },

  productImageRow: { display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" },
  productImagePreview: { position: "relative", width: 64, height: 64, borderRadius: 10, overflow: "hidden", flexShrink: 0, border: `1px solid ${COLORS.line}` },
  productImagePreviewImg: { width: "100%", height: "100%", objectFit: "cover" },
  productImageRemove: {
    position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%",
    background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", display: "flex",
    alignItems: "center", justifyContent: "center", cursor: "pointer",
  },
  productImageActions: { display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 180 },

  customerList: { display: "flex", flexDirection: "column", gap: 8 },
  customerRow: {
    display: "grid", gridTemplateColumns: "1fr 160px auto", gap: 14, alignItems: "center",
    background: COLORS.white, border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "12px 16px",
  },
  customerInfo: { display: "flex", flexDirection: "column", gap: 2 },
  customerName: { fontSize: 14.5, fontWeight: 700, color: COLORS.ink },
  customerPhone: { fontSize: 12, color: COLORS.inkSoft },
  customerBalance: { fontSize: 13, fontWeight: 700, textAlign: "right" },
  customerActions: { display: "flex", gap: 4 },
};
