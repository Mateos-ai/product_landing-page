
      (function () {
        try {
          var saved = localStorage.getItem("mateos-theme");
          var sys = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
          var resolved = saved === "light" || saved === "dark" ? saved : sys;
          document.documentElement.setAttribute("data-theme", resolved);
        } catch (e) {}
      })();
    