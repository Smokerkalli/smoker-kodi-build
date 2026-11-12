(() => {
  "use strict";

  const base = "kodi-repository/";
  const controls = document.getElementById("controls");
  const grid = document.getElementById("cards");
  const result = document.getElementById("result");
  const message = document.getElementById("catalog-message");
  const search = document.getElementById("search");
  const labels = {video: "Video", tools: "Werkzeug", skin: "Skin"};
  const featured = ["plugin.video.smoker.stalker.test", "plugin.video.smoker.xstalker", "skin.smoker.neon.ultra"];
  const text = (node) => (node?.textContent ?? "").trim();
  const clean = (value) => value.replace(/\[(?:\/?(?:COLOR|B|I)(?:\s+[^\]]*)?)\]/gi, "").trim();
  let catalog = [];
  let category = "all";

  function element(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value) node.textContent = value;
    return node;
  }

  function parse(addon) {
    const id = addon.getAttribute("id") ?? "";
    const version = addon.getAttribute("version") ?? "";
    if (!/^[\w.-]+$/.test(id) || !/^[\w.+-]+$/.test(version) || id === "repository.smoker") return null;
    const extensions = Array.from(addon.getElementsByTagName("extension"));
    const has = (point) => extensions.find((extension) => extension.getAttribute("point") === point);
    const meta = has("xbmc.addon.metadata");
    const kind = has("xbmc.gui.skin") ? "skin" : text(has("xbmc.python.pluginsource")?.querySelector("provides")).split(/\s+/).includes("video") ? "video" : "tools";
    const icon = text(meta?.querySelector("assets > icon")) || text(meta?.querySelector("icon"));
    const safeIcon = icon && icon.split("/").every((part) => /^[\w.-]+$/.test(part) && part !== "." && part !== "..");
    const summary = text(meta?.querySelector('summary[lang^="de"]') ?? meta?.querySelector("summary"));
    return {id, version, name: clean(addon.getAttribute("name") ?? id), kind, summary: clean(summary), icon: safeIcon ? base + id + "/" + icon : ""};
  }

  function card(addon) {
    const article = element("article", "card");
    const head = element("div", "card-head");
    const badge = element("div", "addon-icon", addon.name.trim().slice(0, 1).toUpperCase());
    badge.setAttribute("aria-hidden", "true");
    if (addon.icon) {
      const img = element("img");
      img.alt = "";
      img.loading = "lazy";
      img.addEventListener("error", () => img.remove(), {once: true});
      img.src = addon.icon;
      badge.append(img);
    }
    const info = element("div", "card-title");
    info.append(element("div", "category", labels[addon.kind]), element("h3", "", addon.name));
    head.append(badge, info);
    const bottom = element("div", "card-bottom");
    const download = element("a", "download", "ZIP herunterladen ↓");
    download.href = base + addon.id + "/" + addon.id + "-" + addon.version + ".zip";
    download.download = "";
    download.setAttribute("aria-label", addon.name + " als ZIP herunterladen");
    bottom.append(element("span", "version", "v" + addon.version), download);
    article.append(head, element("p", "description", addon.summary || labels[addon.kind] + " für Kodi."), bottom);
    return article;
  }

  function render() {
    const query = search.value.trim().toLocaleLowerCase("de");
    const matches = catalog.filter((addon) => (category === "all" || addon.kind === category) &&
      [addon.name, addon.id, addon.summary].join(" ").toLocaleLowerCase("de").includes(query));
    grid.replaceChildren(...matches.map(card));
    result.textContent = matches.length + (matches.length === 1 ? " Add-on" : " Add-ons");
    message.hidden = matches.length !== 0;
    message.textContent = "Keine passenden Add-ons. Probiere einen anderen Suchbegriff oder Filter.";
  }

  async function load() {
    try {
      const response = await fetch(base + "addons.xml");
      if (!response.ok) throw new Error("Katalog nicht erreichbar");
      const xml = new DOMParser().parseFromString(await response.text(), "application/xml");
      if (xml.querySelector("parsererror") || xml.documentElement.localName !== "addons") throw new Error("Ungültiger Katalog");
      const rank = (id) => featured.includes(id) ? featured.indexOf(id) : featured.length;
      catalog = Array.from(xml.querySelectorAll("addons > addon")).map(parse).filter(Boolean)
        .sort((a, b) => rank(a.id) - rank(b.id) || a.name.localeCompare(b.name, "de"));
      if (!catalog.length) throw new Error("Leerer Katalog");
      controls.hidden = false;
      render();
    } catch {
      const link = element("a", "", "Dateiliste öffnen");
      link.href = base;
      message.replaceChildren("Der Katalog konnte gerade nicht geladen werden. ", link);
    }
  }

  controls.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    category = button.dataset.category;
    controls.querySelectorAll("[data-category]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    render();
  });
  search.addEventListener("input", render);

  const copy = document.getElementById("copy-url");
  if (navigator.clipboard?.writeText) {
    copy.hidden = false;
    copy.addEventListener("click", async () => {
      const status = document.getElementById("copy-status");
      try {
        await navigator.clipboard.writeText(text(document.getElementById("source-url")));
        copy.textContent = "Kopiert";
        status.textContent = "Kodi-Adresse kopiert.";
      } catch {
        copy.textContent = "Bitte manuell kopieren";
        status.textContent = "Kopieren nicht verfügbar.";
      }
    });
  }
  load();
})();
