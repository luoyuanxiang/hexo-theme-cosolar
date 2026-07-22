'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Generate /categories/index.html — all categories list
 */
hexo.extend.generator.register('categories-index', function (locals) {
  return {
    path: 'categories/index.html',
    layout: ['category'],
    data: {
      title: '分类',
      type: 'categories-index',
      categories: locals.categories,
    },
  };
});

/**
 * Generate /tags/index.html — all tags list
 */
hexo.extend.generator.register('tags-index', function (locals) {
  return {
    path: 'tags/index.html',
    layout: ['tag'],
    data: {
      title: '标签',
      type: 'tags-index',
      tags: locals.tags,
    },
  };
});

/**
 * Built-in /about/ page (theme pages/about.md → layout: about).
 * Skipped when the site already provides source/about/.
 *
 * Note: Do NOT put this markdown under theme source/ — Hexo treats theme
 * source *.md as static assets (no front-matter / no layout).
 */
hexo.extend.generator.register('cosolar-about', function (locals) {
  const pages = locals.pages ? locals.pages.toArray() : [];
  const siteHasAbout = pages.some(function (p) {
    const src = String(p.source || '').replace(/\\/g, '/');
    const dest = String(p.path || '').replace(/\\/g, '/');
    return (
      src === 'about/index.md' ||
      src === 'about.md' ||
      dest === 'about/index.html' ||
      dest === 'about.html'
    );
  });
  if (siteHasAbout) return;

  const mdPath = path.join(hexo.theme_dir, 'pages', 'about.md');
  if (!fs.existsSync(mdPath)) return;

  const raw = fs.readFileSync(mdPath, 'utf8');
  const fm = parseSimpleFrontMatter(raw);
  const aboutCfg = (hexo.theme && hexo.theme.config && hexo.theme.config.about) || {};

  return hexo.render.render({ text: fm.body, engine: 'markdown' }).then(function (html) {
    return {
      path: 'about/index.html',
      layout: ['about'],
      data: {
        title: fm.data.title || '关于 · Cosolar 移植纪实',
        description: fm.data.description || aboutCfg.subtitle || '',
        cover: fm.data.cover || aboutCfg.cover || '',
        comments: fm.data.comments === true,
        date: fm.data.date ? new Date(fm.data.date) : new Date(),
        content: html,
        type: 'about',
      },
    };
  });
});

function parseSimpleFrontMatter(raw) {
  const text = String(raw || '').replace(/^\uFEFF/, '');
  if (!text.startsWith('---')) {
    return { data: {}, body: text };
  }
  const end = text.indexOf('\n---', 3);
  if (end === -1) {
    return { data: {}, body: text };
  }
  const yaml = text.slice(3, end).replace(/^\r?\n/, '');
  const body = text.slice(end + 4).replace(/^\r?\n/, '');
  const data = {};
  yaml.split(/\r?\n/).forEach(function (line) {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) return;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (v === 'true') v = true;
    else if (v === 'false') v = false;
    data[m[1]] = v;
  });
  return { data: data, body: body };
}
