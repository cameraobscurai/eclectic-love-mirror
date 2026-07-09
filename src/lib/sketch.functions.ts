import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export type Sketch = {
  name: string;
  url: string;
  tileUrl: string;
  index: number;
};

export const listSketches = createServerFn({ method: "GET" }).handler(
  async (): Promise<Sketch[]> => {
    const EXPIRES_IN = 60 * 60 * 24 * 7;
    const EXCLUDED_BATCHES = new Set([
      "12_50",
      "12_51",
      "12_52",
      "12_55",
      "12_56",
      "12_57",
    ]);

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

    const { data: files, error } = await supabase.storage
      .from("assets")
      .list("", { limit: 1000, sortBy: { column: "name", order: "asc" } });

    if (error) throw new Error(`list assets: ${error.message}`);

    const sketches = (files ?? [])
      .filter((file) => {
        if (!file.name.startsWith("ChatGPT Image")) return false;
        if (!file.name.toLowerCase().endsWith(".png")) return false;

        const batch = file.name.match(/,\s(\d{2}_\d{2})_\d{2}\s(?:AM|PM)/)?.[1];
        if (batch && EXCLUDED_BATCHES.has(batch)) return false;

        return true;
      })
      .map((file) => file.name);

    if (sketches.length === 0) return [];

    const results: Sketch[] = [];

    for (let i = 0; i < sketches.length; i += 100) {
      const batch = sketches.slice(i, i + 100);
      const { data, error: signErr } = await supabase.storage
        .from("assets")
        .createSignedUrls(batch, EXPIRES_IN);

      if (signErr) throw new Error(`sign assets: ${signErr.message}`);

      for (const item of data ?? []) {
        if (!item.signedUrl || !item.path) continue;

        const full = new URL(item.signedUrl, process.env.SUPABASE_URL!);
        const tile = new URL(
          full.toString().replace(
            "/storage/v1/object/sign/",
            "/storage/v1/render/image/sign/",
          ),
        );
        tile.searchParams.set("width", "400");
        tile.searchParams.set("height", "400");
        tile.searchParams.set("resize", "cover");
        tile.searchParams.set("quality", "72");
        tile.searchParams.set("format", "webp");


        results.push({
          name: item.path,
          url: full.toString(),
          tileUrl: tile.toString(),
          index: results.length + 1,
        });
      }
    }

    return results;
  },
);
