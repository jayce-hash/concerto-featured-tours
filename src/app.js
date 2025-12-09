const TOURS_CONTAINER = document.getElementById("tours");

// Base URLs for Concerto microfeatures
const CITY_GUIDE_BASE = "https://concerto-venue-map.netlify.app/?venue=";
const BAG_POLICY_BASE = "https://concerto-microfeatures.netlify.app/bag-policy/?venue=";
const CONCESSIONS_BASE = "https://concerto-microfeatures.netlify.app/concessions/?venue=";
const PARKING_BASE = "https://concerto-microfeatures.netlify.app/parking/?venue=";
const RIDESHARE_BASE = "https://concerto-microfeatures.netlify.app/rideshare/?venue=";

/**
 * Create a tour card
 */
function createTourCard(tour) {
  const card = document.createElement("article");
  card.className = "tour-card";

  // Header
  const header = document.createElement("div");
  header.className = "tour-header";

  const title = document.createElement("h2");
  title.className = "tour-name";
  title.textContent = tour.tourName || tour.artist;

  const meta = document.createElement("div");
  meta.className = "tour-meta";
  meta.textContent = tour.note || tour.artist;

  header.appendChild(title);
  header.appendChild(meta);

  // Pills container
  const pillsContainer = document.createElement("div");
  pillsContainer.className = "tour-pills";

  tour.shows.forEach(show => {
    const pill = createDatePill(show);
    pillsContainer.appendChild(pill);
  });

  card.appendChild(header);
  card.appendChild(pillsContainer);

  return card;
}

/**
 * Create a date pill with dropdown
 */
function createDatePill(show) {
  const pill = document.createElement("div");
  pill.className = "date-pill";

  // Header row inside pill
  const header = document.createElement("div");
  header.className = "date-pill-header";

  const venueEl = document.createElement("div");
  venueEl.className = "date-pill-venue";
  venueEl.textContent = show.venueName;

  const dateEl = document.createElement("div");
  dateEl.className = "date-pill-date";
  dateEl.textContent = show.displayDate;

  const chevron = document.createElement("div");
  chevron.className = "date-pill-chevron";
  chevron.textContent = "▼";

  header.appendChild(venueEl);
  header.appendChild(dateEl);
  header.appendChild(chevron);

  // Dropdown
  const dropdown = document.createElement("div");
  dropdown.className = "pill-dropdown";

  const linksGrid = document.createElement("div");
  linksGrid.className = "pill-links";

  const slug = show.slug;

  const links = [
    {
      label: "Buy Tickets",
      href: show.ticketUrl,
      primary: true
    },
    {
      label: "City Guide",
      href: CITY_GUIDE_BASE + encodeURIComponent(slug)
    },
    {
      label: "Rideshare",
      href: RIDESHARE_BASE + encodeURIComponent(slug)
    },
    {
      label: "Bag Policy",
      href: BAG_POLICY_BASE + encodeURIComponent(slug)
    },
    {
      label: "Concessions",
      href: CONCESSIONS_BASE + encodeURIComponent(slug)
    },
    {
      label: "Parking",
      href: PARKING_BASE + encodeURIComponent(slug)
    }
  ];

  links.forEach(link => {
    const a = document.createElement("a");
    a.className = "pill-link-btn" + (link.primary ? " primary" : "");
    a.href = link.href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = link.label;
    linksGrid.appendChild(a);
  });

  dropdown.appendChild(linksGrid);

  // Toggle behavior
  pill.addEventListener("click", () => {
    const isOpen = dropdown.classList.contains("open");
    // Close all other dropdowns first
    document.querySelectorAll(".pill-dropdown.open").forEach(el => {
      el.classList.remove("open");
      const parentPill = el.closest(".date-pill");
      if (parentPill) {
        const chev = parentPill.querySelector(".date-pill-chevron");
        if (chev) chev.textContent = "▼";
      }
    });

    if (!isOpen) {
      dropdown.classList.add("open");
      chevron.textContent = "▲";
    } else {
      dropdown.classList.remove("open");
      chevron.textContent = "▼";
    }
  });

  pill.appendChild(header);
  pill.appendChild(dropdown);

  return pill;
}

/**
 * Render all tours on page load
 */
function renderTours() {
  if (!Array.isArray(tours) || tours.length === 0) {
    TOURS_CONTAINER.innerHTML = "<p>No featured tours yet.</p>";
    return;
  }

  tours.forEach(tour => {
    const card = createTourCard(tour);
    TOURS_CONTAINER.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", renderTours);
