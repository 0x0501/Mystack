# Mystack website

The English-only official website uses TanStack Start, React and file-based TanStack Router routes. It is independent of the runnable application template. The integration builder shares the generator's real catalog and compatibility rules.

## Run

```sh
bun install --cwd packages/website --frozen-lockfile
bun run --cwd packages/website dev
```

Open http://localhost:3100. The website does not require a database or authentication service. Development builds mount TanStack Devtools at the bottom right with the Router panel and the built-in SEO previews; production bundles do not include them.

```sh
bun run --cwd packages/website generate-routes
bun run --cwd packages/website typecheck
bun run --cwd packages/website art:check
bun run --cwd packages/website art:motion
bun run --cwd packages/website build
bun run --cwd packages/website preview
```

## Deployment

The site runs as a Cloudflare Worker, `mystack-website` (`wrangler.json`): TanStack Start's server entry plus the client assets, served on the route `mystack.sumku.cc/*` in the `sumku.cc` zone. The route only receives traffic once that hostname has a proxied DNS record. Production builds use `https://mystack.sumku.cc` for canonical URLs, Open Graph images, the sitemap and `llms.txt`; set `VITE_SITE_URL` to build for another host.

`bun run --cwd packages/website deploy` builds and deploys from a machine logged in to Wrangler. `bun run --cwd packages/website preview` serves the production build locally in the Workers runtime.

Pushes deploy through Workers Builds, configured on the Worker in the Cloudflare dashboard (**Workers & Pages** > `mystack-website` > **Settings** > **Build**). The repository holds no CI deploy workflow.

| Setting | Value |
|---|---|
| Git repository / production branch | this repository / `main` |
| Root directory | `packages/website` |
| Build command | `bun run build` |
| Deploy command | `bunx wrangler deploy` |
| Build watch paths | include `packages/website/*`, exclude nothing |

The Worker's name in the dashboard must equal `name` in `wrangler.json`. The website has its own `bun.lock`, which is why the root directory matters: Workers Builds installs from `packages/website`, not from the repository root. Changes outside `packages/website` skip the build, so edits to the root app do not redeploy the site.

## SEO, GEO and social sharing

Following TanStack Start's SEO and LLMO guides, every page is server-rendered and `src/services/seo.ts` is the single source for its metadata:

- Each route's `head` comes from `seo(path)`: title, description, canonical link, Open Graph and Twitter tags, plus JSON-LD (`WebSite` site-wide, `SoftwareApplication` on the home page, `TechArticle` on documentation and Quick start).
- `/sitemap.xml`, `/robots.txt` and `/llms.txt` are server routes built from the same page list, so a new page appears in all three once it is added to `pages` in `seo.ts`.
- `public/og.png` (1200×630) is the shared social image. Its source is `scripts/og-image.html`, which reuses the site's fonts, palette and press artwork. Regenerate it after changing that file:

```sh
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
  --allow-file-access-from-files --force-device-scale-factor=1 --window-size=1200,630 \
  --virtual-time-budget=3000 --screenshot="$PWD/packages/website/public/og.png" \
  "file://$PWD/packages/website/scripts/og-image.html"
```

## Pages and objects

| Routes | Physical object and behavior | Composition |
| --- | --- | --- |
| `/`, `/integrations` | A configurable platen letterpress. Its drive, type chase, paper delivery and optional stamping heads change with the selected integrations. | Right, with scroll-driven displacement |
| `/docs/configuration` | A composing stick. Four rows enter the tray before the end stop locks the chase. | Left |
| `/docs/authentication` | A cutaway padlock. Insert the key, align the pins, turn the plug, release the shackle. | Right |
| `/foundation`, `/docs`, `/docs/project-structure` | A printer's type cabinet. Drawers travel on runners and represent separate source responsibilities. | Left |
| `/quick-start`, `/docs/deployment` | The letterpress feeds a sheet, closes and lifts its platen, then delivers the print. | Left for Quick start; right for Deployment |

The machines are a visual analogy for software composition. Captions explain both the physical object and its connection to the page. The website does not generate project files in the browser. It provides real creation commands and documentation.

Selections survive client navigation; a fresh visit starts from the reference configuration. All nine content routes render on the server. All website copy, metadata, controls and status text are English. No Play/Pause controls are present. The press starts open and the lock is shown as a cutaway so their construction can be read immediately.

## Real 3D, with a line-art finish

`public/models/mystack-assembly.blend` is the editable source scene, built in Blender 4.5.3 LTS. It contains 20 assemblies and 471 modeled objects. The generator merges objects into 54 rigid mechanism batches and exports standard GLBs, precomputed crease-edge buffers and provider thumbnails.

Three.js renders the GLBs with an orthographic camera and a depth buffer. Moving parts rotate as actual 3D bodies with unit scale; no projected SVG is skewed to simulate rotation. Component changes first open the press before withdrawing and inserting fittings. The press uses one slider-crank model, so the connecting rod keeps its length and the platen follows the crank. Paper feeds before contact and exits after the platen lifts. Authentication and configuration have their own ordered mechanisms. The same pure state functions drive movement.

One canvas persists across client routes. The renderer loads on demand, caches loaded assemblies, precompiles shaders, limits pixel ratio, and uses one time-based frame loop for scroll and anime.js assembly timelines. It stops when settled, in a hidden tab, or after the reading area leaves view. Reduced motion renders a still state while preserving provider choices. The server-rendered SVG poster remains visible before WebGL loads, if it is unavailable, or after context loss. The poster is a still frame of the renderer itself: `scripts/build-posters.ts` draws the same GLB surfaces and edge buffers in the pose the canvas starts in, hides lines behind surfaces with a depth buffer as the GPU does, and records the frame in `machine.json`. Its box is computed from the renderer's stage (`src/services/stage.ts`), so the canvas replaces it without the machine changing size, position or detail. On desktop the stage starts below the header (`.mechanical-stage`), so the masthead and navigation never cover the machine; on narrow screens the header is taller and the stage is the whole screen.

The renderer is a separate deferred bundle (approximately 169 KB gzipped); Vite reports its uncompressed size warning. It is not part of the initial page bundle. Ordinary builds do not require Blender.

## Rebuild the artwork

Edit `scripts/build-machine.py`, then regenerate the source scene and exported assets together:

```sh
uv venv .local/blender --python 3.11
uv pip install --python .local/blender/bin/python bpy==4.5.3
.local/blender/bin/python packages/website/scripts/build-machine.py
bun run --cwd packages/website art:posters
bun run --cwd packages/website art:check
bun run --cwd packages/website art:motion
```

Blender 4.5 can also run the script in background mode. The script creates its own scene; it does not import manual edits from the saved `.blend`.

## Code and verification

- `src/components/mechanical-world.tsx`: SSR poster, renderer lifecycle and object captions.
- `src/lib/mechanical-renderer.ts`: cached GLB loading, batched drawing, camera composition and the single animation loop.
- `src/lib/mechanical-rig.ts`: rigid transforms applied to the actual model nodes.
- `src/services/mechanics.ts`: slider-crank, lock, composing and drawer behavior.
- `src/services/assembly.ts`: catalog-to-fitting selection and route composition.
- `src/services/stage.ts`: where the machine sits on screen; shared by the canvas camera and the poster's CSS box.
- `src/services/seo.ts`: page metadata, JSON-LD, sitemap, robots and `llms.txt`.
- `src/components/stack-context.tsx`, `stack-builder.tsx`, `src/configurator.ts`: shared configuration, accessible native controls and copyable commands.
- `src/routes/`, `src/data/documentation.ts`: on-site pages and source-backed documentation.
- `scripts/build-posters.ts`: draws each scene's poster from the exported GLBs and edge buffers. Run `art:posters` after changing a model; it does not need Blender.
- `scripts/check-machine.ts`: validates distinct provider geometry, GLBs, edge buffers and static artwork, including that each poster's recorded frame matches its SVG.
- `scripts/check-motion.ts`: loads every real GLB and checks rigid distances across 41 poses; also checks projected axial-edge stability through a complete wheel revolution.
- `../../src/__tests__/website-*.test.ts`: configuration, linkage and ordering tests; excluded from generated application templates.

Run root `bun run check` and `bun run typecheck` as well as the website checks above. CI builds the website and validates its generated assets and motion invariants.

## Credits

The letterpress workshop and M mark are original Blender models. Three.js renders the line art; anime.js coordinates component changes. Hanken Grotesk is by the Hanken Grotesk Project Authors / Hanken Design Co., under the SIL Open Font License shipped at `public/fonts/OFL.txt`. No stock imagery, fictional customers or invented performance claims are used.
