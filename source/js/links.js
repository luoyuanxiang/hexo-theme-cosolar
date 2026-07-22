// Links page — live search + group filter (client-side only)
(function () {
  "use strict";

  var filterNav = document.getElementById("linkFilters");
  if (!filterNav) return;

  var searchInput = document.getElementById("linksSearchInput");
  var searchEmpty = document.getElementById("linksSearchEmpty");
  var linkGroups = Array.from(document.querySelectorAll("[data-link-group]"));

  var activeGroup = "__all__";
  var query = "";

  function applyFilter() {
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
        var matchesQuery = !q || name.indexOf(q) !== -1 || desc.indexOf(q) !== -1 || url.indexOf(q) !== -1;

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
})();
