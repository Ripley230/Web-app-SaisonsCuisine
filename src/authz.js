export function isUserAdmin(user) {
  if (!user) return false;

  const appRole = String(user.app_metadata?.role || "").trim().toLowerCase();
  const userRole = String(user.user_metadata?.role || "").trim().toLowerCase();
  if (appRole === "admin" || userRole === "admin") return true;

  const appRoles = Array.isArray(user.app_metadata?.roles) ? user.app_metadata.roles : [];
  const userRoles = Array.isArray(user.user_metadata?.roles) ? user.user_metadata.roles : [];
  const roles = [...appRoles, ...userRoles].map((r) => String(r || "").trim().toLowerCase());
  return roles.includes("admin");
}
