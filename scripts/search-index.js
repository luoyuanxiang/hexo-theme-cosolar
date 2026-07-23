'use strict';

/**
 * Built-in local search index (/search.json).
 * Works even when hexo-generator-search is missing or only emits search.xml
 * (its default when site _config.yml has no search.path).
 */
hexo.extend.generator.register('cosolar-search', function (locals) {
  const themeSearch = (hexo.theme && hexo.theme.config && hexo.theme.config.search) || {};
  if (themeSearch.enable === false) return;

  const pathName = String(themeSearch.path || 'search.json').replace(/^\//, '');
  if (!/\.json$/i.test(pathName)) return;

  // Official plugin already configured to emit the same JSON path
  const siteSearch = hexo.config.search || {};
  const sitePath = String(siteSearch.path || '').replace(/^\//, '');
  const gens = hexo.extend.generator.list();
  if (
    gens.json &&
    sitePath &&
    sitePath.toLowerCase() === pathName.toLowerCase() &&
    /\.json$/i.test(sitePath)
  ) {
    return;
  }

  const root = String(hexo.config.root || '/');
  const field = String(themeSearch.field || 'post').trim().toLowerCase();
  const includeContent = themeSearch.content !== false;

  const entries = [];

  function pushEntry(doc) {
    if (!doc || doc.indexing === false) return;
    const title = doc.title || '';
    const url = joinUrl(root, doc.path || '');
    let content = '';
    if (includeContent) {
      content = stripHtml(doc._content || doc.content || doc.excerpt || '');
    }
    if (!title && !content) return;
    const item = { title: title, url: url, content: content };
    if (doc.tags && doc.tags.length) {
      item.tags = doc.tags.map(function (t) {
        return t.name || t;
      });
    }
    if (doc.categories && doc.categories.length) {
      item.categories = doc.categories.map(function (c) {
        return c.name || c;
      });
    }
    entries.push(item);
  }

  if (field === 'page') {
    locals.pages.each(pushEntry);
  } else if (field === 'all') {
    locals.posts.sort('-date').each(pushEntry);
    locals.pages.each(pushEntry);
  } else {
    locals.posts.sort('-date').each(pushEntry);
  }

  return {
    path: pathName,
    data: JSON.stringify(entries),
  };
});

function joinUrl(root, path) {
  const r = String(root || '/');
  const p = String(path || '').replace(/^\//, '');
  if (r === '/') return '/' + p;
  return r.replace(/\/?$/, '/') + p;
}

function stripHtml(html) {
  return String(html == null ? '' : html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&\w+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
