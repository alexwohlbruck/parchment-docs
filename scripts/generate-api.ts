/**
 * Generate the API reference pages from Parchment's OpenAPI spec.
 *
 * The spec is vendored into this repo as `openapi.json` and the reference is
 * generated from that local copy, so a docs build never depends on a Parchment
 * instance being up and reachable. Parchment publishes the spec as a committed
 * artifact (`server/openapi.json`, refreshed by its own CI whenever the routes
 * change); the `API Reference` workflow pulls that in and opens a PR when the
 * generated pages drift.
 *
 * Generating from a fixed local path also keeps the output portable: Fumadocs
 * writes the input location into each page's `<APIPage document=...>` prop, so
 * pointing it straight at a URL or an absolute path would commit that value
 * into the pages.
 *
 * Run with no arguments to regenerate from the vendored spec:
 *
 *   bun run generate:api
 *
 * Pass a source to refresh the vendored spec first — a URL or a local path:
 *
 *   OPENAPI_SPEC=../parchment/server/openapi.json bun run generate:api
 *   OPENAPI_SPEC=http://localhost:5000/docs/json  bun run generate:api
 *
 * The second form reads a running server, which is the quickest loop when
 * you're changing routes locally and haven't committed the spec yet.
 */

import { generateFiles } from 'fumadocs-openapi'

/** Vendored spec, committed alongside the pages generated from it. */
const SPEC_PATH = 'openapi.json'

/** Where Parchment publishes the spec for its default development branch. */
const UPSTREAM_SPEC =
  'https://raw.githubusercontent.com/alexwohlbruck/parchment/dev/server/openapi.json'

/** Fetch or read a spec from `source` and replace the vendored copy. */
async function refreshSpec(source: string): Promise<void> {
  console.log(`Refreshing ${SPEC_PATH} from: ${source}`)

  const raw = /^https?:\/\//.test(source)
    ? await fetch(source).then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} fetching ${source}`)
        }
        return res.text()
      })
    : await Bun.file(source).text()

  const spec = JSON.parse(raw) as { paths?: Record<string, unknown> }
  const pathCount = Object.keys(spec.paths ?? {}).length
  if (pathCount === 0) {
    // Writing an empty spec would silently wipe every API page on the next
    // build, so refuse it rather than let the deletion through as a diff.
    throw new Error(`Spec from ${source} contains no paths — refusing it`)
  }

  await Bun.write(SPEC_PATH, JSON.stringify(spec, null, 2) + '\n')
  console.log(`Vendored spec updated — ${pathCount} paths`)
}

// SERVER_ORIGIN is the older way this was configured: a server base URL whose
// /docs/json got fetched at generation time. Still honoured.
const serverOrigin = process.env.SERVER_ORIGIN
const source =
  process.env.OPENAPI_SPEC ||
  (serverOrigin ? `${serverOrigin}/docs/json` : undefined)

if (source) {
  await refreshSpec(source === 'upstream' ? UPSTREAM_SPEC : source)
} else if (!(await Bun.file(SPEC_PATH).exists())) {
  // First run in a fresh checkout that predates the vendored spec.
  await refreshSpec(UPSTREAM_SPEC)
}

await generateFiles({
  input: [`./${SPEC_PATH}`],
  output: './content/docs/api',
  per: 'tag',
  includeDescription: true,
})

console.log('API reference pages generated in content/docs/api/')
