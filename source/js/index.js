// Index page — Featured carousel logic
(function () {
  "use strict";

  var carousel = document.querySelector(".featured-carousel");
  if (!carousel) return;

  var slides = carousel.querySelectorAll(".carousel-slide");
  var dots = carousel.querySelectorAll(".carousel-dot");
  var prevBtn = carousel.querySelector(".carousel-prev");
  var nextBtn = carousel.querySelector(".carousel-next");

  var maxSlides = parseInt(carousel.dataset.maxSlides || "5", 10);
  if (slides.length > maxSlides) {
    slides.forEach(function (slide, i) {
      if (i >= maxSlides) {
        slide.remove();
      }
    });
  }

  var actualSlides = carousel.querySelectorAll(".carousel-slide");

  if (dots.length > actualSlides.length) {
    dots.forEach(function (dot, i) {
      if (i >= actualSlides.length) {
        dot.remove();
      }
    });
  }

  if (actualSlides.length <= 1) {
    if (prevBtn) prevBtn.remove();
    if (nextBtn) nextBtn.remove();
    var dotsContainer = carousel.querySelector(".carousel-dots");
    if (dotsContainer) dotsContainer.remove();
    return;
  }

  var actualDots = carousel.querySelectorAll(".carousel-dot");

  var autoplay = carousel.dataset.autoplay === "true";
  var interval = parseInt(carousel.dataset.interval || "5000", 10);
  var currentIndex = 0;
  var timer = null;

  function showSlide(index) {
    currentIndex = (index + actualSlides.length) % actualSlides.length;
    actualSlides.forEach(function (slide, i) {
      slide.classList.toggle("active", i === currentIndex);
    });
    actualDots.forEach(function (dot, i) {
      dot.classList.toggle("active", i === currentIndex);
    });
  }

  function nextSlide() {
    showSlide(currentIndex + 1);
  }

  function prevSlide() {
    showSlide(currentIndex - 1);
  }

  function startAutoplay() {
    if (!autoplay) return;
    stopAutoplay();
    timer = setInterval(nextSlide, interval);
  }

  function stopAutoplay() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      prevSlide();
      startAutoplay();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      nextSlide();
      startAutoplay();
    });
  }

  actualDots.forEach(function (dot, i) {
    dot.addEventListener("click", function () {
      showSlide(i);
      startAutoplay();
    });
  });

  carousel.addEventListener("mouseenter", stopAutoplay);
  carousel.addEventListener("mouseleave", startAutoplay);

  var touchStartX = 0;
  var touchEndX = 0;

  carousel.addEventListener("touchstart", function (e) {
    touchStartX = e.changedTouches[0].screenX;
    stopAutoplay();
  });

  carousel.addEventListener("touchend", function (e) {
    touchEndX = e.changedTouches[0].screenX;
    var diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
    startAutoplay();
  });

  startAutoplay();
})();

// View Toggle — list/grid
(function () {
  "use strict";

  var STORAGE_KEY = "cosolar-article-view";
  var articleList = document.querySelector(".article-list");
  var toggleBtns = document.querySelectorAll(".view-toggle-btn");

  if (!articleList || toggleBtns.length === 0) return;

  var listEl = articleList;

  function setView(view) {
    toggleBtns.forEach(function (btn) {
      var btnView = btn.dataset.view;
      btn.classList.toggle("active", btnView === view);
    });

    if (view === "grid") {
      listEl.classList.add("grid-view");
    } else {
      listEl.classList.remove("grid-view");
    }

    try {
      localStorage.setItem(STORAGE_KEY, view);
    } catch (e) {}
  }

  var saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "grid") {
    setView("grid");
  }

  toggleBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var view = btn.dataset.view;
      setView(view);
    });
  });
})();

// Filter Tabs — client-side sort (latest / hot / recommend)
(function () {
  "use strict";

  var STORAGE_KEY = "cosolar-article-sort";
  var UPVOTE_PREFIX = "cosolar-upvote-";
  var VISIT_PREFIX = "cosolar-visit-count:";
  var contentArea = document.querySelector(".content-area");
  var articleList = document.querySelector(".article-list");
  var filterTabs = document.querySelectorAll(".filter-tab");
  var sectionTitle = document.querySelector(".section-header .section-title");

  if (!articleList || !filterTabs.length) return;

  var TITLE_MAP = {
    latest: "最新文章",
    hot: "最热文章",
    recommend: "推荐文章",
  };

  function readLocalUpvote(path) {
    if (!path) return 0;
    try {
      var raw = localStorage.getItem(UPVOTE_PREFIX + path);
      if (raw == null) {
        // also try without leading slash / with trailing
        raw = localStorage.getItem(UPVOTE_PREFIX + path.replace(/\/$/, ""));
      }
      if (raw == null) return 0;
      var n = parseInt(raw, 10);
      return isNaN(n) ? 0 : n;
    } catch (e) {
      return 0;
    }
  }

  function readLocalVisit(path) {
    if (!path) return 0;
    if (window.CosolarVisit && typeof CosolarVisit.read === "function") {
      return CosolarVisit.read(path) || 0;
    }
    try {
      var keys = [path, path.replace(/\/$/, ""), path.endsWith("/") ? path : path + "/"];
      var max = 0;
      for (var i = 0; i < keys.length; i++) {
        var raw = localStorage.getItem(VISIT_PREFIX + keys[i]);
        if (raw == null) continue;
        var n = parseInt(raw, 10);
        if (!isNaN(n) && n > max) max = n;
      }
      return max;
    } catch (e) {
      return 0;
    }
  }

  function cardScore(card, mode) {
    var time = card.getAttribute("data-time") || "0";
    var visitAttr = parseInt(card.getAttribute("data-visit") || "0", 10) || 0;
    var upvoteAttr = parseInt(card.getAttribute("data-upvote") || "0", 10) || 0;
    var sticky = card.getAttribute("data-sticky") === "1" ? 1 : 0;
    var word = parseInt(card.getAttribute("data-word") || "0", 10) || 0;
    var path = card.getAttribute("data-path") || "";
    var upvote = Math.max(upvoteAttr, readLocalUpvote(path));
    var visit = Math.max(visitAttr, readLocalVisit(path));

    if (mode === "hot") {
      // 有阅读数用阅读数；否则用字数作弱信号，再按时间
      var hot = visit > 0 ? visit : Math.floor(word / 100);
      return { primary: hot, secondary: time, sticky: sticky };
    }
    if (mode === "recommend") {
      // 置顶优先，再点赞，再时间
      return { primary: sticky * 100000 + upvote, secondary: time, sticky: sticky };
    }
    // latest
    return { primary: 0, secondary: time, sticky: sticky };
  }

  function compareCards(a, b, mode) {
    var sa = cardScore(a, mode);
    var sb = cardScore(b, mode);
    if (mode === "latest") {
      return sb.secondary.localeCompare(sa.secondary);
    }
    if (sb.primary !== sa.primary) return sb.primary - sa.primary;
    return sb.secondary.localeCompare(sa.secondary);
  }

  function sortArticles(mode) {
    var cards = Array.from(articleList.querySelectorAll(".article-card"));
    if (!cards.length) return;
    cards.sort(function (a, b) {
      return compareCards(a, b, mode);
    });
    var frag = document.createDocumentFragment();
    cards.forEach(function (card) {
      frag.appendChild(card);
    });
    articleList.appendChild(frag);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (e) {}
  }

  function setActiveTab(mode) {
    filterTabs.forEach(function (tab) {
      var on = tab.getAttribute("data-sort") === mode;
      tab.classList.toggle("active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
    });
    if (sectionTitle && TITLE_MAP[mode]) {
      sectionTitle.textContent = TITLE_MAP[mode];
    }
  }

  function applyMode(mode) {
    if (!mode) mode = "latest";
    setActiveTab(mode);
    sortArticles(mode);
  }

  // expose for pagination reapply
  window.CosolarHomeSort = {
    apply: applyMode,
    getMode: function () {
      var active = document.querySelector(".filter-tab.active");
      return (active && active.getAttribute("data-sort")) || "latest";
    },
  };

  var saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch (e) {}
  applyMode(saved || "latest");

  document.addEventListener("cosolar:visits-updated", function () {
    applyMode(window.CosolarHomeSort.getMode());
  });

  filterTabs.forEach(function (tab) {
    tab.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var mode = tab.getAttribute("data-sort") || "latest";
      applyMode(mode);
    });
  });
})();

// Client-side navigation — view more / pagination / infinite scroll
(function () {
  "use strict";

  var contentArea = document.querySelector(".content-area");
  var articleList = document.querySelector(".article-list");
  if (!contentArea || !articleList) return;

  var loadMode = contentArea.dataset.loadMode || "pagination";

  function reapplySort() {
    if (window.CosolarHomeSort && typeof window.CosolarHomeSort.apply === "function") {
      window.CosolarHomeSort.apply(window.CosolarHomeSort.getMode());
    }
  }

  async function fetchPageDoc(url) {
    try {
      var res = await fetch(url, { headers: { Accept: "text/html" } });
      if (!res.ok) return null;
      var text = await res.text();
      return new DOMParser().parseFromString(text, "text/html");
    } catch (e) {
      return null;
    }
  }

  function buildPageUrl(targetPage, currentPage, nextUrl, prevUrl) {
    var refUrl = targetPage > currentPage ? nextUrl : prevUrl;
    if (!refUrl) return null;
    var base = new URL(refUrl, window.location.origin);
    if (base.searchParams.has("page")) {
      base.searchParams.set("page", String(targetPage));
      return base.pathname + base.search + base.hash;
    }
    var m = base.pathname.match(/^(.*\/)page\/\d+(\/?)$/);
    if (m) {
      return m[1] + "page/" + targetPage + (m[2] || "");
    }
    var refPage = targetPage > currentPage ? currentPage + 1 : currentPage - 1;
    return refUrl.replace(new RegExp("(?<![\\d])" + refPage + "(?![\\d])"), String(targetPage));
  }

  function getNextUrl(doc) {
    var vm = doc.querySelector(".mt-4.text-center a.btn-outline");
    return vm ? vm.getAttribute("href") : null;
  }

  function updateNext(doc) {
    var nu = getNextUrl(doc);
    var sentinel = contentArea.querySelector(".load-sentinel");
    var viewMore = contentArea.querySelector(".mt-4.text-center a.btn-outline");
    if (nu) {
      if (sentinel) sentinel.dataset.nextUrl = nu;
      if (viewMore) viewMore.setAttribute("href", nu);
    } else {
      if (sentinel) sentinel.remove();
      if (viewMore) {
        var wrap = viewMore.closest(".mt-4");
        if (wrap) wrap.remove();
      }
    }
  }

  var loading = false;

  async function loadNext(url, append) {
    if (loading || !url) return;
    loading = true;
    var sentinel = contentArea.querySelector(".load-sentinel");
    if (sentinel) sentinel.classList.add("is-loading");

    var doc = await fetchPageDoc(url);
    if (sentinel) sentinel.classList.remove("is-loading");

    if (!doc) {
      window.location.href = url;
      loading = false;
      return;
    }

    var fetchedList = doc.querySelector(".article-list");
    if (!fetchedList) {
      window.location.href = url;
      loading = false;
      return;
    }

    if (append) {
      articleList.insertAdjacentHTML("beforeend", fetchedList.innerHTML);
      updateNext(doc);
    } else {
      articleList.innerHTML = fetchedList.innerHTML;
      var newPagination = doc.querySelector(".pagination");
      var oldPagination = contentArea.querySelector(".pagination");
      if (newPagination && oldPagination) {
        oldPagination.outerHTML = newPagination.outerHTML;
      } else if (!newPagination && oldPagination) {
        oldPagination.remove();
      }
      try {
        history.pushState(null, "", url);
      } catch (e) {}
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    reapplySort();
    loading = false;
  }

  contentArea.addEventListener("click", async function (e) {
    var target = e.target;
    if (!(target instanceof Element)) return;
    // 勿拦截筛选 Tab
    if (target.closest(".filter-tab") || target.closest(".filter-tabs")) return;
    var viewMore = target.closest("a.btn-outline");
    var pageLink = target.closest(".pagination a");
    var link = viewMore || pageLink;
    if (!link) return;
    if (link.classList.contains("active")) return;

    e.preventDefault();
    var url = link.getAttribute("href");
    if (!url) return;

    await loadNext(url, !!viewMore);
  });

  contentArea.addEventListener("submit", async function (e) {
    var formTarget = e.target;
    if (!(formTarget instanceof Element)) return;
    var form = formTarget.closest(".pagination-jump");
    if (!form) return;
    e.preventDefault();

    var pag = contentArea.querySelector(".pagination");
    if (!pag) return;
    var total = parseInt(pag.dataset.total || "1", 10);
    var current = parseInt(pag.dataset.current || "1", 10);
    var nextUrl = pag.dataset.nextUrl;
    var prevUrl = pag.dataset.prevUrl;

    var input = form.querySelector("input");
    var page = parseInt((input && input.value) || "", 10);
    if (!page || page < 1) page = 1;
    if (page > total) page = total;

    var url = buildPageUrl(page, current, nextUrl, prevUrl);
    if (url) await loadNext(url, false);
    if (input) input.value = "";
  });

  if (loadMode === "scroll") {
    var sentinel = contentArea.querySelector(".load-sentinel");
    if (sentinel && "IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        async function (entries) {
          if (entries[0].isIntersecting) {
            var url = sentinel.dataset.nextUrl;
            if (url) await loadNext(url, true);
          }
        },
        { rootMargin: "400px 0px" }
      );
      io.observe(sentinel);
    }
  }
})();
