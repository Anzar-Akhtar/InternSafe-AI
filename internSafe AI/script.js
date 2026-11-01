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

const accountsKey = "internsafe-demo-accounts";
const signedInKey = "internsafe-demo-user";
const pageName = location.pathname.split("/").pop() || "index.html";
const protectedPages = new Set([
  "check-job.html",
  "url-check.html",
  "text-check.html",
  "screenshot-check.html",
  "dashboard.html",
]);
const historyKey = (userId) => `internsafe-demo-history-${userId}`;
const bytesToHex = (bytes) =>
  Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");

function readAccounts() {
  const accounts = JSON.parse(localStorage.getItem(accountsKey) || "[]");
  if (!Array.isArray(accounts)) {
    throw new Error("Saved account data is invalid. Clear this site's browser data and try again.");
  }
  return accounts;
}

function readHistory(userId) {
  const history = JSON.parse(localStorage.getItem(historyKey(userId)) || "[]");
  if (!Array.isArray(history)) {
    throw new Error("Saved job history is invalid. Clear this site's browser data and try again.");
  }
  return history;
}

async function hashPassword(password, salt) {
  if (!crypto?.subtle) {
    throw new Error("Account sign-in needs a secure browser context. Open this site using localhost or HTTPS.");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const digest = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: 120000, hash: "SHA-256" },
    key,
    256,
  );
  return bytesToHex(digest);
}

let activeAccount = null;
try {
  const userId = localStorage.getItem(signedInKey);
  activeAccount = userId ? readAccounts().find((account) => account.id === userId) || null : null;
} catch (error) {
  console.error(error);
  notify(error.message);
}

if (document.body.dataset.authRequired === "true" && !activeAccount) {
  document.body.hidden = true;
  const next = protectedPages.has(pageName) ? pageName : "check-job.html";
  location.replace(`sign-in.html?next=${encodeURIComponent(next)}`);
}

function updateAccountMenus() {
  document.querySelectorAll("[data-account-menu]").forEach((menu) => {
    const avatar = menu.querySelector(".account-avatar");
    const initials = menu.querySelector(".account-initials");
    const icon = menu.querySelector(".account-avatar-icon");
    const name = activeAccount?.name || "";
    if (activeAccount) {
      icon.hidden = true;
      initials.hidden = false;
      initials.textContent = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
      avatar.setAttribute("aria-label", `Account menu for ${name}`);
    } else {
      icon.hidden = false;
      initials.hidden = true;
      avatar.setAttribute("aria-label", "Open account menu");
    }

    const count = activeAccount ? readHistory(activeAccount.id).length : 0;
    menu.querySelector("[data-account-count]").textContent = count;
    menu.querySelector("[data-account-name]").textContent = activeAccount?.name || "Your account";
    menu.querySelectorAll("[data-account-signed-in]").forEach((element) => {
      element.hidden = !activeAccount;
    });
    menu.querySelectorAll("[data-account-signed-out]").forEach((element) => {
      element.hidden = Boolean(activeAccount);
    });
  });
}

try {
  updateAccountMenus();
} catch (error) {
  console.error(error);
  notify(error.message);
}

document.querySelectorAll("[data-account-logout]").forEach((button) => {
  button.addEventListener("click", () => {
    localStorage.removeItem(signedInKey);
    location.href = "index.html";
  });
});

document.addEventListener("click", (event) => {
  document.querySelectorAll("[data-account-menu][open]").forEach((menu) => {
    if (!menu.contains(event.target)) menu.open = false;
  });
});

document.querySelectorAll(".auth-form").forEach((form) => {
  const passwordInput = form.querySelector("#password");
  const confirmInput = form.querySelector("#confirmPassword");
  if (confirmInput) {
    const validateMatch = () => {
      confirmInput.setCustomValidity(
        confirmInput.value && confirmInput.value !== passwordInput.value
          ? "Passwords do not match."
          : "",
      );
    };
    passwordInput.addEventListener("input", validateMatch);
    confirmInput.addEventListener("input", validateMatch);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    submit.disabled = true;
    try {
      const email = form.querySelector("#email").value.trim().toLowerCase();
      const accounts = readAccounts();

      if (form.dataset.kind === "sign-up") {
        const name = form.querySelector("#name").value.trim();
        if (accounts.some((account) => account.email === email)) {
          notify("An account already exists for this email. Please sign in.");
          return;
        }
        const salt = crypto.getRandomValues(new Uint8Array(16));
        const account = {
          id: bytesToHex(crypto.getRandomValues(new Uint8Array(16))),
          name,
          email,
          salt: bytesToHex(salt),
          passwordHash: await hashPassword(passwordInput.value, salt),
        };
        accounts.push(account);
        localStorage.setItem(accountsKey, JSON.stringify(accounts));
        activeAccount = account;
      } else {
        const account = accounts.find((item) => item.email === email);
        if (!account) {
          notify("Email or password is incorrect.");
          return;
        }
        const salt = Uint8Array.from(
          account.salt.match(/.{2}/g),
          (byte) => Number.parseInt(byte, 16),
        );
        if ((await hashPassword(passwordInput.value, salt)) !== account.passwordHash) {
          notify("Email or password is incorrect.");
          return;
        }
        activeAccount = account;
      }

      localStorage.setItem(signedInKey, activeAccount.id);
      const next = new URLSearchParams(location.search).get("next");
      location.href = protectedPages.has(next) ? next : "dashboard.html";
    } catch (error) {
      console.error(error);
      notify(error.message || "Unable to save your account in this browser.");
    } finally {
      submit.disabled = false;
    }
  });
});

function renderDashboard() {
  if (!activeAccount || !document.getElementById("historyList")) return;
  document.getElementById("dashboardName").textContent = activeAccount.name;
  document.getElementById("dashboardEmail").textContent = activeAccount.email;
  const checks = readHistory(activeAccount.id);
  document.getElementById("historyCount").textContent = checks.length;
  const list = document.getElementById("historyList");
  list.replaceChildren();
  document.getElementById("historyEmpty").hidden = checks.length !== 0;
  checks.forEach((check) => {
    const item = document.createElement("article");
    item.className = "history-item";
    const details = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = { url: "Job link", text: "Job description", image: "Screenshot" }[check.kind];
    const preview = document.createElement("p");
    preview.textContent = check.preview;
    details.append(title, preview);
    const result = document.createElement("div");
    result.className = "history-result";
    const status = document.createElement("strong");
    status.textContent = check.result;
    const date = document.createElement("time");
    date.dateTime = check.date;
    date.textContent = new Date(check.date).toLocaleString();
    result.append(status, date);
    item.append(details, result);
    list.append(item);
  });
  updateAccountMenus();
}

try {
  renderDashboard();
} catch (error) {
  console.error(error);
  notify(error.message);
}

document.querySelector("[data-clear-history]")?.addEventListener("click", () => {
  if (!activeAccount) return;
  localStorage.removeItem(historyKey(activeAccount.id));
  renderDashboard();
});

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
    if (!activeAccount) {
      location.href = `sign-in.html?next=${encodeURIComponent(pageName)}`;
      return;
    }
    try {
      const preview =
        kind === "url"
          ? document.getElementById("jobUrl").value.trim()
          : kind === "text"
            ? document.getElementById("jobText").value.trim()
            : imageInput.files[0].name;
      const history = readHistory(activeAccount.id);
      history.unshift({
        kind,
        preview: preview.slice(0, 180),
        result: "Demo only — no fraud result generated",
        date: new Date().toISOString(),
      });
      localStorage.setItem(historyKey(activeAccount.id), JSON.stringify(history));
      updateAccountMenus();
    } catch (error) {
      console.error(error);
      notify(error.message || "Unable to save this check in your account history.");
      return;
    }
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
