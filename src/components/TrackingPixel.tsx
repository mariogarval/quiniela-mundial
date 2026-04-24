"use client";
import { useEffect } from "react";

/**
 * Fires a fire-and-forget POST to /api/track when UTM params are in the URL.
 * Renders nothing — drop it anywhere in the page tree.
 */
export function TrackingPixel() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const utm_source = params.get("utm_source");
    const utm_medium = params.get("utm_medium");
    const utm_campaign = params.get("utm_campaign");
    const ref = params.get("ref");

    if (utm_source || ref) {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ utm_source, utm_medium, utm_campaign, ref_user_id: ref }),
      }).catch(() => {});
    }
  }, []);

  return null;
}
