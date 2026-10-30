"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Stats } from "@/lib/types";

interface Props {
  stats: Stats;
  you: { lat: number; lng: number; name: string } | null;
  selected: string[];
  onPickArea: (area: string) => void;
}

export default function MapView({ stats, you, selected, onPickArea }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const pick = useRef(onPickArea);
  pick.current = onPickArea;

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current) return;
      map = L.map(el.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: false }).setView([12.9716, 77.6146], 11);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: "© OpenStreetMap · © CARTO",
        maxZoom: 18,
      }).addTo(map);

      const canvas = L.canvas({ padding: 0.5 });
      for (const p of stats.points) {
        L.circleMarker([p.lat, p.lng], {
          renderer: canvas, radius: 2.6, weight: 0, fillOpacity: 0.55,
          fillColor: p.intent === "has_room" ? "#3b0b6f" : "#a78bfa",
        }).addTo(map);
      }
      for (const a of stats.areas) {
        const on = selected.includes(a.name);
        const m = L.circleMarker([a.lat, a.lng], {
          radius: 8 + Math.sqrt(a.count) * 2.4, color: on ? "#34d399" : "#a78bfa", weight: on ? 3 : 1.5,
          fillColor: on ? "#34d399" : "#8b5cf6", fillOpacity: on ? 0.28 : 0.14,
        }).addTo(map);
        m.bindTooltip(`<b>${a.name}</b><br/>${a.count} people · ${a.rooms} rooms`, { direction: "top" });
        m.on("click", () => pick.current(a.name));
      }
      if (you) {
        L.circleMarker([you.lat, you.lng], { radius: 7, color: "#fff", weight: 2, fillColor: "#34d399", fillOpacity: 1 })
          .addTo(map)
          .bindTooltip("You", { permanent: true, direction: "right", offset: [8, 0] });
      }
    })();
    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [stats, you, selected]);

  return (
    <div className="card overflow-hidden">
      <div ref={el} className="h-[420px] w-full sm:h-[520px]" />
      <div className="flex flex-wrap items-center gap-4 border-t border-line px-4 py-2.5 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-400" /> Looking for a room</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-deep" /> Has a room</span>
        <span className="ml-auto">Tap a neighbourhood to filter</span>
      </div>
    </div>
  );
}
