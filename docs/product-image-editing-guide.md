# Kelmon product image editing guide

Use this guide whenever new phone photos need to be prepared for the Kelmon product catalogue. It records the same visual treatment and technical format used for the existing perfume, bag and earring images.

## Final image specification

| Setting | Value |
| --- | --- |
| Canvas size | **1200 × 1200 pixels** |
| Aspect ratio | **1:1 square** |
| File format | **WebP** |
| Colour space | **sRGB** |
| Background | **Clean solid white** |
| Transparency | **None** |
| Product position | Centred, upright and fully visible |
| Product scale | Large enough to be clear, with comfortable space around every edge |
| Shadow | Very soft, realistic contact shadow only |
| Website fit | Product cards, circular homepage cards and product-detail pages |

The completed catalogue files were verified as 1200 × 1200 WebP images. Their file sizes varied according to image detail, which is normal.

## Editing treatment

For every product photo:

1. Remove the original room, table, hand, fabric or other phone-photo background completely.
2. Replace it with an even white studio background—no gradient, coloured glow, scenery or decorative props.
3. Keep the actual product faithful to the source photograph. Do not redesign its shape, colours, branding, bottle label, stitching, jewellery texture or included pieces.
4. Straighten and centre the product without cropping any part of it.
5. Improve exposure, white balance, sharpness and clarity so it looks professionally photographed.
6. Remove distracting reflections, sensor noise and small background artefacts, but retain believable product texture.
7. Add only a subtle contact shadow so the item does not appear to float.
8. Export as a square 1200 × 1200 sRGB WebP image without transparency.

## Naming rules

- Perfumes: `p1.webp`, `p2.webp`, and so on.
- Bags: `b1.webp`, `b2.webp`, and so on.
- Earrings: `e1.webp`, `e2.webp`, and so on.
- A second photo of the same product uses `b` after its product number. For example, `p14.webp` and `p14b.webp` are two images of **one** product, not two products.
- Do not interpret a `b` suffix as a range. Only files that actually include the suffix are secondary images.

## Ready-to-copy request for Codex

Copy the text below and attach the new source-image folder:

> Prepare these phone photos as Kelmon ecommerce product images. Remove every original background and replace it with a clean solid-white studio background. Keep each real product, colour, label, texture, shape and included item accurate to its source—do not invent or redesign product details. Correct lighting, white balance, perspective and sharpness, clean distracting reflections and noise, centre the full product, leave comfortable padding, and add only a soft realistic contact shadow. Export every result as a non-transparent sRGB WebP image at exactly 1200 × 1200 pixels. Preserve the filenames and product grouping: `p` means perfume, `b` means bag and `e` means earrings. A suffix such as `p14b` means a second image belonging to product `p14`; it must not create another product. Show me a sample first if the new batch has a noticeably different photographic style.

## Upload and storage workflow

1. Keep the original phone images until the edited results have been checked.
2. Upload the finished WebP images to Supabase Storage in the `product-images` bucket.
3. Save the resulting public storage URLs in each product's `images` field.
4. For a product with multiple views, store both URLs in the same product's image array in display order.
5. Confirm every URL loads successfully before deleting local files.
6. After database and storage verification, local originals and generated copies may be removed from the Git repository to avoid duplicating image storage.

## Automatic admin-upload formatting

The product editor now formats every newly uploaded catalogue image before sending it to Supabase:

- creates an exact **1200 × 1200** canvas;
- fills the canvas with solid white;
- preserves the source image's proportions;
- centres it with 60 pixels of minimum outer padding;
- never crops or stretches the image;
- exports WebP at approximately 82% quality, with JPEG as a browser fallback.

This guarantees consistent dimensions and white padding. It cannot identify and remove a complex background that is already inside a photograph. Phone photos with rooms, hands, tables or other scenery should still use the AI-editing request above before upload.

## Quality checklist

- [ ] Exactly 1200 × 1200 pixels
- [ ] WebP, sRGB and no transparency
- [ ] Solid-white background with no gradient
- [ ] Entire product visible and centred
- [ ] Product identity and printed labels preserved
- [ ] Natural colour and texture
- [ ] Soft shadow only
- [ ] Filename matches its product
- [ ] Secondary image linked to the same product
- [ ] Supabase URL verified before local deletion
