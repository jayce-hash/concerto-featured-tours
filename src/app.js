// src/app.js
// Concerto · Featured Tours
// Loads tour JSON files and renders tour cards + per-date dropdown pills.

const TOUR_FILES = [
  "jonas20-greetings-from-your-hometown.json",
  "iheartradio-jingle-ball-2025.json",
  "mariah-carey-christmastime-in-las-vegas.json",
  "demi-lovato-its-not-that-deep-tour.json",
  "conan-gray-wishbone-world-tour-na.json",
  "lady-gaga-the-mayhem-ball-na-2026.json"
];

/**
 * Fetch a single tour JSON file.
 */
async function fetchTour(fileName) {
  try {
    const res = await fetch(`./data/${fileName}`);
    if (!res.ok) {
      console.warn(`Failed to load tour file: ${fileName}`, res.status);
      return null;
    }
    const tour = await res.json();
    return tour;
  } catch (err) {
    console.error(`Error loading tour file: ${fileName}`, err);
    return null;
  }
}

/**
 * Load all tours from TOUR_FILES.
 */
async function loadTours() {
  const results = await Promise.all(TOUR_FILES.map(fetchTour));
  const tours = results.filter(Boolean);

  // Sort shows inside each tour by date ascending
  tours.forEach((tour) => {
    if (Array.isArray(tour.shows)) {
      tour.shows.sort((a, b) => {
        const da = new Date(a.date);
        const db = new Date(b.date);
        return da - db;
      });
    }
  });

  // Sort tours by earliest show date
  tours.sort((a, b) => {
    const earliestA = getEarliestShowDate(a);
    const earliestB = getEarliestShowDate(b);
    return earliestA - earliestB;
  });

  return tours;
}

/**
 * Get earliest show date for a tour (for sorting).
 */
function getEarliestShowDate(tour) {
  if (!tour.shows || tour.shows.length === 0) {
    return new Date(8640000000000000); // max date
  }
  return new Date(tour.shows[0].date);
}

/**
 * Derive a fallback tour image path from tourId or tourName.
 * Images should live at: public/images/tours/<tourId>.jpg
 */
function getTourImageSrc(tour) {
  let id = tour.tourId;

  if (!id) {
    // Fallback if tourId is missing: kebab-case of tourName
    const base = tour.tourName || "tour";
    id = base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  return `./images/tours/${id}.jpg`;
}

/**
 * Format a date (YYYY-MM-DD) into "Dec 9" style.
 */
function formatShortDate(isoDateStr) {
  if (!isoDateStr) return "";
  const d = new Date(isoDateStr);
  if (Number.isNaN(d.getTime())) return isoDateStr;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric"
  });
}

/**
 * Create the DOM for a single tour card.
 */
function createTourCard(tour) {
  const card = document.createElement("article");
  card.className = "tour-card";

  // ==== MEDIA (image) ====
  const media = document.createElement("div");
  media.className = "tour-media";

  const imageWrapper = document.createElement("div");
  imageWrapper.className = "tour-image-wrapper";

  const img = document.createElement("img");
  img.className = "tour-image";
  img.src = getTourImageSrc(tour);
  img.alt = `${tour.tourName || "Tour artwork"}`;

  imageWrapper.appendChild(img);
  media.appendChild(imageWrapper);

  // ==== BODY ====
  const body = document.createElement("div");
  body.className = "tour-body";

  const header = document.createElement("header");
  header.className = "tour-header";

  const title = document.createElement("h2");
  title.className = "tour-name";
  title.textContent = tour.tourName || "Untitled Tour";

  const artist = document.createElement("p");
  artist.className = "tour-artist";
  artist.textContent = tour.artist || "";

  const meta = document.createElement("p");
  meta.className = "tour-meta";
  const showCount = tour.shows ? tour.shows.length : 0;
  const yearLabel = tour.year || "";
  const regionLabel = tour.region || tour.note || "";
  const parts = [];
  if (showCount) parts.push(`${showCount} show${showCount > 1 ? "s" : ""}`);
  if (yearLabel) parts.push(String(yearLabel));
  if (regionLabel) parts.push(regionLabel);
  meta.textContent = parts.join(" · ");

  header.appendChild(title);
  if (artist.textContent.trim()) header.appendChild(artist);
  if (meta.textContent.trim()) header.appendChild(meta);

  // Optionally, you could add a "cities summary" line
  const cities = (tour.shows || [])
    .map((s) => s.city)
    .filter(Boolean);
  const uniqueCities = Array.from(new Set(cities));
  const datesSummary = document.createElement("div");
  datesSummary.className = "tour-dates-summary";
  if (uniqueCities.length) {
    const list =
      uniqueCities.length <= 4
        ? uniqueCities.join(" · ")
        : `${uniqueCities.slice(0, 3).join(" · ")} · +${
            uniqueCities.length - 3
          } more`;
    datesSummary.textContent = list;
  }

  // ==== Pills ====
  const pillRow = document.createElement("div");
  pillRow.className = "tour-pill-row";

  (tour.shows || []).forEach((show) => {
    const pill = createDatePill(show);
    pillRow.appendChild(pill);
  });

  body.appendChild(header);
  if (datesSummary.textContent.trim()) body.appendChild(datesSummary);
  body.appendChild(pillRow);

  card.appendChild(media);
  card.appendChild(body);

  return card;
}

/**
 * Create a date pill with dropdown links for a single show.
 */
function createDatePill(show) {
  const pill = document.createElement("button");
  pill.type = "button";
  pill.className = "date-pill";

  const header = document.createElement("div");
  header.className = "date-pill-header";

  const venueSpan = document.createElement("span");
  venueSpan.className = "date-pill-venue";
  venueSpan.textContent = show.venueName || "Venue";

  const dateSpan = document.createElement("span");
  dateSpan.className = "date-pill-date";
  dateSpan.textContent = formatShortDate(show.date);

  const chevron = document.createElement("span");
  chevron.className = "date-pill-chevron";
  chevron.textContent = "▾";

  header.appendChild(venueSpan);
  header.appendChild(dateSpan);
  header.appendChild(chevron);

  // Dropdown container
  const dropdown = document.createElement("div");
  dropdown.className = "pill-dropdown";

  const linksGrid = document.createElement("div");
  linksGrid.className = "pill-links";

  const links = show.links || {};

  // Helper to create each button link
  function addLink(label, url, isPrimary = false) {
    const a = document.createElement("a");
    a.textContent = label;
    a.className = "pill-link-btn" + (isPrimary ? " primary" : "");
    if (url) {
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
    } else {
      // If URL is missing, visually de-emphasize and disable
      a.href = "javascript:void(0)";
      a.style.opacity = "0.45";
      a.style.pointerEvents = "none";
    }
    linksGrid.appendChild(a);
  }

  addLink("Buy Tickets", links.ticketUrl, true);
  addLink("City Guide", links.cityGuide);
  addLink("Rideshare", links.rideshare);
  addLink("Bag Policy", links.bagPolicy);
  addLink("Concessions", links.concessions);
  addLink("Parking", links.parking);

  dropdown.appendChild(linksGrid);
  pill.appendChild(header);
  pill.appendChild(dropdown);

  // Toggle dropdown open/closed
  pill.addEventListener("click", (event) => {
    event.stopPropagation();

    const isOpen = dropdown.classList.contains("open");

    // Close any other open dropdowns in the document
    document
      .querySelectorAll(".pill-dropdown.open")
      .forEach((el) => el.classList.remove("open"));

    if (!isOpen) {
      dropdown.classList.add("open");
    }
  });

  return pill;
}

/**
 * Close dropdowns when clicking outside any pill.
 */
function setupGlobalClickToClose() {
  document.addEventListener("click", () => {
    document
      .querySelectorAll(".pill-dropdown.open")
      .forEach((el) => el.classList.remove("open"));
  });
}

/**
 * Main init.
 */
async function initFeaturedTours() {
  const root = document.getElementById("toursRoot");
  if (!root) {
    console.error("#toursRoot not found");
    return;
  }

  const tours = await loadTours();

  if (!tours.length) {
    const msg = document.createElement("p");
    msg.textContent = "No tours available at the moment.";
    msg.style.fontSize = "0.9rem";
    msg.style.color = "var(--muted)";
    root.appendChild(msg);
    return;
  }

  tours.forEach((tour) => {
    const card = createTourCard(tour);
    root.appendChild(card);
  });

  setupGlobalClickToClose();
}

window.addEventListener("DOMContentLoaded", initFeaturedTours);
