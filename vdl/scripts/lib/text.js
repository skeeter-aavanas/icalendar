// Conversion d'une page HTML ou d'un PDF en texte brut exploitable par extractSpecs.
import * as cheerio from 'cheerio';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';

export function htmlToText(html, selector = 'main, article, body') {
  const $ = cheerio.load(html);
  $('script, style, noscript, nav, header, footer, form, iframe, svg').remove();
  $('br').replaceWith('\n');
  $('p, li, tr, h1, h2, h3, h4, div, dt, dd, td, th').each((_, el) => { $(el).append('\n'); });
  const root = $(selector).first();
  return (root.length ? root : $('body')).text().replace(/\n\s*\n+/g, '\n').trim();
}

export function htmlLinks(html, baseUrl, selector) {
  const $ = cheerio.load(html);
  const urls = new Set();
  $(selector).each((_, a) => {
    const href = $(a).attr('href');
    if (href && !href.startsWith('#') && !href.startsWith('mailto:')) urls.add(new URL(href, baseUrl).href.split('#')[0]);
  });
  return [...urls];
}

export async function pdfToText(buffer) {
  const { text } = await pdfParse(buffer);
  return text;
}

// Découpe le texte d'un catalogue PDF multi-modèles en blocs, un par nom de modèle.
export function splitByModels(text, models) {
  const hits = [];
  for (const name of models) {
    const re = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*'), 'i');
    const m = re.exec(text);
    if (m) hits.push({ name, index: m.index });
  }
  hits.sort((a, b) => a.index - b.index);
  return hits.map((h, i) => ({ model: h.name, text: text.slice(h.index, hits[i + 1]?.index ?? text.length) }));
}
