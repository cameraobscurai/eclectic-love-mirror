import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export type Sketch = {
  name: string;
  url: string;
  index: number;
};

const EXPIRES_IN = 60 * 60 * 24 * 7; // 7 days

export const listSketches = createServerFn({ method: "GET" }).handler(
  async (): Promise<Sketch[]> => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    // list up to 1000 items in the bucket root
    const { data: files, error } = await supabase.storage
      .from("assets")
      .list("", { limit: 1000, sortBy: { column: "name", order: "asc" } });

    if (error) throw new Error(`list assets: ${error.message}`);

    // filter to the uploaded sketch batch — png assets prefixed with "ChatGPT Image"
    const sketches = (files ?? [])
      .filter(
        (f) =>
          f.name.startsWith("ChatGPT Image") &&
          f.name.toLowerCase().endsWith(".png"),
      )
      .map((f) => f.name);

    if (sketches.length === 0) return [];

    // createSignedUrls batches of 100
    const results: Sketch[] = [];
    for (let i = 0; i < sketches.length; i += 100) {
      const batch = sketches.slice(i, i + 100);
      const { data, error: signErr } = await supabase.storage
        .from("assets")
        .createSignedUrls(batch, EXPIRES_IN);
      if (signErr) throw new Error(`sign assets: ${signErr.message}`);
      for (const item of data ?? []) {
        if (item.signedUrl && item.path) {
          results.push({
            name: item.path,
            url: item.signedUrl,
            index: results.length + 1,
          });
        }
      }
    }

    return results;
  },
);
