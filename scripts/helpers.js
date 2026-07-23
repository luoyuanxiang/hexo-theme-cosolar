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

/**
 * List categories for index / sidebar.
 * Hexo treats multi-line categories as a hierarchy, which can create
 * same-name children (e.g. 生活随笔 under 开发笔记 + top-level 生活随笔).
 *
 * mode:
 *   top  — only root categories (default, avoids duplicate names)
 *   all  — every category; nested names shown as "父 / 子"
 */
hexo.extend.helper.register('list_categories_ui', function (options) {
  options = options || {};
  const themeCat = (this.theme && this.theme.category) || {};
  const mode = options.mode || themeCat.list_mode || 'top';
  const limit = options.limit != null ? Number(options.limit) : 0;
  const all = this.site.categories.toArray();

  function fullName(cat) {
    const names = [cat.name];
    let parentId = cat.parent;
    const guard = {};
    while (parentId && !guard[parentId]) {
      guard[parentId] = true;
      const parent = all.find(function (c) {
        return c._id === parentId;
      });
      if (!parent) break;
      names.unshift(parent.name);
      parentId = parent.parent;
    }
    return names.join(' / ');
  }

  let list = all.slice();
  if (mode === 'top') {
    list = list.filter(function (c) {
      return !c.parent;
    });
  }

  list = list
    .map(function (c) {
      return {
        name: c.name,
        label: mode === 'all' ? fullName(c) : c.name,
        path: c.path,
        length: c.length,
        parent: c.parent,
        _id: c._id,
      };
    })
    .sort(function (a, b) {
      return b.length - a.length || String(a.label).localeCompare(String(b.label), 'zh');
    });

  if (limit > 0) list = list.slice(0, limit);
  return list;
});

/**
 * Absolute URL for SEO (Open Graph / canonical / JSON-LD).
 */
hexo.extend.helper.register('absolute_url', function (input) {
  if (input == null || input === '') {
    if (typeof this.full_url_for === 'function') return this.full_url_for('/');
    return String(this.config.url || '').replace(/\/$/, '') + '/';
  }
  const s = String(input);
  if (/^(https?:|data:|\/\/)/i.test(s)) {
    if (s.indexOf('//') === 0) {
      const proto = String(this.config.url || 'https://example.com').split(':')[0] || 'https';
      return proto + ':' + s;
    }
    return s;
  }
  if (typeof this.full_url_for === 'function') return this.full_url_for(s);
  const root = String(this.config.url || '').replace(/\/$/, '');
  const path = this.url_for(s);
  if (/^https?:/i.test(path)) return path;
  return root + (path.charAt(0) === '/' ? path : '/' + path);
});

/**
 * Build SEO payload used by layout/_partial/seo.ejs
 */
hexo.extend.helper.register('seo_info', function () {
  const config = this.config || {};
  const theme = this.theme || {};
  const page = this.page || {};
  const seo = theme.seo || {};
  const basic = theme.basic || {};
  const abs = this.absolute_url.bind(this);

  const siteTitle = config.title || 'Hexo';
  const siteDesc =
    config.description || basic.tagline || basic.footer_description || siteTitle;
  const author = config.author || basic.logo_text || siteTitle;

  let title = siteTitle;
  let description = siteDesc;
  let type = 'website';
  let image = seo.og_image || theme.favicon || basic.logo_image || '/images/logo.png';
  let keywords = [];
  let publishedTime = '';
  let modifiedTime = '';
  let noindex = !!seo.noindex;

  if (Array.isArray(config.keywords)) {
    keywords = config.keywords.slice();
  } else if (config.keywords) {
    keywords = String(config.keywords)
      .split(/[,，]/)
      .map(function (k) {
        return k.trim();
      })
      .filter(Boolean);
  }

  const isHome = typeof this.is_home === 'function' && this.is_home();
  const isPost = typeof this.is_post === 'function' && this.is_post();
  const isArchive = typeof this.is_archive === 'function' && this.is_archive();
  const isCategory = typeof this.is_category === 'function' && this.is_category();
  const isTag = typeof this.is_tag === 'function' && this.is_tag();

  if (isHome) {
    var homeSub = config.subtitle || basic.tagline || '';
    title = homeSub ? siteTitle + ' - ' + homeSub : siteTitle;
    description = siteDesc;
  } else if (isPost || (page.layout === 'post' && page.title)) {
    type = 'article';
    title = (page.title || 'Untitled') + ' - ' + siteTitle;
    description = this.post_excerpt(page, 160) || siteDesc;
    image = this.post_cover(page) || image;
    publishedTime = seoToIso(page.date);
    modifiedTime = seoToIso(page.updated || page.date);
    if (page.tags && page.tags.each) {
      page.tags.each(function (tag) {
        if (tag && tag.name) keywords.push(tag.name);
      });
    }
    if (page.categories && page.categories.each) {
      page.categories.each(function (cat) {
        if (cat && cat.name) keywords.push(cat.name);
      });
    }
    if (page.keywords) {
      String(page.keywords)
        .split(/[,，]/)
        .forEach(function (k) {
          if (k.trim()) keywords.push(k.trim());
        });
    }
  } else if (isCategory && page.category) {
    title = page.category + ' - ' + siteTitle;
    description = '分类「' + page.category + '」下的文章列表 - ' + siteTitle;
    keywords.push(page.category);
  } else if (isTag && page.tag) {
    title = page.tag + ' - ' + siteTitle;
    description = '标签「' + page.tag + '」下的文章列表 - ' + siteTitle;
    keywords.push(page.tag);
  } else if (isArchive) {
    title = '归档 - ' + siteTitle;
    description = siteTitle + ' 的文章归档';
  } else if (page.title) {
    title = page.title + ' - ' + siteTitle;
    description =
      (page.description && this.strip_html(page.description)) ||
      (page.excerpt && this.strip_html(page.excerpt)) ||
      siteDesc;
    if (page.cover) image = page.cover;
  }

  const seen = {};
  keywords = keywords.filter(function (k) {
    const key = String(k).toLowerCase();
    if (!key || seen[key]) return false;
    seen[key] = true;
    return true;
  });

  description = String(description || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);

  let canonicalPath = page.permalink || page.path || '/';
  if (isHome) canonicalPath = '/';
  const canonical = abs(canonicalPath);
  const imageUrl = abs(image);

  if (seo.noindex_pagination && page.current > 1) noindex = true;
  if (seo.noindex_archives && (isArchive || isCategory || isTag)) noindex = true;
  if (page.robots === 'noindex' || page.noindex) noindex = true;

  return {
    enable: seo.enable !== false,
    title: title,
    description: description,
    keywords: keywords,
    type: type,
    canonical: canonical,
    image: imageUrl,
    siteName: siteTitle,
    author: author,
    locale: String(config.language || 'zh-CN').replace(/-/g, '_'),
    publishedTime: publishedTime,
    modifiedTime: modifiedTime,
    twitterCard: seo.twitter_card || 'summary_large_image',
    twitterSite: seo.twitter_site || '',
    noindex: noindex,
    isHome: isHome,
    isPost: isPost || type === 'article',
    themeColor: (theme.style && theme.style.primary_color) || '#10B981',
  };
});

function seoToIso(d) {
  if (!d) return '';
  try {
    if (typeof d.toDate === 'function') return d.toDate().toISOString();
    if (d instanceof Date) return d.toISOString();
    return new Date(d).toISOString();
  } catch (e) {
    return '';
  }
}
