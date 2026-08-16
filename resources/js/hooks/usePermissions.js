import { useMemo, useCallback } from "react";
import { useAuth } from "../context/AuthContext";

/** Minimum permission required to show each admin nav section. */
export const NAV_PERMISSIONS = {
  dashboard: "dashboard.view",
  users: "users.view",
  categories: "categories.view",
  communities: "whatsapp-groups.view",
  locations: "countries.view|states.view|cities.view",
  "group-management": "community-groups.view",
  banners: "banners.view",
  cms: "cms.view",
  notifications: "notifications.send",
  email: "email_templates.view",
  analytics: "dashboard.view",
  roles: "roles.view",
  permissions: "permissions.view",
  settings: "settings.view",
};

export const PERMISSION_DENIED_MESSAGE =
  "You don't have permission to access this page. Please contact your administrator.";

export function usePermissions() {
  const { permissions, user } = useAuth();

  const set = useMemo(() => new Set(permissions || []), [permissions]);

  const can = useCallback((permission) => {
    if (!permission) return true;
    if (user?.role?.slug === "admin" || user?.roles?.some?.((r) => r.slug === "admin")) {
      return true;
    }
    if (typeof permission === "string" && permission.includes("|")) {
      return permission.split("|").some((p) => set.has(p.trim()));
    }
    if (Array.isArray(permission)) {
      return permission.some((p) => set.has(p));
    }
    return set.has(permission);
  }, [set, user]);

  const canAny = useCallback((...perms) => perms.some((p) => can(p)), [can]);

  const canAccessSection = useCallback((sectionId) => {
    const required = NAV_PERMISSIONS[sectionId];
    return !required || can(required);
  }, [can]);

  const filterNavItems = useCallback(
    (items) =>
      items.filter((item) => canAccessSection(item.id)),
    [canAccessSection]
  );

  const firstAllowedSection = useCallback((items = []) => {
    for (const item of items) {
      if (canAccessSection(item.id)) return item.id;
    }
    return null;
  }, [canAccessSection]);

  return {
    permissions: permissions || [],
    can,
    canAny,
    canAccessSection,
    filterNavItems,
    firstAllowedSection,
  };
}
