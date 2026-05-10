// Lightweight GA4 wrapper. Safe to call from anywhere — no-ops on the server
// and silently ignores when gtag hasn't loaded yet (ad blockers, dev, etc.).
//
// Use `track(name, params)` for custom events. Event names use snake_case
// (GA4 convention). Keep parameter values short — GA4 truncates long strings.

type GtagParams = Record<string, string | number | boolean | null | undefined>;

// Window.gtag is declared globally in src/routes/__root.tsx where the GA4
// script tag is injected. We just consume it here.

export function track(eventName: string, params?: GtagParams) {
  if (typeof window === "undefined") return;
  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, params ?? {});
    }
  } catch {
    // never throw from analytics
  }
}

// ---- Domain-specific helpers (typed wrappers around track) ----

export const analytics = {
  inquirySubmitted(input: {
    item_count: number;
    primary_category: string | null;
    item_names: string[]; // first ~5 for context
    message_length: number;
    has_phone: boolean;
    has_date: boolean;
    has_budget: boolean;
  }) {
    track("inquiry_submitted", {
      item_count: input.item_count,
      primary_category: input.primary_category ?? "none",
      item_names: input.item_names.slice(0, 5).join(" | ").slice(0, 200),
      message_length: input.message_length,
      has_phone: input.has_phone,
      has_date: input.has_date,
      has_budget: input.has_budget,
    });
  },

  productViewed(input: { id: string; name: string; category: string | null }) {
    track("product_viewed", {
      item_id: input.id,
      item_name: input.name.slice(0, 100),
      item_category: input.category ?? "uncategorized",
    });
  },

  productImageZoomed(input: { id: string; name: string }) {
    track("product_image_zoomed", {
      item_id: input.id,
      item_name: input.name.slice(0, 100),
    });
  },

  categoryBrowsed(input: { category: string; item_count?: number }) {
    track("category_browsed", {
      category: input.category,
      item_count: input.item_count ?? 0,
    });
  },

  inquiryListAdd(input: { id: string; name: string }) {
    track("inquiry_list_add", {
      item_id: input.id,
      item_name: input.name.slice(0, 100),
    });
  },

  inquiryListRemove(input: { id: string }) {
    track("inquiry_list_remove", { item_id: input.id });
  },

  contactClick(channel: "phone" | "email" | "instagram", source: string) {
    track(`${channel}_click`, { source });
  },

  galleryImageOpened(input: { id?: string; index?: number }) {
    track("gallery_image_opened", {
      gallery_item_id: input.id ?? "unknown",
      gallery_index: input.index ?? -1,
    });
  },
};
