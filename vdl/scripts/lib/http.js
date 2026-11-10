// Accès HTTP « poli » : respect de robots.txt, délai entre requêtes par hôte,
// User-Agent identifié et cache disque (une page n'est pas retéléchargée avant MAX_AGE).
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CACHE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'cache');
const USER_AGENT = process.env.VDL_USER_AGENT
  || 'VDL-Catalogue-Bot/1.0 (+catalogue indicatif de vehicules de loisirs; respecte robots.txt)';
const DELAY_MS = Number(process.env.VDL_DELAY_MS || 2500);
const MAX_AGE_MS = 7 * 24 * 3600 * 1000;

const lastHit = new Map();
const robotsCache = new Map();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function throttle(host) {
  const wait = (lastHit.get(host) || 0) + DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastHit.set(host, Date.now());
}

// Analyse minimale de robots.txt : règles Disallow/Allow du groupe « * » ou du bot.
export function parseRobots(txt, agent = 'vdl-catalogue-bot') {
  const groups = [];
  let cur = null;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const [, key, val] = m;
    const k = key.toLowerCase();
    if (k === 'user-agent') {
      if (!cur || cur.rules.length) groups.push((cur = { agents: [], rules: [] }));
      cur.agents.push(val.toLowerCase());
    } else if (cur && (k === 'disallow' || k === 'allow')) {
      cur.rules.push({ allow: k === 'allow', path: val });
    }
  }
  const mine = groups.find((g) => g.agents.some((a) => a !== '*' && agent.includes(a)))
    || groups.find((g) => g.agents.includes('*'));
  return mine ? mine.rules.filter((r) => r.path !== '' || r.allow) : [];
}

export function isAllowed(rules, path) {
  let best = null;
  for (const r of rules) {
    const re = new RegExp('^' + r.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
    if (re.test(path) && (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow))) best = r;
  }
  return !best || best.allow;
}

async function robotsAllows(url) {
  const u = new URL(url);
  if (!robotsCache.has(u.origin)) {
    let rules = [];
    try {
      await throttle(u.host);
      const res = await fetch(`${u.origin}/robots.txt`, { headers: { 'User-Agent': USER_AGENT } });
      if (res.ok) rules = parseRobots(await res.text());
    } catch { /* pas de robots.txt joignable : on applique la prudence par défaut (délai) */ }
    robotsCache.set(u.origin, rules);
  }
  return isAllowed(robotsCache.get(u.origin), u.pathname + u.search);
}

// Télécharge une URL (texte ou binaire) avec cache. Lève une erreur si robots.txt l'interdit.
export async function fetchPolite(url, { binary = false, force = false } = {}) {
  const key = createHash('sha1').update(url).digest('hex');
  const file = join(CACHE_DIR, key + (binary ? '.bin' : '.txt'));
  if (!force) {
    try {
      const s = await stat(file);
      if (Date.now() - s.mtimeMs < MAX_AGE_MS) return binary ? readFile(file) : readFile(file, 'utf8');
    } catch { /* pas en cache */ }
  }
  if (!(await robotsAllows(url))) throw new Error(`robots.txt interdit ${url}`);
  await throttle(new URL(url).host);
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'fr,en;q=0.8,de;q=0.6' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
  const body = binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(file, body);
  return body;
}
