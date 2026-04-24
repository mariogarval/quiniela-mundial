"use client";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider, usePostHog } from "posthog-js/react";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";

/** Tracks a $pageview on every client-side navigation. Must be inside PHProvider. */
function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const ph = usePostHog();

  useEffect(() => {
    if (!pathname || !ph) return;
    let url = window.location.origin + pathname;
    if (searchParams.toString()) url += "?" + searchParams.toString();
    ph.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams, ph]);

  return null;
}

/** Root provider — initialises PostHog once and wraps the app. */
export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return; // silently skip in local dev / CI when key is absent
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      person_profiles: "identified_only", // only create profiles for identified users
      capture_pageview: false,            // we do this manually via PostHogPageView
      capture_pageleave: true,
    });
  }, []);

  return (
    <PHProvider client={posthog}>
      {/* Suspense required because PostHogPageView uses useSearchParams */}
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHProvider>
  );
}
