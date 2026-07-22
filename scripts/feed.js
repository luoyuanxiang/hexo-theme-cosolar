'use strict';

/**
 * Built-in Atom feed (/atom.xml) when hexo-generator-feed is not installed.
 * Footer / sidebar RSS defaults to /atom.xml.
 */
hexo.extend.generator.register('cosolar-atom', function (locals) {
  const themeFeed = (hexo.theme && hexo.theme.config && hexo.theme.config.feed) || {};
  if (themeFeed.enable === false) return;

  // Prefer official plugin when present
  const gens = hexo.extend.generator.list();
  if (gens.atom || gens.rss2) return;
  if (hexo.config.feed) return;

  const pathName = themeFeed.path || 'atom.xml';
  const limit = themeFeed.limit != null ? Number(themeFeed.limit) : 20;
  let query = locals.posts.sort('-date');
  if (limit > 0) query = query.limit(limit);
  const list = query.toArray();

  const config = hexo.config;
  const root = String(config.url || '').replace(/\/$/, '');
  const feedUrl = root + '/' + String(pathName).replace(/^\//, '');
  const now = new Date().toISOString();
  const author = escapeXml(config.author || config.title || 'Hexo');

  const entries = list
    .map(function (post) {
      const permalink = root + '/' + String(post.path || '').replace(/^\//, '');
      const updated = toIso(post.updated || post.date);
      const published = toIso(post.date);
      const summaryText = stripHtml(post.excerpt || post.content || '').slice(0, 280);
      const lines = [
        '  <entry>',
        '    <title type="html">' + cdata(post.title || 'Untitled') + '</title>',
        '    <link href="' + escapeXml(permalink) + '"/>',
        '    <id>' + escapeXml(permalink) + '</id>',
        '    <published>' + published + '</published>',
        '    <updated>' + updated + '</updated>',
        '    <author><name>' + author + '</name></author>',
      ];
      if (summaryText) {
        lines.push('    <summary type="html">' + cdata(summaryText) + '</summary>');
      }
      if (post.content) {
        lines.push('    <content type="html">' + cdata(post.content) + '</content>');
      }
      lines.push('  </entry>');
      return lines.join('\n');
    })
    .join('\n');

  const xml = [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<feed xmlns="http://www.w3.org/2005/Atom">',
    '  <title>' + escapeXml(config.title || 'Hexo') + '</title>',
    config.subtitle ? '  <subtitle>' + escapeXml(config.subtitle) + '</subtitle>' : null,
    '  <link href="' + escapeXml(feedUrl) + '" rel="self"/>',
    '  <link href="' + escapeXml(root + '/') + '"/>',
    '  <updated>' + now + '</updated>',
    '  <id>' + escapeXml(feedUrl) + '</id>',
    '  <author><name>' + author + '</name></author>',
    '  <generator uri="https://github.com/luoyuanxiang/hexo-theme-cosolar">hexo-theme-cosolar</generator>',
    entries,
    '</feed>',
    '',
  ]
    .filter(function (line) {
      return line != null && line !== '';
    })
    .join('\n');

  return {
    path: pathName,
    data: xml,
  };
});

function toIso(d) {
  if (!d) return new Date().toISOString();
  if (typeof d.toDate === 'function') return d.toDate().toISOString();
  if (d instanceof Date) return d.toISOString();
  return new Date(d).toISOString();
}

function escapeXml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function cdata(str) {
  return '<![CDATA[' + String(str == null ? '' : str).replace(/]]>/g, ']]]]><![CDATA[>') + ']]>';
}

function stripHtml(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
