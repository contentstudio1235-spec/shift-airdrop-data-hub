const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function fetchDashboard(wallet: string) {
  const res = await fetch(`${API_URL}/api/dashboard/${wallet}`);
  if (!res.ok) throw new Error('Failed to fetch dashboard');
  return res.json();
}

export async function fetchPositions(wallet: string) {
  const res = await fetch(`${API_URL}/api/positions/${wallet}/active`);
  if (!res.ok) throw new Error('Failed to fetch positions');
  return res.json();
}

export async function fetchLeaderboard() {
  const res = await fetch(`${API_URL}/api/leaderboard`);
  if (!res.ok) throw new Error('Failed to fetch leaderboard');
  return res.json();
}

export async function fetchBadges(wallet: string) {
  const res = await fetch(`${API_URL}/api/badges/${wallet}`);
  if (!res.ok) throw new Error('Failed to fetch badges');
  return res.json();
}

export async function fetchEvents() {
  const res = await fetch(`${API_URL}/api/events`);
  if (!res.ok) throw new Error('Failed to fetch events');
  return res.json();
}

export async function healthCheck() {
  try {
    const res = await fetch(`${API_URL}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
