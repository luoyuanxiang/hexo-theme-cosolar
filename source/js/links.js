// Links page — search / filter + copy site info
(function () {
  "use strict";

  var filterNav = document.getElementById("linkFilters");
  var searchInput = document.getElementById("linksSearchInput");
  var searchEmpty = document.getElementById("linksSearchEmpty");
  var linkGroups = Array.from(document.querySelectorAll("[data-link-group]"));

  var activeGroup = "__all__";
  var query = "";

  function applyFilter() {
    if (!linkGroups.length) return;
    var q = query.trim().toLowerCase();
    var visibleCount = 0;

    linkGroups.forEach(function (group) {
      var groupName = group.getAttribute("data-group-name") || "";
      var groupMatches = activeGroup === "__all__" || groupName === activeGroup;

      var items = group.querySelectorAll("[data-link-item]");
      var visibleInGroup = 0;

      items.forEach(function (item) {
        var name = (item.getAttribute("data-name") || "").toLowerCase();
        var desc = (item.getAttribute("data-desc") || "").toLowerCase();
        var url = (item.getAttribute("data-url") || "").toLowerCase();
        var matchesQuery =
          !q || name.indexOf(q) !== -1 || desc.indexOf(q) !== -1 || url.indexOf(q) !== -1;

        var show = groupMatches && matchesQuery;
        item.style.display = show ? "" : "none";
        if (show) {
          visibleInGroup++;
          visibleCount++;
        }
      });

      group.style.display = groupMatches && visibleInGroup > 0 ? "" : "none";
    });

    if (searchEmpty) {
      searchEmpty.style.display = visibleCount === 0 && q !== "" ? "block" : "none";
    }
  }

  if (filterNav) {
    filterNav.querySelectorAll(".link-filter").forEach(function (btn) {
      btn.addEventListener("click", function () {
        activeGroup = btn.getAttribute("data-group") || "__all__";
        filterNav.querySelectorAll(".link-filter").forEach(function (b) {
          b.classList.remove("active");
        });
        btn.classList.add("active");
        applyFilter();
      });
    });
  }

  if (searchInput) {
    var debounceTimer;
    searchInput.addEventListener("input", function () {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(function () {
        query = searchInput.value;
        applyFilter();
      }, 150);
    });

    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        searchInput.value = "";
        query = "";
        applyFilter();
        searchInput.blur();
      }
    });
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      try {
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        if (ok) resolve();
        else reject(new Error("copy failed"));
      } catch (err) {
        document.body.removeChild(ta);
        reject(err);
      }
    });
  }

  document.querySelectorAll(".links-copy-btn[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var text = btn.getAttribute("data-copy") || "";
      if (!text) return;
      var label = btn.querySelector("[data-copy-label]");
      copyText(text)
        .then(function () {
          btn.classList.add("is-copied");
          if (label) label.textContent = "已复制";
          window.setTimeout(function () {
            btn.classList.remove("is-copied");
            if (label) label.textContent = "复制";
          }, 1600);
        })
        .catch(function () {
          if (label) label.textContent = "失败";
          window.setTimeout(function () {
            if (label) label.textContent = "复制";
          }, 1600);
        });
    });
  });
})();
