# 🌿 HealerNet Brand Guidelines & UI System

> **Global Network for Evidence-Based Healing**  
> *Connect • Collaborate • Heal • Transform*

---

## 1. Brand Overview & Vision
**HealerNet™** is a premium global platform uniting practitioners, researchers, and individuals around evidence-based holistic healing.

* **Core Message:** Bridging ancient wisdom with modern evidence-based practice.
* **Tone of Voice:** Compassionate, Scientific, Empowering, Serene, Authoritative.
* **Core Symbolism:** Tree of Life emblem, supportive hands, 5 holistic discipline nodes (Mind, Body, Heart, Herb, Energy).

---

## 2. Color Palette & CSS Variables

### Core Palette
| Token | Hex Code | Role |
| :--- | :--- | :--- |
| **Primary Green** | `#3F8F2D` | Primary actions, branding emphasis |
| **Forest Green** | `#0D5F54` | Headers, navigation background, structural dark accents |
| **Light Green** | `#8CC63E` | Highlights, active indicators, success accent |
| **Gold** | `#C8A24D` | Premium badges, rating stars, accents & borders |
| **White** | `#FFFFFF` | Card surface, light background |
| **Dark Gray** | `#374151` | Body text, slate contrast |

### CSS Theme Tokens

```css
:root {
  /* Brand Core */
  --primary: #3F8F2D;
  --primary-hover: #327524;
  --secondary: #0D5F54;
  --secondary-hover: #09473F;
  --light-green: #8CC63E;
  --accent: #C8A24D;
  --accent-hover: #B08D3C;

  /* Status Colors */
  --success: #16A34A;
  --success-bg: #DCFCE7;
  --warning: #F59E0B;
  --warning-bg: #FEF3C7;
  --danger: #DC2626;
  --danger-bg: #FEE2E2;
  --info: #0284C7;
  --info-bg: #E0F2FE;

  /* Neutrals (Light Mode) */
  --background: #F8FAFC;
  --surface: #FFFFFF;
  --surface-hover: #F1F5F9;
  --border: #E2E8F0;
  --text-primary: #1F2937;
  --text-secondary: #6B7280;
}

[data-theme="dark"] {
  /* Dark Mode Tokens */
  --primary: #52B53B;
  --primary-hover: #63C74B;
  --secondary: #148575;
  --secondary-hover: #1AA390;
  --light-green: #A3D959;
  --accent: #D6B35E;

  --success: #22C55E;
  --warning: #FBBF24;
  --danger: #EF4444;

  --background: #0F172A;
  --surface: #1E293B;
  --surface-hover: #334155;
  --border: #334155;
  --text-primary: #F8FAFC;
  --text-secondary: #94A3B8;
}
```

---

## 3. UI Component System

### Navbar & Header
- **Background:** `#0D5F54` (Forest Green) or `#FFFFFF` / `#1E293B` with border `var(--border)`.
- **Nav Links:** `#FFFFFF` (opacity 0.85, hover 1.0) on dark nav; `var(--text-primary)` on light nav.

### Sidebar Navigation
- **Background:** `#0D5F54` (Light Mode) / `#0F172A` (Dark Mode).
- **Active State:** Background `#3F8F2D` with light green left indicator (`#8CC63E`).

### Cards & Panels
- **Border Radius:** `12px` (`rounded-xl`).
- **Border:** `1px solid var(--border)`.
- **Hover:** Slight shadow elevation, `translateY(-2px)`, gold/green highlight border top.

### Buttons & Inputs
- **Primary Button:** Background `var(--primary)` (`#3F8F2D`), text white, radius `8px`.
- **Secondary Button:** Background `var(--secondary)` (`#0D5F54`), text white, radius `8px`.
- **Accent Button:** Background `var(--accent)` (`#C8A24D`), text white, radius `8px`.
- **Form Controls:** Height `42px`, border `1px solid var(--border)`, focus ring `2px solid var(--primary)`.

---

## 4. Accessibility & Brand Guidelines

- **Contrast:** Minimum WCAG 2.1 AA ratio of 4.5:1 for body text (`#1F2937` on `#FFFFFF` is 16:1).
- **Logo Usage:** Always maintain clear space of at least 50% logo width. Never distort or change core brand colors.
