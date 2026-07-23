// Local search overlay for Hexo (hexo-generator-search /search.json)
(function () {
  "use strict";

  var INDEX_URL = window.COSOLAR_SEARCH_PATH || "/search.json";
  var MAX_RESULTS = 20;
  var SNIPPET_LEN = 80;

  var modal = null;
  var overlay = null;
  var input = null;
  var resultsEl = null;
  var statusEl = null;
  var indexData = null;
  var loading = false;
  var loadError = null;
  var debounceTimer = null;

  function ensureDom() {
    if (modal) return;

    overlay = document.createElement("div");
    overlay.className = "search-modal-overlay";
    overlay.setAttribute("aria-hidden", "true");

    modal = document.createElement("div");
    modal.className = "search-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", "站内搜索");
    modal.innerHTML =
      '<div class="search-modal-header">' +
      '<input type="search" class="search-input" placeholder="搜索文章…" autocomplete="off" enterkeyhint="search" />' +
      '<kbd class="search-modal-kbd">Esc</kbd>' +
      "</div>" +
      '<div class="search-modal-status" aria-live="polite"></div>' +
      '<ul class="search-results"></ul>';

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    input = modal.querySelector(".search-input");
    resultsEl = modal.querySelector(".search-results");
    statusEl = modal.querySelector(".search-modal-status");

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });

    input.addEventListener("input", function () {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        renderResults(input.value);
      }, 120);
    });

    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    });
  }

  function normalizeEntries(raw) {
    if (!raw) return [];

    // hexo-generator-searchdb / common array format
    if (Array.isArray(raw)) {
      return raw
        .map(function (item) {
          return {
            title: item.title || item.name || "",
            content: stripHtml(item.content || item.text || item.summary || ""),
            url: item.url || item.path || item.permalink || "#",
          };
        })
        .filter(function (item) {
          return item.title || item.content;
        });
    }

    // xml-like json / object keyed by path
    if (typeof raw === "object") {
      // { posts: [...] } or { entries: [...] }
      if (Array.isArray(raw.posts)) return normalizeEntries(raw.posts);
      if (Array.isArray(raw.entries)) return normalizeEntries(raw.entries);
      if (Array.isArray(raw.data)) return normalizeEntries(raw.data);

      return Object.keys(raw)
        .map(function (key) {
          var item = raw[key];
          if (!item || typeof item !== "object") return null;
          return {
            title: item.title || key,
            content: stripHtml(item.content || item.text || ""),
            url: item.url || item.path || key,
          };
        })
        .filter(Boolean);
    }

    return [];
  }

  function stripHtml(html) {
    return String(html)
      .replace(/<[^>]+>/g, " ")
      .replace(/&\w+;/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function loadIndex() {
    if (indexData) return Promise.resolve(indexData);
    if (loading) {
      return new Promise(function (resolve, reject) {
        var wait = setInterval(function () {
          if (indexData) {
            clearInterval(wait);
            resolve(indexData);
          } else if (loadError && !loading) {
            clearInterval(wait);
            reject(loadError);
          }
        }, 50);
      });
    }

    loading = true;
    loadError = null;
    setStatus("加载索引中…");

    return fetch(INDEX_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (raw) {
        indexData = normalizeEntries(raw);
        loading = false;
        setStatus("");
        return indexData;
      })
      .catch(function (err) {
        loading = false;
        loadError = err;
        setStatus("无法加载搜索索引 (" + INDEX_URL + ")");
        throw err;
      });
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text || "";
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function highlight(text, q) {
    var safe = escapeHtml(text);
    if (!q) return safe;
    var re;
    try {
      re = new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "ig");
    } catch (e) {
      return safe;
    }
    return safe.replace(re, "<mark>$1</mark>");
  }

  function snippetAround(content, q) {
    if (!content) return "";
    var lower = content.toLowerCase();
    var idx = q ? lower.indexOf(q.toLowerCase()) : -1;
    if (idx < 0) {
      return content.slice(0, SNIPPET_LEN) + (content.length > SNIPPET_LEN ? "…" : "");
    }
    var start = Math.max(0, idx - 24);
    var end = Math.min(content.length, idx + q.length + SNIPPET_LEN);
    var snip = content.slice(start, end);
    return (start > 0 ? "…" : "") + snip + (end < content.length ? "…" : "");
  }

  function search(query) {
    var q = (query || "").trim().toLowerCase();
    if (!q || !indexData) return [];

    var terms = q.split(/\s+/).filter(Boolean);
    var scored = [];

    indexData.forEach(function (item) {
      var title = (item.title || "").toLowerCase();
      var content = (item.content || "").toLowerCase();
      var score = 0;
      var matched = true;

      for (var i = 0; i < terms.length; i++) {
        var t = terms[i];
        var inTitle = title.indexOf(t) !== -1;
        var inContent = content.indexOf(t) !== -1;
        if (!inTitle && !inContent) {
          matched = false;
          break;
        }
        if (inTitle) score += 10;
        if (inContent) score += 2;
        if (title === t) score += 20;
      }

      if (matched) {
        scored.push({ item: item, score: score });
      }
    });

    scored.sort(function (a, b) {
      return b.score - a.score;
    });
    return scored.slice(0, MAX_RESULTS).map(function (s) {
      return s.item;
    });
  }

  function renderResults(query) {
    if (!resultsEl) return;
    var q = (query || "").trim();

    if (!q) {
      resultsEl.innerHTML = "";
      setStatus(indexData ? "输入关键词开始搜索" : "");
      return;
    }

    if (!indexData) {
      resultsEl.innerHTML = "";
      return;
    }

    var hits = search(q);
    if (hits.length === 0) {
      resultsEl.innerHTML = '<li class="search-result-empty">没有找到相关文章</li>';
      setStatus("");
      return;
    }

    setStatus("找到 " + hits.length + " 条结果");
    resultsEl.innerHTML = hits
      .map(function (item) {
        var snip = snippetAround(item.content, q);
        return (
          '<li class="search-result-item">' +
          '<a class="search-result-link" href="' +
          escapeHtml(item.url) +
          '">' +
          '<span class="search-result-title">' +
          highlight(item.title || "(无标题)", q) +
          "</span>" +
          (snip
            ? '<span class="search-result-snippet">' + highlight(snip, q) + "</span>"
            : "") +
          "</a></li>"
        );
      })
      .join("");
  }

  function open() {
    ensureDom();
    overlay.classList.add("is-open");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("search-modal-open");
    input.value = "";
    resultsEl.innerHTML = "";
    setStatus("");
    input.focus();

    loadIndex()
      .then(function () {
        setStatus("输入关键词开始搜索");
      })
      .catch(function () {});
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove("is-open");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("search-modal-open");
    if (input) input.blur();
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay && overlay.classList.contains("is-open")) {
      close();
    }
  });

  // Optional: wire .search-box click to open
  document.addEventListener("click", function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    var box = target.closest(".search-box, [data-search-open]");
    if (box) {
      e.preventDefault();
      open();
    }
  });

  window.CosolarSearch = {
    open: open,
    close: close,
  };
})();
