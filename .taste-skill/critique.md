# Review: a coherent letterpress workshop

The current visual style was explicitly approved by the user. This revision preserves the dark field, Hanken Grotesk and warm engraved line work, while replacing the animation implementation and refining the physical subjects.

## Diagnosis and correction

A browser repro of the old Configuration gear measured a 44.44 px sideways displacement of a vertical thickness edge when rotating around the vertical world axis. The SVG was already projected; applying a planar transform to the solid's depth caused deformation. Splitting images into height bands did not make them rigid 3D objects.

The new renderer uses Blender-exported GLBs, real rigid transforms, an orthographic camera and a depth buffer. The geometry audit loads all 20 GLBs and evaluates 41 poses. Maximum distance error is below 1e-14 world units, and projected axial-edge drift is below 1e-9 px. It checks real mesh vertices using the same rig function used in the browser.

The performance baseline did not reproduce sustained dropped frames on this machine, including a 4× CPU-throttled run, so no universal frame-rate improvement is claimed. The old scene made about 2,675 SVG attribute writes during a 1.8-second scroll. The new scene makes zero per-frame artwork DOM writes and remains around 16.7 ms median / 16.8 ms p95 in the same headless browser. One canvas, shared shader programs, cached assets, a pixel-ratio cap, merged rigid batches and a single time-based loop replace repeated SVG updates. Idle and hidden rendering stop.

## Meaning and composition

The whole configurable object is now a recognizable platen press. Its drive connects to a crank and a constant-length rod, which drives the platen. Paper enters before the platen closes and exits after it rises. Optional marking heads share the delivery operation. Distinct runtime, type-bed, delivery and marking fittings still reflect all 15 catalog options.

Configuration uses a composing stick with rows entering its tray and a closing end stop. Authentication uses a padlock with a real shackle, key and pin line; the stages are ordered. Foundation and source structure use a cabinet whose drawers slide only along their runners. Short captions name the actual object and connect its behavior to the page. They describe an analogy, not browser-side project generation.

Art and reading columns alternate by route, with a modest real camera orbit and viewport drift. The right-facing press, left composing stick, right cutaway lock and left cabinet were viewed in browser captures. Camera direction was corrected so the cabinet's drawers and the lock's pin mechanism face the reader. Reading progress is bounded by the main content instead of the footer, so the important final action remains visible. Dark text backing protects titles and body copy.

## Checks and limits

- Root checks/typecheck, website typecheck/build, asset validation and rigid-motion audit pass.
- Nine configuration/physical-sequence tests and seven CLI tests pass. Website-only tests are excluded from generated applications.
- Browser coverage exercises nine routes at 1440, 768 and 390 pixels: English-only content, no overflow, no Play/Pause controls, valid selection/copy behavior, preserved state and canvas on route changes, left/right placement, lock sequence, reduced motion and context-loss posters.
- Taste lint has no failures. Inspector has no failures with the explicit modeled-artwork and canvas-motion allowances. The retained warm ink, lack of stock footage and small caption/brand sizes follow the approved design rather than a new visual direction.
- The GPU renderer is lazy-loaded. Its approximately 169 KB gzipped deferred chunk triggers Vite's uncompressed chunk-size warning; the initial page and SSR poster do not wait for it. Static artwork remains available without WebGL.
- Artwork remains an illustrative mechanism, not a full engineering simulation or manufacturing drawing. The slider-crank and access sequence have explicit tested constraints. No public deployment was performed.
