/**
 * Cosolar site stats — footer comment count (Twikoo / Waline)
 */
(function () {
  "use strict";

  var cfg = window.COSOLAR_STATS || {};
  if (!cfg.provider || cfg.provider === "none") return;

  function setText(id, value) {
    var el = document.getElementById(id);
    if (!el) return;
    el.textContent = String(value);
  }

  function normalizePath(p) {
    if (!p) return "/";
    var s = String(p).split("?")[0].split("#")[0];
    if (!s.startsWith("/")) s = "/" + s;
    return s;
  }

  function pathVariants(p) {
    var n = normalizePath(p);
    var set = {};
    [n, n.replace(/\/$/, ""), n.endsWith("/") ? n : n + "/"].forEach(function (x) {
      if (x) set[x] = true;
    });
    return Object.keys(set);
  }

  function uniquePaths(list) {
    var seen = {};
    var out = [];
    (list || []).forEach(function (p) {
      pathVariants(p).forEach(function (v) {
        if (!seen[v]) {
          seen[v] = true;
          out.push(v);
        }
      });
    });
    return out;
  }

  function applyPageCommentCount(map) {
    var path = normalizePath(window.location.pathname);
    var count = 0;
    pathVariants(path).forEach(function (v) {
      if (map[v] != null) count = Math.max(count, map[v]);
    });
    var btn = document.querySelector("#commentBtn .action-count");
    if (btn) btn.textContent = String(count);
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (window.twikoo) {
        resolve();
        return;
      }
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = function () {
        resolve();
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function fetchTwikoo() {
    var tw = cfg.twikoo || {};
    if (!tw.envId) return Promise.resolve(null);

    return loadScript(
      tw.cdn ||
        "https://cdn.jsdelivr.net/npm/twikoo@" +
          (tw.version || "1.7.14") +
          "/dist/twikoo.min.js"
    ).then(function () {
      var urls = uniquePaths(cfg.paths || []);
      if (!urls.length) return { total: 0, map: {} };

      // Twikoo batches; keep chunks modest
      var chunkSize = 40;
      var chunks = [];
      for (var i = 0; i < urls.length; i += chunkSize) {
        chunks.push(urls.slice(i, i + chunkSize));
      }

      return chunks
        .reduce(function (chain, chunk) {
          return chain.then(function (acc) {
            return window.twikoo
              .getCommentsCount({
                envId: tw.envId,
                region: tw.region || undefined,
                urls: chunk,
                includeReply: true,
              })
              .then(function (res) {
                (res || []).forEach(function (item) {
                  var url = normalizePath(item.url);
                  var n = parseInt(item.count, 10) || 0;
                  acc.map[url] = Math.max(acc.map[url] || 0, n);
                });
                return acc;
              });
          });
        }, Promise.resolve({ map: {} }))
        .then(function (acc) {
          var total = 0;
          var counted = {};
          Object.keys(acc.map).forEach(function (url) {
            // Prefer one canonical key per page to avoid double-counting slash variants
            var base = url.replace(/\/$/, "") || "/";
            if (counted[base]) return;
            counted[base] = true;
            // take max among variants
            var max = 0;
            pathVariants(base).forEach(function (v) {
              if (acc.map[v] != null) max = Math.max(max, acc.map[v]);
            });
            total += max;
          });
          return { total: total, map: acc.map };
        });
    });
  }

  function fetchWaline() {
    var wl = cfg.waline || {};
    if (!wl.serverURL) return Promise.resolve(null);
    var base = String(wl.serverURL).replace(/\/$/, "");
    var urls = uniquePaths(cfg.paths || []);
    if (!urls.length) return Promise.resolve({ total: 0, map: {} });

    // Deduplicate to base paths first
    var bases = [];
    var seen = {};
    urls.forEach(function (u) {
      var b = u.replace(/\/$/, "") || "/";
      if (!seen[b]) {
        seen[b] = true;
        bases.push(b);
      }
    });

    return Promise.all(
      bases.map(function (path) {
        var q =
          base +
          "/api/comment?type=count&path=" +
          encodeURIComponent(path.endsWith("/") ? path : path + "/");
        return fetch(q)
          .then(function (r) {
            return r.json();
          })
          .then(function (data) {
            var n = parseInt(data && (data.data != null ? data.data : data), 10);
            return { path: path, count: isNaN(n) ? 0 : n };
          })
          .catch(function () {
            return { path: path, count: 0 };
          });
      })
    ).then(function (rows) {
      var map = {};
      var total = 0;
      rows.forEach(function (row) {
        map[row.path] = row.count;
        map[row.path + "/"] = row.count;
        total += row.count;
      });
      return { total: total, map: map };
    });
  }

  function boot() {
    var task =
      cfg.provider === "twikoo"
        ? fetchTwikoo()
        : cfg.provider === "waline"
          ? fetchWaline()
          : Promise.resolve(null);

    task
      .then(function (result) {
        if (!result) return;
        setText("cosolar-comment-count", result.total);
        applyPageCommentCount(result.map || {});
      })
      .catch(function (err) {
        if (typeof console !== "undefined") console.warn("[cosolar-stats]", err);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
