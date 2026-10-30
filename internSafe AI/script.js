document
  .querySelectorAll(".year")
  .forEach((el) => (el.textContent = new Date().getFullYear()));
const menuButton = document.getElementById("menuToggle"),
  nav = document.getElementById("nav");
if (menuButton && nav) {
  menuButton.addEventListener("click", () => {
    const open = nav.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.textContent = open ? "×" : "☰";
  });
  nav.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("open");
      menuButton.textContent = "☰";
      menuButton.setAttribute("aria-expanded", "false");
    }),
  );
}
const toast = document.getElementById("toast");
let toastTimer;
function notify(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3300);
}
const imageInput = document.getElementById("jobImage");
if (imageInput) {
  imageInput.addEventListener("change", () => {
    const f = imageInput.files[0];
    const label = document.getElementById("fileName");
    if (label) label.textContent = f ? f.name : "No file selected";
    if (f && !["image/png", "image/jpeg", "image/webp"].includes(f.type)) {
      imageInput.value = "";
      if (label) label.textContent = "No file selected";
      notify("Please choose a PNG, JPG, or WEBP image.");
    }
  });
}
document.querySelectorAll(".demo-form").forEach((form) =>
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const kind = form.dataset.kind;
    const result = form.parentElement.querySelector(".result-empty");
    if (kind === "contact") {
      notify("Demo only: connect a backend to send feedback.");
      return;
    }
    if (kind === "url") {
      const val = document.getElementById("jobUrl").value.trim();
      try {
        const u = new URL(val);
        if (!["http:", "https:"].includes(u.protocol)) throw Error();
      } catch {
        notify("Enter a valid URL starting with http:// or https://.");
        return;
      }
    }
    if (
      kind === "text" &&
      document.getElementById("jobText").value.trim().length < 20
    ) {
      notify("Please paste a little more text to continue.");
      return;
    }
    if (kind === "image" && !imageInput.files.length) {
      notify("Choose a screenshot first.");
      return;
    }
    const titles = {
      url: "Link ready for review",
      text: "Text ready for review",
      image: "Screenshot selected",
    };
    const copy = {
      url: "The URL was accepted by this demo. Domain reputation checks and the detection model are not connected.",
      text: "The text was accepted by this demo. NLP analysis and the detection model are not connected.",
      image:
        "The image was selected. OCR extraction is not connected in this prototype.",
    };
    if (result) {
      result.querySelector(".result-title").textContent = titles[kind];
      result.querySelector(".result-copy").textContent = copy[kind];
      result.querySelector(".result-note").textContent =
        "No fraud verdict or risk score was generated. Connect a validated backend before showing real results.";
      result.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    notify("Demo interface only — no real fraud detection was performed.");
  }),
);

const reducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;
if (!reducedMotion && "IntersectionObserver" in window) {
  const revealTargets = document.querySelectorAll(
    "main > section, .card, .step, .faq article, .checker-layout > *, .contact-grid > *, footer",
  );
  const textTargets = document.querySelectorAll(
    "main h1, main h2, main h3, main p, main .eyebrow, main .breadcrumbs, main li, footer p, footer small",
  );
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -30px 0px" },
  );

  revealTargets.forEach((element) => {
    const siblings = Array.from(element.parentElement.children);
    const staggerIndex = siblings.indexOf(element) % 4;
    element.style.setProperty("--reveal-delay", `${staggerIndex * 75}ms`);
    element.classList.add("reveal");
    revealObserver.observe(element);
  });

  textTargets.forEach((element) => {
    const siblings = Array.from(element.parentElement.children).filter((sibling) =>
      sibling.matches(
        "h1, h2, h3, p, .eyebrow, .breadcrumbs, li, small",
      ),
    );
    const staggerIndex = siblings.indexOf(element) % 4;
    element.style.setProperty("--reveal-delay", `${staggerIndex * 60}ms`);
    element.classList.add("text-reveal");
    revealObserver.observe(element);
  });
}
