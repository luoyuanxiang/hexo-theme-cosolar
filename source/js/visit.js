/**
 * Cosolar visit counter
 * - local: localStorage counts + optional sync from 不蒜子 page PV
 * - leancloud: shared Counter via REST (reuses upvote.leancloud when unset)
 */
(function () {
  "use strict";

  var cfg = window.COSOLAR_VISIT || {};
  if (cfg.enable === false) return;

  var provider = cfg.provider || "local";
  var COUNT_PREFIX = "cosolar-visit-count:";
  var SESSION_PREFIX = "cosolar-visit-session:";
  var lc = cfg.leancloud || {};

  function normalizePath(p) {
    if (!p) return "/";
    var s = String(p).split("?")[0].split("#")[0];
    if (!s.startsWith("/")) s = "/" + s;
    if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
    return s || "/";
  }

  function pathKeys(path) {
    var n = normalizePath(path);
    var keys = [n];
    if (!n.endsWith("/")) keys.push(n + "/");
    if (n !== "/" && n.endsWith("/")) keys.push(n.slice(0, -1));
    return keys;
  }

  function readLocal(path) {
    try {
      var keys = pathKeys(path);
      var max = 0;
      for (var i = 0; i < keys.length; i++) {
        var raw = localStorage.getItem(COUNT_PREFIX + keys[i]);
        if (raw == null) continue;
        var n = parseInt(raw, 10);
        if (!isNaN(n) && n > max) max = n;
      }
      return max;
    } catch (e) {
      return 0;
    }
  }

  function writeLocal(path, count) {
    try {
      var n = normalizePath(path);
      var cur = readLocal(n);
      if (count < cur) count = cur;
      localStorage.setItem(COUNT_PREFIX + n, String(count));
      localStorage.setItem(COUNT_PREFIX + (n.endsWith("/") ? n : n + "/"), String(count));
    } catch (e) {}
  }

  function sessionHit(path) {
    try {
      var key = SESSION_PREFIX + normalizePath(path);
      if (sessionStorage.getItem(key)) return true;
      sessionStorage.setItem(key, "1");
      return false;
    } catch (e) {
      return false;
    }
  }

  function lcReady() {
    return !!(lc.appId && lc.appKey && lc.serverURL);
  }

  function lcHeaders() {
    return {
      "X-LC-Id": lc.appId,
      "X-LC-Key": lc.appKey,
      "Content-Type": "application/json",
    };
  }

  function lcUrl(path) {
    return String(lc.serverURL).replace(/\/$/, "") + path;
  }

  function lcFind(path) {
    var where = encodeURIComponent(JSON.stringify({ key: normalizePath(path) }));
    return fetch(lcUrl("/1.1/classes/CosolarVisit?where=" + where + "&limit=1"), {
      headers: lcHeaders(),
    }).then(function (r) {
      return r.json();
    }).then(function (data) {
      var row = data && data.results && data.results[0];
      return row || null;
    });
  }

  function lcIncrement(path) {
    var key = normalizePath(path);
    return lcFind(key).then(function (row) {
      if (row) {
        return fetch(lcUrl("/1.1/classes/CosolarVisit/" + row.objectId), {
          method: "PUT",
          headers: lcHeaders(),
          body: JSON.stringify({ views: { __op: "Increment", amount: 1 } }),
        }).then(function (r) {
          return r.json();
        }).then(function () {
          return (row.views || 0) + 1;
        });
      }
      return fetch(lcUrl("/1.1/classes/CosolarVisit"), {
        method: "POST",
        headers: lcHeaders(),
        body: JSON.stringify({ key: key, views: 1 }),
      }).then(function (r) {
        return r.json();
      }).then(function () {
        return 1;
      });
    });
  }

  function lcFetchMany(paths) {
    var uniq = [];
    var seen = {};
    paths.forEach(function (p) {
      var n = normalizePath(p);
      if (!seen[n]) {
        seen[n] = true;
        uniq.push(n);
      }
    });
    if (!uniq.length) return Promise.resolve({});
    var where = encodeURIComponent(JSON.stringify({ key: { $in: uniq } }));
    return fetch(lcUrl("/1.1/classes/CosolarVisit?where=" + where + "&limit=1000"), {
      headers: lcHeaders(),
    }).then(function (r) {
      return r.json();
    }).then(function (data) {
      var map = {};
      (data.results || []).forEach(function (row) {
        map[normalizePath(row.key)] = row.views || 0;
      });
      return map;
    });
  }

  function setText(el, n) {
    if (!el) return;
    el.textContent = String(n);
  }

  function applyCardVisit(card, count) {
    if (!card || !(count > 0)) return;
    var base = parseInt(card.getAttribute("data-visit") || "0", 10) || 0;
    var next = Math.max(base, count);
    card.setAttribute("data-visit", String(next));
    var label = card.querySelector(".card-visit");
    setText(label, next);
  }

  function hydrateList() {
    var cards = document.querySelectorAll(".article-card[data-path]");
    if (!cards.length) return Promise.resolve();

    var paths = [];
    cards.forEach(function (card) {
      paths.push(card.getAttribute("data-path"));
    });

    function applyLocal() {
      cards.forEach(function (card) {
        var path = card.getAttribute("data-path");
        applyCardVisit(card, readLocal(path));
      });
    }

    applyLocal();

    if (provider === "leancloud" && lcReady()) {
      return lcFetchMany(paths)
        .then(function (map) {
          cards.forEach(function (card) {
            var path = normalizePath(card.getAttribute("data-path"));
            var remote = map[path] || 0;
            if (remote > 0) {
              writeLocal(path, remote);
              applyCardVisit(card, remote);
            }
          });
        })
        .catch(function () {});
    }
    return Promise.resolve();
  }

  function watchBusuanzi(path, displayEl) {
    var target = document.getElementById("busuanzi_value_page_pv");
    if (!target) return;

    function sync() {
      var text = (target.textContent || "").replace(/[,\s]/g, "");
      var n = parseInt(text, 10);
      if (isNaN(n) || n <= 0) return;
      writeLocal(path, n);
      if (displayEl) setText(displayEl, Math.max(readLocal(path), n));
    }

    sync();
    var obs = new MutationObserver(sync);
    obs.observe(target, { childList: true, characterData: true, subtree: true });
    setTimeout(function () {
      sync();
      obs.disconnect();
    }, 8000);
  }

  function recordPostVisit() {
    var root = document.querySelector("[data-post-visit-path]");
    if (!root) return;

    var path = normalizePath(root.getAttribute("data-post-visit-path") || window.location.pathname);
    var display = document.getElementById("postVisitCount");

    var localCount = readLocal(path);
    if (!sessionHit(path)) {
      localCount += 1;
      writeLocal(path, localCount);
    } else {
      localCount = Math.max(localCount, readLocal(path));
    }

    if (display) setText(display, localCount);

    watchBusuanzi(path, display);

    if (provider === "leancloud" && lcReady()) {
      lcIncrement(path)
        .then(function (n) {
          writeLocal(path, n);
          if (display) setText(display, Math.max(readLocal(path), n));
        })
        .catch(function () {});
    }
  }

  function boot() {
    recordPostVisit();
    Promise.resolve(hydrateList()).then(function () {
      try {
        document.dispatchEvent(new CustomEvent("cosolar:visits-updated"));
      } catch (e) {}
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.CosolarVisit = {
    read: readLocal,
    hydrate: hydrateList,
    normalizePath: normalizePath,
  };
})();
