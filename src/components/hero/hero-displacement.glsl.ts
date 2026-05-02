// ---------------------------------------------------------------------------
// Hero displacement shaders
//
// Vertex: pass-through, full-bleed quad in clip space.
// Fragment: sample the hero texture with a UV offset that:
//   - radiates from the cursor (aspect-corrected so the influence radius is
//     a true circle, not an ellipse on widescreen).
//   - falls off smoothly outside a configurable radius.
//   - is multiplied by `uInfluence` (0..1), the eased pointer presence value
//     driven from JS. At rest (uInfluence === 0) UVs are untouched and the
//     output is pixel-identical to the source image — that is the "whisper".
//   - gets a tiny lens-gain brightness bump at the displacement peak so the
//     warp reads as glass refracting light, not just pixels sliding.
// ---------------------------------------------------------------------------

export const VERT = /* glsl */ `#version 300 es
  in vec2 position;
  in vec2 uv;
  out vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

export const FRAG = /* glsl */ `#version 300 es
  precision highp float;

  in vec2 vUv;
  out vec4 fragColor;

  uniform sampler2D uTexture;
  uniform vec2  uPointer;     // 0..1 in UV space
  uniform float uInfluence;   // 0..1 eased pointer presence
  uniform float uAspect;      // viewport.width / viewport.height
  uniform float uRadius;      // influence radius in (corrected) UV units
  uniform float uStrength;    // max displacement in UV units (~6px equiv)
  uniform vec2  uTexAspect;   // cover-fit correction for the texture
  uniform float uTime;

  // Cheap 2D hash noise — organic non-radial character on the warp.
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    // Aspect-correct vector from this fragment to the pointer so the falloff
    // radius is a real circle on every viewport (Claude note #2).
    vec2 toPointer = uPointer - vUv;
    toPointer.x *= uAspect;
    float dist = length(toPointer);

    // Local falloff — distortion only inside uRadius around the cursor.
    float falloff = smoothstep(uRadius, 0.0, dist);

    // Direction from pointer outward (pixels flow away from the touch point,
    // like glass bulging under a fingertip). Aspect-undo on x for the offset.
    vec2 dir = toPointer / max(dist, 0.0001);
    dir.x /= uAspect;

    // Organic noise modulation so the warp isn't a perfect lens.
    float n = noise(vUv * 4.0 + uTime * 0.05) - 0.5;
    vec2 organic = vec2(n, -n) * 0.6;

    float strength = falloff * uInfluence;
    vec2 offset = (dir + organic) * uStrength * strength;

    // Cover-fit the texture so the image fills the canvas without stretching
    // (mirrors CSS object-fit:cover with object-position:50% 38%).
    vec2 uv = (vUv - 0.5) * uTexAspect + 0.5;
    uv.y -= 0.12; // bias toward top — same intent as object-[50%_38%]

    vec4 color = texture(uTexture, uv + offset);

    // Lens gain — tiny brightness bump at the peak of the warp (Claude #4).
    float lensGain = 1.0 + strength * 0.15;
    color.rgb *= lensGain;

    fragColor = color;
  }
`;
