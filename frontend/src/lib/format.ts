export function inr(n: number): string {
  if (n >= 1000) return `₹${Math.round(n / 100) / 10}k`.replace(".0k", "k");
  return `₹${n}`;
}
export const inrFull = (n: number) => "₹" + n.toLocaleString("en-IN");

export function range(a: number, b: number): string {
  return `${inr(a)} – ${inr(b)}`;
}

export function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export function avatarUrl(name: string, id: number): string {
  const seed = encodeURIComponent(`${name}-${id}`);
  return `https://api.dicebear.com/9.x/lorelei/svg?seed=${seed}&backgroundType=gradientLinear&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function scoreColor(score: number): string {
  if (score >= 90) return "#34d399";
  if (score >= 80) return "#a78bfa";
  if (score >= 70) return "#f0abfc";
  return "#9494ab";
}

export function scoreLabel(score: number): string {
  if (score >= 92) return "Exceptional";
  if (score >= 85) return "Great match";
  if (score >= 75) return "Good match";
  if (score >= 65) return "Worth a chat";
  return "Some overlap";
}

export function genderLabel(g: string): string {
  return g === "non-binary" ? "Non-binary" : g === "male" ? "Man" : "Woman";
}
