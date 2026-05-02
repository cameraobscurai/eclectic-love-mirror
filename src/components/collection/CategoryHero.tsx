import { useState } from "react";
import {
  BROWSE_GROUP_LABELS,
  BROWSE_GROUP_DESCRIPTIONS,
  type BrowseGroupId,
} from "@/lib/collection-browse-groups";
import { CATEGORY_COVERS } from "@/lib/category-covers";
import { withCdnWidth } from "@/lib/image-url";
import type { CollectionProduct } from "@/lib/phase3-catalog";

interface CategoryHeroProps {
  group: BrowseGroupId;
  /** First product in this bucket with a primaryImage. May be null. */
  firstProduct: CollectionProduct | null;
}

/**
 * Category hero — sits above the sticky utility bar in the category state.
 *
 * Eyebrow + Cormorant H1 + one-sentence description, with a museum-placard
 * specimen plate to the right. The specimen image is sourced from the same
 * data the rail thumbnail uses (firstProduct.primaryImage, with optional
 * CATEGORY_COVERS override) — no new data field, no new curation pass.
 *
 * Counts intentionally omitted everywhere on the collection page except the
 * "N results matching …" search-feedback line in the utility bar.
 */
export function CategoryHero({ group, firstProduct }: CategoryHeroProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const label = BROWSE_GROUP_LABELS[group];
  const description = BROWSE_GROUP_DESCRIPTIONS[group];
  const cover = CATEGORY_COVERS[group];
  const heroSrc =
    cover ??
    (firstProduct?.primaryImage
      ? withCdnWidth(firstProduct.primaryImage.url, 600)
      : null);
  const heroAlt = firstProduct?.primaryImage?.altText ?? label;
  const showImage = !!heroSrc && !imgFailed;

  return (
    <section
      className="grid items-end gap-6 border-b"
      style={{
        gridTemplateColumns: "1fr auto",
        padding: "32px 32px 24px",
        borderColor: "var(--archive-rule)",
      }}
    >
      {/* Text column */}
      <div className="min-w-0">
        <p
          className="uppercase text-charcoal/45"
          style={{
            fontSize: "10px",
            letterSpacing: "0.30em",
            marginBottom: "10px",
          }}
        >
          Hive Signature Collection
        </p>
        <h2
          className="text-charcoal"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(36px, 3.5vw, 56px)",
            fontWeight: 400,
            letterSpacing: "-0.005em",
            lineHeight: 1,
          }}
        >
          {label}
        </h2>
        <p
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "13px",
            lineHeight: 1.7,
            marginTop: "12px",
            maxWidth: "360px",
            color: "rgba(26, 26, 26, 0.60)",
          }}
        >
          {description}
        </p>
      </div>

      {/* Specimen plate — soft shadow, no border, against the white field. */}
      <div
        className="hidden sm:flex shrink-0 items-center justify-center bg-white"
        style={{
          width: "200px",
          height: "150px",
          borderRadius: "8px",
          boxShadow:
            "0 1px 2px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04)",
          overflow: "hidden",
        }}
      >
        {showImage && (
          <img
            src={heroSrc}
            alt={heroAlt}
            width={200}
            height={150}
            loading="eager"
            // @ts-expect-error — fetchpriority is valid HTML, not yet typed by React
            fetchpriority="high"
            decoding="async"
            onError={() => setImgFailed(true)}
            className="block max-h-full max-w-full object-contain"
            style={{ padding: "16px" }}
          />
        )}
      </div>
    </section>
  );
}
