(function () {
  "use strict";

  // ===== Theme Toggle =====
  var themeToggle = document.getElementById("themeToggle");
  var html = document.documentElement;

  function getCurrentTheme() {
    return html.getAttribute("data-theme") || "light";
  }

  function setTheme(theme) {
    html.setAttribute("data-theme", theme);
    html.setAttribute("data-color-scheme", theme);
    localStorage.setItem("cosolar-theme", theme);
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var current = getCurrentTheme();
      setTheme(current === "dark" ? "light" : "dark");
    });
  }

  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function (e) {
    if (!localStorage.getItem("cosolar-theme")) {
      var config = html.getAttribute("data-color-scheme");
      if (config === "auto" || (!config && !localStorage.getItem("cosolar-theme"))) {
        setTheme(e.matches ? "dark" : "light");
      }
    }
  });

  // ===== Mobile Menu Toggle =====
  var menuToggle = document.getElementById("menuToggle");
  var headerNav = document.getElementById("headerNav");
  var siteHeader = document.querySelector(".site-header");
  var mobileMq = window.matchMedia("(max-width: 768px)");
  var navPortalParent = null;
  var navPortalNext = null;

  // 顶栏 backdrop-filter / sticky 会让内部 fixed 菜单被裁切，移动端把 nav 挂到 body
  function syncMobileNavPortal() {
    if (!headerNav) return;
    var mobile = mobileMq.matches;
    if (mobile) {
      if (headerNav.parentElement !== document.body) {
        navPortalParent = headerNav.parentElement;
        navPortalNext = headerNav.nextSibling;
        document.body.appendChild(headerNav);
        headerNav.setAttribute("data-portaled", "true");
      }
    } else {
      if (headerNav.getAttribute("data-portaled") === "true" && navPortalParent) {
        if (navPortalNext && navPortalNext.parentNode === navPortalParent) {
          navPortalParent.insertBefore(headerNav, navPortalNext);
        } else {
          var actions = navPortalParent.querySelector(".header-actions");
          if (actions) navPortalParent.insertBefore(headerNav, actions);
          else navPortalParent.appendChild(headerNav);
        }
        headerNav.removeAttribute("data-portaled");
        navPortalParent = null;
        navPortalNext = null;
      }
      setMobileMenuOpen(false);
    }
  }

  function setMobileMenuOpen(open) {
    if (open) syncMobileNavPortal();
    if (menuToggle) menuToggle.classList.toggle("active", open);
    if (headerNav) headerNav.classList.toggle("open", open);
    if (siteHeader) siteHeader.classList.toggle("is-menu-open", open);
    document.body.classList.toggle("menu-open", open);
    if (menuToggle) menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
  }

  syncMobileNavPortal();
  if (typeof mobileMq.addEventListener === "function") {
    mobileMq.addEventListener("change", syncMobileNavPortal);
  } else if (typeof mobileMq.addListener === "function") {
    mobileMq.addListener(syncMobileNavPortal);
  }

  if (menuToggle) {
    menuToggle.addEventListener("click", function () {
      var willOpen = !(headerNav && headerNav.classList.contains("open"));
      setMobileMenuOpen(willOpen);
    });
  }

  if (headerNav) {
    // Multi-level: desktop placeholder parents don't navigate; mobile accordion
    headerNav.addEventListener("click", function (e) {
      var target = e.target;
      if (!(target instanceof Element)) return;

      var link = target.closest(".nav-link");
      if (!link || !headerNav.contains(link)) return;

      var item = link.closest(".nav-item");
      var hasChildren = item && item.classList.contains("has-children");
      var isMobile = window.matchMedia("(max-width: 768px)").matches;
      var href = link.getAttribute("href") || "#";
      var isPlaceholder = href === "#" || href === "" || href === "javascript:void(0)";
      var clickedCaret = !!target.closest(".nav-caret");

      if (hasChildren && (isPlaceholder || (isMobile && clickedCaret))) {
        e.preventDefault();
        if (isMobile) {
          var open = item.classList.toggle("is-open");
          link.setAttribute("aria-expanded", open ? "true" : "false");
        }
        return;
      }

      // Close mobile drawer when following a real link
      if (isMobile) {
        setMobileMenuOpen(false);
      }
    });

    if (window.matchMedia("(max-width: 768px)").matches) {
      headerNav.querySelectorAll(".nav-item.is-active.has-children").forEach(function (el) {
        el.classList.add("is-open");
        var link = el.querySelector(":scope > .nav-link");
        if (link) link.setAttribute("aria-expanded", "true");
      });
    }
  }

  // ===== Search Shortcut (Ctrl+K) =====
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "k") {
      e.preventDefault();
      if (window.CosolarSearch && typeof CosolarSearch.open === "function") {
        CosolarSearch.open();
      } else {
        var searchBox = document.querySelector(".search-box");
        if (searchBox) searchBox.click();
      }
    }
  });

  // ===== Header Scroll Shadow =====
  window.addEventListener("scroll", function () {
    if (!siteHeader) return;
    if (window.scrollY > 10) {
      siteHeader.classList.add("scrolled");
    } else {
      siteHeader.classList.remove("scrolled");
    }
  });

  // ===== Active Nav State =====
  var navLinks = headerNav ? headerNav.querySelectorAll("a") : null;
  var currentPath = window.location.pathname;

  if (navLinks) {
    navLinks.forEach(function (link) {
      var href = link.getAttribute("href") || "";
      var linkPath = href.replace(/^(https?:\/\/[^/]+)?/, "");

      if (linkPath === currentPath || (linkPath !== "/" && currentPath.startsWith(linkPath))) {
        link.classList.add("active");
      } else if (linkPath === "/" && currentPath === "/") {
        link.classList.add("active");
      }
    });
  }

  // ===== Smooth Scroll for Anchor Links =====
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener("click", function (e) {
      var targetId = anchor.getAttribute("href");
      if (targetId && targetId.length > 1) {
        var target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    });
  });

  // ===== Dynamic background canvas =====
  function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 16, g: 185, b: 129 };
  }

  function setupCanvas(canvasSelector, dynamicType, color1Hex, color2Hex, opacityVal) {
    var canvas = document.querySelector(canvasSelector);
    if (!canvas) return;

    var ctx = canvas.getContext("2d");
    if (!ctx) return;

    var c = canvas;
    var rgb1 = hexToRgb(color1Hex);
    var rgb2 = hexToRgb(color2Hex);

    function resize() {
      c.width = window.innerWidth;
      c.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    if (dynamicType === "particles") {
      var particleCount = Math.min(80, Math.floor((c.width * c.height) / 15000));
      var maxDist = 120;
      var particles = [];

      for (var i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * c.width,
          y: Math.random() * c.height,
          vx: (Math.random() - 0.5) * 0.6,
          vy: (Math.random() - 0.5) * 0.6,
        });
      }

      function drawParticles() {
        ctx.clearRect(0, 0, c.width, c.height);
        for (var i = 0; i < particles.length; i++) {
          var p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > c.width) p.vx *= -1;
          if (p.y < 0 || p.y > c.height) p.vy *= -1;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(" + rgb1.r + ", " + rgb1.g + ", " + rgb1.b + ", " + opacityVal * 2 + ")";
          ctx.fill();
          for (var j = i + 1; j < particles.length; j++) {
            var p2 = particles[j];
            var dx = p.x - p2.x;
            var dy = p.y - p2.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < maxDist) {
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.strokeStyle =
                "rgba(" +
                rgb1.r +
                ", " +
                rgb1.g +
                ", " +
                rgb1.b +
                ", " +
                opacityVal * (1 - dist / maxDist) +
                ")";
              ctx.lineWidth = 0.8;
              ctx.stroke();
            }
          }
        }
        requestAnimationFrame(drawParticles);
      }
      drawParticles();
    }

    if (dynamicType === "gradient") {
      var time = 0;
      function drawGradient() {
        time += 0.003;
        ctx.clearRect(0, 0, c.width, c.height);
        var blobs = [
          {
            x: c.width * (0.3 + 0.2 * Math.sin(time * 0.7)),
            y: c.height * (0.3 + 0.2 * Math.cos(time * 0.5)),
            r: Math.max(1, c.width * 0.25),
          },
          {
            x: c.width * (0.7 + 0.15 * Math.cos(time * 0.6)),
            y: c.height * (0.6 + 0.2 * Math.sin(time * 0.8)),
            r: Math.max(1, c.width * 0.2),
          },
          {
            x: c.width * (0.5 + 0.25 * Math.sin(time * 0.4)),
            y: c.height * (0.5 + 0.15 * Math.cos(time * 0.9)),
            r: Math.max(1, c.width * 0.22),
          },
        ];
        blobs.forEach(function (blob, bi) {
          var rgb = bi % 2 === 0 ? rgb1 : rgb2;
          var gradient = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.r);
          gradient.addColorStop(
            0,
            "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", " + opacityVal + ")"
          );
          gradient.addColorStop(1, "rgba(" + rgb.r + ", " + rgb.g + ", " + rgb.b + ", 0)");
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, c.width, c.height);
        });
        requestAnimationFrame(drawGradient);
      }
      drawGradient();
    }

    if (dynamicType === "bubbles") {
      var bubbleCount = Math.min(30, Math.floor((c.width * c.height) / 40000));
      var bubbles = [];
      for (var bi = 0; bi < bubbleCount; bi++) {
        bubbles.push({
          x: Math.random() * c.width,
          y: Math.random() * c.height,
          r: Math.max(4, Math.random() * 30 + 8),
          vy: -(Math.random() * 0.4 + 0.15),
          vx: (Math.random() - 0.5) * 0.3,
          phase: Math.random() * Math.PI * 2,
        });
      }
      function drawBubbles() {
        ctx.clearRect(0, 0, c.width, c.height);
        bubbles.forEach(function (b) {
          b.y += b.vy;
          b.x += b.vx + Math.sin(b.phase) * 0.2;
          b.phase += 0.01;
          if (b.y + b.r < 0) {
            b.y = c.height + b.r;
            b.x = Math.random() * c.width;
          }
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fillStyle =
            "rgba(" + rgb1.r + ", " + rgb1.g + ", " + rgb1.b + ", " + opacityVal * 0.5 + ")";
          ctx.fill();
          ctx.strokeStyle =
            "rgba(" + rgb1.r + ", " + rgb1.g + ", " + rgb1.b + ", " + opacityVal + ")";
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(b.x - b.r * 0.25, b.y - b.r * 0.25, b.r * 0.2, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 255, 255, " + opacityVal * 0.6 + ")";
          ctx.fill();
        });
        requestAnimationFrame(drawBubbles);
      }
      drawBubbles();
    }

    if (dynamicType === "stars") {
      var starCount = Math.min(150, Math.floor((c.width * c.height) / 8000));
      var stars = [];
      for (var si = 0; si < starCount; si++) {
        stars.push({
          x: Math.random() * c.width,
          y: Math.random() * c.height,
          r: Math.max(0.5, Math.random() * 2),
          phase: Math.random() * Math.PI * 2,
          speed: Math.random() * 0.02 + 0.005,
        });
      }
      function drawStars() {
        ctx.clearRect(0, 0, c.width, c.height);
        stars.forEach(function (s) {
          s.phase += s.speed;
          var alpha = opacityVal * (0.4 + 0.6 * Math.abs(Math.sin(s.phase)));
          ctx.beginPath();
          ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(" + rgb1.r + ", " + rgb1.g + ", " + rgb1.b + ", " + alpha + ")";
          ctx.fill();
          if (s.r > 1.2) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r * 3, 0, Math.PI * 2);
            ctx.fillStyle =
              "rgba(" + rgb1.r + ", " + rgb1.g + ", " + rgb1.b + ", " + alpha * 0.15 + ")";
            ctx.fill();
          }
        });
        requestAnimationFrame(drawStars);
      }
      drawStars();
    }

    if (dynamicType === "mesh") {
      var gridSize = 40;
      var meshTime = 0;
      function drawMesh() {
        meshTime += 0.015;
        ctx.clearRect(0, 0, c.width, c.height);
        var cols = Math.ceil(c.width / gridSize) + 1;
        var rows = Math.ceil(c.height / gridSize) + 1;
        for (var mi = 0; mi < cols; mi++) {
          for (var mj = 0; mj < rows; mj++) {
            var x = mi * gridSize;
            var y = mj * gridSize;
            var dist = Math.sqrt(Math.pow(x - c.width / 2, 2) + Math.pow(y - c.height / 2, 2));
            var wave = Math.sin(dist * 0.01 - meshTime) * 0.5 + 0.5;
            var alpha = opacityVal * wave * 0.6;
            ctx.beginPath();
            ctx.arc(x, y, 1.2, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(" + rgb1.r + ", " + rgb1.g + ", " + rgb1.b + ", " + alpha + ")";
            ctx.fill();
            if (mi < cols - 1) {
              var nx = (mi + 1) * gridSize;
              var nDist = Math.sqrt(
                Math.pow(nx - c.width / 2, 2) + Math.pow(y - c.height / 2, 2)
              );
              var nWave = Math.sin(nDist * 0.01 - meshTime) * 0.5 + 0.5;
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(nx, y);
              ctx.strokeStyle =
                "rgba(" +
                rgb1.r +
                ", " +
                rgb1.g +
                ", " +
                rgb1.b +
                ", " +
                opacityVal * Math.min(wave, nWave) * 0.3 +
                ")";
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
            if (mj < rows - 1) {
              var ny = (mj + 1) * gridSize;
              var nDist2 = Math.sqrt(
                Math.pow(x - c.width / 2, 2) + Math.pow(ny - c.height / 2, 2)
              );
              var nWave2 = Math.sin(nDist2 * 0.01 - meshTime) * 0.5 + 0.5;
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(x, ny);
              ctx.strokeStyle =
                "rgba(" +
                rgb2.r +
                ", " +
                rgb2.g +
                ", " +
                rgb2.b +
                ", " +
                opacityVal * Math.min(wave, nWave2) * 0.3 +
                ")";
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
        requestAnimationFrame(drawMesh);
      }
      drawMesh();
    }
  }

  function initDynamicBackground() {
    var body = document.body;

    var lightBgType = body.getAttribute("data-light-bg-type");
    if (lightBgType === "dynamic") {
      setupCanvas(
        ".site-bg-canvas-light",
        body.getAttribute("data-light-bg-dynamic-type") || "particles",
        body.getAttribute("data-light-bg-dynamic-color1") || "#10B981",
        body.getAttribute("data-light-bg-dynamic-color2") || "#3B82F6",
        parseFloat(body.getAttribute("data-light-bg-dynamic-opacity") || "0.15")
      );
    }

    var darkBgType = body.getAttribute("data-dark-bg-type");
    if (darkBgType === "dynamic") {
      setupCanvas(
        ".site-bg-canvas-dark",
        body.getAttribute("data-dark-bg-dynamic-type") || "stars",
        body.getAttribute("data-dark-bg-dynamic-color1") || "#10B981",
        body.getAttribute("data-dark-bg-dynamic-color2") || "#3B82F6",
        parseFloat(body.getAttribute("data-dark-bg-dynamic-opacity") || "0.15")
      );
    }
  }

  initDynamicBackground();

  // ===== Footer subscribe tip =====
  (function initSubscribeTip() {
    var form = document.querySelector(".footer-subscribe-form");
    if (!form) return;

    var action = form.getAttribute("action") || "";
    if (action && action !== "#") return;

    var tip = null;
    var hideTimer = null;

    function showTip() {
      if (!tip) {
        tip = document.createElement("div");
        tip.className = "footer-subscribe-tip";
        tip.textContent = "功能待开发，敬请期待～";
        form.appendChild(tip);
      }
      requestAnimationFrame(function () {
        if (tip) tip.classList.add("is-visible");
      });
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        if (tip) tip.classList.remove("is-visible");
      }, 2500);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      showTip();
    });
  })();
})();
