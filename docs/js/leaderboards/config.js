// Central configuration for Leaderboards
// Contest end date and admin flag handling

export const CONTEST_END_ISO = '2025-10-15T00:00:00';
export const ADMIN_QUERY_PARAM = 'admin';

export function getContestEndDate() {
  try {
    const d = new Date(CONTEST_END_ISO);
    if (!isNaN(d)) {
      // Normalize to a local Date instance with the same Y/M/D H:M:S to avoid UTC vs local parsing surprises
      return new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
    }
  } catch (_) {}
  // Fallback: construct explicitly in local time (Oct is month index 9)
  return new Date(2025, 9, 15, 0, 0, 0);
}

export function isAdmin() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get(ADMIN_QUERY_PARAM) === '1';
  } catch (_) {
    return false;
  }
}
