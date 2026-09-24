# website

The pacenote.tech site: a landing page and the documentation for Pacenote, sim racing telemetry a team hosts itself.

## Working on it

Static [Astro](https://astro.build) site, built with [Bun](https://bun.sh). No client-side JavaScript is shipped.

```
bun install
bun run dev        # http://localhost:4321
bun run build      # dist/
bun run preview
```

| Where | What |
|---|---|
| `src/pages/index.astro` | the landing page |
| `src/content/docs/*.md` | one file per documentation page; `order` in the front matter sets the sidebar |
| `src/data/site.ts` | URLs, and the release lookup the quick-start uses |
| `src/styles/global.css` | design tokens: colours, type, spacing |
| `src/components/Trace.astro` | the lap trace in the hero, generated at build time from a made-up circuit |

The quick-start block reads the latest server release from GitHub at build time and falls back to a pinned version when offline.

## Deploying

`bun run build` writes `dist/`, plain files that any static host can serve. `astro.config.mjs` sets the canonical `site` to `https://www.pacenote.tech`.

With Caddy: `deploy/Caddyfile` has the two site blocks (www serves the files, the bare domain redirects to www). Copy `dist/` to `/var/www/pacenote` on the server, or run `deploy/deploy.sh user@host`, which builds and rsyncs it.
