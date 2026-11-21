/**
 * All prompts in one place so you can tweak them easily.
 * Approach A = "Understand first": AI writes a description of the saree, image model only sees the description.
 * Approach B = "Direct": image model sees the labelled saree photo itself.
 */

export const SPEC_PROMPT = `You are an expert in Indian sarees and textiles.

The image is a flat-lay photo of ONE saree, folded on a table, photographed so its parts are visible.
Printed white label cards placed next to the fabric name each part: BODY, TOP BORDER (or TOP), BOTTOM BORDER, PALLU, BLOUSE.
The label cards, the table and any hands are NOT part of the saree.

Describe the saree precisely enough that an artist who never saw it could paint it accurately.
Be specific about colours (use plain names plus a hex guess), motif shapes, motif size relative to the border, spacing/density, border widths, and zari/metallic work.

Return ONLY valid JSON (no markdown fences) with this shape:
{
  "fabric": "e.g. cotton, silk, georgette, chiffon, linen",
  "finish": "matte / slight sheen / high sheen silk / zari heavy",
  "body": { "base_color": "", "motif": "", "motif_color": "", "motif_size": "", "motif_layout": "" },
  "top_border": { "colors": "", "width": "", "pattern": "" },
  "bottom_border": { "colors": "", "width": "", "pattern": "" },
  "pallu": { "base_color": "", "design": "", "stripes_or_bands": "" },
  "blouse": { "color": "", "pattern": "", "border": "" },
  "overall_look": "one sentence a shopkeeper would say about this saree",
  "uncertain": "anything you could not see clearly"
}`;

const COMMON_RULES = `
Rules:
- Keep the person's face, identity, skin tone, hair, body shape and height EXACTLY as in the person photo. Do not slim, lighten or beautify.
- Standard Nivi drape: neat front pleats at the waist, pallu over the LEFT shoulder falling down the back, with part of the pallu design visible from the front.
- The bottom border runs along the hem of the pleats and skirt. The top border runs along the waist and the edge of the pallu.
- The body pattern covers the pleats and the skirt.
- The blouse is short-sleeved, made from the blouse fabric described/shown.
- Full-length, front-facing, standing, plain light studio background, soft even lighting, photorealistic.
- No text, labels, watermarks or table in the output.`;

export function promptApproachA(spec: unknown): string {
  return `Image 1 is a photo of a person.
Create a photorealistic image of THIS EXACT PERSON wearing a saree that matches the following description exactly:

${JSON.stringify(spec, null, 2)}
${COMMON_RULES}`;
}

export function promptApproachB(): string {
  return `Image 1 is a photo of a person.
Image 2 is a flat-lay photo of ONE saree folded on a table. White printed label cards next to the fabric name its parts:
BODY (main fabric and repeating motif), TOP BORDER, BOTTOM BORDER, PALLU (decorated end piece), BLOUSE (separate blouse piece).
The label cards and the table are NOT part of the saree.

Create a photorealistic image of THIS EXACT PERSON from Image 1 wearing THIS EXACT SAREE from Image 2.
Copy the saree faithfully: same colours, same motif shapes and sizes, same border patterns and widths, same pallu design, same blouse fabric. Do not invent a different design.
${COMMON_RULES}`;
}
