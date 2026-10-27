// Antes de `next build`: genera public/_redirects con las rutas REALES de la app (leídas de app/)
// y manda cualquier otra URL a un 404 estático que sirve el CDN de Netlify.
//
// Por qué: Next.js en Netlify enruta toda URL que no es un archivo por su función servidor, así que
// cada petición basura de un bot (/339149944, /wp-login.php…) gastaba una invocación de la cuota de
// Functions (en octubre de 2026 un botnet agotó la cuota del team de MDN con ~140k al día). Lo
// desconocido lo responde el CDN sin invocar nada.
//
// Las reglas se evalúan de arriba abajo y gana la primera: las rutas reales se reescriben a sí
// mismas (status 200) y siguen su camino normal; lo demás cae en /404.html. Una ruta nueva se
// permite sola en el siguiente build. Los archivos de public/ no hacen falta: existen y ganan solos.
//
// Si next.config tiene redirects/rewrites cuyo origen no es una ruta de app/, agrégalos en EXTRA.

import { readdir, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const EXTRA = [] // rutas de next.config (redirects/rewrites) que no están en app/

const root = process.cwd()
const appDir = ['src/app', 'app'].map((d) => path.join(root, d)).find(existsSync)
if (!appDir) throw new Error('gen-redirects: no encontré app/ ni src/app/')

const FILE_ROUTES = /^(icon|apple-icon|opengraph-image|twitter-image|robots|sitemap|manifest)\.(js|jsx|ts|tsx|png|ico|txt|xml|json)$/
const rules = new Set()

function add(segments) {
  const out = []
  for (const s of segments) {
    if (s.startsWith('[[...') || s.startsWith('[...')) { out.push('*'); break }
    out.push(s.startsWith('[') ? ':' + s.slice(1, -1) : s)
  }
  const p = '/' + out.join('/')
  rules.add(p.endsWith('*') ? `${p}  ${p.replace(/\*$/, ':splat')}  200` : `${p}  ${p}  200`)
  // un [[...x]] opcional también responde en su carpeta base
  if (segments.at(-1)?.startsWith('[[...')) rules.add(`${'/' + out.slice(0, -1).join('/')}  ${'/' + out.slice(0, -1).join('/')}  200`)
}

async function walk(dir, segs) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) {
      if (e.name.startsWith('_') || e.name.startsWith('@')) continue // carpetas privadas y slots paralelos
      const isGroup = e.name.startsWith('(') && e.name.endsWith(')')
      await walk(path.join(dir, e.name), isGroup ? segs : [...segs, e.name])
    } else if (/^(page|route)\.(js|jsx|ts|tsx|mdx)$/.test(e.name)) add(segs)
    else if (FILE_ROUTES.test(e.name)) {
      // Convenciones de archivo de Next: la URL real no siempre es el nombre del archivo.
      const [, base, ext] = e.name.match(FILE_ROUTES)
      const generated = /^(js|jsx|ts|tsx)$/.test(ext)
      const urls = base === 'robots' ? ['robots.txt'] : base === 'sitemap' ? ['sitemap.xml']
        : base === 'manifest' ? ['manifest.webmanifest', 'manifest.json'] : [generated ? base : e.name]
      for (const u of urls) add([...segs, u])
    }
  }
}
await walk(appDir, [])

const fixed = ['/_next/*', ...EXTRA]
const lines = [
  '# GENERADO por scripts/gen-redirects.mjs — no editar a mano.',
  ...[...rules].sort(),
  ...fixed.map((p) => `${p}  ${p.endsWith('*') ? p.replace(/\*$/, ':splat') : p}  200`),
  '/*  /404.html  404',
  '',
]
await mkdir(path.join(root, 'public'), { recursive: true })
await writeFile(path.join(root, 'public/_redirects'), lines.join('\n'))
console.log(`gen-redirects: ${rules.size} rutas de app/ + ${fixed.length} fijas`)
