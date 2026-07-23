'use strict';

/**
 * Built-in sitemap.xml + robots.txt for SEO.
 * Skips when hexo-generator-sitemap / hexo-generator-robotstxt is present.
 */
hexo.extend.generator.register('cosolar-sitemap', function (locals) {
  const themeSeo = (hexo.theme && hexo.theme.config && hexo.theme.config.seo) || {};
  if (themeSeo.enable === false || themeSeo.sitemap === false) return;

  const gens = hexo.extend.generator.list();
  if (gens.sitemap) return;

  const config = hexo.config;
  const root = String(config.url || '').replace(/\/$/, '');
  if (!root) return;

  const urls = [];

  function push(loc, lastmod, changefreq, priority) {
    if (loc == null) return;
    const path = String(loc).replace(/^\//, '');
    const href = path ? root + '/' + path : root + '/';
    urls.push({
      loc: href,
      lastmod: lastmod || '',
      changefreq: changefreq || 'weekly',
      priority: priority != null ? priority : '0.6',
    });
  }

  function iso(d) {
    if (!d) return '';
    try {
      if (typeof d.toDate === 'function') return d.toDate().toISOString().slice(0, 10);
      if (d instanceof Date) return d.toISOString().slice(0, 10);
      return new Date(d).toISOString().slice(0, 10);
    } catch (e) {
      return '';
    }
  }

  push('', '', 'daily', '1.0');

  locals.posts.sort('-updated').forEach(function (post) {
    if (post.sitemap === false || post.noindex) return;
    push(post.path, iso(post.updated || post.date), 'monthly', '0.8');
  });

  locals.pages.forEach(function (page) {
    if (page.sitemap === false || page.noindex) return;
    push(page.path, iso(page.updated || page.date), 'monthly', '0.6');
  });

  locals.categories.forEach(function (cat) {
    push(cat.path, '', 'weekly', '0.5');
  });

  locals.tags.forEach(function (tag) {
    push(tag.path, '', 'weekly', '0.4');
  });

  push('archives/', '', 'weekly', '0.5');

  const seen = {};
  const unique = urls.filter(function (u) {
    const key = u.loc.replace(/\/$/, '');
    if (seen[key]) return false;
    seen[key] = true;
    return true;
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ]
    .concat(
      unique.map(function (u) {
        const lines = ['  <url>', '    <loc>' + escapeXml(u.loc) + '</loc>'];
        if (u.lastmod) lines.push('    <lastmod>' + u.lastmod + '</lastmod>');
        if (u.changefreq) lines.push('    <changefreq>' + u.changefreq + '</changefreq>');
        if (u.priority) lines.push('    <priority>' + u.priority + '</priority>');
        lines.push('  </url>');
        return lines.join('\n');
      })
    )
    .concat(['</urlset>', ''])
    .join('\n');

  return {
    path: themeSeo.sitemap_path || 'sitemap.xml',
    data: xml,
  };
});

hexo.extend.generator.register('cosolar-robots', function () {
  const themeSeo = (hexo.theme && hexo.theme.config && hexo.theme.config.seo) || {};
  if (themeSeo.enable === false || themeSeo.robots === false) return;

  const gens = hexo.extend.generator.list();
  if (gens.robotstxt || gens.robots) return;

  const config = hexo.config;
  const root = String(config.url || '').replace(/\/$/, '');
  const sitemapPath = (themeSeo.sitemap_path || 'sitemap.xml').replace(/^\//, '');
  const extra = Array.isArray(themeSeo.robots_extra) ? themeSeo.robots_extra : [];

  const lines = ['User-agent: *', 'Allow: /', ''];
  extra.forEach(function (line) {
    if (line) lines.push(String(line));
  });
  if (themeSeo.sitemap !== false && root) {
    lines.push('Sitemap: ' + root + '/' + sitemapPath);
  }
  lines.push('');

  return {
    path: 'robots.txt',
    data: lines.join('\n'),
  };
});

function escapeXml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
