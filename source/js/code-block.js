// Mac-style code block enhancer: header / copy / fold
(function () {
  "use strict";

  var cfg = window.COSOLAR_CODE || {};
  if (cfg.enable === false) return;

  var foldEnabled = cfg.fold !== false;
  var foldHeight = parseInt(cfg.fold_height, 10);
  if (isNaN(foldHeight) || foldHeight < 0) foldHeight = 320;
  var showCopy = cfg.copy !== false;

  var LANG_ALIASES = {
    js: "javascript",
    ts: "typescript",
    py: "python",
    rb: "ruby",
    yml: "yaml",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    md: "markdown",
    txt: "text",
    plaintext: "text",
  };

  function normalizeLang(raw) {
    if (!raw) return "code";
    var lang = String(raw).trim().toLowerCase();
    lang = lang.replace(/^language-/, "").replace(/^lang-/, "");
    if (LANG_ALIASES[lang]) return LANG_ALIASES[lang];
    return lang || "code";
  }

  function detectLang(el) {
    if (el.classList) {
      var classes = Array.from(el.classList);
      for (var i = 0; i < classes.length; i++) {
        var c = classes[i];
        if (c === "highlight" || c === "hljs" || c === "chroma") continue;
        if (/^(language|lang)-/i.test(c)) return normalizeLang(c);
        // Hexo: figure.highlight.js
        if (el.matches && el.matches("figure.highlight") && c !== "highlight") {
          return normalizeLang(c);
        }
      }
    }
    var code = el.querySelector && el.querySelector("code");
    if (code && code.className) {
      var m = String(code.className).match(/(?:language|lang)-([a-z0-9_+-]+)/i);
      if (m) return normalizeLang(m[1]);
    }
    return "code";
  }

  function getCodeText(el) {
    var code = el.querySelector(".code pre") || el.querySelector("pre") || el;
    return (code.innerText || code.textContent || "").replace(/\n$/, "");
  }

  function alreadyWrapped(el) {
    return !!(el.closest && el.closest(".mac-code-block"));
  }

  function collectBlocks(root) {
    var list = [];
    var figures = root.querySelectorAll("figure.highlight");
    figures.forEach(function (fig) {
      if (!alreadyWrapped(fig)) list.push(fig);
    });
    var pres = root.querySelectorAll(".prose pre, article pre, .article-detail pre");
    pres.forEach(function (pre) {
      if (alreadyWrapped(pre)) return;
      if (pre.closest("figure.highlight")) return;
      list.push(pre);
    });
    return list;
  }

  function wrapBlock(el) {
    if (alreadyWrapped(el)) return;

    var lang = detectLang(el);
    var wrap = document.createElement("div");
    wrap.className = "mac-code-block";
    wrap.setAttribute("data-lang", lang);
    wrap.style.setProperty("--code-fold-height", foldHeight + "px");

    var header = document.createElement("div");
    header.className = "mac-code-header";
    header.innerHTML =
      '<span class="mac-code-dots" aria-hidden="true">' +
      '<i class="dot-red"></i><i class="dot-yellow"></i><i class="dot-green"></i>' +
      "</span>" +
      '<span class="mac-code-lang"></span>' +
      '<span class="mac-code-actions"></span>';
    header.querySelector(".mac-code-lang").textContent = lang;

    var actions = header.querySelector(".mac-code-actions");
    if (showCopy) {
      var copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "mac-code-copy";
      copyBtn.textContent = "复制";
      copyBtn.addEventListener("click", function () {
        var text = getCodeText(el);
        var done = function () {
          copyBtn.textContent = "已复制";
          copyBtn.classList.add("is-copied");
          setTimeout(function () {
            copyBtn.textContent = "复制";
            copyBtn.classList.remove("is-copied");
          }, 1600);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done).catch(function () {
            fallbackCopy(text, done);
          });
        } else {
          fallbackCopy(text, done);
        }
      });
      actions.appendChild(copyBtn);
    }

    var body = document.createElement("div");
    body.className = "mac-code-body";

    var foldBtn = document.createElement("button");
    foldBtn.type = "button";
    foldBtn.className = "mac-code-fold";
    foldBtn.textContent = "展开代码";

    var parent = el.parentNode;
    if (!parent) return;
    parent.insertBefore(wrap, el);
    body.appendChild(el);
    wrap.appendChild(header);
    wrap.appendChild(body);
    wrap.appendChild(foldBtn);

    function refreshFold() {
      if (!foldEnabled || foldHeight <= 0) {
        wrap.classList.remove("is-foldable", "is-expanded");
        return;
      }
      // measure after layout
      var h = body.scrollHeight;
      if (h > foldHeight + 8) {
        wrap.classList.add("is-foldable");
        if (!wrap.classList.contains("is-expanded")) {
          foldBtn.textContent = "展开代码";
        }
      } else {
        wrap.classList.remove("is-foldable", "is-expanded");
      }
    }

    foldBtn.addEventListener("click", function () {
      var expanded = wrap.classList.toggle("is-expanded");
      foldBtn.textContent = expanded ? "收起代码" : "展开代码";
    });

    // measure twice: fonts may load late
    requestAnimationFrame(function () {
      refreshFold();
      setTimeout(refreshFold, 120);
    });
  }

  function fallbackCopy(text, done) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      done();
    } catch (e) {}
  }

  function enhance(root) {
    collectBlocks(root || document).forEach(wrapBlock);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      enhance(document);
    });
  } else {
    enhance(document);
  }

  window.CosolarCodeBlock = { enhance: enhance };
})();
