#!/usr/bin/env python3
"""
Cover normalization — trims baked-in padding from a product cover and re-centers
the subject on a square canvas with uniform padding.

Why this exists: a handful of source covers are the subject floating in a large
empty frame. The sizing engine sizes the *file*, not the subject, so those items
render tiny next to neighbours of the same real-world size. No amount of layout
math fixes that; the file has to be normalized.

Two hard rules, learned the expensive way:

  1. The normalized image is written back to the SAME storage path. One URL means
     the admin editor and the public site can never diverge again (that divergence
     is what the upscaled-cover mess was).
  2. The original is copied to `originals-backup/<path>` in the same bucket before
     anything is overwritten. Nothing is destroyed.

Usage:
    python3 scripts/normalize-covers.py --slugs a,b,c            # dry run
    python3 scripts/normalize-covers.py --slugs a,b,c --apply    # write

Dry run downloads, computes, and writes a before/after contact sheet to
/tmp/cover-normalize/contact-sheet.png. Review that before --apply.
"""
import argparse
import io
import json
import os
import sys
import urllib.parse
from pathlib import Path

import requests
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "src/data/inventory/current_catalog.json"
OUT = Path("/tmp/cover-normalize")

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SRK = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Subject must be this tight before we consider the file already normalized.
FILL_TARGET = 0.92
# Uniform breathing room around the subject on the output canvas.
PAD = 0.04
WHITE_CUTOFF = 247


def cover_url(product):
    cover = product.get("primaryImage") or (product.get("images") or [None])[0]
    if isinstance(cover, dict):
        return cover.get("url")
    return cover


def parse_storage(url):
    """-> (bucket, object_path) for a Supabase public object URL."""
    marker = "/storage/v1/object/public/"
    if marker not in url:
        return None, None
    tail = url.split(marker, 1)[1]
    bucket, _, path = tail.partition("/")
    return bucket, urllib.parse.unquote(path)


def subject_bbox(im):
    """Bounding box of the actual product, alpha first then white-threshold."""
    alpha = im.split()[-1]
    if alpha.getextrema()[0] < 250:
        return alpha.getbbox(), True
    mask = im.convert("L").point(lambda v: 0 if v > WHITE_CUTOFF else 255)
    return mask.getbbox(), False


def normalize(im):
    """Trim to subject, re-center on a square canvas with uniform padding."""
    bbox, transparent = subject_bbox(im)
    if not bbox:
        return None, None
    W, H = im.size
    fill_w = (bbox[2] - bbox[0]) / W
    fill_h = (bbox[3] - bbox[1]) / H
    if fill_w >= FILL_TARGET or fill_h >= FILL_TARGET:
        return None, (fill_w, fill_h)

    subject = im.crop(bbox)
    sw, sh = subject.size
    side = int(round(max(sw, sh) / (1 - 2 * PAD)))
    bg = (0, 0, 0, 0) if transparent else (255, 255, 255, 255)
    canvas = Image.new("RGBA", (side, side), bg)
    canvas.paste(subject, ((side - sw) // 2, (side - sh) // 2), subject if transparent else None)
    return canvas, (fill_w, fill_h)


def to_png(im):
    buf = io.BytesIO()
    im.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def backup_and_upload(bucket, path, payload):
    """Copy the original aside, then overwrite it in place."""
    base = f"{SUPABASE_URL}/storage/v1"
    headers = {"Authorization": f"Bearer {SRK}", "apikey": SRK}
    backup_path = f"originals-backup/{path}"

    exists = requests.head(
        f"{base}/object/{bucket}/{urllib.parse.quote(backup_path)}", headers=headers, timeout=30
    )
    if exists.status_code != 200:
        r = requests.post(
            f"{base}/object/copy",
            headers={**headers, "Content-Type": "application/json"},
            json={"bucketId": bucket, "sourceKey": path, "destinationKey": backup_path},
            timeout=60,
        )
        if r.status_code >= 400:
            raise RuntimeError(f"backup failed {r.status_code}: {r.text[:200]}")

    r = requests.post(
        f"{base}/object/{bucket}/{urllib.parse.quote(path)}",
        headers={
            **headers,
            "Content-Type": "image/png",
            "x-upsert": "true",
            "cache-control": "3600",
        },
        data=payload,
        timeout=120,
    )
    if r.status_code >= 400:
        raise RuntimeError(f"upload failed {r.status_code}: {r.text[:200]}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--slugs", required=True, help="comma separated product slugs")
    ap.add_argument("--apply", action="store_true")
    args = ap.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    wanted = [s.strip() for s in args.slugs.split(",") if s.strip()]
    products = {p["slug"]: p for p in json.loads(CATALOG.read_text())["products"]}

    pairs, report = [], []
    for slug in wanted:
        p = products.get(slug)
        if not p:
            print(f"  skip {slug}: not in catalog")
            continue
        url = cover_url(p)
        bucket, path = parse_storage(url or "")
        if not bucket:
            print(f"  skip {slug}: cover is not a storage object")
            continue

        original = Image.open(io.BytesIO(requests.get(url, timeout=60).content)).convert("RGBA")
        out, fill = normalize(original)
        if out is None:
            print(f"  skip {slug}: already tight ({fill[0]:.2f} x {fill[1]:.2f})" if fill else f"  skip {slug}: empty")
            continue

        print(f"  {slug}: fill {fill[0]:.2f} x {fill[1]:.2f} -> {1 - 2 * PAD:.2f} square")
        pairs.append((slug, original, out))
        report.append({"slug": slug, "bucket": bucket, "path": path, "fillBefore": fill})

        if args.apply:
            backup_and_upload(bucket, path, to_png(out))
            print(f"     written to {bucket}/{path} (original in originals-backup/)")

    if pairs:
        cell = 300
        sheet = Image.new("RGB", (cell * 2, cell * len(pairs)), (255, 255, 255))
        for i, (_, before, after) in enumerate(pairs):
            for j, im in enumerate((before, after)):
                thumb = Image.new("RGBA", im.size, (255, 255, 255, 255))
                thumb.alpha_composite(im)
                thumb = thumb.convert("RGB")
                thumb.thumbnail((cell, cell))
                sheet.paste(thumb, (j * cell + (cell - thumb.width) // 2, i * cell + (cell - thumb.height) // 2))
        sheet.save(OUT / "contact-sheet.png")
        print(f"\ncontact sheet: {OUT / 'contact-sheet.png'}  (left = before, right = after)")

    (OUT / "report.json").write_text(json.dumps(report, indent=2))
    if not args.apply:
        print("\nDRY RUN — nothing written. Re-run with --apply after reviewing.")


if __name__ == "__main__":
    sys.exit(main())
