// app.js
// Concerto — Featured Tours (Library + Dedicated Tour Pages via ?tour=ID)

const TOUR_FILES = [
  'iheartradio-jingle-ball-2025.json',
  'mariah-carey-christmastime-in-las-vegas-2025.json',
  'jonas20-greetings-from-your-hometown.json',
  'demi-lovato-its-not-that-deep-tour.json',
  'conan-gray-wishbone-world-tour-na.json',
  'lady-gaga-the-mayhem-ball-na-2026.json',
  'backstreet-boys-into-the-millenium-sphere-las-vegas.json',
  'ariana-grande-the-eternal-sunshine-tour-na-2026.json',
  'ed-sheeran-the-loop-tour-na-2026.json',
  'olivia-dean-the-art-of-loving-live-na-2026.json',
  'billie-eilish-2025-tour.json'
];

let allTours = [];
let selectedTour = null;

/* ---------- Loading ---------- */

async function fetchTour(fileName) {
  try {
    const res = await fetch(`./data/${fileName}`);
    if (!res.ok) {
      console.warn(`Failed to load tour file: ${fileName}`, res.status);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`Error loading tour file: ${fileName}`, err);
    return null;
  }
}

async function loadTours() {
  const results = await Promise.all(TOUR_FILES.map(fetchTour));
  const tours = results.filter(Boolean);

  tours.forEach((tour) => {
    if (Array.isArray(tour.shows)) {
      tour.shows.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
  });

  tours.sort((a, b) => getEarliestShowDate(a) - getEarliestShowDate(b));
  return tours;
}

function getEarliestShowDate(tour) {
  if (!tour.shows || tour.shows.length === 0) {
    return new Date(8640000000000000);
  }
  return new Date(tour.shows[0].date);
}

/* ---------- Helpers ---------- */

function slugify(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getTourSlug(tour) {
  return tour.tourId || slugify(tour.tourName || "tour");
}

function getTourImageSrc(tour) {
  const id = getTourSlug(tour);
  return `./images/tours/${id}.jpg`;
}

function formatShortDate(isoDateStr) {
  if (!isoDateStr) return "";
  const d = new Date(isoDateStr);
  if (Number.isNaN(d.getTime())) return isoDateStr;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ---------- UI: Tour Library ---------- */

function renderTourLibrary(tours) {
  const listEl = document.getElementById("toursBrowseList");
  if (!listEl) return;
  listEl.innerHTML = "";

  tours.forEach((tour) => {
    const item = document.createElement("div");
    item.className = "browse-item";
    const slug = getTourSlug(tour);
    item.dataset.tourSlug = slug;

    const name = document.createElement("div");
    name.className = "browse-item-name";
    name.textContent = tour.tourName || "Untitled Tour";

    const meta = document.createElement("div");
    meta.className = "browse-item-meta";
    const artist = tour.artist || "";
    const showCount = tour.shows ? tour.shows.length : 0;
    const year = tour.year || "";
    const bits = [];
    if (artist) bits.push(artist);
    if (showCount) bits.push(`${showCount} show${showCount > 1 ? "s" : ""}`);
    if (year) bits.push(year);
    meta.textContent = bits.join(" · ");

    item.appendChild(name);
    if (meta.textContent.trim()) item.appendChild(meta);

    item.addEventListener("click", () => {
      navigateToTour(tour);
    });

    listEl.appendChild(item);
  });
}

/* ---------- UI: Selected Tour (Detail Page Mode) ---------- */

function selectTour(tour, { hideLibrary = false } = {}) {
  selectedTour = tour;
  const panel = document.getElementById("infoPanel");
  const emptyState = panel.querySelector(".info-empty");
  const content = panel.querySelector(".info-content");
  const browseSection = document.querySelector(".browse-list");

  if (hideLibrary && browseSection) {
    browseSection.style.display = "none";
  } else if (browseSection) {
    browseSection.style.display = "";
  }

  if (emptyState) emptyState.style.display = "none";
  if (content) content.hidden = false;
  panel.classList.remove("info-panel--empty");

  // Header content
  const nameEl = document.getElementById("tourName");
  const artistEl = document.getElementById("tourArtist");
  const metaEl = document.getElementById("tourMeta");
  const imgEl = document.getElementById("tourImage");

  nameEl.textContent = tour.tourName || "Untitled Tour";
  artistEl.textContent = tour.artist || "";

  const showCount = tour.shows ? tour.shows.length : 0;
  const year = tour.year || "";
  const region = tour.region || tour.note || "";
  const bits = [];
  if (showCount) bits.push(`${showCount} show${showCount > 1 ? "s" : ""}`);
  if (year) bits.push(year);
  if (region) bits.push(region);
  metaEl.textContent = bits.join(" · ");

  if (imgEl) {
    const src = getTourImageSrc(tour);
    imgEl.src = src;
    imgEl.alt = `${tour.tourName || "Tour artwork"}`;
  }

  renderShowsList(tour);
}

function renderShowsList(tour) {
  const listEl = document.getElementById("showsList");
  if (!listEl) return;
  listEl.innerHTML = "";

  (tour.shows || []).forEach((show) => {
    const row = document.createElement("div");
    row.className = "show-row";

    const headerBtn = document.createElement("button");
    headerBtn.type = "button";
    headerBtn.className = "show-row-header";

    const venueSpan = document.createElement("span");
    venueSpan.className = "show-venue";
    venueSpan.textContent = show.venueName || "Venue";

    const citySpan = document.createElement("span");
    citySpan.className = "show-city";
    const cityBits = [];
    if (show.city) cityBits.push(show.city);
    if (show.state) cityBits.push(show.state);
    citySpan.textContent = cityBits.join(", ");

    const dateSpan = document.createElement("span");
    dateSpan.className = "show-date";
    dateSpan.textContent = formatShortDate(show.date);

    const chevron = document.createElement("span");
    chevron.className = "show-chevron";
    chevron.textContent = "▾";

    headerBtn.appendChild(venueSpan);
    if (citySpan.textContent.trim()) headerBtn.appendChild(citySpan);
    headerBtn.appendChild(dateSpan);
    headerBtn.appendChild(chevron);

    const dropdown = document.createElement("div");
    dropdown.className = "show-dropdown";

    const linksWrap = document.createElement("div");
    linksWrap.className = "show-links";

    const links = show.links || {};

    function addLink(label, url, isPrimary = false) {
      const a = document.createElement("a");
      a.textContent = label;
      a.className = "show-link-btn" + (isPrimary ? " primary" : "");
      if (url) {
        a.href = url;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      } else {
        a.href = "javascript:void(0)";
        a.style.opacity = "0.45";
        a.style.pointerEvents = "none";
      }
      linksWrap.appendChild(a);
    }

    // 🔥 FIX: use show.ticketUrl (with a fallback to links.ticketUrl just in case)
    addLink("Buy Tickets", show.ticketUrl || links.ticketUrl, true);
    addLink("City Guide", links.cityGuide);
    addLink("Rideshare", links.rideshare);
    addLink("Bag Policy", links.bagPolicy);
    addLink("Concessions", links.concessions);
    addLink("Parking", links.parking);

    dropdown.appendChild(linksWrap);

    headerBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      const isOpen = dropdown.classList.contains("open");
      document
        .querySelectorAll(".show-dropdown.open")
        .forEach((el) => el.classList.remove("open"));
      if (!isOpen) dropdown.classList.add("open");
    });

    row.appendChild(headerBtn);
    row.appendChild(dropdown);
    listEl.appendChild(row);
  });
}

/* ---------- URL Routing ---------- */

function navigateToTour(tour) {
  const slug = getTourSlug(tour);
  const url = new URL(window.location.href);
  url.searchParams.set("tour", slug);

  // Update address bar without full reload
  window.history.pushState({ tourSlug: slug }, "", url.toString());

  // Enter "tour page" mode (hide library)
  selectTour(tour, { hideLibrary: true });
}

function enterFromUrl() {
  const url = new URL(window.location.href);
  const slug = url.searchParams.get("tour");
  if (!slug) return null;

  const match = allTours.find((t) => getTourSlug(t) === slug);
  if (!match) return null;

  // Direct link to this tour: hide library so it feels like its own page
  selectTour(match, { hideLibrary: true });
  return match;
}

/* ---------- Search ---------- */

function setupSearch() {
  const input = document.getElementById("tourSearch");
  const resultsEl = document.getElementById("searchResults");
  if (!input || !resultsEl) return;

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    resultsEl.innerHTML = "";
    if (!q) {
      resultsEl.classList.remove("visible");
      return;
    }

    const matches = allTours.filter((tour) => {
      const name = (tour.tourName || "").toLowerCase();
      const artist = (tour.artist || "").toLowerCase();
      return name.includes(q) || artist.includes(q);
    });

    if (!matches.length) {
      resultsEl.classList.remove("visible");
      return;
    }

    matches.forEach((tour) => {
      const item = document.createElement("div");
      item.className = "search-result-item";
      item.textContent = tour.tourName || "Untitled Tour";
      item.addEventListener("click", () => {
        input.value = tour.tourName || "";
        resultsEl.classList.remove("visible");
        navigateToTour(tour);
      });
      resultsEl.appendChild(item);
    });

    resultsEl.classList.add("visible");
  });

  document.addEventListener("click", (event) => {
    if (!resultsEl.contains(event.target) && event.target !== input) {
      resultsEl.classList.remove("visible");
    }
  });
}

/* ---------- Init ---------- */

async function initFeaturedTours() {
  allTours = await loadTours();

  renderTourLibrary(allTours);
  setupSearch();

  // If URL has ?tour=..., go straight into that tour's page mode
  const fromUrl = enterFromUrl();

  // If no tour in URL, we stay in library mode (empty state + browse list)
  if (!fromUrl && allTours.length === 1) {
    // Optional: auto-open if only one tour exists
    // navigateToTour(allTours[0]);
  }

  // Handle back/forward navigation
  window.addEventListener("popstate", () => {
    const url = new URL(window.location.href);
    const slug = url.searchParams.get("tour");
    const browseSection = document.querySelector(".browse-list");
    const panel = document.getElementById("infoPanel");
    const emptyState = panel.querySelector(".info-empty");
    const content = panel.querySelector(".info-content");

    if (!slug) {
      // Back to library view
      if (browseSection) browseSection.style.display = "";
      if (content) content.hidden = true;
      if (emptyState) {
        emptyState.style.display = "block";
        panel.classList.add("info-panel--empty");
      }
      return;
    }

    const match = allTours.find((t) => getTourSlug(t) === slug);
    if (match) {
      selectTour(match, { hideLibrary: true });
    }
  });
}

window.addEventListener("DOMContentLoaded", initFeaturedTours);
