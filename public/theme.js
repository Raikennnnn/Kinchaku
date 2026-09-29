// Applies the saved light/dark choice before the page paints, so it never
// flashes the wrong theme. A file rather than an inline script, so the
// Content-Security-Policy (vercel.json) can refuse every inline script.
try {
  var t = localStorage.getItem("kinchaku:theme");
  if (t === "light" || t === "dark") {
    document.documentElement.setAttribute("data-theme", t);
    document.querySelectorAll('meta[name="theme-color"]').forEach(function (m) {
      m.content = t === "dark" ? "#0e1014" : "#f4f4f1";
    });
  }
} catch (e) {}
