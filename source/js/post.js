// Post page — TOC generation with accordion & scroll spy
(function () {
  "use strict";

  var tocNav = document.getElementById("tocNav");
  if (!tocNav) return;

  var articleContent = document.querySelector(".prose");
  if (!articleContent) return;

  var headings = articleContent.querySelectorAll("h2, h3, h4");
  if (headings.length === 0) {
    tocNav.innerHTML = '<div class="toc-empty">本文无目录</div>';
    return;
  }

  var headingList = [];
  headings.forEach(function (heading, index) {
    if (!heading.id) {
      heading.id =
        "heading-" +
        index +
        "-" +
        (heading.textContent || "")
          .replace(/\s+/g, "-")
          .replace(/[^a-zA-Z0-9\u4e00-\u9fa5-]/g, "")
          .slice(0, 30);
    }
    var level = parseInt(heading.tagName.substring(1), 10);
    headingList.push({
      el: heading,
      id: heading.id,
      level: level,
      text: heading.textContent || "",
      index: index,
    });
  });

  function findParentIndex(idx) {
    var targetLevel = headingList[idx].level - 1;
    for (var i = idx - 1; i >= 0; i--) {
      if (headingList[i].level === targetLevel) {
        return i;
      }
    }
    return -1;
  }

  var tocLinks = [];
  var groupWrappers = {};

  headingList.forEach(function (info, idx) {
    var item = document.createElement("div");
    item.className = "toc-item toc-level-" + info.level;
    item.dataset.index = String(idx);

    var link = document.createElement("a");
    link.href = "#" + info.id;
    link.textContent = info.text;
    link.className = "toc-link toc-h" + info.level;
    link.addEventListener("click", function (e) {
      e.preventDefault();
      var target = document.getElementById(info.id);
      if (target) {
        var headerHeight = 80;
        var targetPos = target.getBoundingClientRect().top + window.scrollY - headerHeight;
        window.scrollTo({ top: targetPos, behavior: "smooth" });
      }
    });

    item.appendChild(link);
    tocLinks.push({ link: link, item: item, level: info.level });

    if (info.level === 2) {
      tocNav.appendChild(item);
    } else {
      var parentIdx = findParentIndex(idx);
      if (parentIdx >= 0) {
        var container = groupWrappers[parentIdx];
        if (!container) {
          container = document.createElement("div");
          container.className = "toc-children";
          groupWrappers[parentIdx] = container;
          tocLinks[parentIdx].item.appendChild(container);
        }
        container.appendChild(item);
      } else {
        tocNav.appendChild(item);
      }
    }
  });

  function setActive(idx) {
    var expandSet = {};
    var current = idx;
    while (current >= 0) {
      expandSet[current] = true;
      var parent = findParentIndex(current);
      if (parent < 0) break;
      current = parent;
    }

    Object.keys(groupWrappers).forEach(function (key) {
      var parentIdx = parseInt(key, 10);
      var container = groupWrappers[parentIdx];
      if (expandSet[parentIdx]) {
        container.classList.add("expanded");
        tocLinks[parentIdx].item.classList.add("expanded");
      } else {
        container.classList.remove("expanded");
        tocLinks[parentIdx].item.classList.remove("expanded");
      }
    });

    tocLinks.forEach(function (entry, i) {
      entry.link.classList.toggle("active", i === idx);
    });
  }

  setActive(0);

  var observer = new IntersectionObserver(
    function (entries) {
      var topIdx = -1;
      var topY = Infinity;
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var idx = parseInt(entry.target.getAttribute("data-toc-idx") || "-1", 10);
          if (idx >= 0) {
            var rect = entry.boundingClientRect;
            if (rect.top < topY) {
              topY = rect.top;
              topIdx = idx;
            }
          }
        }
      });
      if (topIdx >= 0) {
        setActive(topIdx);
      }
    },
    {
      rootMargin: "-80px 0px -70% 0px",
      threshold: 0,
    }
  );

  headingList.forEach(function (info, idx) {
    info.el.setAttribute("data-toc-idx", String(idx));
    observer.observe(info.el);
  });

  // ===== Upvote — CosolarUpvote hook or localStorage by pathname =====
  var upvoteBtn = document.getElementById("upvoteBtn");
  var upvoteCount = document.getElementById("upvoteCount");

  if (upvoteBtn && upvoteCount) {
    var storageKey = "cosolar-upvote-" + window.location.pathname;

    if (localStorage.getItem(storageKey)) {
      upvoteBtn.classList.add("liked");
    }

    upvoteBtn.addEventListener("click", async function () {
      if (upvoteBtn.classList.contains("liked")) {
        return;
      }

      upvoteBtn.classList.add("liked");
      var count = parseInt(upvoteCount.textContent || "0", 10);
      upvoteCount.textContent = String(count + 1);
      localStorage.setItem(storageKey, "1");

      if (window.CosolarUpvote && typeof CosolarUpvote === "function") {
        try {
          var ok = await CosolarUpvote({
            pathname: window.location.pathname,
            postName: upvoteBtn.dataset.post || "",
          });
          if (ok === false) {
            upvoteBtn.classList.remove("liked");
            upvoteCount.textContent = String(count);
            localStorage.removeItem(storageKey);
            showToast("点赞失败，请稍后重试");
          }
        } catch (err) {
          upvoteBtn.classList.remove("liked");
          upvoteCount.textContent = String(count);
          localStorage.removeItem(storageKey);
          showToast("网络错误，请稍后重试");
        }
      }
    });
  }

  // ===== Comment Button — scroll to comments =====
  var commentBtn = document.getElementById("commentBtn");
  if (commentBtn) {
    commentBtn.addEventListener("click", function () {
      var commentSection = document.querySelector(
        "#comments, .comments, [data-comment], halo-comment-widget, .halo-comment-widget"
      );
      if (commentSection) {
        var targetPos = commentSection.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: targetPos, behavior: "smooth" });
      } else {
        var article = document.querySelector(".article-detail, .content-area");
        if (article) {
          var pos = article.getBoundingClientRect().bottom + window.scrollY - 80;
          window.scrollTo({ top: pos, behavior: "smooth" });
        }
      }
    });
  }

  // ===== Share Button =====
  var shareBtn = document.getElementById("shareBtn");
  var shareMenu = document.getElementById("shareMenu");

  if (shareBtn && shareMenu) {
    shareBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      shareMenu.classList.toggle("show");
    });

    document.addEventListener("click", function () {
      shareMenu.classList.remove("show");
    });

    shareMenu.addEventListener("click", function (e) {
      e.stopPropagation();
    });

    var shareItems = shareMenu.querySelectorAll(".share-item");
    var shareUrl = window.location.href;
    var shareTitle = document.title;

    shareItems.forEach(function (item) {
      item.addEventListener("click", function () {
        var type = item.dataset.share;
        if (type === "weibo") {
          window.open(
            "https://service.weibo.com/share/share.php?url=" +
              encodeURIComponent(shareUrl) +
              "&title=" +
              encodeURIComponent(shareTitle),
            "_blank"
          );
        } else if (type === "wechat") {
          copyToClipboard(shareUrl);
          showToast("链接已复制，请在微信中粘贴分享");
        } else if (type === "copy") {
          copyToClipboard(shareUrl);
          showToast("链接已复制到剪贴板");
        }
        shareMenu.classList.remove("show");
      });
    });
  }

  function copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
    } else {
      var textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  }

  function showToast(message) {
    var toast = document.createElement("div");
    toast.textContent = message;
    toast.style.cssText =
      "position:fixed;bottom:30px;left:50%;transform:translateX(-50%);" +
      "padding:10px 20px;background:#1e293b;color:#fff;border-radius:8px;" +
      "font-size:14px;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.15);" +
      "opacity:0;transition:opacity 0.3s;";
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = "1";
    }, 10);
    setTimeout(function () {
      toast.style.opacity = "0";
      setTimeout(function () {
        document.body.removeChild(toast);
      }, 300);
    }, 2000);
  }

  // ===== Back to Top Button =====
  var backtopBtn = document.getElementById("backtopBtn");
  if (backtopBtn) {
    var btn = backtopBtn;
    function updateBacktopState() {
      if (window.scrollY > 400) {
        btn.classList.add("show");
        btn.classList.remove("disabled");
        btn.removeAttribute("aria-disabled");
      } else {
        btn.classList.add("show", "disabled");
        btn.setAttribute("aria-disabled", "true");
      }
    }
    updateBacktopState();
    window.addEventListener("scroll", updateBacktopState, { passive: true });

    btn.addEventListener("click", function () {
      if (btn.classList.contains("disabled")) return;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // ===== Word count & reading time =====
  function fillReadingStats() {
    var wcEl = document.getElementById("postWordCount");
    var rtEl = document.getElementById("postReadTime");
    if (!wcEl || !rtEl || !articleContent) return;

    var text = articleContent.innerText || articleContent.textContent || "";
    var chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    var englishWords = (text.replace(/[\u4e00-\u9fa5]/g, " ").match(/[A-Za-z0-9]+/g) || []).length;
    var total = chineseChars + englishWords;
    if (total === 0) return;

    var minutes = Math.max(1, Math.round(chineseChars / 300 + englishWords / 200));

    var wcText = wcEl.querySelector(".word-count-text");
    var rtText = rtEl.querySelector(".read-time-text");
    if (wcText) wcText.textContent = total + " 字";
    if (rtText) rtText.textContent = "约 " + minutes + " 分钟";
    wcEl.removeAttribute("hidden");
    rtEl.removeAttribute("hidden");
  }
  fillReadingStats();

  // ===== Reading progress =====
  var tocPercent = document.getElementById("tocPercent");
  var readingProgress = document.getElementById("readingProgress");
  if (tocPercent && readingProgress) {
    function updateReadingProgress() {
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var scrolled = window.scrollY;
      var percent =
        docHeight > 0 ? Math.min(100, Math.max(0, Math.round((scrolled / docHeight) * 100))) : 0;
      tocPercent.textContent = percent + "%";
      readingProgress.style.width = percent + "%";
    }
    updateReadingProgress();
    window.addEventListener("scroll", updateReadingProgress, { passive: true });
    window.addEventListener("resize", updateReadingProgress, { passive: true });
  }

  initMobileTocDrawer(headingList);
})();

function initMobileTocDrawer(headingList) {
  var tocBtn = document.getElementById("tocBtn");
  var drawer = document.getElementById("tocDrawer");
  var mask = document.getElementById("tocDrawerMask");
  var closeBtn = document.getElementById("tocDrawerClose");
  var drawerNav = document.getElementById("tocDrawerNav");
  if (!drawer || !mask || !closeBtn || !drawerNav) return;

  if (headingList.length === 0) {
    if (tocBtn) tocBtn.style.display = "none";
    return;
  }

  var sourceNav = document.getElementById("tocNav");
  function syncDrawerNav() {
    if (!sourceNav) return;
    drawerNav.innerHTML = "";
    drawerNav.appendChild(sourceNav.cloneNode(true));
  }

  function openDrawer() {
    syncDrawerNav();
    drawer.classList.add("open");
    mask.classList.add("show");
    drawer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeDrawer() {
    drawer.classList.remove("open");
    mask.classList.remove("show");
    drawer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  if (tocBtn) tocBtn.addEventListener("click", openDrawer);
  closeBtn.addEventListener("click", closeDrawer);
  mask.addEventListener("click", closeDrawer);

  drawerNav.addEventListener("click", function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    var link = target.closest("a.toc-link");
    if (!link) return;
    e.preventDefault();
    var hash = link.getAttribute("href") || "";
    var id = hash.replace(/^#/, "");
    var heading = document.getElementById(id);
    if (heading) {
      var headerHeight = 80;
      var targetPos = heading.getBoundingClientRect().top + window.scrollY - headerHeight;
      window.scrollTo({ top: targetPos, behavior: "smooth" });
    }
    closeDrawer();
  });
}

// ===== Image viewer =====
function initImageViewer() {
  var prose = document.querySelector(".prose");
  if (!prose) return;

  var viewer = document.createElement("div");
  viewer.className = "image-viewer";
  viewer.innerHTML =
    '<div class="image-viewer-tip">滚轮缩放 · 拖动平移 · 双击复位 · 点击关闭</div>';
  var img = document.createElement("img");
  viewer.appendChild(img);
  document.body.appendChild(viewer);

  var scale = 1;
  var x = 0;
  var y = 0;
  var dragging = false;
  var startX = 0;
  var startY = 0;
  var startTX = 0;
  var startTY = 0;
  var moved = false;

  function applyTransform() {
    img.style.transform = "translate(" + x + "px, " + y + "px) scale(" + scale + ")";
  }

  function open(src) {
    img.src = src;
    scale = 1;
    x = 0;
    y = 0;
    applyTransform();
    viewer.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function close() {
    viewer.classList.remove("open");
    document.body.style.overflow = "";
  }

  prose.addEventListener("click", function (e) {
    var target = e.target;
    if (target && target.tagName === "IMG") {
      e.preventDefault();
      open(target.src);
    }
  });

  viewer.addEventListener("click", function () {
    if (moved) {
      moved = false;
      return;
    }
    close();
  });

  viewer.addEventListener(
    "wheel",
    function (e) {
      e.preventDefault();
      var delta = e.deltaY < 0 ? 0.15 : -0.15;
      scale = Math.min(5, Math.max(0.5, scale + delta));
      applyTransform();
    },
    { passive: false }
  );

  viewer.addEventListener("dblclick", function (e) {
    e.preventDefault();
    scale = 1;
    x = 0;
    y = 0;
    applyTransform();
  });

  viewer.addEventListener("mousedown", function (e) {
    dragging = true;
    moved = false;
    startX = e.clientX;
    startY = e.clientY;
    startTX = x;
    startTY = y;
    e.preventDefault();
  });
  window.addEventListener("mousemove", function (e) {
    if (!dragging) return;
    var dx = e.clientX - startX;
    var dy = e.clientY - startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
    x = startTX + dx;
    y = startTY + dy;
    applyTransform();
  });
  window.addEventListener("mouseup", function () {
    dragging = false;
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && viewer.classList.contains("open")) close();
  });
}
initImageViewer();
