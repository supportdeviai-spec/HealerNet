import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import { useAuth } from "../../context/AuthContext";
import { apiFetch } from "../../services/api";
import { locationApi } from "../../services/locationApi";
import {
  LayoutDashboard, Users, Heart, Leaf, MessageCircle, Calendar,
  Bell, Mail, FileCode2, LifeBuoy, PieChart as PieIcon,
  ShieldCheck, Settings as SettingsIcon, LogOut, Search, ChevronDown, Menu, X, Sun, Moon,
  Plus, MoreVertical, Pencil, Trash2, CheckCircle2, XCircle, Download,
  ArrowUpDown, RefreshCw, AlertTriangle, Clock, MapPin, Link2, TrendingUp,
  UserCheck, UserX, Send, ChevronLeft, ChevronRight, Ticket, Key,
  Sparkles, ArrowRight, Inbox, ImageIcon, Loader2, Info,
  BadgeCheck, FolderOpen, User as UserIcon, Network
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import BannersPage from "./BannersPage";
import LocationManagementPage from "./LocationManagementPage";
import EmailTemplatesPage from "./EmailTemplatesPage";
import RolesManagementPage from "./RolesManagementPage";
import PermissionsManagementPage from "./PermissionsManagementPage";
import { Select, RefreshButton, refreshTableStyle } from "../../components/admin/AdminShared";
import { usePermissions, PERMISSION_DENIED_MESSAGE } from "../../hooks/usePermissions";

const MOBILE_MAX_DIGITS = 10;
const INTL_MOBILE_MAX_DIGITS = 15;

function sanitizeMobileInput(value) {
  const trimmed = value.trimStart();
  if (!trimmed) return "";

  let out = "";
  for (const ch of trimmed) {
    if (ch >= "0" && ch <= "9") {
      out += ch;
    } else if (ch === "+" && out === "") {
      out += ch;
    }
  }

  if (out.startsWith("+91")) {
    return `+91${out.slice(3).replace(/\D/g, "").slice(0, MOBILE_MAX_DIGITS)}`;
  }

  if (out.startsWith("+")) {
    return `+${out.slice(1).replace(/\D/g, "").slice(0, INTL_MOBILE_MAX_DIGITS)}`;
  }

  return out.replace(/\D/g, "").slice(0, MOBILE_MAX_DIGITS);
}

function validateMobileNumber(mobile) {
  const raw = mobile.trim();
  if (!raw) return null;

  if (raw.startsWith("+91")) {
    const digits = raw.slice(3);
    if (digits.length !== MOBILE_MAX_DIGITS) {
      return "Indian mobile must be 10 digits after +91.";
    }
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return "Enter a valid Indian mobile (starts with 6, 7, 8, or 9).";
    }
    return null;
  }

  if (raw.startsWith("+")) {
    const digits = raw.slice(1);
    if (digits.length < 7 || digits.length > INTL_MOBILE_MAX_DIGITS) {
      return "International number must be 7–15 digits after +.";
    }
    return null;
  }

  if (raw.length !== MOBILE_MAX_DIGITS) {
    return "Mobile number must be exactly 10 digits.";
  }
  if (!/^[6-9]\d{9}$/.test(raw)) {
    return "Enter a valid mobile number (starts with 6, 7, 8, or 9).";
  }

  return null;
}

function normalizeMobileNumber(mobile) {
  const raw = mobile.trim();
  if (!raw) return "";

  if (raw.startsWith("+91")) {
    const digits = raw.slice(3).replace(/\D/g, "").slice(0, MOBILE_MAX_DIGITS);
    return digits ? `+91${digits}` : "";
  }

  if (raw.startsWith("+")) {
    const digits = raw.slice(1).replace(/\D/g, "").slice(0, INTL_MOBILE_MAX_DIGITS);
    return digits ? `+${digits}` : "";
  }

  return raw.replace(/\D/g, "").slice(0, MOBILE_MAX_DIGITS);
}

function userStatusLabel(status) {
  if (!status) return "Active";
  const normalized = String(status).toLowerCase();
  if (normalized === "suspended") return "Inactive";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function userStatusForApi(status) {
  const normalized = String(status || "Active").toLowerCase();
  if (normalized === "inactive") return "suspended";
  return normalized;
}

/* =========================================================================
   TOKENS — HealerNet "Enterprise Network" theme: deep forest green rail,
   lime accent for growth/action, gold for the one thing that needs a
   human's attention, soft lavender for secondary data.
   ========================================================================= */
// Use fonts already loaded in welcome.blade.php — avoid extra CSS @import (blocks paint)
const FONT_DISPLAY = "'Playfair Display', Georgia, serif";
const FONT_BODY = "'Plus Jakarta Sans', system-ui, sans-serif";
const FONT_MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

const RAIL = { bg: "#0E2A1C", bgActive: "rgba(255,255,255,0.10)", indicator: "#D4A62C", text: "#CFE0D2", textDim: "#6C8574", border: "rgba(141,198,63,0.14)", danger: "#E8ABA3" };
const RAIL_LIGHT = { bg: "#FFFFFF", bgActive: "rgba(31,92,59,0.08)", indicator: "#B8841E", text: "#0F241A", textDim: "#7C8F81", border: "rgba(21,48,43,0.08)", danger: "#C1483F" };
const LIGHT = { bg: "#F4F8F1", surface: "#FFFFFF", surfaceAlt: "#EAF3DE", border: "rgba(21,48,43,0.08)", text: "#0F241A", textMuted: "#54695C", textFaint: "#8B9C90" };
const DARKT = { bg: "#071A12", surface: "#122E1F", surfaceAlt: "#183624", border: "rgba(141,198,63,0.14)", text: "#F2F7EE", textMuted: "#B9C7BC", textFaint: "#7E9186" };
const BRAND = { primary: "#1F5C3B", primaryDark: "#0E2A1C", primaryLight: "#EAF3DE", amber: "#B8841E", amberLight: "#FBEFD1", danger: "#C1483F", dangerLight: "#FBE7E7", info: "#6A6FC9", infoLight: "#ECEDFA", ok: "#5C9A34", okLight: "#EAF3DE" };

const CHART_COLORS = ["#1F5C3B", "#D4A62C", "#7C83DB", "#8DC63F", "#C1483F", "#0E2A1C", "#54695C", "#9A5A1E"];

/* =========================================================================
   DUMMY DATA
   ========================================================================= */
const CATEGORIES = [
  { id: "c1", name: "Yoga & Movement", icon: "🧘", description: "Asana practice, breathwork and mobility circles.", status: "Active", sortOrder: 1 },
  { id: "c2", name: "Nutrition Science", icon: "🥗", description: "Evidence-based dietary guidance and metabolic health.", status: "Active", sortOrder: 2 },
  { id: "c3", name: "Mental Wellness", icon: "🧠", description: "Peer support grounded in CBT and mindfulness research.", status: "Active", sortOrder: 3 },
  { id: "c4", name: "Sleep Medicine", icon: "🌙", description: "Circadian health and clinical sleep hygiene.", status: "Active", sortOrder: 4 },
  { id: "c5", name: "Chronic Pain", icon: "🦴", description: "Physiotherapy-led management and mobility work.", status: "Active", sortOrder: 5 },
  { id: "c6", name: "Cardiac Recovery", icon: "❤️", description: "Post-cardiac rehab support cohorts.", status: "Inactive", sortOrder: 6 },
  { id: "c7", name: "Herbal & Traditional", icon: "🌿", description: "Traditional practice cross-checked against current evidence.", status: "Active", sortOrder: 7 },
  { id: "c8", name: "Maternal Health", icon: "🤰", description: "Pre- and post-natal peer circles.", status: "Active", sortOrder: 8 },
];

function genCommunities() {
  const list = [];
  let n = 1;
  CATEGORIES.forEach((cat) => {
    const groups = cat.id === "c1" ? 3 : cat.id === "c3" ? 3 : 2;
    for (let i = 1; i <= groups; i++) {
      const max = 250;
      const members = i === 1 ? max : i === 2 ? Math.floor(max * 0.72) : Math.floor(max * 0.31);
      list.push({
        id: `g${n}`, name: `${cat.name.split(" ")[0]} Group ${i}`, categoryId: cat.id,
        link: `https://chat.whatsapp.com/invite/${cat.id}${i}xz9`,
        members, max, status: cat.status === "Paused" ? "Inactive" : (members >= max ? "Full" : "Active"),
        created: `2025-${String(((n * 3) % 12) + 1).padStart(2, "0")}-${String(((n * 7) % 27) + 1).padStart(2, "0")}`,
      });
      n++;
    }
  });
  return list;
}
const COMMUNITIES = genCommunities();

const COUNTRIES = ["India", "United States", "United Kingdom", "Canada", "Australia", "Germany", "Kenya", "Philippines", "Brazil", "UAE"];

// Dynamic Country → State → City map, used to drive cascading dropdowns in the
// user create/edit form (selecting a country repopulates its states, selecting
// a state repopulates its cities).
const LOCATIONS = {
  "India": { "Punjab": ["Chandigarh", "Ludhiana", "Amritsar"], "Maharashtra": ["Mumbai", "Pune", "Nagpur"], "Karnataka": ["Bengaluru", "Mysuru"], "Delhi": ["New Delhi"] },
  "United States": { "California": ["Los Angeles", "San Francisco", "San Diego"], "New York": ["New York City", "Buffalo"], "Texas": ["Austin", "Houston", "Dallas"] },
  "United Kingdom": { "England": ["London", "Manchester", "Birmingham"], "Scotland": ["Edinburgh", "Glasgow"], "Wales": ["Cardiff"] },
  "Canada": { "Ontario": ["Toronto", "Ottawa"], "British Columbia": ["Vancouver", "Victoria"], "Quebec": ["Montreal", "Quebec City"] },
  "Australia": { "New South Wales": ["Sydney", "Newcastle"], "Victoria": ["Melbourne", "Geelong"], "Queensland": ["Brisbane", "Gold Coast"] },
  "Germany": { "Bavaria": ["Munich", "Nuremberg"], "Berlin": ["Berlin"], "Hesse": ["Frankfurt", "Wiesbaden"] },
  "Kenya": { "Nairobi": ["Nairobi"], "Coast": ["Mombasa", "Malindi"], "Rift Valley": ["Nakuru", "Eldoret"] },
  "Philippines": { "Metro Manila": ["Manila", "Quezon City"], "Cebu": ["Cebu City", "Mandaue"], "Davao": ["Davao City"] },
  "Brazil": { "São Paulo": ["São Paulo", "Campinas"], "Rio de Janeiro": ["Rio de Janeiro", "Niterói"], "Bahia": ["Salvador"] },
  "UAE": { "Dubai": ["Dubai"], "Abu Dhabi": ["Abu Dhabi", "Al Ain"], "Sharjah": ["Sharjah"] },
};

const getStoredItem = (key, defaultValue) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const setStoredItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error("Failed to save to localStorage", e);
  }
};

const exportToCSV = (filename, data, columns, toastFn) => {
  if (!data || !data.length) {
    toastFn?.("No data available to export", "error");
    return;
  }
  const headers = columns ? columns.map((c) => c.label || c.key) : Object.keys(data[0]);
  const keys = columns ? columns.map((c) => c.key) : Object.keys(data[0]);

  const csvRows = [];
  csvRows.push(headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(","));

  data.forEach((row) => {
    const values = keys.map((k) => {
      const val = row[k] !== undefined && row[k] !== null ? row[k] : "";
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(","));
  });

  const csvString = "\uFEFF" + csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const exportToExcel = (filename, data, columns, toastFn) => {
  if (!data || !data.length) {
    toastFn?.("No data available to export", "error");
    return;
  }
  const headers = columns ? columns.map((c) => c.label || c.key) : Object.keys(data[0]);
  const keys = columns ? columns.map((c) => c.key) : Object.keys(data[0]);

  let tableHtml = `<table border="1"><thead><tr>`;
  headers.forEach((h) => {
    tableHtml += `<th style="background-color: #0E2A1C; color: #FFFFFF; font-weight: bold; padding: 8px;">${String(h)}</th>`;
  });
  tableHtml += `</tr></thead><tbody>`;

  data.forEach((row) => {
    tableHtml += `<tr>`;
    keys.forEach((k) => {
      const val = row[k] !== undefined && row[k] !== null ? row[k] : "";
      tableHtml += `<td style="padding: 6px;">${String(val)}</td>`;
    });
    tableHtml += `</tr>`;
  });
  tableHtml += `</tbody></table>`;

  const excelFile = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sheet1</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
    <body>${tableHtml}</body>
    </html>`;

  const blob = new Blob([excelFile], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const USERS = [];

const EVENTS = [
  { id: "e1", title: "Morning Vinyasa Live Session", categoryId: "c1", location: "Online — Zoom", date: "2026-08-14", time: "07:00", max: 200, registered: 178, status: "Upcoming" },
  { id: "e2", title: "Understanding Macronutrients", categoryId: "c2", location: "Online — Webinar", date: "2026-08-18", time: "18:30", max: 150, registered: 92, status: "Upcoming" },
  { id: "e3", title: "Mindfulness for Anxiety — Workshop", categoryId: "c3", location: "Community Hall, Pune", date: "2026-08-09", time: "10:00", max: 60, registered: 60, status: "Full" },
  { id: "e4", title: "Sleep Hygiene Clinic", categoryId: "c4", location: "Online — Webinar", date: "2026-07-28", time: "19:00", max: 100, registered: 100, status: "Completed" },
  { id: "e5", title: "Gentle Mobility for Chronic Pain", categoryId: "c5", location: "Wellness Center, Chandigarh", date: "2026-08-22", time: "16:00", max: 40, registered: 21, status: "Upcoming" },
  { id: "e6", title: "Postnatal Recovery Circle", categoryId: "c8", location: "Online — Zoom", date: "2026-08-05", time: "11:00", max: 80, registered: 45, status: "Upcoming" },
];

const TICKETS = [
  { id: "t1", subject: "Cannot join Yoga Group 2 via invite link", user: "Meera Nair", priority: "High", status: "Open", created: "2026-08-05" },
  { id: "t2", subject: "Email verification link expired", user: "Ethan Wilson", priority: "Medium", status: "Assigned", created: "2026-08-04" },
  { id: "t3", subject: "Request to switch healthcare category", user: "Fatima Khan", priority: "Low", status: "Open", created: "2026-08-06" },
  { id: "t4", subject: "Duplicate account created", user: "James Taylor", priority: "High", status: "Resolved", created: "2026-08-01" },
  { id: "t5", subject: "Event reminder not received", user: "Kavya Sen", priority: "Medium", status: "Open", created: "2026-08-06" },
  { id: "t6", subject: "Unable to download research PDF", user: "Lucas Clark", priority: "Low", status: "Assigned", created: "2026-08-03" },
];

const CATEGORY_DIST = CATEGORIES.map((c, i) => ({ name: c.name, value: [18, 22, 20, 10, 12, 4, 9, 5][i] }));

/* =========================================================================
   SMALL PRIMITIVES
   ========================================================================= */
function cx(...a) { return a.filter(Boolean).join(" "); }

function useTheme() {
  const [dark, setDark] = useState(false);
  const t = dark ? DARKT : LIGHT;
  return { dark, setDark, t };
}

function Skeleton({ className }) {
  return <div className={cx("animate-pulse rounded-lg bg-stone-200/70", className)} style={{ background: "linear-gradient(90deg,rgba(120,120,110,0.12),rgba(120,120,110,0.22),rgba(120,120,110,0.12))", backgroundSize: "200% 100%", animation: "hn-shimmer 1.4s ease-in-out infinite" }} />;
}

function Badge({ tone = "neutral", children, t }) {
  const map = {
    ok: { bg: BRAND.okLight, fg: BRAND.ok },
    warn: { bg: BRAND.amberLight, fg: BRAND.amber },
    danger: { bg: BRAND.dangerLight, fg: BRAND.danger },
    info: { bg: BRAND.infoLight, fg: BRAND.info },
    brand: { bg: BRAND.primaryLight, fg: BRAND.primaryDark },
    neutral: { bg: "#EEF1EF", fg: t?.textMuted || "#54695C" },
    muted: { bg: "#E8EBE9", fg: "#6B7C72" },
  };
  const c = map[tone] || map.neutral;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: c.bg, color: c.fg }}>
      {children}
    </span>
  );
}

function Button({ variant = "primary", size = "md", className, children, icon: Icon, style: styleProp, ...props }) {
  const sizes = { sm: "px-2.5 py-1.5 text-xs gap-1.5", md: "px-3.5 py-2 text-sm gap-2", lg: "px-4 py-2.5 text-sm gap-2" };
  const base = "inline-flex items-center justify-center font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: { background: BRAND.primary, color: "#fff" },
    dark: { background: "#182521", color: "#fff" },
    danger: { background: BRAND.danger, color: "#fff" },
    ghost: { background: "transparent", color: "inherit" },
    outline: { background: "transparent", color: "inherit" },
  };
  const style = variants[variant] || variants.primary;
  const border = variant === "outline" ? "1px solid currentColor" : "none";
  return (
    <button
      className={cx(
        base,
        sizes[size],
        variant === "outline" && "hover:bg-black/[0.04]",
        variant === "ghost" && "hover:bg-black/5",
        (variant === "danger" || variant === "primary") && "hover:brightness-95",
        className
      )}
      style={{ ...style, border, opacity: props.disabled ? 0.5 : 1, ...styleProp }}
      {...props}
    >
      {Icon && <Icon size={size === "sm" ? 14 : 16} className={Icon === Loader2 ? "animate-spin" : undefined} />}
      {children}
    </button>
  );
}

function Card({ t, className, children, style, onClick, onMouseEnter, onMouseLeave }) {
  return (
    <div onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} className={cx("rounded-2xl border", className)} style={{ background: t.surface, borderColor: t.border, ...style }}>
      {children}
    </div>
  );
}

function IconBtn({ t, icon: Icon, onClick, title, active }) {
  return (
    <button title={title} onClick={onClick} className="p-2 rounded-lg transition-colors" style={{ background: active ? BRAND.primaryLight : "transparent", color: active ? BRAND.primaryDark : t.textMuted }}>
      <Icon size={17} />
    </button>
  );
}

function EmptyState({ t, icon: Icon = Inbox, title, sub, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: t.surfaceAlt, color: t.textFaint }}>
        <Icon size={24} />
      </div>
      <div className="font-semibold" style={{ color: t.text, fontFamily: FONT_DISPLAY, fontSize: 17 }}>{title}</div>
      {sub && <div className="text-sm mt-1.5 max-w-xs" style={{ color: t.textMuted }}>{sub}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function ErrorState({ t, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: BRAND.dangerLight, color: BRAND.danger }}>
        <AlertTriangle size={24} />
      </div>
      <div className="font-semibold" style={{ color: t.text, fontFamily: FONT_DISPLAY, fontSize: 17 }}>Couldn't load this data</div>
      <div className="text-sm mt-1.5" style={{ color: t.textMuted }}>Something went wrong while fetching from the API.</div>
      <Button variant="outline" size="sm" icon={RefreshCw} className="mt-4" onClick={onRetry} style={{ color: t.text }}>Retry</Button>
    </div>
  );
}

function Modal({ t, open, onClose, title, children, width = 520, footer }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto" style={{ background: "rgba(10,15,14,0.5)" }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full rounded-2xl shadow-2xl my-8" style={{ maxWidth: width, background: t.surface, border: `1px solid ${t.border}` }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: t.border }}>
          <div className="font-semibold" style={{ color: t.text, fontFamily: FONT_DISPLAY, fontSize: 18 }}>{title}</div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-black/5" style={{ color: t.textMuted }}><X size={18} /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 px-5 py-4 border-t" style={{ borderColor: t.border }}>{footer}</div>}
      </div>
    </div>
  );
}

/** Professional SweetAlert-style confirm / alert (theme-aware buttons with hover). */
function SweetConfirm({
  t,
  open,
  title = "Are you sure?",
  text,
  confirmText = "Yes, delete",
  cancelText = "Cancel",
  tone = "danger",
  loading = false,
  mode = "confirm",
  onConfirm,
  onCancel,
}) {
  const [hoverCancel, setHoverCancel] = useState(false);
  const [hoverConfirm, setHoverConfirm] = useState(false);
  const isAlert = mode === "alert";

  useEffect(() => {
    if (!open) {
      setHoverCancel(false);
      setHoverConfirm(false);
    }
  }, [open]);

  if (!open) return null;

  const isDanger = tone === "danger";
  const iconBg = isDanger ? BRAND.dangerLight : (tone === "ok" ? BRAND.okLight : BRAND.amberLight);
  const iconFg = isDanger ? BRAND.danger : (tone === "ok" ? BRAND.ok : BRAND.amber);
  const confirmBg = isAlert
    ? (hoverConfirm ? BRAND.primaryDark : BRAND.primary)
    : isDanger
      ? (hoverConfirm && !loading ? "#A83D35" : BRAND.danger)
      : (hoverConfirm && !loading ? BRAND.primaryDark : BRAND.primary);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={{ background: "rgba(14, 42, 28, 0.45)", backdropFilter: "blur(2px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel?.();
      }}
    >
      <div
        className="w-full max-w-[440px] rounded-2xl px-7 pt-8 pb-6 text-center animate-[hn-toast-in_.2s_ease]"
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          boxShadow: "0 24px 48px rgba(14, 42, 28, 0.18)",
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sweet-confirm-title"
      >
        <div
          className="mx-auto mb-5 w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: iconBg, color: iconFg, boxShadow: `0 0 0 8px ${iconBg}` }}
        >
          <AlertTriangle size={30} strokeWidth={2.25} />
        </div>
        <div
          id="sweet-confirm-title"
          className="mb-2 font-semibold tracking-tight"
          style={{ fontFamily: FONT_DISPLAY, fontSize: 22, color: t.text }}
        >
          {title}
        </div>
        {text && (
          <p className="text-sm leading-relaxed mb-7 whitespace-pre-line max-w-[340px] mx-auto" style={{ color: t.textMuted }}>
            {text}
          </p>
        )}
        <div className="flex items-center justify-center gap-3">
          {!isAlert && (
            <button
              type="button"
              disabled={loading}
              onClick={onCancel}
              onMouseEnter={() => setHoverCancel(true)}
              onMouseLeave={() => setHoverCancel(false)}
              className="min-w-[118px] px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: hoverCancel && !loading ? t.surfaceAlt : t.surface,
                color: t.text,
                border: `1.5px solid ${hoverCancel && !loading ? BRAND.primary : t.border}`,
                boxShadow: hoverCancel && !loading ? `0 0 0 3px ${BRAND.primaryLight}` : "none",
              }}
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            onMouseEnter={() => setHoverConfirm(true)}
            onMouseLeave={() => setHoverConfirm(false)}
            className="min-w-[132px] px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            style={{
              background: confirmBg,
              color: "#fff",
              border: "none",
              boxShadow: hoverConfirm && !loading
                ? (isAlert || !isDanger
                  ? `0 8px 20px ${BRAND.primary}55`
                  : "0 8px 20px rgba(193, 72, 63, 0.35)")
                : "0 2px 8px rgba(0,0,0,0.12)",
              transform: hoverConfirm && !loading ? "translateY(-1px)" : "none",
            }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? "Please wait…" : (isAlert ? (confirmText || "OK") : confirmText)}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ t, label, hint, children }) {
  return (
    <label className="block mb-3.5">
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="text-xs font-semibold" style={{ color: t.textMuted }}>{label}</div>
        {hint && (
          <span title={hint} className="inline-flex cursor-help" style={{ color: t.textFaint }}>
            <Info size={13} aria-hidden="true" />
          </span>
        )}
      </div>
      {children}
    </label>
  );
}
function inputStyle(t) { return { background: t.surfaceAlt, borderColor: t.border, color: t.text }; }
function Input(props) { return <input {...props} className={cx("w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2", props.className)} style={{ ...props.style, boxShadow: "none" }} />; }
function Pagination({ t, page, totalPages, onPage, total, pageSize }) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t text-sm" style={{ borderColor: t.border, color: t.textMuted }}>
      <div>Showing <span style={{ color: t.text, fontWeight: 600 }}>{start}–{end}</span> of <span style={{ color: t.text, fontWeight: 600 }}>{total}</span></div>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="p-1.5 rounded-lg border disabled:opacity-40" style={{ borderColor: t.border }}><ChevronLeft size={15} /></button>
        <span className="px-2 text-xs">Page {page} of {totalPages || 1}</span>
        <button disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="p-1.5 rounded-lg border disabled:opacity-40" style={{ borderColor: t.border }}><ChevronRight size={15} /></button>
      </div>
    </div>
  );
}

function Th({ t, label, sortKey, sort, onSort, className }) {
  const active = sort?.key === sortKey;
  return (
    <th className={cx("text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide select-none", sortKey && "cursor-pointer", className)}
      style={{ color: t.textFaint }} onClick={() => sortKey && onSort(sortKey)}>
      <span className="inline-flex items-center gap-1">{label}{sortKey && <ArrowUpDown size={11} style={{ opacity: active ? 1 : 0.4, color: active ? BRAND.primary : t.textFaint }} />}</span>
    </th>
  );
}

function ActionsTh({ t }) {
  return (
    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide w-16" style={{ color: t.textFaint }}>
      Actions
    </th>
  );
}

function Avatar({ name, size = 32 }) {
  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const hue = (name.charCodeAt(0) * 37) % 360;
  return (
    <div className="rounded-full flex items-center justify-center font-semibold shrink-0" style={{ width: size, height: size, fontSize: size * 0.36, background: `hsl(${hue} 35% 92%)`, color: `hsl(${hue} 45% 32%)` }}>
      {initials}
    </div>
  );
}

/* Toasts */
function ToastHost({ toasts, remove }) {
  const icon = { success: CheckCircle2, error: XCircle, info: Sparkles };
  const color = { success: BRAND.ok, error: BRAND.danger, info: BRAND.info };
  return (
    <div className="fixed top-5 right-5 z-[200] flex flex-col gap-2 w-[320px] max-w-[90vw]">
      {toasts.map((tt) => {
        const Icon = icon[tt.type] || Sparkles;
        return (
          <div key={tt.id} className="flex items-start gap-2.5 rounded-xl shadow-lg px-3.5 py-3 animate-[hn-toast-in_.22s_ease]" style={{ background: "#152220", color: "#fff", border: "1px solid rgba(255,255,255,0.08)" }}>
            <Icon size={17} style={{ color: color[tt.type] || "#fff", marginTop: 1, flexShrink: 0 }} />
            <div className="text-sm leading-snug">{tt.msg}</div>
            <button onClick={() => remove(tt.id)} className="ml-auto text-white/50 hover:text-white"><X size={14} /></button>
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================================
   NAV CONFIG
   ========================================================================= */
const NAV = [
  { section: "Overview", items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    section: "Community", items: [
      { id: "users", label: "User Management", icon: Users },
      { id: "categories", label: "Healthcare Categories", icon: Heart },
      { id: "communities", label: "WhatsApp Communities", icon: MessageCircle },
    ]
  },
  {
    section: "Locations", items: [
      { id: "locations", label: "Location Management", icon: MapPin },
      { id: "group-management", label: "Group Management", icon: Network },
    ]
  },
  {
    section: "Content", items: [
      { id: "banners", label: "Banner Management", icon: ImageIcon },
      { id: "cms", label: "CMS Pages", icon: FileCode2 },
    ]
  },
  {
    section: "Engagement", items: [
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "email", label: "Email Templates", icon: Mail },
    ]
  },
  {
    section: "Insights", items: [
      { id: "analytics", label: "Analytics", icon: PieIcon },
    ]
  },
  {
    section: "System", items: [
      { id: "roles", label: "Roles", icon: ShieldCheck },
      { id: "permissions", label: "Permissions", icon: Key },
      { id: "settings", label: "Settings", icon: SettingsIcon },
    ]
  },
];
const LABELS = Object.fromEntries(NAV.flatMap((s) => s.items).map((i) => [i.id, i.label]));

function AccessDeniedPanel({ t, message, onGoHome, homeLabel = "Go to your home page" }) {
  return (
    <Card t={t} className="p-8 max-w-lg mx-auto mt-10 text-center">
      <div className="mx-auto mb-4 w-12 h-12 rounded-full flex items-center justify-center" style={{ background: `${BRAND.danger}18` }}>
        <ShieldCheck size={22} style={{ color: BRAND.danger }} />
      </div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 600, color: t.text, marginBottom: 8 }}>
        Access denied
      </div>
      <p className="text-sm leading-relaxed mb-5" style={{ color: t.textMuted }}>
        {message}
      </p>
      {onGoHome && (
        <Button onClick={onGoHome}>{homeLabel}</Button>
      )}
    </Card>
  );
}

/* =========================================================================
   KPI CARD (signature element: serif number + inline sparkline)
   ========================================================================= */
function Kpi({ t, label, value, delta, trend, tone = "brand", onClick }) {
  const toneColor = { brand: BRAND.primary, amber: BRAND.amber, info: BRAND.info, danger: BRAND.danger, ok: BRAND.ok }[tone];
  return (
    <Card
      t={t}
      onClick={onClick}
      className={`p-4 sm:p-5 flex flex-col gap-3 transition-all duration-200 ${onClick ? "cursor-pointer hover:scale-[1.02] hover:shadow-lg hover:border-emerald-500/50 group" : ""
        }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1" style={{ color: t.textFaint }}>
          {label}
        </span>
        {delta != null ? (
          <span className="text-xs font-semibold flex items-center gap-0.5" style={{ color: delta >= 0 ? BRAND.ok : BRAND.danger }}>
            <TrendingUp size={12} style={{ transform: delta < 0 ? "scaleY(-1)" : "none" }} /> {delta >= 0 ? "+" : ""}{delta}%
          </span>
        ) : onClick ? (
          <ArrowRight size={14} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" style={{ color: toneColor }} />
        ) : null}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 600, color: t.text, lineHeight: 1 }}>{value}</div>
        {trend && (
          <div style={{ width: 72, height: 30 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id={`spark-${label.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={toneColor} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={toneColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={toneColor} strokeWidth={1.75} fill={`url(#spark-${label.replace(/\s+/g, '-')})`} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
const spark = (base, vol) => Array.from({ length: 8 }, (_, i) => ({ v: Math.max(4, base + Math.sin(i * 1.3) * vol + i * (vol / 4)) }));

/* =========================================================================
   GENERIC DATA TABLE (drives Users / Events / Tickets / Categories / content pages)
   ========================================================================= */
function useTableState(data, { searchKeys = [], initialSort = null, pageSize = 8 }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});

  const filtered = useMemo(() => {
    let rows = data;
    Object.entries(filters).forEach(([k, v]) => { if (v && v !== "All") rows = rows.filter((r) => r[k] === v); });
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((r) => searchKeys.some((k) => String(r[k] ?? "").toLowerCase().includes(q)));
    }
    if (sort) {
      rows = [...rows].sort((a, b) => {
        const av = a[sort.key], bv = b[sort.key];
        const res = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
        return sort.dir === "asc" ? res : -res;
      });
    }
    return rows;
  }, [data, query, sort, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const onSort = (key) => setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  useEffect(() => setPage(1), [query, filters]);

  return { query, setQuery, sort, onSort, page, setPage: (p) => setPage(Math.min(Math.max(1, p), totalPages)), filters, setFilters, filtered, pageRows, totalPages };
}

function TableToolbar({ t, query, setQuery, placeholder, right }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b" style={{ borderColor: t.border }}>
      <div className="relative flex-1 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: t.textFaint }} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm outline-none" style={inputStyle(t)} />
      </div>
      {right && <div className="flex items-center gap-2 flex-wrap sm:ml-auto">{right}</div>}
    </div>
  );
}

/* =========================================================================
   SIDEBAR
   ========================================================================= */
function Sidebar({ sections, active, onNav, open, setOpen, isDesktop, dark, onLogout }) {
  const showAsDrawer = !isDesktop;
  const visible = isDesktop || open;
  const RAIL_T = dark ? RAIL : RAIL_LIGHT;
  return (
    <>
      {showAsDrawer && open && <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setOpen(false)} />}
      <aside
        className={cx(
          "shrink-0 w-[248px] z-50 transition-transform duration-300 ease-in-out",
          isDesktop ? "h-full" : "fixed top-0 left-0 h-screen",
          visible ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ background: RAIL_T.bg, borderRight: `1px solid ${RAIL_T.border}`, boxShadow: dark ? "none" : "1px 0 0 rgba(15,40,35,0.03)" }}
      >
        <div className="w-[248px] h-full flex flex-col">
          <div className="flex items-center gap-2.5 px-5 h-16 shrink-0" style={{ borderBottom: `1px solid ${RAIL_T.border}` }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${BRAND.primary}, #8DC63F)` }}>
              <Leaf size={16} color="#fff" />
            </div>
            <div className="min-w-0">
              <div style={{ fontFamily: FONT_DISPLAY, color: dark ? "#fff" : RAIL_T.text, fontSize: 15.5, fontWeight: 600, lineHeight: 1.1 }}>HealerNet</div>
              <div style={{ color: RAIL_T.textDim, fontSize: 10, letterSpacing: 0.4 }} className="truncate">GLOBAL HEALING NETWORK</div>
            </div>
            {showAsDrawer && (
              <button className="ml-auto p-1 rounded-lg shrink-0" style={{ background: "transparent" }} onClick={() => setOpen(false)} title="Close menu"
                onMouseEnter={(e) => (e.currentTarget.style.background = dark ? "rgba(255,255,255,0.1)" : "rgba(15,40,35,0.06)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <X size={17} color={RAIL_T.text} />
              </button>
            )}
          </div>
          <nav className="flex-1 overflow-y-auto px-3 py-4" style={{ scrollbarWidth: "thin" }}>
            {sections.map((sec) => (
              <div key={sec.section} className="mb-4">
                <div className="px-2.5 mb-1.5 text-[10.5px] font-bold uppercase tracking-wider" style={{ color: RAIL_T.textDim }}>{sec.section}</div>
                {sec.items.map((item) => {
                  const isActive = active === item.id;
                  const Icon = item.icon;
                  return (
                    <button key={item.id} onClick={() => { onNav(item.id); if (showAsDrawer) setOpen(false); }}
                      className="relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] font-medium mb-0.5 transition-colors"
                      style={{ background: isActive ? RAIL_T.bgActive : "transparent", color: isActive ? (dark ? "#fff" : BRAND.primary) : RAIL_T.text }}>
                      {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full" style={{ background: RAIL_T.indicator }} />}
                      <Icon size={16} strokeWidth={2} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="px-3 py-3" style={{ borderTop: `1px solid ${RAIL_T.border}` }}>
            <button onClick={onLogout} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13.5px] font-medium hover:bg-rose-500/10 cursor-pointer" style={{ color: RAIL_T.danger }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

/* =========================================================================
   HEADER
   ========================================================================= */
const HeaderClock = memo(function HeaderClock({ t }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  const dateStr = now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const timeStr = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs" style={{ borderColor: t.border, background: t.surfaceAlt, color: t.textMuted }}>
      <Clock size={13} style={{ color: BRAND.primary }} />
      <span>{dateStr}</span>
      <span style={{ color: t.border }}>|</span>
      <span className="tabular-nums font-mono font-medium" style={{ color: t.text }}>{timeStr}</span>
    </div>
  );
});

const ADMIN_NOTIF_ICONS = {
  user_registered: UserCheck,
  password_reset_requested: Key,
  password_reset_completed: ShieldCheck,
  community_join: MessageCircle,
  info: Bell,
};

function formatAdminNotifTime(value, timeAgo) {
  if (timeAgo) return timeAgo;
  if (!value) return "";
  try {
    const date = new Date(value);
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  } catch {
    return "";
  }
}

const Header = memo(function Header({ t, dark, setDark, sidebarOpen, isDesktop, onMenu, section, notifOpen, setNotifOpen, profileOpen, setProfileOpen, onLogout, user, onNav, canAccessSection }) {
  const adminName = user?.name || "System Administrator";
  const adminEmail = user?.email || "admin@healernet.org";

  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [hoveredProfileItem, setHoveredProfileItem] = useState(null);
  const [hoveredSearchItem, setHoveredSearchItem] = useState(null);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);

  const fetchAdminNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      const res = await apiFetch("/admin/notifications/inbox");
      const data = res.ok ? await res.json() : null;
      if (data?.status === "success") {
        setAdminNotifications(data.data || []);
        setUnreadNotifCount(typeof data.unread_count === "number" ? data.unread_count : 0);
      }
    } catch {
      /* keep previous list */
    } finally {
      setNotifLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminNotifications();
    const interval = setInterval(fetchAdminNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchAdminNotifications]);

  useEffect(() => {
    if (notifOpen) fetchAdminNotifications();
  }, [notifOpen, fetchAdminNotifications]);

  const handleNotificationClick = async (notification) => {
    if (!notification?.id) return;
    try {
      if (!notification.read_at) {
        const res = await apiFetch(`/admin/notifications/${notification.id}/read`, { method: "PATCH" });
        const data = res.ok ? await res.json() : null;
        if (typeof data?.unread_count === "number") {
          setUnreadNotifCount(data.unread_count);
        } else {
          setUnreadNotifCount((count) => Math.max(0, count - 1));
        }
        setAdminNotifications((items) =>
          items.map((item) => (item.id === notification.id ? { ...item, read_at: new Date().toISOString() } : item))
        );
      }
    } catch {
      /* ignore */
    }
    setNotifOpen(false);
    if (notification.link_section && onNav) {
      onNav(notification.link_section);
    }
  };

  const handleMarkAllNotificationsRead = async (event) => {
    event.stopPropagation();
    try {
      const res = await apiFetch("/admin/notifications/read-all", { method: "POST" });
      if (res.ok) {
        setUnreadNotifCount(0);
        setAdminNotifications((items) => items.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
      }
    } catch {
      /* ignore */
    }
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase().trim();
    const matches = [];

    NAV.flatMap((s) => s.items).forEach((item) => {
      if (!canAccessSection?.(item.id)) return;
      if (item.label.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)) {
        matches.push({ type: "Page", label: item.label, id: item.id, icon: item.icon });
      }
    });

    return matches;
  }, [searchQuery, canAccessSection]);

  const handleProfileItemClick = (label) => {
    setProfileOpen(false);
    if (label === "Logout") {
      if (onLogout) onLogout();
    } else if (label === "My Profile") {
      if (onNav) onNav("settings");
    }
  };

  return (
    <header
      className="z-30 flex items-center justify-between gap-4 px-4 sm:px-6 h-16 shrink-0 border-b"
      style={{ background: t.surface, borderColor: t.border, transform: 'translateZ(0)', backfaceVisibility: 'hidden' }}
    >
      <div className="flex items-center gap-3">
        {!isDesktop && (
          <button className="p-1.5 -ml-1.5" onClick={onMenu} title="Open menu">
            <Menu size={19} style={{ color: t.text }} />
          </button>
        )}
        <div className="hidden md:block">
          <div className="text-xs" style={{ color: t.textFaint }}>
            <span className="font-semibold" style={{ color: t.textMuted }}>Admin</span>
            {" / "}{LABELS[section]}
          </div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: t.text, fontWeight: 600 }}>Welcome back, {adminName}</div>
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 ml-auto">
        <div className="relative w-48 sm:w-64 lg:w-72 hidden sm:block">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: t.textFaint }} />
          <input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search navigation, settings, pages…"
            className="w-full pl-9 pr-8 py-2 rounded-lg border text-sm outline-none"
            style={inputStyle(t)}
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(""); setSearchOpen(false); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-black/10 text-xs"
              style={{ color: t.textFaint }}
            >
              <X size={13} />
            </button>
          )}

          {searchOpen && searchQuery.trim() && (
            <div
              className="absolute left-0 right-0 mt-2 rounded-xl shadow-2xl border overflow-hidden text-sm z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              style={{ background: t.surface, borderColor: t.border }}
            >
              <div className="px-3.5 py-2 text-xs font-semibold uppercase tracking-wider border-b" style={{ color: t.textFaint, borderColor: t.border }}>
                Search Results ({searchResults.length})
              </div>
              {searchResults.length > 0 ? (
                <div className="max-h-60 overflow-y-auto py-1">
                  {searchResults.map((res) => {
                    const IconComponent = res.icon || LayoutDashboard;
                    const isHovered = hoveredSearchItem === res.id;
                    return (
                      <button
                        key={res.id}
                        onMouseEnter={() => setHoveredSearchItem(res.id)}
                        onMouseLeave={() => setHoveredSearchItem(null)}
                        onClick={() => {
                          if (onNav) onNav(res.id);
                          setSearchOpen(false);
                          setSearchQuery("");
                        }}
                        className="w-full text-left px-3.5 py-2.5 flex items-center justify-between transition-colors"
                        style={{
                          background: isHovered
                            ? (dark ? "rgba(141, 198, 63, 0.2)" : "rgba(141, 198, 63, 0.15)")
                            : "transparent",
                          color: t.text,
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <IconComponent size={16} style={{ color: BRAND.primary }} />
                          <span className="font-medium">{res.label}</span>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: t.surfaceAlt, color: t.textFaint }}>
                          {res.type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-xs" style={{ color: t.textFaint }}>
                  No matching page or section found.
                </div>
              )}
            </div>
          )}
        </div>

        <HeaderClock t={t} />

        <div className="flex items-center gap-1">
          <IconBtn t={t} icon={dark ? Sun : Moon} onClick={() => setDark((d) => !d)} title="Toggle theme" />
          <div className="relative">
            <IconBtn t={t} icon={Bell} active={notifOpen} onClick={(e) => { e.stopPropagation(); setNotifOpen((v) => !v); setProfileOpen(false); }} title="Notifications" />
            {unreadNotifCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: BRAND.danger }} />
            )}
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl shadow-xl border overflow-hidden z-50" onClick={(e) => e.stopPropagation()} style={{ background: t.surface, borderColor: t.border }}>
                <div className="px-4 py-3 border-b flex items-center justify-between gap-2" style={{ borderColor: t.border }}>
                  <div className="font-semibold text-sm" style={{ color: t.text }}>Notifications</div>
                  {unreadNotifCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllNotificationsRead}
                      className="text-xs font-semibold hover:underline"
                      style={{ color: BRAND.primary }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                {notifLoading && adminNotifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-xs" style={{ color: t.textFaint }}>Loading notifications…</div>
                ) : adminNotifications.length > 0 ? (
                  <div className="max-h-80 overflow-y-auto">
                    {adminNotifications.map((n) => {
                      const IconComponent = ADMIN_NOTIF_ICONS[n.type] || Bell;
                      const isUnread = !n.read_at;
                      return (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => handleNotificationClick(n)}
                          className="w-full flex items-start gap-2.5 px-4 py-3 border-b last:border-0 hover:bg-black/5 text-left transition-colors"
                          style={{ borderColor: t.border, background: isUnread ? (dark ? "rgba(141, 198, 63, 0.08)" : "rgba(141, 198, 63, 0.06)") : "transparent" }}
                        >
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: t.surfaceAlt, color: t.textMuted }}>
                            <IconComponent size={14} />
                          </div>
                          <div className="text-xs min-w-0 flex-1" style={{ color: t.text }}>
                            <div className="font-semibold">{n.title}</div>
                            <div className="mt-0.5 leading-relaxed" style={{ color: t.textMuted }}>{n.body}</div>
                            <div style={{ color: t.textFaint, marginTop: 4 }}>{formatAdminNotifTime(n.created_at, n.time_ago)}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-8 text-center text-xs" style={{ color: t.textFaint }}>
                    No notifications yet. New registrations and password resets will appear here.
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setProfileOpen((v) => !v); setNotifOpen(false); }} className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-lg hover:bg-black/5">
              <Avatar name={adminName} size={30} />
              <ChevronDown size={14} style={{ color: t.textMuted }} className="hidden sm:block" />
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-2xl border overflow-hidden text-sm z-50" onClick={(e) => e.stopPropagation()} style={{ background: t.surface, borderColor: t.border }}>
                <div className="px-4 py-3 border-b" style={{ borderColor: t.border }}>
                  <div className="font-semibold" style={{ color: t.text }}>{adminName}</div>
                  <div style={{ color: t.textFaint, fontSize: 12 }}>{adminEmail}</div>
                </div>
                {[
                  { label: "My Profile", icon: UserIcon },
                  { label: "Logout", icon: LogOut },
                ].map((item) => {
                  const isLogout = item.label === "Logout";
                  const isHovered = hoveredProfileItem === item.label;
                  return (
                    <button
                      key={item.label}
                      onClick={() => handleProfileItemClick(item.label)}
                      onMouseDown={(e) => e.stopPropagation()}
                      onMouseEnter={() => setHoveredProfileItem(item.label)}
                      onMouseLeave={() => setHoveredProfileItem(null)}
                      className="w-full text-left px-4 py-3 flex items-center gap-3 transition-all duration-150 font-medium"
                      style={{
                        background: isHovered
                          ? (isLogout ? "rgba(239, 68, 68, 0.14)" : (dark ? "rgba(141, 198, 63, 0.2)" : "rgba(141, 198, 63, 0.15)"))
                          : "transparent",
                        color: isLogout ? BRAND.danger : (isHovered ? BRAND.primary : t.text),
                      }}
                    >
                      {item.icon && (
                        <item.icon
                          size={16}
                          style={{
                            color: isLogout ? BRAND.danger : (isHovered ? BRAND.primary : t.textMuted),
                            transform: isHovered ? "scale(1.15)" : "scale(1)",
                            transition: "transform 0.15s ease",
                          }}
                        />
                      )}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
});

/* =========================================================================
   DASHBOARD PAGE
   ========================================================================= */
function DashboardPage({ t, dark, toast, onNav, canAccessSection }) {
  const [metrics, setMetrics] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [dashLoading, setDashLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setDashLoading(true);

    Promise.all([
      apiFetch("/admin/dashboard").then((r) => r.ok ? r.json() : null).catch(() => null),
      apiFetch("/admin/users?limit=8").then((r) => r.ok ? r.json() : null).catch(() => null),
    ]).then(([dashRes, usersRes]) => {
      if (!isMounted) return;
      if (dashRes?.data) {
        setMetrics(dashRes.data);
      }

      const dashUsers = dashRes?.data?.recent_users;
      const directUsers = usersRes?.data?.data || (Array.isArray(usersRes?.data) ? usersRes.data : []);

      const rawList = (Array.isArray(dashUsers) && dashUsers.length > 0)
        ? dashUsers
        : ((Array.isArray(dashUsers?.data) && dashUsers.data.length > 0)
          ? dashUsers.data
          : (Array.isArray(directUsers) ? directUsers : []));

      setRecentUsers(rawList);
    }).finally(() => {
      if (isMounted) setDashLoading(false);
    });

    return () => { isMounted = false; };
  }, []);

  const totalUsers = metrics?.total_users ?? recentUsers.length;
  const verificationRate = metrics?.verification_rate ?? 0;
  const activeCommunities = metrics?.active_communities ?? COMMUNITIES.length;
  const fullCommunities = metrics?.full_communities ?? COMMUNITIES.filter((c) => c.status === "Full").length;
  const communityCount = metrics?.group_management_count
    ?? metrics?.community_count
    ?? 0;
  const totalCountries = metrics?.total_countries ?? 0;

  const regGrowthData = Array.isArray(metrics?.reg_growth)
    ? metrics.reg_growth
    : (Array.isArray(metrics?.reg_growth?.data) ? metrics.reg_growth.data : []);

  const categoryDistData = Array.isArray(metrics?.category_dist)
    ? metrics.category_dist
    : (Array.isArray(metrics?.category_dist?.data)
      ? metrics.category_dist.data
      : (metrics?.category_dist && typeof metrics.category_dist === "object" ? Object.values(metrics.category_dist) : CATEGORY_DIST));

  const recentUsersData = useMemo(() => {
    if (!Array.isArray(recentUsers) || recentUsers.length === 0) return [];
    return recentUsers.map((u) => ({
      id: u.id,
      name: u.name || u.full_name || "N/A",
      email: u.email || "N/A",
      mobile: u.mobile || u.mobile_number || u.phone || "-",
      category: u.category?.name || (typeof u.category === "string" ? u.category : "-") || "-",
      country: u.country?.name || (typeof u.country === "string" ? u.country : "-") || "-",
      state: u.state?.name || (typeof u.state === "string" ? u.state : "-") || "-",
      city: u.city?.name || (typeof u.city === "string" ? u.city : "-") || "-",
      registered: u.created_at ? new Date(u.created_at).toISOString().split("T")[0] : "-",
      status: u.status ? (u.status.charAt(0).toUpperCase() + u.status.slice(1)) : "Active",
    }));
  }, [recentUsers]);

  const table = useTableState(recentUsersData, {
    searchKeys: ["name", "email", "mobile", "category", "city", "country", "state"],
    initialSort: { key: "registered", dir: "desc" },
    pageSize: 8,
  });

  if (dashLoading) {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-[104px]" />)}</div>
        <Skeleton className="h-[320px]" />
      </div>
    );
  }

  const showUsers = canAccessSection("users");
  const showCommunities = canAccessSection("communities");
  const showCategories = canAccessSection("categories");
  const showLocations = canAccessSection("locations");
  const showGroupManagement = canAccessSection("group-management");
  const showSettings = canAccessSection("settings");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {showUsers && (
          <>
            <Kpi t={t} label="Registered Users" value={totalUsers.toLocaleString()} delta={12.4} trend={spark(30, 8)} tone="brand" onClick={() => onNav("users")} />
            <Kpi t={t} label="Verification Rate" value={`${verificationRate}%`} delta={8.1} trend={spark(26, 6)} tone="ok" onClick={() => onNav("users")} />
          </>
        )}
        {showCommunities && (
          <>
            <Kpi t={t} label="Active WhatsApp Groups" value={activeCommunities} delta={5.0} trend={spark(15, 4)} tone="brand" onClick={() => onNav("communities")} />
            <Kpi t={t} label="Communities Full" value={fullCommunities} tone="danger" onClick={() => onNav("communities")} />
          </>
        )}
        {showCategories && (
          <Kpi t={t} label="Healthcare Categories" value={metrics?.total_categories ?? CATEGORIES.length} tone="info" onClick={() => onNav("categories")} />
        )}
        {showGroupManagement && (
          <Kpi
            t={t}
            label="Group Management"
            value={Number(communityCount).toLocaleString()}
            trend={spark(Math.max(8, Number(communityCount) || 8), 4)}
            tone="brand"
            onClick={() => onNav("group-management")}
          />
        )}
        {showLocations && (
          <Kpi t={t} label="Countries" value={totalCountries} tone="info" onClick={() => onNav("locations")} />
        )}
        {showSettings && (
          <Kpi t={t} label="System Status" value="Healthy" tone="ok" onClick={() => onNav("settings")} />
        )}
      </div>

      {(showUsers || showCategories) && (
        <div className="grid lg:grid-cols-3 gap-5">
          {showUsers && (
            <Card t={t} className="lg:col-span-2 p-5">
              <div className="flex items-center justify-between mb-1">
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 600, color: t.text }}>User Registration Growth</div>
                <Badge tone="brand" t={t}>Last 7 months</Badge>
              </div>
              <div className="h-[260px] mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={regGrowthData} margin={{ left: -20, top: 5 }}>
                    <defs>
                      <linearGradient id="regGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BRAND.primary} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={BRAND.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: t.textFaint }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: t.textFaint }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${t.border}`, background: t.surface, fontSize: 12 }} />
                    <Area type="monotone" dataKey="users" stroke={BRAND.primary} strokeWidth={2.25} fill="url(#regGrad)" name="Users" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {showCategories && (
            <Card t={t} className={`p-5 ${showUsers ? "" : "lg:col-span-3"}`}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 600, color: t.text }}>Category Distribution</div>
              <div className="h-[260px] mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <RePieChart>
                    <Pie data={categoryDistData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={2}>
                      {categoryDistData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${t.border}`, background: t.surface, fontSize: 12 }} />
                  </RePieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-1">
                {categoryDistData.slice(0, 6).map((c, i) => (
                  <div key={c.name} className="flex items-center gap-1.5 text-xs" style={{ color: t.textMuted }}>
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="truncate">{c.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {showUsers && (
        <Card t={t}>
          <div className="flex items-center justify-between px-5 pt-4">
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 600, color: t.text }}>Recent Registrations</div>
            <Button variant="ghost" size="sm" icon={ArrowRight} onClick={() => onNav("users")} style={{ color: BRAND.primary }}>View all users</Button>
          </div>
          <TableToolbar t={t} query={table.query} setQuery={table.setQuery} placeholder="Search recent registrations…" />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>
                <Th t={t} label="Profile" />
                <Th t={t} label="Full Name" sortKey="name" sort={table.sort} onSort={table.onSort} />
                <Th t={t} label="Email" sortKey="email" sort={table.sort} onSort={table.onSort} />
                <Th t={t} label="Mobile Number" />
                <Th t={t} label="Category" sortKey="category" sort={table.sort} onSort={table.onSort} />
                <Th t={t} label="Country" />
                <Th t={t} label="State" />
                <Th t={t} label="City" />
                <Th t={t} label="Registered Date" sortKey="registered" sort={table.sort} onSort={table.onSort} />
                <Th t={t} label="Status" />
              </tr></thead>
              <tbody>
                {table.pageRows.map((u) => (
                  <tr key={u.id} className="border-t hover:bg-black/[0.02]" style={{ borderColor: t.border }}>
                    <td className="px-4 py-3"><Avatar name={u.name} size={32} /></td>
                    <td className="px-4 py-3 text-sm font-semibold" style={{ color: t.text }}>{u.name}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: t.textMuted }}>{u.email}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: t.textMuted, fontFamily: FONT_MONO, fontSize: 12.5 }}>{u.mobile}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: t.textMuted }}>{u.category}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: t.textMuted }}>{u.country}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: t.textMuted }}>{u.state}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: t.textMuted }}>{u.city}</td>
                    <td className="px-4 py-3 text-sm" style={{ color: t.textMuted, fontFamily: FONT_MONO, fontSize: 12.5 }}>{u.registered}</td>
                    <td className="px-4 py-3"><StatusBadge t={t} status={u.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {table.pageRows.length === 0 && <EmptyState t={t} title="No registrations match your search" sub="Try a different name or email." />}
          </div>
          <Pagination t={t} page={table.page} totalPages={table.totalPages} onPage={table.setPage} total={table.filtered.length} pageSize={8} />
        </Card>
      )}

      {!showUsers && !showCommunities && !showCategories && !showLocations && !showSettings && (
        <AccessDeniedPanel
          t={t}
          message="Your role does not include dashboard widgets. Use the sidebar to open pages assigned to you."
        />
      )}
    </div>
  );
}

function StatusBadge({ t, status }) {
  const normalized = status ? String(status).charAt(0).toUpperCase() + String(status).slice(1).toLowerCase() : "Active";
  const map = { Active: "ok", Pending: "warn", Suspended: "danger", Full: "danger", Inactive: "muted", Upcoming: "info", Completed: "neutral", Open: "warn", Assigned: "info", Resolved: "ok", Paused: "muted", Draft: "muted", Published: "ok" };
  return <Badge tone={map[normalized] || "neutral"} t={t}>{normalized}</Badge>;
}

/* =========================================================================
   USER MANAGEMENT (Dynamic Database Integration)
   ========================================================================= */
function MenuItem({ t, icon: Icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-black/5"
      style={{ color: danger ? BRAND.danger : t.text }}
    >
      {Icon && <Icon size={14} />}
      {label}
    </button>
  );
}

function UsersPage({ t, toast }) {
  const { can } = usePermissions();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState(CATEGORIES);
  const [selected, setSelected] = useState(new Set());
  const [modal, setModal] = useState(null); // { mode: 'create' | 'edit', user }

  // Search & Filter State
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ status: "All", category_id: "All" });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [sort, setSort] = useState({ key: "created_at", dir: "desc" });
  const refreshResetRef = useRef(false);

  // Debounced search query
  const [debouncedQuery, setDebouncedQuery] = useState("");
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  // Fetch Categories from Database
  useEffect(() => {
    let isMounted = true;
    apiFetch("/admin/categories")
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json?.data?.length > 0) {
          setCategories(json.data);
        }
      })
      .catch((err) => console.error("Error loading categories:", err));
    return () => { isMounted = false; };
  }, []);

  // Fetch Users from Database API
  const fetchUsers = useCallback(async ({ silent = false, bustCache = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", page);
      params.set("limit", 10);
      if (debouncedQuery.trim()) params.set("search", debouncedQuery.trim());
      if (filters.status && filters.status !== "All") params.set("status", filters.status.toLowerCase());
      if (filters.category_id && filters.category_id !== "All") params.set("category_id", filters.category_id);
      if (sort.key) {
        params.set("sort_by", sort.key);
        params.set("order", sort.dir);
      }
      if (bustCache) params.set("_", String(Date.now()));

      const res = await apiFetch(`/admin/users?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch users");
      const json = await res.json();

      const paginated = json.data || json;
      const items = paginated.data || [];
      setUsers(items);
      setTotalPages(paginated.last_page || 1);
      setTotalUsers(paginated.total || items.length);
    } catch (err) {
      console.error(err);
      setError("Failed to load users from database. Please check connection.");
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }, [page, debouncedQuery, filters, sort]);

  useEffect(() => {
    const silent = refreshResetRef.current;
    refreshResetRef.current = false;
    fetchUsers({ silent });
  }, [fetchUsers]);

  const handleRefresh = () => {
    setSelected(new Set());
    const alreadyDefault = query === "" && debouncedQuery === "" && filters.status === "All" && filters.category_id === "All" && page === 1;
    if (alreadyDefault) {
      fetchUsers({ silent: true, bustCache: true });
      return;
    }
    refreshResetRef.current = true;
    setQuery("");
    setFilters({ status: "All", category_id: "All" });
    setPage(1);
  };

  const hasActiveFilters = debouncedQuery.trim() !== "" || filters.status !== "All" || filters.category_id !== "All";
  const canCreateUser = can("users.create");
  const usersEmptyState = useMemo(() => {
    if (!hasActiveFilters && totalUsers === 0) {
      return {
        sub: 'No users registered yet. Use "Add User" to create one manually.',
        showCreate: canCreateUser,
      };
    }
    if (hasActiveFilters) {
      return {
        sub: "Try clearing your search or filters to see more results, or add a new user.",
        showCreate: canCreateUser,
      };
    }
    return { sub: "No records match the current view.", showCreate: false };
  }, [hasActiveFilters, totalUsers, canCreateUser]);

  const toggleAll = () => {
    const ids = users.map((r) => String(r.id));
    const allSel = ids.length > 0 && ids.every((id) => selected.has(id));
    const next = new Set(selected);
    ids.forEach((id) => (allSel ? next.delete(id) : next.add(id)));
    setSelected(next);
  };
  const toggle = (id) => {
    const key = String(id);
    const next = new Set(selected);
    next.has(key) ? next.delete(key) : next.add(key);
    setSelected(next);
  };

  const onSort = (key) => {
    setSort((s) => ({
      key,
      dir: s.key === key && s.dir === "asc" ? "desc" : "asc",
    }));
  };

  const updateStatus = async (id, newStatus) => {
    try {
      const res = await apiFetch(`/admin/users/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: userStatusForApi(newStatus) }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast(`User status updated to ${newStatus}`, "success");
      fetchUsers();
    } catch {
      toast("Failed to update user status", "danger");
    }
  };

  const verifyEmail = () => {
    toast("Verification email confirmed", "success");
  };

  const removeUser = async (id) => {
    try {
      const res = await apiFetch(`/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
      toast("User deleted successfully", "success");
      fetchUsers();
    } catch {
      toast("Failed to delete user", "danger");
    }
  };

  const bulkDelete = async () => {
    try {
      const res = await apiFetch(`/admin/users/bulk`, {
        method: "POST",
        body: JSON.stringify({ action: "delete", user_ids: Array.from(selected) }),
      });
      if (!res.ok) throw new Error("Bulk delete failed");
      toast(`${selected.size} users deleted successfully`, "success");
      setSelected(new Set());
      fetchUsers();
    } catch {
      toast("Failed to perform bulk delete", "danger");
    }
  };

  const exportAs = (fmt) => {
    const columns = [
      { key: "id", label: "User ID" },
      { key: "name", label: "Full Name" },
      { key: "email", label: "Email Address" },
      { key: "mobile", label: "Mobile Number" },
      { key: "category", label: "Category" },
      { key: "country", label: "Country" },
      { key: "state", label: "State" },
      { key: "city", label: "City" },
      { key: "created_at", label: "Registered Date" },
      { key: "status", label: "Account Status" },
    ];
    const exportData = users.map((u) => ({
      ...u,
      name: u.name || u.full_name,
      mobile: u.mobile || u.mobile_number || u.phone || "-",
      category: u.category?.name || u.category || "-",
      country: u.country?.name || (typeof u.country === "string" ? u.country : "-"),
      state: u.state?.name || (typeof u.state === "string" ? u.state : "-"),
      city: u.city?.name || (typeof u.city === "string" ? u.city : "-"),
      status: u.status ? u.status.charAt(0).toUpperCase() + u.status.slice(1) : "Active",
    }));
    if (fmt === "CSV") {
      exportToCSV("HealerNet_Users", exportData, columns, toast);
    } else {
      exportToExcel("HealerNet_Users", exportData, columns, toast);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: t.text }}>
            User Management
          </div>
          <div className="text-sm" style={{ color: t.textMuted }}>
            {totalUsers} registered users in database
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={Download} onClick={() => exportAs("CSV")} style={{ color: t.text, borderColor: t.border }}>CSV</Button>
          <Button variant="outline" size="sm" icon={Download} onClick={() => exportAs("Excel")} style={{ color: t.text, borderColor: t.border }}>Excel</Button>
          {can("users.create") && (
            <Button size="sm" icon={Plus} onClick={() => setModal({ mode: "create", user: null })}>Add User</Button>
          )}
        </div>
      </div>

      <Card t={t}>
        <TableToolbar
          t={t}
          query={query}
          setQuery={setQuery}
          placeholder="Search name, email or mobile…"
          right={
            <>
              {selected.size > 0 && (
                <Button size="sm" variant="danger" icon={Trash2} onClick={bulkDelete}>Delete ({selected.size})</Button>
              )}
              <Select
                t={t}
                className="w-auto min-w-[110px]"
                value={filters.status}
                onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(1); }}
              >
                {["All", "Active", "Inactive"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
              <Select
                t={t}
                className="w-auto min-w-[160px]"
                value={filters.category_id}
                onChange={(e) => { setFilters((f) => ({ ...f, category_id: e.target.value })); setPage(1); }}
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
              <RefreshButton t={t} refreshing={refreshing} onClick={handleRefresh} className="ml-auto" />
            </>
          }
        />

        {error && (
          <div className="p-4 text-center text-sm font-medium text-red-500 flex items-center justify-center gap-2">
            <AlertTriangle size={16} /> {error}
            <Button size="sm" variant="outline" onClick={fetchUsers} className="ml-2">Retry</Button>
          </div>
        )}

        <div className="overflow-x-auto" style={refreshTableStyle(refreshing)}>
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={users.length > 0 && users.every((r) => selected.has(String(r.id)))}
                    onChange={toggleAll}
                  />
                </th>
                <Th t={t} label="Profile" />
                <Th t={t} label="Full Name" sortKey="name" sort={sort} onSort={onSort} />
                <Th t={t} label="Email" sortKey="email" sort={sort} onSort={onSort} />
                <Th t={t} label="Mobile Number" />
                <Th t={t} label="Category" sortKey="category_id" sort={sort} onSort={onSort} />
                <Th t={t} label="Country" />
                <Th t={t} label="State" />
                <Th t={t} label="City" />
                <Th t={t} label="Registered Date" sortKey="created_at" sort={sort} onSort={onSort} />
                <Th t={t} label="Status" />
                <ActionsTh t={t} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: t.border }}>
                    <td colSpan={12} className="px-4 py-3"><Skeleton className="h-8 w-full" /></td>
                  </tr>
                ))
              ) : users.length > 0 ? (
                users.map((u) => (
                  <UserRow
                    key={u.id}
                    t={t}
                    u={u}
                    checked={selected.has(String(u.id))}
                    onCheck={() => toggle(u.id)}
                    onEdit={() => setModal({ mode: "edit", user: u })}
                    onDelete={() => removeUser(u.id)}
                    onSuspend={() => updateStatus(u.id, "Inactive")}
                    onActivate={() => updateStatus(u.id, "Active")}
                    onVerify={() => verifyEmail(u.id)}
                    canEdit={can("users.edit")}
                    canDelete={can("users.delete")}
                  />
                ))
              ) : null}
            </tbody>
          </table>

          {!loading && !refreshing && users.length === 0 && !error && (
            <EmptyState
              t={t}
              icon={usersEmptyState.showCreate ? Plus : Users}
              title="No users found"
              sub={usersEmptyState.sub}
              action={
                usersEmptyState.showCreate ? (
                  <Button size="sm" icon={Plus} onClick={() => setModal({ mode: "create", user: null })}>Add User</Button>
                ) : null
              }
            />
          )}
        </div>

        <Pagination
          t={t}
          page={page}
          totalPages={totalPages}
          onPage={setPage}
          total={totalUsers}
          pageSize={10}
        />
      </Card>

      {modal && (
        <UserModal
          t={t}
          mode={modal.mode}
          user={modal.user}
          categories={categories}
          onClose={() => setModal(null)}
          onSuccess={(savedMode, message) => {
            setModal(null);
            fetchUsers();
            toast(
              message || (savedMode === "create" ? "User added successfully." : "User updated successfully."),
              "success"
            );
          }}
          toast={toast}
        />
      )}
    </div>
  );
}

function UserRow({ t, u, checked, onCheck, onEdit, onDelete, onSuspend, onActivate, onVerify, canEdit = true, canDelete = true }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const registeredDate = u.registered_at
    ? new Date(u.registered_at).toISOString().slice(0, 10)
    : (u.created_at ? new Date(u.created_at).toISOString().slice(0, 10) : (u.registered || "-"));

  const rawStatus = (u.status || "active").toLowerCase();
  const displayStatus = rawStatus === "suspended" ? "inactive" : rawStatus;

  return (
    <tr className="border-t hover:bg-black/[0.015]" style={{ borderColor: t.border }}>
      <td className="px-4 py-2.5"><input type="checkbox" checked={checked} onChange={onCheck} /></td>
      <td className="px-4 py-2.5"><Avatar name={u.name || u.full_name} size={30} /></td>
      <td className="px-4 py-2.5 text-sm font-medium" style={{ color: t.text }}>{u.name || u.full_name}</td>
      <td className="px-4 py-2.5 text-sm" style={{ color: t.textMuted }}>
        <span className="inline-flex items-center gap-1.5">{u.email}{(u.emailVerified || u.email_verified_at) && <BadgeCheck size={13} style={{ color: BRAND.ok }} />}</span>
      </td>
      <td className="px-4 py-2.5 text-sm" style={{ color: t.textMuted, fontFamily: FONT_MONO, fontSize: 12.5 }}>{u.mobile || u.mobile_number || u.phone || "-"}</td>
      <td className="px-4 py-2.5 text-sm" style={{ color: t.textMuted }}>{u.category?.name || u.category || "-"}</td>
      <td className="px-4 py-2.5 text-sm" style={{ color: t.textMuted }}>{u.country?.name || (typeof u.country === "string" ? u.country : "-")}</td>
      <td className="px-4 py-2.5 text-sm" style={{ color: t.textMuted }}>{u.state?.name || (typeof u.state === "string" ? u.state : "-")}</td>
      <td className="px-4 py-2.5 text-sm" style={{ color: t.textMuted }}>{u.city?.name || (typeof u.city === "string" ? u.city : "-")}</td>
      <td className="px-4 py-2.5 text-sm" style={{ color: t.textMuted, fontFamily: FONT_MONO, fontSize: 12.5 }}>{registeredDate}</td>
      <td className="px-4 py-2.5"><StatusBadge t={t} status={displayStatus} /></td>
      <td className="px-4 py-2.5 relative text-right" ref={ref}>
        <button type="button" onClick={() => setOpen((v) => !v)} className="p-1.5 rounded-lg hover:bg-black/5" style={{ color: t.textMuted }}><MoreVertical size={16} /></button>
        {open && (
          <div className="absolute right-4 top-9 z-20 w-48 rounded-xl shadow-xl border overflow-hidden text-sm" style={{ background: t.surface, borderColor: t.border }}>
            <MenuItem t={t} icon={Pencil} label="Edit user" onClick={() => { onEdit(); setOpen(false); }} disabled={!canEdit} />
            {!u.email_verified_at && !u.emailVerified && <MenuItem t={t} icon={BadgeCheck} label="Verify email" onClick={() => { onVerify(); setOpen(false); }} />}
            {canEdit && (rawStatus === "active"
              ? <MenuItem t={t} icon={UserX} label="Inactive" onClick={() => { onSuspend(); setOpen(false); }} />
              : <MenuItem t={t} icon={UserCheck} label="Activate" onClick={() => { onActivate(); setOpen(false); }} />)}
            {canDelete && (
              <>
                <div className="border-t" style={{ borderColor: t.border }} />
                <MenuItem t={t} icon={Trash2} label="Delete user" danger onClick={() => { onDelete(); setOpen(false); }} />
              </>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

function UserModal({ t, mode, user, categories = [], onClose, onSuccess, toast }) {
  const [form, setForm] = useState({
    full_name: user?.name || user?.full_name || "",
    email: user?.email || "",
    mobile_number: user?.mobile || user?.mobile_number || "",
    password: "",
    role_id: user?.role_id || user?.role?.id || "",
    role_ids: user?.role_ids || (user?.role_id ? [user.role_id] : []),
    category_id: user?.category_id || (categories[0]?.id || ""),
    country_id: user?.country_id || user?.country?.id || "",
    state_id: user?.state_id || user?.state?.id || "",
    city_id: user?.city_id || user?.city?.id || "",
    status: userStatusLabel(user?.status),
  });

  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);

  // Dynamic location options
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Fetch assignable roles
  useEffect(() => {
    let isMounted = true;
    apiFetch("/admin/roles?limit=100")
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        const list = json?.data?.data || json?.data || [];
        const activeRoles = list.filter((r) => (r.status || "active") === "active");
        setRoles(activeRoles);
        setLoadingRoles(false);
      })
      .catch(() => setLoadingRoles(false));
    return () => { isMounted = false; };
  }, [mode]);

  // Fetch Countries on Mount
  useEffect(() => {
    let isMounted = true;
    apiFetch("/locations/countries")
      .then((res) => res.json())
      .then((json) => {
        if (isMounted) {
          const list = json.data || json || [];
          setCountries(list);
          setLoadingCountries(false);
        }
      })
      .catch((err) => {
        console.error("Error fetching countries:", err);
        setLoadingCountries(false);
      });
    return () => { isMounted = false; };
  }, []);

  // Dependent States fetching when country_id changes
  useEffect(() => {
    if (!form.country_id) {
      setStates([]);
      setCities([]);
      return;
    }
    let isMounted = true;
    setLoadingStates(true);
    apiFetch(`/locations/countries/${form.country_id}/states`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted) {
          setStates(json.data || json || []);
          setLoadingStates(false);
        }
      })
      .catch((err) => {
        console.error("Error fetching states:", err);
        setLoadingStates(false);
      });
    return () => { isMounted = false; };
  }, [form.country_id]);

  // Dependent Cities fetching when state_id changes
  useEffect(() => {
    if (!form.state_id) {
      setCities([]);
      return;
    }
    let isMounted = true;
    setLoadingCities(true);
    apiFetch(`/locations/states/${form.state_id}/cities`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted) {
          setCities(json.data || json || []);
          setLoadingCities(false);
        }
      })
      .catch((err) => {
        console.error("Error fetching cities:", err);
        setLoadingCities(false);
      });
    return () => { isMounted = false; };
  }, [form.state_id]);

  const set = (field, val) => {
    setForm((f) => {
      const next = { ...f, [field]: val };
      if (field === "country_id") { next.state_id = ""; next.city_id = ""; }
      if (field === "state_id") { next.city_id = ""; }
      return next;
    });
    setErrors((e) => ({ ...e, [field]: null }));
  };

  const assignableRoles = useMemo(
    () => roles.filter((r) => r.slug !== "admin" && !r.is_super_admin),
    [roles]
  );

  const selectedRole = useMemo(
    () => roles.find((r) => String(r.id) === String(form.role_id)),
    [roles, form.role_id]
  );

  const isMemberRole = !form.role_id || selectedRole?.slug === "user";

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = "Full Name is required.";
    if (!form.email.trim()) {
      errs.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errs.email = "Please enter a valid email address.";
    }
    if (mode === "edit" && !form.role_id) errs.role_id = "Role is required.";
    const mobileError = validateMobileNumber(form.mobile_number);
    if (mobileError) errs.mobile_number = mobileError;
    if (mode === "create") {
      if (form.password && form.password.length < 8) errs.password = "Password must be at least 8 characters.";
    } else if (form.password && form.password.length < 8) {
      errs.password = "Password must be at least 8 characters.";
    }
    return errs;
  };

  const handleSubmit = async () => {
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const endpoint = mode === "create" ? "/admin/users" : `/admin/users/${user.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const payload = {
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        mobile_number: normalizeMobileNumber(form.mobile_number) || undefined,
        status: userStatusForApi(form.status),
      };

      if (mode === "create") {
        if (form.role_id) {
          payload.role_id = form.role_id;
          payload.role_ids = [form.role_id];
        }
      } else {
        payload.role_id = form.role_id;
        payload.role_ids = form.role_ids?.length ? form.role_ids : [form.role_id];
      }

      if (isMemberRole && form.category_id) payload.category_id = form.category_id;
      if (form.country_id) payload.country_id = Number(form.country_id);
      if (form.state_id) payload.state_id = Number(form.state_id);
      if (form.city_id) payload.city_id = Number(form.city_id);
      if (form.password) {
        payload.password = form.password;
        payload.password_confirmation = form.password;
      }

      const res = await apiFetch(endpoint, {
        method,
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        if (res.status === 422 && json.errors) {
          const fieldErrs = {};
          Object.keys(json.errors).forEach((key) => {
            fieldErrs[key] = json.errors[key][0];
          });
          setErrors(fieldErrs);
        } else {
          toast(json.message || "Failed to save user", "danger");
        }
        return;
      }

      onSuccess(mode, json.message);
    } catch (err) {
      console.error(err);
      toast("An unexpected error occurred while saving user.", "danger");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      t={t}
      open
      width={700}
      onClose={onClose}
      title={mode === "create" ? "Add User" : "Edit User"}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting} style={{ color: t.text, borderColor: t.border }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} icon={submitting ? Loader2 : null}>
            {submitting ? "Saving…" : mode === "create" ? "Add User" : "Save Changes"}
          </Button>
        </>
      }
    >
      <div className="grid sm:grid-cols-2 gap-x-5 gap-y-3 py-1">
        <Field t={t} label="Full Name *">
          <Input
            style={inputStyle(t)}
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            placeholder="Jane Doe"
          />
          {errors.full_name && <div className="text-xs text-red-500 mt-1 font-medium">{errors.full_name}</div>}
        </Field>

        <Field t={t} label="Email Address *">
          <Input
            type="email"
            style={inputStyle(t)}
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="jane@mail.com"
          />
          {errors.email && <div className="text-xs text-red-500 mt-1 font-medium">{errors.email}</div>}
        </Field>

        <Field t={t} label="Mobile Number">
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={13}
            style={inputStyle(t)}
            value={form.mobile_number}
            onChange={(e) => set("mobile_number", sanitizeMobileInput(e.target.value))}
            placeholder="9876543210"
          />
          <p className="text-[11px] mt-1" style={{ color: t.textMuted }}>
            10 digits · or +91 then 10 digits
          </p>
          {errors.mobile_number && <div className="text-xs text-red-500 mt-1 font-medium">{errors.mobile_number}</div>}
        </Field>

        {mode === "create" ? (
          <Field
            t={t}
            label="Role"
            hint="Optional. Leave as Member for a normal user, or choose a staff role to grant permissions."
          >
            <Select
              t={t}
              value={form.role_id}
              onChange={(e) => {
                const roleId = e.target.value;
                const role = roles.find((r) => String(r.id) === String(roleId));
                const member = !roleId || role?.slug === "user";
                setForm((f) => ({
                  ...f,
                  role_id: roleId,
                  role_ids: roleId ? [roleId] : [],
                  password: roleId ? f.password : "",
                  category_id: member ? f.category_id : "",
                }));
                setErrors((er) => ({ ...er, role_id: null, password: null, category_id: null }));
              }}
              disabled={loadingRoles}
            >
              <option value="">Member (default)</option>
              {assignableRoles
                .filter((r) => r.slug !== "user")
                .map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
            </Select>
            {errors.role_id && <div className="text-xs text-red-500 mt-1 font-medium">{errors.role_id}</div>}
          </Field>
        ) : (
          <Field t={t} label="Role *">
            <Select
              t={t}
              value={form.role_id}
              onChange={(e) => {
                const roleId = e.target.value;
                const role = roles.find((r) => String(r.id) === String(roleId));
                const member = role?.slug === "user";
                setForm((f) => ({
                  ...f,
                  role_id: roleId,
                  role_ids: f.role_ids?.includes(roleId) ? f.role_ids : [...(f.role_ids || []), roleId],
                  category_id: member ? f.category_id : "",
                }));
                setErrors((er) => ({ ...er, role_id: null, category_id: null }));
              }}
              disabled={loadingRoles}
            >
              {loadingRoles ? (
                <option value="">Loading roles…</option>
              ) : (
                assignableRoles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))
              )}
            </Select>
            {errors.role_id && <div className="text-xs text-red-500 mt-1 font-medium">{errors.role_id}</div>}
          </Field>
        )}

        {mode === "edit" && (
          <Field t={t} label="Additional Roles">
            <div className="space-y-2 max-h-32 overflow-y-auto rounded-lg border p-2" style={{ borderColor: t.border }}>
              {assignableRoles.map((r) => (
                <label key={r.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={(form.role_ids || []).includes(r.id)}
                    onChange={(e) => {
                      setForm((f) => {
                        const ids = new Set(f.role_ids || []);
                        if (e.target.checked) ids.add(r.id);
                        else ids.delete(r.id);
                        const nextIds = Array.from(ids);
                        return {
                          ...f,
                          role_ids: nextIds,
                          role_id: nextIds[0] || f.role_id,
                        };
                      });
                    }}
                  />
                  {r.name}
                </label>
              ))}
            </div>
          </Field>
        )}

        {(mode !== "create" || form.role_id) && (
          <Field
            t={t}
            label={mode === "create" ? "Password" : "New Password"}
            hint={mode === "create" ? "Optional. Leave blank to email a password setup link." : "Leave blank to keep current password."}
          >
            <Input
              type="password"
              style={inputStyle(t)}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder=""
            />
            {errors.password && <div className="text-xs text-red-500 mt-1 font-medium">{errors.password}</div>}
          </Field>
        )}

        {isMemberRole && (
          <Field t={t} label="Healthcare Category" hint="Optional. Used for WhatsApp community assignment.">
            <Select t={t} value={form.category_id} onChange={(e) => set("category_id", e.target.value)}>
              <option value="">Optional</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
            {errors.category_id && <div className="text-xs text-red-500 mt-1 font-medium">{errors.category_id}</div>}
          </Field>
        )}

        <Field t={t} label="Country">
          <Select t={t} value={form.country_id} onChange={(e) => set("country_id", e.target.value)}>
            <option value="">{loadingCountries ? "Loading countries…" : "Optional"}</option>
            {countries.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          {errors.country_id && <div className="text-xs text-red-500 mt-1 font-medium">{errors.country_id}</div>}
        </Field>

        <Field t={t} label="State">
          <Select t={t} value={form.state_id} onChange={(e) => set("state_id", e.target.value)} disabled={!form.country_id || loadingStates}>
            <option value="">
              {!form.country_id ? "Select country first" : loadingStates ? "Loading states…" : "Optional"}
            </option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
          {errors.state_id && <div className="text-xs text-red-500 mt-1 font-medium">{errors.state_id}</div>}
        </Field>

        <Field t={t} label="City">
          <Select t={t} value={form.city_id} onChange={(e) => set("city_id", e.target.value)} disabled={!form.state_id || loadingCities}>
            <option value="">
              {!form.state_id ? "Select state first" : loadingCities ? "Loading cities…" : "Optional"}
            </option>
            {cities.map((ct) => (
              <option key={ct.id} value={ct.id}>{ct.name}</option>
            ))}
          </Select>
          {errors.city_id && <div className="text-xs text-red-500 mt-1 font-medium">{errors.city_id}</div>}
        </Field>

        <Field t={t} label="Status">
          <Select t={t} value={form.status} onChange={(e) => set("status", e.target.value)}>
            {["Active", "Inactive"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}

/* =========================================================================
   HEALTHCARE CATEGORIES
   ========================================================================= */
function CategoryRow({ t, c, checked, onCheck, onEdit, onDelete, onToggleStatus }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const displayStatus = c.status === "paused" ? "inactive" : c.status;
  const isActive = (c.status || "active").toLowerCase() === "active";

  return (
    <tr className="border-t hover:bg-black/[0.015]" style={{ borderColor: t.border }}>
      <td className="px-4 py-2.5"><input type="checkbox" checked={checked} onChange={onCheck} /></td>
      <td className="px-4 py-2.5 text-sm font-medium" style={{ color: t.text }}>{c.name}</td>
      <td className="px-4 py-2.5 text-sm max-w-xs truncate" style={{ color: t.textMuted }}>{c.description}</td>
      <td className="px-4 py-2.5 text-sm" style={{ color: t.textMuted }}>{c.whatsapp_groups_count ?? c.community_groups_count ?? 0}</td>
      <td className="px-4 py-2.5"><StatusBadge t={t} status={displayStatus} /></td>
      <td className="px-4 py-2.5 relative text-right" ref={ref}>
        <button type="button" onClick={() => setOpen((v) => !v)} className="p-1.5 rounded-lg hover:bg-black/5" style={{ color: t.textMuted }}><MoreVertical size={16} /></button>
        {open && (
          <div className="absolute right-4 top-9 z-20 w-48 rounded-xl shadow-xl border overflow-hidden text-sm" style={{ background: t.surface, borderColor: t.border }}>
            <MenuItem t={t} icon={Pencil} label="Edit category" onClick={() => { onEdit(); setOpen(false); }} />
            {isActive
              ? <MenuItem t={t} icon={UserX} label="Inactive" onClick={() => { onToggleStatus(); setOpen(false); }} />
              : <MenuItem t={t} icon={UserCheck} label="Activate" onClick={() => { onToggleStatus(); setOpen(false); }} />}
            <div className="border-t" style={{ borderColor: t.border }} />
            <MenuItem t={t} icon={Trash2} label="Delete category" danger onClick={() => { onDelete(); setOpen(false); }} />
          </div>
        )}
      </td>
    </tr>
  );
}

function CategoriesPage({ t, toast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ status: "All" });
  const [sort, setSort] = useState({ key: "name", dir: "asc" });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const fetchCategories = useCallback(async ({ silent = false, bustCache = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const url = bustCache ? `/admin/categories?_=${Date.now()}` : "/admin/categories";
      const res = await apiFetch(url);
      if (!res.ok) throw new Error("Failed to fetch categories");
      const json = await res.json();
      setRows(json.data || []);
    } catch (err) {
      setError(err.message || "Failed to load categories");
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleRefresh = () => {
    setSelected(new Set());
    setQuery("");
    setFilters({ status: "All" });
    setPage(1);
    fetchCategories({ silent: rows.length > 0, bustCache: true });
  };

  const hasActiveFilters = query.trim() !== "" || filters.status !== "All";
  const categoriesEmptyState = useMemo(() => {
    if (!hasActiveFilters && rows.length === 0) {
      return {
        sub: 'No categories exist yet. Use "Add Category" to create one.',
        showCreate: true,
      };
    }
    if (hasActiveFilters) {
      return {
        sub: "Try clearing your search or filters to see more results, or add a new category.",
        showCreate: true,
      };
    }
    return { sub: "No records match the current view.", showCreate: false };
  }, [hasActiveFilters, rows.length]);

  const onSort = (key) => {
    setSort((s) => ({
      key,
      dir: s.key === key && s.dir === "asc" ? "desc" : "asc",
    }));
  };

  const filtered = useMemo(() => {
    let list = rows;
    if (filters.status !== "All") {
      const target = filters.status.toLowerCase();
      list = list.filter((c) => {
        const status = c.status === "paused" ? "inactive" : c.status;
        return status === target;
      });
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((c) =>
        [c.name, c.description].some((v) => String(v ?? "").toLowerCase().includes(q))
      );
    }
    if (sort) {
      list = [...list].sort((a, b) => {
        const av = a[sort.key] ?? "";
        const bv = b[sort.key] ?? "";
        const res = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
        return sort.dir === "asc" ? res : -res;
      });
    }
    return list;
  }, [rows, query, filters, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [query, filters]);

  const toggleAll = () => {
    const ids = pageRows.map((r) => r.id);
    const allSel = ids.length > 0 && ids.every((id) => selected.has(id));
    const next = new Set(selected);
    ids.forEach((id) => (allSel ? next.delete(id) : next.add(id)));
    setSelected(next);
  };
  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const bulkDelete = async () => {
    let deleted = 0;
    for (const id of selected) {
      try {
        const res = await apiFetch(`/admin/categories/${id}`, { method: "DELETE" });
        if (res.ok) deleted++;
      } catch {
        /* skip failed rows */
      }
    }
    toast(deleted ? `${deleted} categories deleted` : "Could not delete selected categories", deleted ? "success" : "danger");
    setSelected(new Set());
    fetchCategories();
  };

  const exportAs = (fmt) => {
    const columns = [
      { key: "name", label: "Category Name" },
      { key: "description", label: "Description" },
      { key: "groups", label: "Groups" },
      { key: "status", label: "Status" },
    ];
    const exportData = filtered.map((c) => ({
      name: c.name,
      description: c.description || "",
      groups: c.community_groups_count ?? 0,
      status: c.status === "paused" ? "Inactive" : (c.status ? c.status.charAt(0).toUpperCase() + c.status.slice(1) : "Active"),
    }));
    if (fmt === "CSV") exportToCSV("HealerNet_Categories", exportData, columns, toast);
    else exportToExcel("HealerNet_Categories", exportData, columns, toast);
  };

  const save = async (data) => {
    try {
      const status = (data.status || "active").toLowerCase();
      const payload = {
        name: data.name,
        description: data.description || null,
        status: status === "paused" ? "inactive" : status,
      };
      const res = await apiFetch(
        modal.mode === "create" ? "/admin/categories" : `/admin/categories/${data.id}`,
        {
          method: modal.mode === "create" ? "POST" : "PUT",
          body: JSON.stringify(payload),
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const firstError = body.errors ? Object.values(body.errors).flat()[0] : null;
        throw new Error(firstError || body.message || "Save failed");
      }
      toast(modal.mode === "create" ? "Category created" : "Category updated", "success");
      setModal(null);
      fetchCategories();
    } catch (err) {
      toast(err.message || "Failed to save category", "danger");
    }
  };

  const remove = async (id) => {
    try {
      const res = await apiFetch(`/admin/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setSelected((s) => { const n = new Set(s); n.delete(id); return n; });
      toast("Category deleted", "success");
      fetchCategories();
    } catch {
      toast("Cannot delete category with active communities", "danger");
    }
  };

  const toggleStatus = async (cat) => {
    const isActive = cat.status === "active";
    const next = isActive ? "inactive" : "active";
    try {
      const res = await apiFetch(`/admin/categories/${cat.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: cat.name,
          description: cat.description || null,
          status: next,
        }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast(`Category ${next === "active" ? "activated" : "marked inactive"}`, "success");
      fetchCategories();
    } catch {
      toast("Failed to update category status", "danger");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: t.text }}>Healthcare Categories</div>
          <div className="text-sm" style={{ color: t.textMuted }}>{rows.length} categories in database</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={Download} onClick={() => exportAs("CSV")} style={{ color: t.text, borderColor: t.border }}>CSV</Button>
          <Button variant="outline" size="sm" icon={Download} onClick={() => exportAs("Excel")} style={{ color: t.text, borderColor: t.border }}>Excel</Button>
          <Button size="sm" icon={Plus} onClick={() => setModal({ mode: "create", cat: { name: "", description: "", status: "active" } })}>Add Category</Button>
        </div>
      </div>

      <Card t={t}>
        <TableToolbar
          t={t}
          query={query}
          setQuery={setQuery}
          placeholder="Search category name or description…"
          right={
            <>
              {selected.size > 0 && (
                <Button size="sm" variant="danger" icon={Trash2} onClick={bulkDelete}>Delete ({selected.size})</Button>
              )}
              <Select t={t} className="w-auto min-w-[110px]" value={filters.status} onChange={(e) => setFilters({ status: e.target.value })}>
                {["All", "Active", "Inactive"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
              <RefreshButton t={t} refreshing={refreshing} onClick={handleRefresh} className="ml-auto" />
            </>
          }
        />

        {error && (
          <div className="p-4 text-center text-sm font-medium text-red-500 flex items-center justify-center gap-2">
            <AlertTriangle size={16} /> {error}
            <Button size="sm" variant="outline" onClick={fetchCategories} className="ml-2">Retry</Button>
          </div>
        )}

        <div className="overflow-x-auto" style={refreshTableStyle(refreshing)}>
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))}
                    onChange={toggleAll}
                  />
                </th>
                <Th t={t} label="Category Name" sortKey="name" sort={sort} onSort={onSort} />
                <Th t={t} label="Description" />
                <Th t={t} label="Groups" sortKey="community_groups_count" sort={sort} onSort={onSort} />
                <Th t={t} label="Status" />
                <ActionsTh t={t} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: t.border }}>
                    <td colSpan={6} className="px-4 py-3"><Skeleton className="h-8 w-full" /></td>
                  </tr>
                ))
              ) : pageRows.length > 0 ? (
                pageRows.map((c) => (
                  <CategoryRow
                    key={c.id}
                    t={t}
                    c={c}
                    checked={selected.has(c.id)}
                    onCheck={() => toggle(c.id)}
                    onEdit={() => setModal({ mode: "edit", cat: c })}
                    onDelete={() => remove(c.id)}
                    onToggleStatus={() => toggleStatus(c)}
                  />
                ))
              ) : null}
            </tbody>
          </table>

          {!loading && !refreshing && pageRows.length === 0 && !error && (
            <EmptyState
              t={t}
              icon={categoriesEmptyState.showCreate ? Plus : Heart}
              title="No categories found"
              sub={categoriesEmptyState.sub}
              action={
                categoriesEmptyState.showCreate ? (
                  <Button
                    size="sm"
                    icon={Plus}
                    onClick={() => setModal({ mode: "create", cat: { name: "", description: "", status: "active" } })}
                  >
                    Add Category
                  </Button>
                ) : null
              }
            />
          )}
        </div>

        <Pagination t={t} page={page} totalPages={totalPages} onPage={setPage} total={filtered.length} pageSize={pageSize} />
      </Card>

      {modal && (
        <Modal t={t} open onClose={() => setModal(null)} title={modal.mode === "create" ? "Add Category" : "Edit Category"}
          footer={<>
            <Button variant="outline" onClick={() => setModal(null)} style={{ color: t.text, borderColor: t.border }}>Cancel</Button>
            <Button onClick={() => save(modal.cat)}>{modal.mode === "create" ? "Create" : "Save"}</Button>
          </>}>
          <CategoryForm t={t} cat={modal.cat} onChange={(cat) => setModal((m) => ({ ...m, cat }))} />
        </Modal>
      )}
    </div>
  );
}
function CategoryForm({ t, cat, onChange }) {
  const set = (k, v) => onChange({ ...cat, [k]: v });
  const rawStatus = cat.status ? String(cat.status).toLowerCase() : "active";
  const normalizedStatus = rawStatus === "paused" ? "inactive" : rawStatus;
  const statusValue = normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);
  return (
    <div>
      <Field t={t} label="Category Name"><Input style={inputStyle(t)} value={cat.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Physical Therapy" /></Field>
      <Field t={t} label="Description"><textarea style={inputStyle(t)} className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none" rows={3} value={cat.description || ""} onChange={(e) => set("description", e.target.value)} /></Field>
      <Field t={t} label="Status">
        <Select t={t} value={statusValue} onChange={(e) => set("status", e.target.value.toLowerCase())}>
          <option value="Active">Active</option><option value="Inactive">Inactive</option>
        </Select>
      </Field>
    </div>
  );
}

/* =========================================================================
   WHATSAPP COMMUNITIES
   ========================================================================= */
function CommunityRow({ t, g, checked, onCheck, onEdit, onDelete, onCopyLink }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <tr className="border-t hover:bg-black/[0.015]" style={{ borderColor: t.border }}>
      <td className="px-4 py-2.5"><input type="checkbox" checked={checked} onChange={onCheck} /></td>
      <td className="px-4 py-2.5 text-sm font-medium" style={{ color: t.text }}>{g.name}</td>
      <td className="px-4 py-2.5 text-sm" style={{ color: t.textMuted }}>
        {g.current_members ?? g.members_count ?? 0} / {g.max_members ?? 250}
      </td>
      <td className="px-4 py-2.5 text-xs truncate max-w-[200px]" style={{ color: t.textMuted, fontFamily: FONT_MONO }}>
        {g.whatsapp_url || g.link || "-"}
      </td>
      <td className="px-4 py-2.5"><StatusBadge t={t} status={g.status} /></td>
      <td className="px-4 py-2.5 relative text-right" ref={ref}>
        <button type="button" onClick={() => setOpen((v) => !v)} className="p-1.5 rounded-lg hover:bg-black/5" style={{ color: t.textMuted }}><MoreVertical size={16} /></button>
        {open && (
          <div className="absolute right-4 top-9 z-20 w-48 rounded-xl shadow-xl border overflow-hidden text-sm" style={{ background: t.surface, borderColor: t.border }}>
            <MenuItem t={t} icon={Link2} label="Copy invite link" onClick={() => { onCopyLink(); setOpen(false); }} />
            <MenuItem t={t} icon={Pencil} label="Edit group" onClick={() => { onEdit(); setOpen(false); }} />
            <div className="border-t" style={{ borderColor: t.border }} />
            <MenuItem t={t} icon={Trash2} label="Delete group" danger onClick={() => { onDelete(); setOpen(false); }} />
          </div>
        )}
      </td>
    </tr>
  );
}

function CommunitiesPage({ t, toast, focusCommunity }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState({ status: "All" });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const refreshResetRef = useRef(false);

  useEffect(() => {
    if (!focusCommunity?.key) return;
    const nextSearch = focusCommunity.search || "";
    setQuery(nextSearch);
    setDebouncedQuery(nextSearch);
    setFilters({ status: "All" });
    setPage(1);
    setSelected(new Set());
  }, [focusCommunity?.key]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const fetchCommunities = useCallback(async ({ silent = false, bustCache = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        per_page: pageSize,
      };
      if (filters.status !== "All") params.status = filters.status.toLowerCase();
      if (debouncedQuery.trim()) params.search = debouncedQuery.trim();
      if (bustCache) params._ = Date.now();

      const json = await locationApi.adminListWhatsAppGroups(params);
      const items = Array.isArray(json.data) ? json.data : (json.data?.data || []);

      setRows(items);
      setTotalPages(json.meta?.last_page || 1);
      setTotal(json.meta?.total ?? items.length);
    } catch (err) {
      setError(err.message || "Failed to load communities");
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }, [page, filters, debouncedQuery]);

  useEffect(() => {
    const silent = refreshResetRef.current;
    refreshResetRef.current = false;
    fetchCommunities({ silent });
  }, [fetchCommunities]);

  const handleRefresh = () => {
    setSelected(new Set());
    const alreadyDefault = query === "" && debouncedQuery === "" && filters.status === "All" && page === 1;
    if (alreadyDefault) {
      fetchCommunities({ silent: true, bustCache: true });
      return;
    }
    refreshResetRef.current = true;
    setQuery("");
    setFilters({ status: "All" });
    setPage(1);
  };

  const hasActiveFilters = debouncedQuery.trim() !== "" || filters.status !== "All";
  const communitiesEmptyState = useMemo(() => {
    if (!hasActiveFilters && total === 0) {
      return {
        sub: 'No WhatsApp groups yet. Use "Add Group" to create one.',
        showCreate: true,
      };
    }
    if (hasActiveFilters) {
      return {
        sub: "Try clearing your search or filters to see more results, or add a new group.",
        showCreate: true,
      };
    }
    return { sub: "No records match the current view.", showCreate: false };
  }, [hasActiveFilters, total]);

  const save = async (data) => {
    if (!data.name?.trim()) {
      toast("Group name is required", "danger");
      return;
    }
    const url = data.whatsapp_url || data.link || "";
    if (!/^https?:\/\/(chat\.whatsapp\.com|wa\.me|api\.whatsapp\.com)/i.test(url)) {
      toast("Enter a valid WhatsApp invite URL (chat.whatsapp.com, wa.me, or api.whatsapp.com)", "danger");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: data.name.trim(),
        description: data.description || null,
        whatsapp_url: url,
        max_members: data.max_members ?? data.max ?? 250,
        status: (data.status || "active").toLowerCase(),
        category_id: null,
      };
      await locationApi.adminSaveWhatsAppGroup(payload, modal.mode === "edit" ? data.id : null);
      toast(modal.mode === "create" ? "WhatsApp group created" : "WhatsApp group updated", "success");
      setModal(null);
      fetchCommunities();
    } catch (err) {
      toast(err?.message || "Failed to save WhatsApp group", "danger");
    } finally {
      setSaving(false);
    }
  };

  const remove = (id, name = "this group", group = null) => {
    const members = Number(group?.members_count ?? group?.current_members ?? 0);
    setConfirmDelete({
      mode: "confirm",
      action: "single",
      id,
      title: "Delete WhatsApp group?",
      text: members > 0
        ? `Delete "${name}"?\n\nThis group currently has ${members} member(s).\nDelete will be blocked until members are unassigned.`
        : `Delete "${name}"?\n\nThis cannot be undone.\nDelete is blocked if members are assigned or the group is linked to cities (Group Management).`,
      confirmText: "Yes, delete",
      tone: "danger",
    });
  };

  const showDeleteBlockedAlert = (message) => {
    setConfirmDelete({
      mode: "alert",
      title: "Cannot delete group",
      text: message || "This WhatsApp group cannot be deleted right now.",
      confirmText: "OK",
      tone: "danger",
    });
  };

  const runConfirmedDelete = async () => {
    if (!confirmDelete) return;

    if (confirmDelete.mode === "alert") {
      setConfirmDelete(null);
      return;
    }

    setDeleting(true);
    try {
      if (confirmDelete.action === "single") {
        await locationApi.adminDeleteWhatsAppGroup(confirmDelete.id);
        setSelected((s) => {
          const n = new Set(s);
          n.delete(confirmDelete.id);
          return n;
        });
        setConfirmDelete(null);
        toast("WhatsApp group deleted", "success");
        fetchCommunities();
      } else {
        let deleted = 0;
        const failures = [];
        for (const id of selected) {
          const row = rows.find((r) => r.id === id);
          try {
            await locationApi.adminDeleteWhatsAppGroup(id);
            deleted++;
          } catch (err) {
            failures.push(`• ${row?.name || id}: ${err?.message || "Failed"}`);
          }
        }
        setSelected(new Set());
        fetchCommunities();
        if (failures.length && !deleted) {
          showDeleteBlockedAlert(
            `None of the selected groups could be deleted.\n\n${failures.slice(0, 5).join("\n")}${failures.length > 5 ? `\n…and ${failures.length - 5} more` : ""}`
          );
        } else if (failures.length) {
          showDeleteBlockedAlert(
            `${deleted} group(s) deleted.\n\n${failures.length} could not be deleted:\n${failures.slice(0, 5).join("\n")}${failures.length > 5 ? `\n…and ${failures.length - 5} more` : ""}`
          );
        } else {
          setConfirmDelete(null);
          toast(`${deleted} group(s) deleted`, "success");
        }
      }
    } catch (err) {
      showDeleteBlockedAlert(err?.message || "Failed to delete WhatsApp group");
    } finally {
      setDeleting(false);
    }
  };

  const copyLink = async (link) => {
    try {
      await navigator.clipboard.writeText(link);
      toast("Invite link copied", "success");
    } catch {
      toast("Could not copy link — check browser permissions", "danger");
    }
  };

  const toggleAll = () => {
    const ids = rows.map((r) => r.id);
    const allSel = ids.length > 0 && ids.every((id) => selected.has(id));
    const next = new Set(selected);
    ids.forEach((id) => (allSel ? next.delete(id) : next.add(id)));
    setSelected(next);
  };
  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const bulkDelete = () => {
    setConfirmDelete({
      mode: "confirm",
      action: "bulk",
      title: "Delete selected groups?",
      text: `Delete ${selected.size} selected group(s)?\n\nThis cannot be undone.\nGroups with members or city links (Group Management) will be blocked.`,
      confirmText: "Yes, delete",
      tone: "danger",
    });
  };

  const exportAs = (fmt) => {
    const columns = [
      { key: "name", label: "Group Name" },
      { key: "members", label: "Members" },
      { key: "link", label: "WhatsApp Link" },
      { key: "status", label: "Status" },
    ];
    const exportData = rows.map((g) => ({
      name: g.name,
      members: `${g.current_members ?? g.members_count ?? 0} / ${g.max_members ?? 250}`,
      link: g.whatsapp_url || g.link || "-",
      status: g.status ? String(g.status).charAt(0).toUpperCase() + String(g.status).slice(1) : "Active",
    }));
    if (fmt === "CSV") exportToCSV("HealerNet_Communities", exportData, columns, toast);
    else exportToExcel("HealerNet_Communities", exportData, columns, toast);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: t.text }}>WhatsApp Communities</div>
          <div className="text-sm" style={{ color: t.textMuted }}>{total} community groups in database</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={Download} onClick={() => exportAs("CSV")} style={{ color: t.text, borderColor: t.border }}>CSV</Button>
          <Button variant="outline" size="sm" icon={Download} onClick={() => exportAs("Excel")} style={{ color: t.text, borderColor: t.border }}>Excel</Button>
          <Button size="sm" icon={Plus} onClick={() => setModal({ mode: "create", group: { name: "", whatsapp_url: "", max_members: 250, status: "active" } })}>Add Group</Button>
        </div>
      </div>

      <Card t={t}>
        <TableToolbar
          t={t}
          query={query}
          setQuery={setQuery}
          placeholder="Search group name or link…"
          right={
            <>
              {selected.size > 0 && (
                <Button size="sm" variant="danger" icon={Trash2} onClick={bulkDelete}>Delete ({selected.size})</Button>
              )}
              <Select t={t} className="w-auto min-w-[110px]" value={filters.status} onChange={(e) => { setFilters((f) => ({ ...f, status: e.target.value })); setPage(1); }}>
                {["All", "Active", "Full", "Inactive"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
              <RefreshButton t={t} refreshing={refreshing} onClick={handleRefresh} className="ml-auto" />
            </>
          }
        />

        {error && (
          <div className="p-4 text-center text-sm font-medium text-red-500 flex items-center justify-center gap-2">
            <AlertTriangle size={16} /> {error}
            <Button size="sm" variant="outline" onClick={fetchCommunities} className="ml-2">Retry</Button>
          </div>
        )}

        <div className="overflow-x-auto" style={refreshTableStyle(refreshing)}>
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
                    onChange={toggleAll}
                  />
                </th>
                <Th t={t} label="Group Name" />
                <Th t={t} label="Members" />
                <Th t={t} label="WhatsApp Link" />
                <Th t={t} label="Status" />
                <ActionsTh t={t} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-t" style={{ borderColor: t.border }}>
                    <td colSpan={6} className="px-4 py-3"><Skeleton className="h-8 w-full" /></td>
                  </tr>
                ))
              ) : rows.length > 0 ? (
                rows.map((g) => (
                  <CommunityRow
                    key={g.id}
                    t={t}
                    g={g}
                    checked={selected.has(g.id)}
                    onCheck={() => toggle(g.id)}
                    onEdit={() => setModal({ mode: "edit", group: g })}
                    onDelete={() => remove(g.id, g.name, g)}
                    onCopyLink={() => copyLink(g.whatsapp_url || g.link)}
                  />
                ))
              ) : null}
            </tbody>
          </table>

          {!loading && !refreshing && rows.length === 0 && !error && (
            <EmptyState
              t={t}
              icon={communitiesEmptyState.showCreate ? Plus : MessageCircle}
              title="No community groups found"
              sub={communitiesEmptyState.sub}
              action={
                communitiesEmptyState.showCreate ? (
                  <Button
                    size="sm"
                    icon={Plus}
                    onClick={() => setModal({ mode: "create", group: { name: "", whatsapp_url: "", max_members: 250, status: "active" } })}
                  >
                    Add Group
                  </Button>
                ) : null
              }
            />
          )}
        </div>

        <Pagination t={t} page={page} totalPages={totalPages} onPage={setPage} total={total} pageSize={pageSize} />
      </Card>

      {modal && (
        <Modal t={t} open onClose={() => setModal(null)} title={modal.mode === "create" ? "Add WhatsApp Group" : "Edit WhatsApp Group"}
          footer={<>
            <Button variant="outline" onClick={() => setModal(null)} style={{ color: t.text, borderColor: t.border }}>Cancel</Button>
            <Button disabled={saving} onClick={() => save(modal.group)}>{saving ? "Saving…" : (modal.mode === "create" ? "Create Group" : "Save Changes")}</Button>
          </>}>
          <GroupForm t={t} group={modal.group} onChange={(group) => setModal((m) => ({ ...m, group }))} />
        </Modal>
      )}

      <SweetConfirm
        t={t}
        open={Boolean(confirmDelete)}
        title={confirmDelete?.title || "Are you sure?"}
        text={confirmDelete?.text}
        confirmText={confirmDelete?.confirmText || (confirmDelete?.mode === "alert" ? "OK" : "Yes, delete")}
        cancelText="Cancel"
        tone={confirmDelete?.tone || "danger"}
        mode={confirmDelete?.mode === "alert" ? "alert" : "confirm"}
        loading={deleting && confirmDelete?.mode !== "alert"}
        onCancel={() => !deleting && setConfirmDelete(null)}
        onConfirm={runConfirmedDelete}
      />
    </div>
  );
}
function GroupForm({ t, group, onChange }) {
  const set = (k, v) => onChange({ ...group, [k]: v });
  const statusValue = group.status ? String(group.status).charAt(0).toUpperCase() + String(group.status).slice(1).toLowerCase() : "Active";
  return (
    <div>
      <Field t={t} label="Group Name"><Input style={inputStyle(t)} value={group.name || ""} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Yoga & Movement Cohort 1" /></Field>
      <Field t={t} label="Description">
        <textarea
          style={inputStyle(t)}
          className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
          rows={3}
          value={group.description || ""}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Optional group description"
        />
      </Field>
      <Field t={t} label="WhatsApp URL"><Input style={inputStyle(t)} value={group.whatsapp_url || group.link || ""} onChange={(e) => set("whatsapp_url", e.target.value)} placeholder="https://chat.whatsapp.com/…" /></Field>
      <Field t={t} label="Maximum Members"><Input type="number" style={inputStyle(t)} value={group.max_members ?? group.max ?? 250} onChange={(e) => set("max_members", Number(e.target.value))} /></Field>
      <Field t={t} label="Status">
        <Select t={t} value={statusValue} onChange={(e) => set("status", e.target.value.toLowerCase())}>
          <option value="Active">Active</option><option value="Full">Full</option><option value="Inactive">Inactive</option>
        </Select>
      </Field>
    </div>
  );
}

/* =========================================================================
   ANALYTICS
   ========================================================================= */
function AnalyticsPage({ t }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadAnalytics = useCallback(() => {
    setLoading(true);
    setError(false);
    apiFetch('/admin/analytics')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Failed to load analytics'))))
      .then((payload) => setAnalytics(payload?.data ?? null))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-40" />
        <div className="grid lg:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72" />)}
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[104px]" />)}
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="space-y-4">
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: t.text }}>Analytics</div>
        <Card t={t}><ErrorState t={t} onRetry={loadAnalytics} /></Card>
      </div>
    );
  }

  const regGrowth = Array.isArray(analytics.reg_growth) ? analytics.reg_growth : [];
  const dailyActive = Array.isArray(analytics.daily_active) ? analytics.daily_active : [];
  const countryDist = Array.isArray(analytics.country_dist) ? analytics.country_dist : [];
  const kpis = analytics.kpis ?? {};

  const countryMaxUsers = Math.max(1, ...countryDist.map((row) => Number(row.users) || 0));
  const countryXMax = Math.max(countryMaxUsers + 1, Math.ceil(countryMaxUsers * 1.15));
  const countryChartHeight = Math.min(320, Math.max(120, countryDist.length * 44 + 28));
  const countryYWidth = Math.min(
    160,
    Math.max(72, ...countryDist.map((row) => String(row.country || '').length * 7))
  );

  const utilization = kpis.community_utilization ?? {};
  const emailRate = kpis.email_verification_rate ?? {};
  const weeklyActive = kpis.weekly_active_users ?? {};

  return (
    <div className="space-y-5">
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: t.text }}>Analytics</div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Card t={t} className="p-5">
          <div className="font-semibold text-sm mb-3" style={{ color: t.text }}>User Registration Growth</div>
          {regGrowth.length > 0 ? (
            <div className="h-64"><ResponsiveContainer><LineChart data={regGrowth}><CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 11, fill: t.textFaint }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: t.textFaint }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${t.border}`, background: t.surface, fontSize: 12 }} /><Line type="monotone" dataKey="users" stroke={BRAND.primary} strokeWidth={2.25} dot={false} /></LineChart></ResponsiveContainer></div>
          ) : (
            <EmptyState t={t} icon={PieIcon} title="No registration data yet" sub="User sign-ups will appear here once users register." />
          )}
        </Card>
        <Card t={t} className="p-5">
          <div className="font-semibold text-sm mb-3" style={{ color: t.text }}>Community Growth</div>
          {regGrowth.length > 0 ? (
            <div className="h-64"><ResponsiveContainer><AreaChart data={regGrowth}><defs><linearGradient id="commGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={BRAND.amber} stopOpacity={0.35} /><stop offset="100%" stopColor={BRAND.amber} stopOpacity={0} /></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} /><XAxis dataKey="month" tick={{ fontSize: 11, fill: t.textFaint }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: t.textFaint }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${t.border}`, background: t.surface, fontSize: 12 }} /><Area type="monotone" dataKey="communities" stroke={BRAND.amber} fill="url(#commGrad)" strokeWidth={2} /></AreaChart></ResponsiveContainer></div>
          ) : (
            <EmptyState t={t} icon={PieIcon} title="No community data yet" sub="WhatsApp group growth will appear here over time." />
          )}
        </Card>
        <Card t={t} className="p-5">
          <div className="font-semibold text-sm mb-3" style={{ color: t.text }}>Daily Active Users</div>
          {dailyActive.some((row) => row.active > 0) ? (
            <div className="h-64"><ResponsiveContainer><BarChart data={dailyActive}><CartesianGrid strokeDasharray="3 3" stroke={t.border} vertical={false} /><XAxis dataKey="day" tick={{ fontSize: 11, fill: t.textFaint }} axisLine={false} tickLine={false} /><YAxis tick={{ fontSize: 11, fill: t.textFaint }} axisLine={false} tickLine={false} /><Tooltip contentStyle={{ borderRadius: 10, border: `1px solid ${t.border}`, background: t.surface, fontSize: 12 }} /><Bar dataKey="active" fill={BRAND.primary} radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div>
          ) : (
            <EmptyState t={t} icon={Users} title="No login activity yet" sub="Active users by weekday appear after members log in." />
          )}
        </Card>
        <Card t={t} className="p-5">
          <div className="font-semibold text-sm mb-3" style={{ color: t.text }}>Country-wise Users</div>
          {countryDist.length > 0 ? (
            <div style={{ height: countryChartHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={countryDist}
                  layout="vertical"
                  margin={{ left: 4, right: 12, top: 4, bottom: 4 }}
                  barSize={28}
                  barCategoryGap="24%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={t.border} horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, countryXMax]}
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: t.textFaint }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="country"
                    tick={{ fontSize: 11, fill: t.textFaint }}
                    axisLine={false}
                    tickLine={false}
                    width={countryYWidth}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: 10, border: `1px solid ${t.border}`, background: t.surface, fontSize: 12 }}
                    formatter={(value) => [Number(value).toLocaleString(), 'Users']}
                  />
                  <Bar dataKey="users" fill={BRAND.info} radius={[0, 5, 5, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState t={t} icon={MapPin} title="No country data yet" sub="User counts by country appear after registrations include location." />
          )}
        </Card>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Kpi t={t} label="Community Utilization" value={`${utilization.value ?? 0}%`} delta={utilization.delta} trend={utilization.trend} tone="brand" />
        <Kpi t={t} label="Email Verification Rate" value={`${emailRate.value ?? 0}%`} delta={emailRate.delta} trend={emailRate.trend} tone="ok" />
        <Kpi t={t} label="Weekly Active Users" value={(weeklyActive.value ?? 0).toLocaleString()} delta={weeklyActive.delta} trend={weeklyActive.trend} tone="info" />
      </div>
    </div>
  );
}


function CmsPage({ t, toast }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [newPage, setNewPage] = useState({ title: "", slug: "", status: "published", content: "" });

  const fetchPages = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/admin/pages');
      if (res.ok) {
        const data = await res.json();
        if (data && data.pages) {
          setPages(data.pages);
          if (data.pages.length > 0) {
            setActiveId((prev) => prev || data.pages[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Fetch pages error:", err);
      toast("Failed to load CMS pages from API", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const activePage = pages.find((p) => p.id === activeId) || pages[0];

  const updateActive = (field, value) => {
    if (!activePage) return;
    setPages((prev) => prev.map((p) => (p.id === activePage.id ? { ...p, [field]: value } : p)));
  };

  const insertFormat = (formatTag) => {
    if (!activePage) return;
    const formatting = {
      Bold: "**Bold Text**",
      Italic: "*Italic Text*",
      Link: "[Link Title](https://example.com)",
      H1: "\n# Heading 1\n",
      H2: "\n## Heading 2\n",
      List: "\n- Item 1\n- Item 2\n",
    };
    const textToInsert = formatting[formatTag] || "";
    updateActive("content", (activePage?.content || "") + textToInsert);
  };

  const handleSave = async () => {
    if (!activePage) return;
    try {
      setSaving(true);
      const payload = {
        ...activePage,
        status: String(activePage.status || 'published').toLowerCase(),
      };
      const res = await apiFetch(`/admin/pages/${activePage.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.page) {
        setPages((prev) => prev.map((p) => (p.id === activePage.id ? data.page : p)));
        toast(`Page "${data.page.title}" saved successfully!`, "success");
      } else {
        const message =
          data?.message ||
          (data?.errors ? Object.values(data.errors).flat().join(', ') : null) ||
          `Save failed (HTTP ${res.status})`;
        toast(message, "error");
      }
    } catch (err) {
      console.error("Save page error:", err);
      toast("Failed to save page to backend", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (pages.length <= 1) {
      toast("Cannot delete the only remaining page", "error");
      return;
    }
    const target = pages.find((p) => p.id === id);
    try {
      const res = await apiFetch(`/admin/pages/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const nextPages = pages.filter((p) => p.id !== id);
        setPages(nextPages);
        if (activeId === id) {
          setActiveId(nextPages[0]?.id || null);
        }
        toast(`Page "${target?.title || "Page"}" deleted`, "success");
      }
    } catch (err) {
      console.error("Delete page error:", err);
      toast("Failed to delete page", "error");
    }
  };

  const handleCreatePage = async () => {
    if (!newPage.title.trim()) {
      toast("Please enter a page title", "error");
      return;
    }
    try {
      const payload = {
        title: newPage.title.trim(),
        slug: newPage.slug.trim() || undefined,
        status: (newPage.status || "published").toLowerCase(),
        content: newPage.content || `# ${newPage.title.trim()}\n\nEnter page content here...`,
      };
      const res = await apiFetch('/admin/pages', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.page) {
          const created = data.page;
          setPages((prev) => [created, ...prev]);
          setActiveId(created.id);
          setCreateModal(false);
          setNewPage({ title: "", slug: "", status: "published", content: "" });
          toast(`Dynamic page "${created.title}" created successfully!`, "success");
        }
      }
    } catch (err) {
      console.error("Create page error:", err);
      toast("Failed to create page", "error");
    }
  };

  if (loading) return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: t.text }}>CMS Pages</div>
          <div className="text-sm" style={{ color: t.textMuted }}>Create and edit dynamic content pages across HealerNet</div>
        </div>
        <Button size="sm" icon={Plus} onClick={() => setCreateModal(true)}>Create New Page</Button>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-4">
        {/* Page Selector Sidebar */}
        <Card t={t} className="p-3 flex flex-col justify-between h-fit">
          <div className="space-y-1">
            <div className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: t.textFaint }}>Pages ({pages.length})</div>
            {pages.map((p) => {
              const isActive = activeId === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setActiveId(p.id)}
                  className="group flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-colors"
                  style={{
                    background: isActive ? BRAND.primaryLight : "transparent",
                    color: isActive ? BRAND.primaryDark : t.text,
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  <div className="min-w-0 pr-2">
                    <div className="truncate">{p.title}</div>
                    <div className="text-[11px] truncate opacity-70" style={{ fontFamily: FONT_MONO }}>{p.slug}</div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge tone={String(p.status || '').toLowerCase() === 'published' ? "ok" : "neutral"} t={t}>
                      {String(p.status || 'draft').charAt(0).toUpperCase() + String(p.status || 'draft').slice(1).toLowerCase()}
                    </Badge>
                    {pages.length > 1 && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-600 transition-opacity"
                        title="Delete Page"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setCreateModal(true)}
            className="w-full flex items-center justify-center gap-2 mt-4 px-3 py-2 rounded-lg border border-dashed text-xs font-semibold transition-colors hover:bg-black/5"
            style={{ borderColor: t.border, color: BRAND.primary }}
          >
            <Plus size={14} /> Add New Page
          </button>
        </Card>

        {/* Editor Area */}
        {activePage && (
          <Card t={t} className="p-5 flex flex-col space-y-4">
            {/* Metadata inputs */}
            <div className="grid sm:grid-cols-3 gap-3 pb-3 border-b" style={{ borderColor: t.border }}>
              <div className="sm:col-span-1">
                <div className="text-xs font-semibold mb-1" style={{ color: t.textMuted }}>Page Title</div>
                <Input
                  value={activePage.title}
                  onChange={(e) => updateActive("title", e.target.value)}
                  placeholder="e.g. Privacy Policy"
                  style={inputStyle(t)}
                />
              </div>

              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: t.textMuted }}>URL Slug</div>
                <Input
                  value={activePage.slug}
                  onChange={(e) => updateActive("slug", e.target.value)}
                  placeholder="/page-slug"
                  style={inputStyle(t)}
                />
              </div>

              <div>
                <div className="text-xs font-semibold mb-1" style={{ color: t.textMuted }}>Status</div>
                <Select
                  t={t}
                  value={activePage.status || "published"}
                  onChange={(e) => updateActive("status", e.target.value)}
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <div className="text-xs font-semibold mb-1" style={{ color: t.textMuted }}>Meta Title (SEO)</div>
                <Input
                  value={activePage.meta_title || ""}
                  onChange={(e) => updateActive("meta_title", e.target.value)}
                  placeholder="e.g. Privacy Policy — HealerNet"
                  style={inputStyle(t)}
                />
              </div>

              <div className="sm:col-span-1">
                <div className="text-xs font-semibold mb-1" style={{ color: t.textMuted }}>Meta Description (SEO)</div>
                <Input
                  value={activePage.meta_description || ""}
                  onChange={(e) => updateActive("meta_description", e.target.value)}
                  placeholder="Brief page summary..."
                  style={inputStyle(t)}
                />
              </div>
            </div>

            {/* Header bar */}
            <div className="flex items-center justify-between">
              <div className="font-semibold" style={{ color: t.text, fontFamily: FONT_DISPLAY, fontSize: 18 }}>
                Editing: {activePage.title}
              </div>
              <div className="flex items-center gap-2">
                {pages.length > 1 && (
                  <Button variant="danger" size="sm" icon={Trash2} onClick={() => handleDelete(activePage.id)}>Delete</Button>
                )}
                <Button size="sm" onClick={handleSave}>Save Page</Button>
              </div>
            </div>

            {/* Formatting Toolbar */}
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-t-xl border border-b-0 text-xs font-medium" style={{ borderColor: t.border, color: t.textMuted, background: t.surfaceAlt }}>
              <span className="text-[11px] font-bold uppercase tracking-wider mr-2" style={{ color: t.textFaint }}>Insert:</span>
              {["Bold", "Italic", "Link", "H1", "H2", "List"].map((b) => (
                <button
                  key={b}
                  onClick={() => insertFormat(b)}
                  className="px-2.5 py-1 rounded-lg border bg-white/50 hover:bg-white transition-colors text-xs"
                  style={{ borderColor: t.border, color: t.text }}
                >
                  {b}
                </button>
              ))}
            </div>

            {/* Content Textarea */}
            <textarea
              value={activePage.content}
              onChange={(e) => updateActive("content", e.target.value)}
              rows={14}
              className="w-full px-4 py-3 rounded-b-xl border text-sm outline-none resize-none font-mono"
              style={inputStyle(t)}
              placeholder="Write Markdown or HTML page content here…"
            />

            <div className="flex items-center justify-between text-xs px-1" style={{ color: t.textFaint }}>
              <div>Live URL: <span style={{ color: BRAND.primary, fontFamily: FONT_MONO }}>/pages/{String(activePage.slug || '').replace(/^\//, '')}</span></div>
              <div>{activePage.content?.length || 0} characters · {(activePage.content?.match(/\S+/g) || []).length} words</div>
            </div>
          </Card>
        )}
      </div>

      {/* Create New Page Modal */}
      {createModal && (
        <Modal
          t={t}
          open={createModal}
          onClose={() => setCreateModal(false)}
          title="Create New Dynamic CMS Page"
          footer={
            <>
              <Button variant="ghost" size="sm" onClick={() => setCreateModal(false)} style={{ color: t.textMuted }}>Cancel</Button>
              <Button size="sm" onClick={handleCreatePage}>Create Page</Button>
            </>
          }
        >
          <div className="space-y-4">
            <Field t={t} label="Page Title *">
              <Input
                value={newPage.title}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewPage((p) => ({
                    ...p,
                    title: val,
                    slug: "/" + val.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                  }));
                }}
                placeholder="e.g. Terms of Membership"
                style={inputStyle(t)}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field t={t} label="URL Slug">
                <Input
                  value={newPage.slug}
                  onChange={(e) => setNewPage((p) => ({ ...p, slug: e.target.value }))}
                  placeholder="/terms-of-membership"
                  style={inputStyle(t)}
                />
              </Field>

              <Field t={t} label="Status">
                <Select
                  t={t}
                  value={newPage.status}
                  onChange={(e) => setNewPage((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </Select>
              </Field>
            </div>

            <Field t={t} label="Initial Page Content">
              <textarea
                rows={5}
                value={newPage.content}
                onChange={(e) => setNewPage((p) => ({ ...p, content: e.target.value }))}
                placeholder="Enter initial body text or heading…"
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none font-mono"
                style={inputStyle(t)}
              />
            </Field>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* Notifications composer — email all active users */
function NotificationsPage({ t, toast }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [recipientCount, setRecipientCount] = useState(null);
  const [loadingCount, setLoadingCount] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingCount(true);
    apiFetch("/admin/notifications/recipients-count")
      .then(async (res) => {
        if (cancelled) return;
        const data = res.ok ? await res.json() : null;
        setRecipientCount(typeof data?.count === "number" ? data.count : 0);
      })
      .catch(() => {
        if (!cancelled) setRecipientCount(0);
      })
      .finally(() => {
        if (!cancelled) setLoadingCount(false);
      });
    return () => { cancelled = true; };
  }, []);

  const send = async () => {
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    if (!trimmedSubject) { toast("Enter an email subject", "error"); return; }
    if (trimmedMessage.length < 10) { toast("Message must be at least 10 characters", "error"); return; }
    if (!recipientCount) { toast("No active users with email addresses to send to", "error"); return; }

    setConfirmSend(true);
  };

  const runSend = async () => {
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();
    setSending(true);
    try {
      const res = await apiFetch("/admin/notifications/email-all", {
        method: "POST",
        body: JSON.stringify({ subject: trimmedSubject, message: trimmedMessage }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to queue announcement");
      toast(data.message || `Announcement queued for ${data.recipient_count} users`, "success");
      setSubject("");
      setMessage("");
      setConfirmSend(false);
    } catch (err) {
      toast(err.message || "Failed to send announcement", "error");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: t.text }}>Notification Center</div>
        <p className="text-sm mt-1" style={{ color: t.textMuted }}>
          Send a platform announcement by email to every active registered user.
        </p>
      </div>
      <Card t={t} className="p-5 space-y-1">
        <Field t={t} label="Audience">
          <div className="px-3 py-2.5 rounded-lg border text-sm font-medium" style={{ ...inputStyle(t), color: t.text }}>
            {loadingCount ? "Counting recipients…" : `All active users (${recipientCount ?? 0})`}
          </div>
        </Field>
        <Field t={t} label="Email subject">
          <Input style={inputStyle(t)} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="HealerNet platform update" />
        </Field>
        <Field t={t} label="Message">
          <textarea
            style={inputStyle(t)}
            className="w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none"
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your announcement to all users…"
          />
        </Field>
        <p className="text-xs pb-2" style={{ color: t.textMuted }}>
          Emails are sent in the background using your configured SMTP (Mailtrap / production mail). Large sends are processed in batches so the admin panel stays responsive.
        </p>
        <Button icon={sending ? Loader2 : Send} onClick={send} disabled={sending || loadingCount || !recipientCount}>
          {sending ? "Queueing…" : "Email All Users"}
        </Button>
      </Card>

      <SweetConfirm
        t={t}
        open={confirmSend}
        title="Send announcement?"
        text={`Send this email to all ${recipientCount} active users?\n\nSubject: ${subject.trim()}`}
        confirmText="Yes, send"
        cancelText="Cancel"
        tone="brand"
        loading={sending}
        onCancel={() => !sending && setConfirmSend(false)}
        onConfirm={runSend}
      />
    </div>
  );
}
/* Roles & Permissions — see RolesPermissionsPage.jsx (Spatie-backed API) */

/* Settings — admin profile only; platform config lives in dedicated sidebar pages */
function SettingsPage({ t, toast }) {
  const { user, checkAuth } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setName(user.name || "");
    setEmail(user.email || "");
    setMobile(user.mobile || user.mobile_number || user.phone || "");
  }, [user]);

  const roleLabel = user?.role?.name || "Administrator";

  const saveProfile = async () => {
    if (!user?.id) {
      toast("Could not load your account", "error");
      return;
    }
    if (!name.trim()) {
      toast("Full name is required", "error");
      return;
    }

    const mobileError = validateMobileNumber(mobile);
    if (mobileError) {
      toast(mobileError, "error");
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch(`/admin/users/${user.id}`, {
        method: "PUT",
        body: JSON.stringify({
          full_name: name.trim(),
          mobile: normalizeMobileNumber(mobile) || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Failed to save profile");
      toast("Profile saved successfully", "success");
      if (checkAuth) await checkAuth();
    } catch (err) {
      toast(err.message || "Failed to save profile", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: t.text }}>Settings & Profile</div>
        <div className="text-sm mt-1" style={{ color: t.textMuted }}>Update your admin account details.</div>
      </div>

      <Card t={t} className="p-5 max-w-2xl">
        <div className="flex items-center gap-4 mb-6 pb-4 border-b" style={{ borderColor: t.border }}>
          <Avatar name={name || user?.name || "Admin"} size={52} />
          <div>
            <div className="font-bold text-lg" style={{ color: t.text }}>{name || user?.name || "Administrator"}</div>
            <div className="text-xs" style={{ color: t.textFaint }}>{email || user?.email} · Active {roleLabel}</div>
          </div>
        </div>

        <Field t={t} label="Full Name">
          <Input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle(t)} />
        </Field>
        <Field t={t} label="Email Address">
          <Input value={email} disabled readOnly style={{ ...inputStyle(t), opacity: 0.75 }} />
        </Field>
        <Field t={t} label="Role">
          <Input value={roleLabel} disabled readOnly style={{ ...inputStyle(t), opacity: 0.75 }} />
        </Field>
        <Field t={t} label="Mobile Number">
          <Input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={13}
            value={mobile}
            onChange={(e) => setMobile(sanitizeMobileInput(e.target.value))}
            style={inputStyle(t)}
            placeholder="9876543210"
          />
        </Field>

        <Button onClick={saveProfile} disabled={saving || !user} className="mt-2">
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </Card>
    </div>
  );
}

/* =========================================================================
   ROOT APP
   ========================================================================= */
export default function App({ currentView }) {
  const { dark, setDark, t } = useTheme();
  const { authReady, permissions, logout, user } = useAuth();
  const { filterNavItems, canAccessSection, firstAllowedSection } = usePermissions();
  const navSections = useMemo(
    () => NAV.map((sec) => ({ ...sec, items: filterNavItems(sec.items) })).filter((sec) => sec.items.length > 0),
    [filterNavItems]
  );
  const allowedNavItems = useMemo(() => navSections.flatMap((sec) => sec.items), [navSections]);
  const defaultSection = useMemo(
    () => firstAllowedSection(allowedNavItems) || "dashboard",
    [allowedNavItems, firstAllowedSection]
  );
  // Strip 'admin-' prefix if present to map to internal section names (e.g. 'admin-users' -> 'users')
  const requestedSection = currentView && currentView !== 'admin-dashboard' ? currentView.replace('admin-', '') : 'dashboard';
  const initialSection = requestedSection;
  const [section, setSection] = useState(initialSection);
  const [visitedSections, setVisitedSections] = useState(() => new Set([initialSection]));
  const [communityFocus, setCommunityFocus] = useState(null);
  const [isDesktop, setIsDesktop] = useState(() => (typeof window !== "undefined" ? window.innerWidth >= 1024 : true));
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile drawer only — desktop sidebar ignores this
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, type = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((ts) => [...ts, { id, msg, type }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 3200);
  }, []);
  const removeToast = (id) => setToasts((ts) => ts.filter((x) => x.id !== id));

  useEffect(() => {
    if (!authReady) return;

    if (!canAccessSection(section)) {
      const fallback = defaultSection;
      if (fallback && fallback !== section) {
        setSection(fallback);
      }
    }
  }, [authReady, permissions, section, canAccessSection, defaultSection]);

  useEffect(() => {
    if (canAccessSection(section)) {
      setVisitedSections((prev) => (prev.has(section) ? prev : new Set(prev).add(section)));
    }
  }, [section, canAccessSection]);

  useEffect(() => {
    const h = () => { setNotifOpen(false); setProfileOpen(false); };
    window.addEventListener("click", h);
    return () => window.removeEventListener("click", h);
  }, []);
  // Measure actual width in JS instead of trusting a CSS breakpoint alone — this is what
  // decides whether the sidebar is a permanent rail (desktop) or an off-canvas drawer
  // (mobile). Keeps the two states from ever getting out of sync with the real viewport.
  useEffect(() => {
    const onResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (desktop) setSidebarOpen(false); // drop any leftover mobile-drawer state once we're on desktop
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const app = document.getElementById("app");
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      appOverflow: app?.style.overflow ?? "",
      appHeight: app?.style.height ?? "",
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    if (app) {
      app.style.overflow = "hidden";
      app.style.height = "100dvh";
    }
    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      if (app) {
        app.style.overflow = prev.appOverflow;
        app.style.height = prev.appHeight;
      }
    };
  }, []);

  const nav = useCallback((id, payload) => {
    if (!canAccessSection(id)) {
      toast(PERMISSION_DENIED_MESSAGE, "error");
      return;
    }
    setSection(id);
    if (id === "communities" && payload) {
      setCommunityFocus({ ...payload, key: Date.now() });
    } else if (id !== "communities") {
      setCommunityFocus(null);
    }
  }, [canAccessSection, toast]);

  const showSection = (id) => canAccessSection(id) && visitedSections.has(id);
  const sectionStyle = (id) => ({ display: section === id ? "block" : "none" });

  const hasAnySectionAccess = allowedNavItems.length > 0;

  return (
    <div className="h-[100dvh] overflow-hidden flex" style={{ fontFamily: FONT_BODY, background: t.bg, color: t.text }}>
      <style>{`
        * { box-sizing: border-box; }
        input, select, textarea, button { font-family: ${FONT_BODY}; }
        input:focus, select:focus, textarea:focus { border-color: ${BRAND.primary} !important; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: ${dark ? "#26452F" : "#D9E5CC"}; border-radius: 8px; }
        @keyframes hn-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes hn-toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        table { border-collapse: collapse; }
      `}</style>
        <Sidebar sections={navSections} active={section} onNav={nav} open={sidebarOpen} setOpen={setSidebarOpen} isDesktop={isDesktop} dark={dark} onLogout={logout} />
        <div className="flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden">
          <Header t={t} dark={dark} setDark={setDark} sidebarOpen={sidebarOpen} isDesktop={isDesktop} onMenu={() => setSidebarOpen(true)} section={section}
            notifOpen={notifOpen} setNotifOpen={setNotifOpen} profileOpen={profileOpen} setProfileOpen={setProfileOpen} onLogout={logout} user={user} onNav={nav} canAccessSection={canAccessSection} />
          <div className="flex-1 min-h-0 overflow-y-auto">
          <main className="p-4 sm:p-6 max-w-[1400px] w-full mx-auto">
            <div className="mb-4 text-xs md:hidden" style={{ color: t.textFaint }}>Admin / {LABELS[section] || "Panel"}</div>
            {!hasAnySectionAccess && (
              <AccessDeniedPanel
                t={t}
                message="No admin pages are assigned to your role. Please contact your administrator."
              />
            )}
            {hasAnySectionAccess && !canAccessSection(section) && (
              <AccessDeniedPanel
                t={t}
                message={PERMISSION_DENIED_MESSAGE}
                onGoHome={() => nav(defaultSection)}
                homeLabel={`Open ${LABELS[defaultSection] || "home"}`}
              />
            )}
            {hasAnySectionAccess && canAccessSection(section) && showSection("dashboard") && (
              <div style={sectionStyle("dashboard")}>
                <DashboardPage t={t} dark={dark} toast={toast} onNav={nav} canAccessSection={canAccessSection} />
              </div>
            )}
            {showSection("users") && (
              <div style={sectionStyle("users")}>
                <UsersPage t={t} toast={toast} />
              </div>
            )}
            {showSection("categories") && (
              <div style={sectionStyle("categories")}>
                <CategoriesPage t={t} toast={toast} />
              </div>
            )}
            {showSection("communities") && (
              <div style={sectionStyle("communities")}>
                <CommunitiesPage t={t} toast={toast} focusCommunity={communityFocus} />
              </div>
            )}
            {showSection("locations") && (
              <div style={sectionStyle("locations")}>
                <LocationManagementPage t={t} toast={toast} onNav={nav} variant="locations" />
              </div>
            )}
            {showSection("group-management") && (
              <div style={sectionStyle("group-management")}>
                <LocationManagementPage t={t} toast={toast} onNav={nav} variant="groups" />
              </div>
            )}
            {showSection("banners") && (
              <div style={sectionStyle("banners")}>
                <BannersPage t={t} toast={toast} />
              </div>
            )}
            {showSection("cms") && (
              <div style={sectionStyle("cms")}>
                <CmsPage t={t} toast={toast} />
              </div>
            )}
            {showSection("notifications") && (
              <div style={sectionStyle("notifications")}>
                <NotificationsPage t={t} toast={toast} />
              </div>
            )}
            {showSection("email") && (
              <div style={sectionStyle("email")}>
                <EmailTemplatesPage t={t} toast={toast} />
              </div>
            )}
            {showSection("analytics") && (
              <div style={sectionStyle("analytics")}>
                <AnalyticsPage t={t} />
              </div>
            )}
            {showSection("roles") && (
              <div style={sectionStyle("roles")}>
                <RolesManagementPage t={t} toast={toast} />
              </div>
            )}
            {showSection("permissions") && (
              <div style={sectionStyle("permissions")}>
                <PermissionsManagementPage t={t} toast={toast} />
              </div>
            )}
            {showSection("settings") && (
              <div style={sectionStyle("settings")}>
                <SettingsPage t={t} toast={toast} />
              </div>
            )}
          </main>
          <footer className="px-6 py-4 text-xs text-center" style={{ color: t.textFaint, borderTop: `1px solid ${t.border}` }}>
            HealerNet Admin Console · Global Network for Evidence-Based Healing · v1.0
          </footer>
          </div>
        </div>
      <ToastHost toasts={toasts} remove={removeToast} />
    </div>
  );
}
