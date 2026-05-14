## Single change

```sql
UPDATE inventory_items
SET title = 'Evren 8x10 Kilim Rug'
WHERE rms_id = '707';
```

Then `bun scripts/bake-catalog.mjs`.

## Report (delivered after apply)

**A.** Above UPDATE + rebake. Nothing else.
**B.** No other rug rows touched. No deletions, no image edits, no status changes.
**C.** Visual QA links (preview):

- [https://id-preview--a0ee6478-cac8-4430-9157-0742820605f7.lovable.app/collection/shima-8x10-faded-black-rug-907](https://id-preview--a0ee6478-cac8-4430-9157-0742820605f7.lovable.app/collection/shima-8x10-faded-black-rug-907)
- [https://id-preview--a0ee6478-cac8-4430-9157-0742820605f7.lovable.app/collection/shiloh-8x10-grey-ivory-rug-1691](https://id-preview--a0ee6478-cac8-4430-9157-0742820605f7.lovable.app/collection/shiloh-8x10-grey-ivory-rug-1691)
- [https://id-preview--a0ee6478-cac8-4430-9157-0742820605f7.lovable.app/collection/obsidian-8x10-black-rug-1637](https://id-preview--a0ee6478-cac8-4430-9157-0742820605f7.lovable.app/collection/obsidian-8x10-black-rug-1637)
- [https://id-preview--a0ee6478-cac8-4430-9157-0742820605f7.lovable.app/collection/glaucus-6x8-grey-faux-hide-rug-2149](https://id-preview--a0ee6478-cac8-4430-9157-0742820605f7.lovable.app/collection/glaucus-6x8-grey-faux-hide-rug-2149)

**D.** Hide rugs still needing 2nd image: Byron (394), Eniko (395), Gopala (396), Hathor (1932), Melas (4162), Ninsun (397).
**E.** Zero 2102-byte placeholders wired. The `rugs/{name}/01-image-0` files in the mirror bucket stay ignored.