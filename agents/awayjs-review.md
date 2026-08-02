# AwayJS Demo Review Checklist

Visual review of all 22 AwayJS→Flight demo ports. Every item is **open** until the user visually verifies after merge.

## Status key

- **open** — not yet verified by user
- Addressed — code change made, awaiting user visual verification
- SDK limitation — requires Flight SDK changes, not fixable in demo code
- Deferred — intentional scope cut or low priority

---

### 1. AWD Suzanne (`awd-suzanne`)

**Status:** open — needs visual review

No user feedback yet.

---

### 2. AWD Viewer (`awd-viewer`)

**Status:** open — needs visual review

No user feedback yet.

---

### 3. Aircraft (`aircraft-demo`)

**Status:** open — builder fix at `e3f77a3`

**What was wrong:** Wings not folded, no click animation, no emissive glow, not HiDPI.

**What was addressed:** Builder restored wing articulation by recursively collecting meshes and binding the 7 authored OBJ groups per wing. Contrail lifetime extended from 7–9 s to 12–15 s with capacity raised 820→1400 to prevent early recycling. Reviewed and approved by review agent.

---

### 4. Cube Primitive (`cube-primitive`)

**Status:** open — SDK limitation

**What was wrong:** No transparency/blending visible.

**Notes:** AwayJS uses `BlendMode.Add` which has no Flight SDK equivalent. Requires SDK-level additive-blend support.

---

### 5. Fire (`fire`)

**Status:** open — partially addressed

**What was wrong:** Floor texture low resolution, light decal z-fighting.

**What was addressed:** Z-fighting mitigated. Floor texture is a PBR conversion artifact (lower apparent detail from roughness mapping vs. AwayJS's direct diffuse).

---

### 6. Generate FNT (`generate-fnt`)

**Status:** open — needs visual review

**What was wrong:** Doesn't match AwayJS demo. Background saturation differs.

**Notes:** Described as "very close" in earlier review.

---

### 7. Globe (`globe`)

**Status:** open — needs visual review

**What was wrong:** Clouds hovering above surface, continents and city lights not visible.

---

### 8. Graphics Drawing (`graphics-drawing`)

**Status:** open — addressed, awaiting re-verification

**What was wrong:** Cutout not visible, animation not apparent.

**What was addressed:**

- Clip circle origin fixed from `(logoPivotX, logoPivotY, maskRadius)` to `(0, 0, maskRadius)` — the pivot already centers the logo, so the clip needs post-pivot coordinates (`f23e04c`).
- Rotation was incorrectly converted from degrees to radians; removed the `* Math.PI / 180` conversion since `DisplayObject.rotation` is already in degrees (`932a9d0`).

---

### 9. Stars (`graphics-drawing-stars`)

**Status:** open — user gave thumbs up in round 1, not formally verified

**What was wrong:** Not cycling shapes on drag.

**Notes:** User indicated it looked good in round 1 visual review.

---

### 10. Tracer (`graphics-drawing-tracer`)

**Status:** open — needs visual review

**What was wrong:** Wrong line styles.

**Notes:** Cross-review with builder indicated it matches well.

---

### 11. Hello AwayJS (`hello-awayjs`)

**Status:** open — needs visual review

**What was wrong:** Poor resolution.

**Notes:** HiDPI at initial DPR. Dynamic DPR changes are an SDK limitation (#22).

---

### 12. Load AWD (`load-awd`)

**Status:** open — needs visual review

**What was wrong:** Resolution might be low.

---

### 13. Load 3DS (`load-3ds`)

**Status:** open — needs visual review

**What was wrong:** Not visible.

---

### 14. Master Chief (`obj-loader-master-chief`)

**Status:** open — needs visual review

**What was wrong:** Not HiDPI.

**Notes:** Same dynamic-DPR SDK limitation as #22.

---

### 15. MD5 Animation (`md5-animation`)

**Status:** open — addressed, awaiting re-verification

**What was wrong:** Model has never looked correct in Flight. Joints visually wrong; after earlier fix attempts, model became invisible or showed spikes from the ground.

**What was addressed:**

- Root cause identified: Flight's `computeSkeleton3DJointMatrices` uses `getNodeWorldMatrix4(joints[j])` which includes ancestor transforms (character rotation/position). The renderer then applies the mesh's world transform on top — doubling the character transform.
- Fix (`11f7a53`): temporarily reset `characterNode` and `characterPositionNode` to identity before `updateMeshSkin`, then restore the real transforms for rendering. Skinning now sees model-space joint world matrices; the renderer applies the character transform once.
- All animation clips zero joint-0 translation to match AwayJS root-motion extraction.
- Restored the moving red and blue light cards and retuned their physically attenuated point lights so their colour sweeps read clearly across the character.
- Restored the authored body specular map through the PBR specular extension, generated tangents for normal mapping, and added a restrained ambient/exposure lift.
- Restored the three alpha-blended gob/drool meshes with the source's scrolling V texture now that Flight renders transparent geometry in a separate sorted pass.
- The directional shadow volume now follows character root motion and excludes the ground and light cards, matching the source caster setup.

**Known remaining gaps:**

- AwayJS extracts and applies root-joint translation as owner root motion for every clip. Flight zeroes it for all clips but only drives container movement during `walk7`. Attack/pain clips lose their owner lunge.

---

### 16. Monster Head Shading (`monster-head-shading`)

**Status:** open — addressed, awaiting re-verification

**What was wrong:** Lighting blown out, very white. No more white glowing after earlier fixes, but user said it needs more gamma.

**What was addressed:**

- AwayJS `SpecularFresnelMethod` (fresnelPower=3, strength=3, gloss=10) has no Flight equivalent. Specular set to 0.15 as a compromise to avoid white sheen on camera-facing surfaces. Shininess 10 maps directly from AwayJS Blinn-based gloss.
- Tone map exposure bumped to 1.3 per user request (`f23e04c`).

---

### 17. Mouse Interaction (`mouse-interaction`)

**Status:** open — partially addressed, SDK limitation

**What was wrong:** No texture visible. AwayJS shows wireframe bounding box/sphere on hover and stroke highlight.

**What was addressed:**

- Ambient set to 0.05 to improve visibility.

**SDK limitation:** AwayJS's `boundsVisible` (wireframe bounding box/sphere on hover) has no Flight SDK equivalent. Mouse-hover alignment work blocked on SDK feature.

---

### 18. Sponza Demo (`sponza-demo`)

**Status:** open — partially addressed, awaiting re-verification

**What was wrong:** Big banner at player position needs to be hidden. Untextured appearance.

**What was addressed:**

- Mesh-name filtering added to match AwayJS (`f23e04c`): hides `sponza_04` and `sponza_379`, filters `column_c` (only nums 22–33) and `flagpole` (skips specific nums). Meshes with no matching material name are hidden.
- All known materials assigned with diffuse, normal, and specular-derived metallic-roughness maps.

**Known remaining gaps:**

- AwayJS version has fog (`EffectFogMethod`), flame particles, and point lights that are not ported.

---

### 19. Particle Explosions (`particle-explosions`)

**Status:** open — addressed

**What was wrong:** Hangs browser.

**What was addressed:** Particle t-range set to `[0, 2]`.

---

### 20. Perelith Knight (`perelith-knight`)

**Status:** open — addressed

**What was wrong:** Dark and unanimated.

**What was addressed:** Animation speed set to `dt * 0.5`.

---

### 21. Shading (`shading`)

**Status:** open — addressed, awaiting re-verification

**What was wrong:** Much brighter/lighter than AwayJS version.

**What was addressed:** Tone map exposure dropped from 1.0 to 0.7 (`f23e04c`).

---

### 22. HiDPI

**Status:** open — SDK limitation

**What was wrong:** Skybox, text, torus, and view demos look okay but are not HiDPI.

**Notes:** Demos render at initial `devicePixelRatio` but do not respond to dynamic DPR changes (e.g., dragging between monitors). This is an SDK-level feature gap.
