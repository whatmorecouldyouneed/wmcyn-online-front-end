export function hasMarkerWritePermission(user?: any): boolean {
  if (!user) return true;
  if (user?.isAdmin === true) return true;
  if (Array.isArray(user?.roles) && user.roles.includes('admin')) return true;
  return false;
}
