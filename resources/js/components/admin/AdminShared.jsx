import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import {
  LayoutDashboard, Users, Heart, Leaf, MessageCircle, Calendar, BookOpen,
  FileText, Library, Bell, Mail, FileCode2, LifeBuoy, PieChart as PieIcon,
  ShieldCheck, Settings as SettingsIcon, LogOut, Search, ChevronDown, Menu, X, Sun, Moon,
  Plus, MoreVertical, Pencil, Trash2, CheckCircle2, XCircle, Download, Filter,
  ArrowUpDown, RefreshCw, AlertTriangle, Clock, MapPin, Link2, TrendingUp, Activity,
  UserCheck, UserX, Send, ChevronLeft, ChevronRight, Ticket, Globe, Database, Palette,
  Key, Wrench, Sparkles, ArrowRight, Inbox, KeyRound, ImageIcon, Loader2, ChevronsUpDown,
  BadgeCheck, ShieldAlert, FolderOpen, PanelLeftClose, PanelLeftOpen
} from "lucide-react";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RePieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

/* =========================================================================
   TOKENS — HealerNet "Enterprise Network" theme: deep forest green rail,
   lime accent for growth/action, gold for the one thing that needs a
   human's attention, soft lavender for secondary data.
   ========================================================================= */
const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,380;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap');";
export const FONT_DISPLAY = "'Fraunces', serif";
export const FONT_BODY = "'Inter', system-ui, sans-serif";
export const FONT_MONO = "'IBM Plex Mono', monospace";

export const RAIL = { bg: "#0E2A1C", bgActive: "rgba(255,255,255,0.10)", indicator: "#D4A62C", text: "#CFE0D2", textDim: "#6C8574", border: "rgba(141,198,63,0.14)", danger: "#E8ABA3" };
export const RAIL_LIGHT = { bg: "#FFFFFF", bgActive: "rgba(31,92,59,0.08)", indicator: "#B8841E", text: "#0F241A", textDim: "#7C8F81", border: "rgba(21,48,43,0.08)", danger: "#C1483F" };
export const LIGHT = { bg: "#F4F8F1", surface: "#FFFFFF", surfaceAlt: "#EAF3DE", border: "rgba(21,48,43,0.08)", text: "#0F241A", textMuted: "#54695C", textFaint: "#8B9C90" };
export const DARKT = { bg: "#071A12", surface: "#122E1F", surfaceAlt: "#183624", border: "rgba(141,198,63,0.14)", text: "#F2F7EE", textMuted: "#B9C7BC", textFaint: "#7E9186" };
export const BRAND = { primary: "#1F5C3B", primaryDark: "#0E2A1C", primaryLight: "#EAF3DE", amber: "#B8841E", amberLight: "#FBEFD1", danger: "#C1483F", dangerLight: "#FBE7E7", info: "#6A6FC9", infoLight: "#ECEDFA", ok: "#5C9A34", okLight: "#EAF3DE" };

export const CHART_COLORS = ["#1F5C3B", "#D4A62C", "#7C83DB", "#8DC63F", "#C1483F", "#0E2A1C", "#54695C", "#9A5A1E"];

/* =========================================================================
   DUMMY DATA
   ========================================================================= */
export const CATEGORIES = [
  { id: "c1", name: "Yoga & Movement", icon: "🧘", description: "Asana practice, breathwork and mobility circles.", status: "Active", sortOrder: 1 },
  { id: "c2", name: "Nutrition Science", icon: "🥗", description: "Evidence-based dietary guidance and metabolic health.", status: "Active", sortOrder: 2 },
  { id: "c3", name: "Mental Wellness", icon: "🧠", description: "Peer support grounded in CBT and mindfulness research.", status: "Active", sortOrder: 3 },
  { id: "c4", name: "Sleep Medicine", icon: "🌙", description: "Circadian health and clinical sleep hygiene.", status: "Active", sortOrder: 4 },
  { id: "c5", name: "Chronic Pain", icon: "🦴", description: "Physiotherapy-led management and mobility work.", status: "Active", sortOrder: 5 },
  { id: "c6", name: "Cardiac Recovery", icon: "❤️", description: "Post-cardiac rehab support cohorts.", status: "Inactive", sortOrder: 6 },
  { id: "c7", name: "Herbal & Traditional", icon: "🌿", description: "Traditional practice cross-checked against current evidence.", status: "Active", sortOrder: 7 },
  { id: "c8", name: "Maternal Health", icon: "🤰", description: "Pre- and post-natal peer circles.", status: "Active", sortOrder: 8 },
];

export function genCommunities() {
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
export const COMMUNITIES = genCommunities();

export const COUNTRIES = ["India", "United States", "United Kingdom", "Canada", "Australia", "Germany", "Kenya", "Philippines", "Brazil", "UAE"];

// Dynamic Country → State → City map, used to drive cascading dropdowns in the
// user create/edit form (selecting a country repopulates its states, selecting
// a state repopulates its cities).
export const LOCATIONS = {
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
export const statesOf = (country) => Object.keys(LOCATIONS[country] || {});
export const citiesOf = (country, state) => (LOCATIONS[country] || {})[state] || [];
export const FIRST = ["Asha", "Liam", "Priya", "Noah", "Meera", "Ethan", "Fatima", "Oliver", "Sana", "James", "Kavya", "Lucas", "Nia", "Daniel", "Reema", "Mateus", "Zara", "Henry", "Ines", "Arjun", "Grace", "Tariq", "Wei", "Elena", "Sofia", "Diego", "Amara", "Kenji", "Layla", "Owen"];
export const LAST = ["Rao", "Smith", "Kapoor", "Brown", "Nair", "Wilson", "Khan", "Taylor", "Reddy", "Anderson", "Sen", "Clark", "Ochieng", "Rossi", "Alvarez", "Silva", "Cohen", "Baker", "Diallo", "Suzuki"];
export function genUsers(count) {
  const arr = [];
  for (let i = 0; i < count; i++) {
    const f = FIRST[i % FIRST.length], l = LAST[(i * 3) % LAST.length];
    const cat = CATEGORIES[i % CATEGORIES.length];
    const country = COUNTRIES[i % COUNTRIES.length];
    const statusRoll = i % 11;
    const status = statusRoll === 0 ? "Suspended" : statusRoll < 3 ? "Pending" : "Active";
    arr.push({
      id: `u${1000 + i}`, name: `${f} ${l}`, email: `${f.toLowerCase()}.${l.toLowerCase()}${i}@mail.com`,
      mobile: `+${(i % 9) + 1} ${900000000 + i * 137}`, categoryId: cat.id, category: cat.name,
      country, state: country === "India" ? ["Punjab", "Maharashtra", "Karnataka", "Delhi"][i % 4] : ["North", "South", "East", "West"][i % 4],
      city: country === "India" ? ["Chandigarh", "Pune", "Bengaluru", "New Delhi"][i % 4] : ["Springvale", "Rosewood", "Elmhurst", "Fairview"][i % 4],
      registered: `2026-0${(i % 7) + 1}-${String((i % 27) + 1).padStart(2, "0")}`,
      status, emailVerified: statusRoll >= 3,
    });
  }
  return arr;
}
export const USERS = genUsers(64);

export const EVENTS = [
  { id: "e1", title: "Morning Vinyasa Live Session", categoryId: "c1", location: "Online — Zoom", date: "2026-08-14", time: "07:00", max: 200, registered: 178, status: "Upcoming" },
  { id: "e2", title: "Understanding Macronutrients", categoryId: "c2", location: "Online — Webinar", date: "2026-08-18", time: "18:30", max: 150, registered: 92, status: "Upcoming" },
  { id: "e3", title: "Mindfulness for Anxiety — Workshop", categoryId: "c3", location: "Community Hall, Pune", date: "2026-08-09", time: "10:00", max: 60, registered: 60, status: "Full" },
  { id: "e4", title: "Sleep Hygiene Clinic", categoryId: "c4", location: "Online — Webinar", date: "2026-07-28", time: "19:00", max: 100, registered: 100, status: "Completed" },
  { id: "e5", title: "Gentle Mobility for Chronic Pain", categoryId: "c5", location: "Wellness Center, Chandigarh", date: "2026-08-22", time: "16:00", max: 40, registered: 21, status: "Upcoming" },
  { id: "e6", title: "Postnatal Recovery Circle", categoryId: "c8", location: "Online — Zoom", date: "2026-08-05", time: "11:00", max: 80, registered: 45, status: "Upcoming" },
];

export const TICKETS = [
  { id: "t1", subject: "Cannot join Yoga Group 2 via invite link", user: "Meera Nair", priority: "High", status: "Open", created: "2026-08-05" },
  { id: "t2", subject: "Email verification link expired", user: "Ethan Wilson", priority: "Medium", status: "Assigned", created: "2026-08-04" },
  { id: "t3", subject: "Request to switch healthcare category", user: "Fatima Khan", priority: "Low", status: "Open", created: "2026-08-06" },
  { id: "t4", subject: "Duplicate account created", user: "James Taylor", priority: "High", status: "Resolved", created: "2026-08-01" },
  { id: "t5", subject: "Event reminder not received", user: "Kavya Sen", priority: "Medium", status: "Open", created: "2026-08-06" },
  { id: "t6", subject: "Unable to download research PDF", user: "Lucas Clark", priority: "Low", status: "Assigned", created: "2026-08-03" },
];

export const REG_GROWTH = [
  { month: "Feb", users: 420, communities: 12 }, { month: "Mar", users: 610, communities: 14 },
  { month: "Apr", users: 780, communities: 16 }, { month: "May", users: 1020, communities: 18 },
  { month: "Jun", users: 1340, communities: 21 }, { month: "Jul", users: 1710, communities: 24 },
  { month: "Aug", users: 1980, communities: 26 },
];
export const DAU = [
  { day: "Mon", active: 640 }, { day: "Tue", active: 712 }, { day: "Wed", active: 690 },
  { day: "Thu", active: 780 }, { day: "Fri", active: 820 }, { day: "Sat", active: 560 }, { day: "Sun", active: 505 },
];
export const COUNTRY_DIST = COUNTRIES.slice(0, 6).map((c, i) => ({ country: c, users: [1240, 860, 540, 410, 305, 260][i] }));
export const CATEGORY_DIST = CATEGORIES.map((c, i) => ({ name: c.name, value: [18, 22, 20, 10, 12, 4, 9, 5][i] }));

/* =========================================================================
   SMALL PRIMITIVES
   ========================================================================= */
export function cx(...a) { return a.filter(Boolean).join(" "); }

export function useTheme() {
  const [dark, setDark] = useState(false);
  const t = dark ? DARKT : LIGHT;
  return { dark, setDark, t };
}

export function Skeleton({ className }) {
  return <div className={cx("animate-pulse rounded-lg bg-stone-200/70", className)} style={{ background: "linear-gradient(90deg,rgba(120,120,110,0.12),rgba(120,120,110,0.22),rgba(120,120,110,0.12))", backgroundSize: "200% 100%", animation: "hn-shimmer 1.4s ease-in-out infinite" }} />;
}

export function Badge({ tone = "neutral", children, t }) {
  const map = {
    ok: { bg: BRAND.okLight, fg: BRAND.ok },
    warn: { bg: BRAND.amberLight, fg: BRAND.amber },
    danger: { bg: BRAND.dangerLight, fg: BRAND.danger },
    info: { bg: BRAND.infoLight, fg: BRAND.info },
    brand: { bg: BRAND.primaryLight, fg: BRAND.primaryDark },
    // Distinct from Active green (surfaceAlt/okLight are the same #EAF3DE)
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

export function Button({ variant = "primary", size = "md", className, children, icon: Icon, style: styleProp, ...props }) {
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
      {Icon && <Icon size={size === "sm" ? 14 : 16} />}
      {children}
    </button>
  );
}

/** Location Management style — label stays "Refresh", only icon spins; avoids toolbar layout shift. */
export function RefreshButton({ t, refreshing = false, onClick, disabled, className }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      icon={RefreshCw}
      onClick={onClick}
      disabled={disabled ?? refreshing}
      className={cx(refreshing && "[&_svg]:animate-spin", "shrink-0", className)}
      style={{ color: t.text, borderColor: t.border }}
    >
      Refresh
    </Button>
  );
}

export function refreshTableStyle(refreshing) {
  return refreshing
    ? { opacity: 0.72, transition: "opacity 0.15s ease" }
    : undefined;
}

export function Card({ t, className, children, style }) {
  return (
    <div className={cx("rounded-2xl border", className)} style={{ background: t.surface, borderColor: t.border, ...style }}>
      {children}
    </div>
  );
}

export function IconBtn({ t, icon: Icon, onClick, title, active }) {
  return (
    <button title={title} onClick={onClick} className="p-2 rounded-lg transition-colors" style={{ background: active ? BRAND.primaryLight : "transparent", color: active ? BRAND.primaryDark : t.textMuted }}>
      <Icon size={17} />
    </button>
  );
}

export function EmptyState({ t, icon: Icon = Inbox, title, sub, action }) {
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

export function ErrorState({ t, onRetry }) {
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

export function Modal({ t, open, onClose, title, children, width = 520, footer }) {
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

export function Field({ t, label, children }) {
  return (
    <label className="block mb-3.5">
      <div className="text-xs font-semibold mb-1.5" style={{ color: t.textMuted }}>{label}</div>
      {children}
    </label>
  );
}
export function inputStyle(t) { return { background: t.surfaceAlt, borderColor: t.border, color: t.text }; }
export function Input(props) { return <input {...props} className={cx("w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2", props.className)} style={{ ...props.style, boxShadow: "none" }} />; }
export function AdminPageHeader({ t, title, subtitle, actions }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div>
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: t.text }}>{title}</div>
        {subtitle && <div className="text-sm" style={{ color: t.textMuted }}>{subtitle}</div>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function StatusBadge({ t, status }) {
  const normalized = status
    ? String(status).charAt(0).toUpperCase() + String(status).slice(1).toLowerCase()
    : "Active";
  const map = {
    Active: "ok", Pending: "warn", Suspended: "danger", Full: "danger", Inactive: "muted",
    Upcoming: "info", Completed: "neutral", Open: "warn", Assigned: "info", Resolved: "ok",
    Paused: "muted", Draft: "muted", Published: "ok",
  };
  return <Badge tone={map[normalized] || "neutral"} t={t}>{normalized}</Badge>;
}

export function Select({ t, className, value, onChange, disabled, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const menuRef = useRef(null);
  const [menuStyle, setMenuStyle] = useState(null);

  const collectOptions = useCallback((nodes) => {
    const options = [];
    React.Children.forEach(nodes, (child) => {
      if (!React.isValidElement(child)) return;
      if (child.type === 'option') {
        options.push({
          value: child.props.value ?? '',
          label: child.props.children,
          disabled: Boolean(child.props.disabled),
        });
        return;
      }
      if (child.props?.children) {
        options.push(...collectOptions(child.props.children));
      }
    });
    return options;
  }, []);

  const options = useMemo(() => collectOptions(children), [children, collectOptions]);

  useEffect(() => {
    const close = (e) => {
      if (ref.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    if (!open || !ref.current) return undefined;
    const updatePosition = () => {
      const rect = ref.current.getBoundingClientRect();
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 200,
      });
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  const selected = options.find((opt) => String(opt.value) === String(value ?? ''));
  const displayLabel = selected?.label ?? options.find((opt) => opt.value === '')?.label ?? 'Select…';

  const pick = (opt) => {
    if (opt.disabled) return;
    onChange?.({ target: { value: opt.value } });
    setOpen(false);
  };

  const menu = open && menuStyle ? (
    <div
      ref={menuRef}
      className="max-h-52 overflow-y-auto rounded-lg border shadow-lg py-1"
      style={{ ...menuStyle, background: t.surface, borderColor: t.border }}
    >
      {options.map((opt) => {
        const isSelected = String(opt.value) === String(value ?? '');
        return (
          <button
            key={`${opt.value}-${String(opt.label)}`}
            type="button"
            disabled={opt.disabled}
            onClick={() => pick(opt)}
            className="w-full px-3 py-2 text-sm text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: isSelected ? BRAND.primaryLight : 'transparent',
              color: isSelected ? BRAND.primaryDark : t.text,
              fontWeight: isSelected ? 600 : 400,
            }}
            onMouseEnter={(e) => {
              if (!opt.disabled && !isSelected) {
                e.currentTarget.style.background = BRAND.primaryLight;
                e.currentTarget.style.color = BRAND.primaryDark;
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = t.text;
              }
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <div ref={ref} className={cx('relative', className || 'w-full')}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className="w-full px-3 py-2 rounded-lg border text-sm outline-none text-left flex items-center justify-between gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        style={inputStyle(t)}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown size={14} style={{ color: t.textMuted, flexShrink: 0, transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.15s ease' }} />
      </button>
      {typeof document !== 'undefined' && menu ? ReactDOM.createPortal(menu, document.body) : null}
    </div>
  );
}

export function Pagination({ t, page, totalPages, onPage, total, pageSize }) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t text-sm" style={{ borderColor: t.border, color: t.textMuted }}>
      <div>Showing <span style={{ color: t.text, fontWeight: 600 }}>{start}–{end}</span> of <span style={{ color: t.text, fontWeight: 600 }}>{total}</span></div>
      <div className="flex items-center gap-1">
        <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className="p-1.5 rounded-lg border disabled:opacity-40" style={{ borderColor: t.border }}><ChevronLeft size={15} /></button>
        <span className="px-2 text-xs">Page {page} of {totalPages || 1}</span>
        <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="p-1.5 rounded-lg border disabled:opacity-40" style={{ borderColor: t.border }}><ChevronRight size={15} /></button>
      </div>
    </div>
  );
}

export function Th({ t, label, sortKey, sort, onSort, className }) {
  const active = sort?.key === sortKey;
  return (
    <th className={cx("text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide select-none", sortKey && "cursor-pointer", className)}
      style={{ color: t.textFaint }} onClick={() => sortKey && onSort(sortKey)}>
      <span className="inline-flex items-center gap-1">{label}{sortKey && <ArrowUpDown size={11} style={{ opacity: active ? 1 : 0.4, color: active ? BRAND.primary : t.textFaint }} />}</span>
    </th>
  );
}

export function ActionsTh({ t }) {
  return (
    <th className="text-right px-4 py-3 text-xs font-semibold uppercase tracking-wide w-16" style={{ color: t.textFaint }}>
      Actions
    </th>
  );
}

export function MenuItem({ t, icon: Icon, label, onClick, danger }) {
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

export function exportToCSV(filename, data, columns, toastFn) {
  if (!data?.length) {
    toastFn?.("No data available to export", "error");
    return;
  }
  const headers = columns ? columns.map((c) => c.label || c.key) : Object.keys(data[0]);
  const keys = columns ? columns.map((c) => c.key) : Object.keys(data[0]);
  const csvRows = [headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(",")];
  data.forEach((row) => {
    csvRows.push(keys.map((k) => `"${String(row[k] ?? "").replace(/"/g, '""')}"`).join(","));
  });
  const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToExcel(filename, data, columns, toastFn) {
  if (!data?.length) {
    toastFn?.("No data available to export", "error");
    return;
  }
  const headers = columns ? columns.map((c) => c.label || c.key) : Object.keys(data[0]);
  const keys = columns ? columns.map((c) => c.key) : Object.keys(data[0]);
  let tableHtml = "<table border=\"1\"><thead><tr>";
  headers.forEach((h) => { tableHtml += `<th style="background-color:#0E2A1C;color:#FFF;padding:8px;">${h}</th>`; });
  tableHtml += "</tr></thead><tbody>";
  data.forEach((row) => {
    tableHtml += "<tr>";
    keys.forEach((k) => { tableHtml += `<td style="padding:6px;">${row[k] ?? ""}</td>`; });
    tableHtml += "</tr>";
  });
  tableHtml += "</tbody></table>";
  const blob = new Blob([`<html><body>${tableHtml}</body></html>`], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.xls`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function Avatar({ name, size = 32 }) {
  const initials = name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
  const hue = (name.charCodeAt(0) * 37) % 360;
  return (
    <div className="rounded-full flex items-center justify-center font-semibold shrink-0" style={{ width: size, height: size, fontSize: size * 0.36, background: `hsl(${hue} 35% 92%)`, color: `hsl(${hue} 45% 32%)` }}>
      {initials}
    </div>
  );
}

/* Toasts */
export function ToastHost({ toasts, remove }) {
  const icon = { success: CheckCircle2, error: XCircle, info: Sparkles };
  const color = { success: BRAND.ok, error: BRAND.danger, info: BRAND.info };
  return (
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 w-[320px] max-w-[90vw]">
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
export const NAV = [
  { section: "Overview", items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    section: "Community", items: [
      { id: "users", label: "User Management", icon: Users },
      { id: "categories", label: "Healthcare Categories", icon: Heart },
      { id: "communities", label: "WhatsApp Communities", icon: MessageCircle },
      { id: "events", label: "Events", icon: Calendar },
    ]
  },
  {
    section: "Content", items: [
      { id: "resources", label: "Resources", icon: BookOpen },
      { id: "articles", label: "Articles", icon: FileText },
      { id: "research", label: "Research Library", icon: Library },
      { id: "cms", label: "CMS Pages", icon: FileCode2 },
    ]
  },
  {
    section: "Engagement", items: [
      { id: "notifications", label: "Notifications", icon: Bell },
      { id: "email", label: "Email Templates", icon: Mail },
      { id: "tickets", label: "Support Tickets", icon: LifeBuoy },
    ]
  },
  {
    section: "Insights", items: [
      { id: "analytics", label: "Analytics", icon: PieIcon },
    ]
  },
  {
    section: "System", items: [
      { id: "roles", label: "Roles & Permissions", icon: ShieldCheck },
      { id: "settings", label: "Settings", icon: SettingsIcon },
    ]
  },
];
export const LABELS = Object.fromEntries(NAV.flatMap((s) => s.items).map((i) => [i.id, i.label]));

/* =========================================================================
   KPI CARD (signature element: serif number + inline sparkline)
   ========================================================================= */
export function Kpi({ t, label, value, delta, trend, tone = "brand" }) {
  const toneColor = { brand: BRAND.primary, amber: BRAND.amber, info: BRAND.info, danger: BRAND.danger, ok: BRAND.ok }[tone];
  return (
    <Card t={t} className="p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: t.textFaint }}>{label}</span>
        {delta != null && (
          <span className="text-xs font-semibold flex items-center gap-0.5" style={{ color: delta >= 0 ? BRAND.ok : BRAND.danger }}>
            <TrendingUp size={12} style={{ transform: delta < 0 ? "scaleY(-1)" : "none" }} /> {delta >= 0 ? "+" : ""}{delta}%
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-3">
        <div style={{ fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 600, color: t.text, lineHeight: 1 }}>{value}</div>
        {trend && (
          <div style={{ width: 72, height: 30 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={toneColor} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={toneColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="v" stroke={toneColor} strokeWidth={1.75} fill={`url(#spark-${label})`} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}
export const spark = (base, vol) => Array.from({ length: 8 }, (_, i) => ({ v: Math.max(4, base + Math.sin(i * 1.3) * vol + i * (vol / 4)) }));

/* =========================================================================
   GENERIC DATA TABLE (drives Users / Events / Tickets / Categories / content pages)
   ========================================================================= */
export function useTableState(data, { searchKeys = [], initialSort = null, pageSize = 8 }) {
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

export function TableToolbar({ t, query, setQuery, placeholder, right }) {
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