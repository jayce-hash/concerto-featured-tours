// app.js
// Concerto — Featured Tours (Library + Dedicated Tour Pages via ?tour=ID)

const TOUR_FILES = [
  'backstreet-boys-into-the-millenium-sphere-las-vegas.json',
  'halsey-back-to-the-badlands-tour.json',
  'hilary-duff-small-rooms-big-nerves-tour.json',
  'jessie-j-no-secrets-tour.json',
  'lady-gaga-the-mayhem-ball-na-2026.json',
  'conan-gray-wishbone-world-tour-na.json',
  'alex-warren-little-orphan-alex-live.json',
  'ariana-grande-the-eternal-sunshine-tour-na-2026.json',
  'ed-sheeran-the-loop-tour-na-2026.json',
  'fifa-world-cup-2026.json',
  'olivia-dean-the-art-of-loving-tour.json',
  'demi-lovato-its-not-that-deep-tour.json',
  'bruno-mars-ticketmaster.json'
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

    const tour = await res.json();

    // ✅ Auto-populate Ticketmaster tours that have an attractionId
    if (
      tour &&
      String(tour.source || "").toLowerCase() === "ticketmaster" &&
      tour.ticketmaster &&
      tour.ticketmaster.attractionId
    ) {
      const attractionId = tour.ticketmaster.attractionId;

      const tmRes = await fetch(`/.netlify/functions/tm-events?attractionId=${encodeURIComponent(attractionId)}`);
      if (tmRes.ok) {
        const tmJson = await tmRes.json();
        const events = tmJson.events || [];

        // Map Ticketmaster events -> your show format
        tour.shows = events
          .map((ev) => {
            const venue = ev?._embedded?.venues?.[0];
            const dt = ev?.dates?.start?.localDate; // "YYYY-MM-DD"
            if (!dt || !venue) return null;

            const city = venue?.city?.name || "";
            const region = venue?.state?.stateCode || ""; // US
            const country = venue?.country?.countryCode || "";
            const venueName = venue?.name || "Venue";

            const venueSlug = (venue?.id)
              ? `tm-${venue.id}` // most reliable unique key
              : slugify(venueName);

            return {
              id: `${dt}-${slugify(city)}-${slugify(venueName)}`,
              date: dt,
              city,
              region,
              country,
              venueName,
              venueSlug,
              ticketUrl: ev?.url || tour.ticketUrl || "",
              links: {
                cityGuide: `https://concerto-venue-map.netlify.app/?venue=${venueSlug}`,
                bagPolicy: `https://concerto-microfeatures.netlify.app/bag-policy/?venue=${venueSlug}`,
                concessions: `https://concerto-microfeatures.netlify.app/concessions/?venue=${venueSlug}`,
                parking: `https://concerto-microfeatures.netlify.app/parking/?venue=${venueSlug}`,
                rideshare: `https://concerto-microfeatures.netlify.app/rideshare/?venue=${venueSlug}`
              }
            };
          })
          .filter(Boolean);

      } else {
        console.warn("Ticketmaster function failed:", tmRes.status);
      }
    }

    return tour;
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
      tour.shows.sort((a, b) => parseLocalYMD(a.date) - parseLocalYMD(b.date));
    }
  });

  tours.sort((a, b) => getEarliestShowDate(a) - getEarliestShowDate(b));
  return tours;
}

function getEarliestShowDate(tour) {
  if (!tour.shows || tour.shows.length === 0) {
    return new Date(8640000000000000);
  }
  return parseLocalYMD(tour.shows[0].date);
}

/* ---------- Helpers ---------- */

function parseLocalYMD(isoDateStr) {
  const m = String(isoDateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return new Date(isoDateStr);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

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

  const m = String(isoDateStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!m) {
    const dFallback = new Date(isoDateStr);
    if (Number.isNaN(dFallback.getTime())) return isoDateStr;
    return dFallback.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  const year = Number(m[1]);
  const monthIndex = Number(m[2]) - 1;
  const day = Number(m[3]);

  const d = new Date(year, monthIndex, day);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function buildVenueLinks(venueSlug) {
  if (!venueSlug) return {};
  return {
    cityGuide: `https://concerto-venue-map.netlify.app/?venue=${venueSlug}`,
    bagPolicy: `https://concerto-microfeatures.netlify.app/bag-policy/?venue=${venueSlug}`,
    concessions: `https://concerto-microfeatures.netlify.app/concessions/?venue=${venueSlug}`,
    parking: `https://concerto-microfeatures.netlify.app/parking/?venue=${venueSlug}`,
    rideshare: `https://concerto-microfeatures.netlify.app/rideshare/?venue=${venueSlug}`
  };
}

function resolveConcertoVenueSlug(tour, { venueId, venueName }) {
  const overrides = tour?.ticketmaster?.venueSlugOverrides || {};
  if (venueId && overrides[venueId]) return overrides[venueId];
  if (venueName && overrides[venueName]) return overrides[venueName];
  if (venueName) return slugify(venueName);
  return "";
}

/* ---------- Ticketmaster Hydration (requires Netlify function proxy) ---------- */

async function hydrateTourFromTicketmaster(tour) {
  const attractionId = tour.ticketmaster.attractionId;

  // This expects you to have: /.netlify/functions/tm-events?attractionId=XXXX
  const url = `/.netlify/functions/tm-events?attractionId=${encodeURIComponent(attractionId)}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Ticketmaster proxy failed for ${tour.tourName}:`, res.status);
      tour.shows = tour.shows || [];
      return;
    }

    const data = await res.json();
    const events = data?._embedded?.events || [];

    const shows = events
      .map((ev) => {
        const localDate = ev?.dates?.start?.localDate;
        const venue = ev?._embedded?.venues?.[0];
        const venueName = venue?.name || "";
        const city = venue?.city?.name || "";
        const region = venue?.state?.stateCode || venue?.state?.name || "";
        const country = venue?.country?.countryCode || "";

        const venueId = venue?.id || "";
        const venueSlug = resolveConcertoVenueSlug(tour, { venueId, venueName });
        const ticketUrl = ev?.url || "";

        return {
          date: localDate,
          city,
          region,
          country,
          venueName,
          venueSlug,
          ticketUrl,
          links: buildVenueLinks(venueSlug)
        };
      })
      .filter((s) => s.date && s.venueName);

    shows.sort((a, b) => parseLocalYMD(a.date) - parseLocalYMD(b.date));
    tour.shows = shows;

    if (!tour.year && shows[0]?.date) {
      tour.year = Number(String(shows[0].date).slice(0, 4)) || tour.year;
    }
  } catch (err) {
    console.error("Ticketmaster hydration error:", err);
    tour.shows = tour.shows || [];
  }
}

/* ---------- Back Button (Tour -> Library) ---------- */

function goBackToLibrary() {
  document.querySelectorAll(".show-dropdown.open").forEach((el) => el.classList.remove("open"));

  const url = new URL(window.location.href);
  url.searchParams.delete("tour");
  window.history.pushState({}, "", url.toString());

  const browseSection = document.querySelector(".browse-list");
  const panel = document.getElementById("infoPanel");
  const emptyState = panel?.querySelector(".info-empty");
  const content = panel?.querySelector(".info-content");

  if (browseSection) browseSection.style.display = "";
  if (content) content.hidden = true;
  if (emptyState) emptyState.style.display = "block";
  panel?.classList.add("info-panel--empty");

  selectedTour = null;
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

  const backBtn = document.getElementById("backToLibrary");
  if (backBtn && !backBtn.dataset.bound) {
    backBtn.addEventListener("click", goBackToLibrary);
    backBtn.dataset.bound = "1";
  }

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

  const isFifa = getTourSlug(tour) === "fifa-world-cup-2026" || tour.tourId === "fifa-world-cup-2026";

  (tour.shows || []).forEach((show) => {
    const row = document.createElement("div");
    row.className = "show-row";

    const headerBtn = document.createElement("button");
    headerBtn.type = "button";
    headerBtn.className = "show-row-header";

    const venueSpan = document.createElement("span");
    venueSpan.className = "show-venue";

    venueSpan.textContent = isFifa
      ? (show.matchup || show.match || show.title || "Match")
      : (show.venueName || "Venue");

    const citySpan = document.createElement("span");
    citySpan.className = "show-city";

    if (isFifa) {
      citySpan.textContent = show.city || "";
    } else {
      const cityBits = [];
      if (show.city) cityBits.push(show.city);
      // ✅ FIX: most of your JSON uses "region", not "state"
      if (show.region) cityBits.push(show.region);
      citySpan.textContent = cityBits.join(", ");
    }

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
      document.querySelectorAll(".show-dropdown.open").forEach((el) => el.classList.remove("open"));
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

  window.history.pushState({ tourSlug: slug }, "", url.toString());
  selectTour(tour, { hideLibrary: true });
}

function enterFromUrl() {
  const url = new URL(window.location.href);
  const slug = url.searchParams.get("tour");
  if (!slug) return null;

  const match = allTours.find((t) => getTourSlug(t) === slug);
  if (!match) return null;

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

  const backBtn = document.getElementById("backToLibrary");
  if (backBtn && !backBtn.dataset.bound) {
    backBtn.addEventListener("click", goBackToLibrary);
    backBtn.dataset.bound = "1";
  }

  enterFromUrl();

  window.addEventListener("popstate", () => {
    const url = new URL(window.location.href);
    const slug = url.searchParams.get("tour");
    const browseSection = document.querySelector(".browse-list");
    const panel = document.getElementById("infoPanel");
    const emptyState = panel.querySelector(".info-empty");
    const content = panel.querySelector(".info-content");

    if (!slug) {
      if (browseSection) browseSection.style.display = "";
      if (content) content.hidden = true;
      if (emptyState) {
        emptyState.style.display = "block";
        panel.classList.add("info-panel--empty");
      }
      selectedTour = null;
      return;
    }

    const match = allTours.find((t) => getTourSlug(t) === slug);
    if (match) {
      selectTour(match, { hideLibrary: true });
    }
  });
}

window.addEventListener("DOMContentLoaded", initFeaturedTours);
