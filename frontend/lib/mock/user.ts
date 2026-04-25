export type MockUser = {
  id: string;
  email: string;
  name: string;
  initials: string;
};

export const defaultUser: MockUser = {
  id: "user_0001",
  email: "sarah.reyes@gmail.com",
  name: "Sarah Reyes",
  initials: "SR",
};

const STORAGE_KEY = "unwritten_user";

export function getUser(): MockUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as MockUser;
  } catch {
    return null;
  }
}

export function setUser(email: string): MockUser {
  const name = email.split("@")[0].split(/[._]/).map(capitalize).join(" ") || "Member";
  const initials = name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const user: MockUser = {
    id: `user_${Date.now().toString(36)}`,
    email,
    name,
    initials,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return user;
}

export function clearUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

function capitalize(s: string): string {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1).toLowerCase();
}

export function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const first = name.split(" ")[0];
  if (hour < 5) return `Still up, ${first}.`;
  if (hour < 12) return `Good morning, ${first}.`;
  if (hour < 18) return `Good afternoon, ${first}.`;
  return `Good evening, ${first}.`;
}
