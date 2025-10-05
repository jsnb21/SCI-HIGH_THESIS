// Central configuration for Leaderboards
// Contest end date and admin flag handling

export const CONTEST_END_ISO = '2025-10-12T00:00:00';
export const ADMIN_QUERY_PARAM = 'admin';

export function getContestEndDate() {
  return new Date(CONTEST_END_ISO);
}

export function isAdmin() {
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get(ADMIN_QUERY_PARAM) === '1';
  } catch (_) {
    return false;
  }
}
