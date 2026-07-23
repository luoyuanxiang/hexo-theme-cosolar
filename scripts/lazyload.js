'use strict';

/**
 * Add native lazy-loading to post/page content images.
 * Skips images that already set loading= / data-src (manual lazy libs).
 */
function injectLazy(html) {
  if (!html || typeof html !== 'string') return html;
  return html.replace(/<img\b([^>]*?)>/gi, function (match, attrs) {
    if (/\bloading\s*=/i.test(attrs)) return match;
    if (/\bdata-src\s*=/i.test(attrs)) return match;
    var next = attrs;
    if (!/\bdecoding\s*=/i.test(next)) {
      next += ' decoding="async"';
    }
    next += ' loading="lazy"';
    return '<img' + next + '>';
  });
}

hexo.extend.filter.register('after_post_render', function (data) {
  const cfg = (hexo.theme && hexo.theme.config && hexo.theme.config.lazyload) || {};
  if (cfg.enable === false) return data;
  if (data.content) data.content = injectLazy(data.content);
  if (data.more) data.more = injectLazy(data.more);
  if (data.excerpt) data.excerpt = injectLazy(data.excerpt);
  return data;
});
