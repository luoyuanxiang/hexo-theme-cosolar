'use strict';

/**
 * Nested config getter: get_config('sidebar.show_sidebar', true)
 */
hexo.extend.helper.register('get_config', function (path, defaultValue) {
  const theme = this.theme || {};
  if (!path) return defaultValue;
  const parts = String(path).split('.');
  let cur = theme;
  for (let i = 0; i < parts.length; i++) {
    if (cur == null || typeof cur !== 'object') return defaultValue;
    cur = cur[parts[i]];
  }
  return cur === undefined || cur === null || cur === '' ? defaultValue : cur;
});

/**
 * Resolve post cover URL with theme fallback.
 */
hexo.extend.helper.register('post_cover', function (post) {
  const url_for = this.url_for.bind(this);
  const theme = this.theme || {};
  const style = theme.style || {};
  const builtin = url_for('/images/default_post_cover.png');
  if (post && post.cover) return post.cover;
  if (style.default_post_cover) return style.default_post_cover;
  return builtin;
});

/**
 * Featured posts for homepage carousel.
 * Matches theme.featured.featured_posts by path / title / slug,
 * or falls back to latest / sticky / none.
 */
hexo.extend.helper.register('featured_posts', function () {
  const theme = this.theme || {};
  const featured = theme.featured || {};
  const max = featured.featured_max_count || 5;
  const posts = this.site.posts.sort('-date');
  const configured = featured.featured_posts || [];

  function normalize(s) {
    return String(s || '')
      .replace(/^https?:\/\/[^/]+/i, '')
      .replace(/\/+$/, '')
      .replace(/^\//, '')
      .toLowerCase();
  }

  if (Array.isArray(configured) && configured.length > 0) {
    const result = [];
    configured.forEach(function (key) {
      if (!key) return;
      const nKey = normalize(key);
      const found = posts.find(function (p) {
        return (
          normalize(p.path) === nKey ||
          normalize(p.slug) === nKey ||
          normalize(p.title) === nKey ||
          normalize('/' + p.path) === nKey ||
          String(p.title) === String(key) ||
          String(p.slug) === String(key)
        );
      });
      if (found) result.push(found);
    });
    return result.slice(0, max);
  }

  const fallback = featured.fallback || 'latest';
  if (fallback === 'none') return [];
  if (fallback === 'pinned') {
    return posts
      .filter(function (p) {
        return p.sticky;
      })
      .limit(max)
      .toArray();
  }
  // latest
  return posts.limit(max).toArray();
});

/**
 * Build pagination page URL from page.base + page number.
 */
hexo.extend.helper.register('page_url', function (n, base) {
  const url_for = this.url_for.bind(this);
  const page = this.page || {};
  const b = base != null ? base : page.base || '/';
  const num = parseInt(n, 10) || 1;
  if (num <= 1) return url_for(b);
  const prefix = b.endsWith('/') ? b : b + '/';
  return url_for(prefix + 'page/' + num + '/');
});

/**
 * Post excerpt helper.
 */
hexo.extend.helper.register('post_excerpt', function (post, length) {
  const len = length || 120;
  if (post.excerpt) return this.strip_html(post.excerpt);
  if (post.description) return this.strip_html(post.description);
  return this.truncate(this.strip_html(post.content || ''), { length: len });
});

/**
 * Random sample of friend links from site.data.links
 */
hexo.extend.helper.register('sidebar_links', function (count) {
  const n = count || 5;
  const data = (this.site.data && this.site.data.links) || {};
  let links = [];
  if (Array.isArray(data.links)) {
    links = data.links.slice();
  } else if (Array.isArray(data)) {
    links = data.slice();
  }
  // shuffle
  for (let i = links.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = links[i];
    links[i] = links[j];
    links[j] = t;
  }
  return links.slice(0, n);
});

/**
 * Resolve menu URL (supports absolute / mailto / relative).
 */
hexo.extend.helper.register('menu_url', function (u) {
  if (u == null || u === '' || u === '#') return '#';
  const s = String(u);
  if (/^(https?:|mailto:|tel:|\/\/)/i.test(s)) return s;
  return this.url_for(s);
});

/**
 * Whether a menu item (or any descendant) matches current page path.
 */
hexo.extend.helper.register('menu_is_active', function (item) {
  if (!item) return false;
  const path = String(this.path || '')
    .replace(/^\//, '')
    .replace(/index\.html$/, '')
    .replace(/\/$/, '');

  function normalize(u) {
    if (!u || u === '#' || /^(https?:|mailto:|tel:|\/\/)/i.test(String(u))) return '';
    return String(u)
      .replace(/^\//, '')
      .replace(/index\.html$/, '')
      .replace(/\/$/, '');
  }

  function match(it) {
    const u = normalize(it.url);
    if (u === '') {
      // treat bare "/" as home
      if (it.url === '/' || it.url === '') {
        if (path === '' || path === 'index.html') return true;
      }
    } else if (path === u || path.indexOf(u + '/') === 0) {
      return true;
    }
    const kids = it.children || it.submenu;
    if (Array.isArray(kids)) {
      for (let i = 0; i < kids.length; i++) {
        if (match(kids[i])) return true;
      }
    }
    return false;
  }

  return match(item);
});

/**
 * Grouped friend links for links page.
 */
hexo.extend.helper.register('links_grouped', function () {
  const data = (this.site.data && this.site.data.links) || {};
  let links = [];
  let groups = [];

  if (Array.isArray(data.links)) {
    links = data.links;
  } else if (Array.isArray(data)) {
    links = data;
  }

  if (Array.isArray(data.groups) && data.groups.length) {
    groups = data.groups.map(function (g) {
      const name = g.name || g.id || 'default';
      return {
        name: name,
        display_name: g.display_name || g.name || name,
        links: links.filter(function (l) {
          return (l.group || 'default') === name;
        }),
      };
    });
    // orphan links without matching group
    const known = {};
    groups.forEach(function (g) {
      known[g.name] = true;
    });
    const orphans = links.filter(function (l) {
      return !known[l.group || 'default'];
    });
    if (orphans.length) {
      groups.push({ name: 'other', display_name: '其他', links: orphans });
    }
  } else if (links.length) {
    const map = {};
    links.forEach(function (l) {
      const key = l.group || 'friends';
      if (!map[key]) {
        map[key] = { name: key, display_name: key, links: [] };
      }
      map[key].links.push(l);
    });
    groups = Object.keys(map).map(function (k) {
      return map[k];
    });
  }

  return { groups: groups, links: links, total: links.length };
});
