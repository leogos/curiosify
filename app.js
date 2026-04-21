const FACT_API_URL =
  "https://uselessfacts.jsph.pl/api/v2/facts/random?language=en";

const STORAGE_KEY = "curiosityExplorerFavorites";

const statusEl = document.getElementById("status");
const factTextEl = document.getElementById("factText");
const factMetaEl = document.getElementById("factMeta");

const randomBtn = document.getElementById("randomBtn");
const translateBtn = document.getElementById("translateBtn");
const saveBtn = document.getElementById("saveBtn");
const copyBtn = document.getElementById("copyBtn");

const favoritesList = document.getElementById("favoritesList");
const emptyText = document.getElementById("emptyText");

let currentFact = null;
let favorites = loadFavorites();
let originalFactText = "";
let isTranslated = false;

function loadFavorites() {
  try {
    const savedFavorites = localStorage.getItem(STORAGE_KEY);
    return savedFavorites ? JSON.parse(savedFavorites) : [];
  } catch (error) {
    console.error("Could not load favorites:", error);
    return [];
  }
}

function persistFavorites() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
}

function setStatus(message = "") {
  statusEl.textContent = message;
}

function setLoadingState(isLoading) {
  randomBtn.disabled = isLoading;
  translateBtn.disabled = isLoading || !currentFact;
  saveBtn.disabled = isLoading || !currentFact;
  copyBtn.disabled = isLoading || !currentFact;
}

function renderFact(fact) {
  factTextEl.textContent = fact.text;

  if (fact.source && fact.source !== "djtech.net") {
    factMetaEl.textContent = `Source: ${fact.source}`;
  } else {
    factMetaEl.textContent = "";
  }
}

function resetTranslationState() {
  originalFactText = "";
  isTranslated = false;
  translateBtn.textContent = "Translate to Turkish";
}

function renderFavorites() {
  favoritesList.innerHTML = "";

  if (favorites.length === 0) {
    emptyText.style.display = "block";
    return;
  }

  emptyText.style.display = "none";

  favorites.forEach((fact) => {
    const li = document.createElement("li");
    li.className = "favorite-item";

    const text = document.createElement("p");
    text.className = "favorite-text";
    text.textContent = fact.text;

    const actions = document.createElement("div");
    actions.className = "favorite-actions";

    const removeBtn = document.createElement("button");
    removeBtn.className = "secondary";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      removeFavorite(fact.id);
    });

    actions.appendChild(removeBtn);
    li.appendChild(text);
    li.appendChild(actions);
    favoritesList.appendChild(li);
  });
}

function isAlreadySaved(id) {
  return favorites.some((fact) => fact.id === id);
}

function saveCurrentFact() {
  if (!currentFact) return;

  if (isAlreadySaved(currentFact.id)) {
    setStatus("This fact is already in favorites.");
    return;
  }

  favorites.unshift({
    id: currentFact.id,
    text: currentFact.text,
    source: currentFact.source || "Unknown",
  });

  persistFavorites();
  renderFavorites();
  setStatus("Saved to favorites.");
}

function removeFavorite(id) {
  favorites = favorites.filter((fact) => fact.id !== id);
  persistFavorites();
  renderFavorites();
  setStatus("Removed from favorites.");
}

async function copyFact() {
  if (!currentFact) return;

  try {
    await navigator.clipboard.writeText(factTextEl.textContent);
    setStatus("Fact copied to clipboard.");
  } catch (error) {
    console.error("Copy failed:", error);
    setStatus("Could not copy the fact.");
  }
}

async function fetchRandomFact() {
  setLoadingState(true);
  setStatus("Loading...");

  try {
    const response = await fetch(FACT_API_URL, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    currentFact = {
      id: data.id,
      text: data.text,
      source: data.source,
    };

    renderFact(currentFact);
    resetTranslationState();
    setStatus("New fact loaded.");
  } catch (error) {
    console.error("Fact fetch failed:", error);
    currentFact = null;
    factTextEl.textContent = "Something went wrong while fetching a fact.";
    factMetaEl.textContent = "";
    resetTranslationState();
    setStatus("Please try again.");
  } finally {
    setLoadingState(false);
    translateBtn.disabled = !currentFact;
    saveBtn.disabled = !currentFact;
    copyBtn.disabled = !currentFact;
  }
}

async function translateText(text) {
  try {
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        text,
      )}&langpair=en|tr`,
    );

    if (!response.ok) {
      throw new Error("Translation request failed");
    }

    const data = await response.json();
    return data.responseData.translatedText;
  } catch (error) {
    console.error("Translation error:", error);
    return null;
  }
}

async function handleTranslate() {
  if (!currentFact) return;

  if (isTranslated) {
    factTextEl.textContent = originalFactText;
    isTranslated = false;
    translateBtn.textContent = "Translate to Turkish";
    setStatus("Switched back to English.");
    return;
  }

  try {
    setLoadingState(true);
    setStatus("Translating...");

    originalFactText = currentFact.text;

    const translatedText = await translateText(originalFactText);

    if (!translatedText) {
      setStatus("Translation failed.");
      return;
    }

    factTextEl.textContent = translatedText;
    isTranslated = true;
    translateBtn.textContent = "Show English Version";
    setStatus("Translated to Turkish.");
  } catch (error) {
    console.error("Translation error:", error);
    setStatus("Translation failed.");
  } finally {
    setLoadingState(false);
    translateBtn.disabled = !currentFact;
    saveBtn.disabled = !currentFact;
    copyBtn.disabled = !currentFact;
  }
}

randomBtn.addEventListener("click", fetchRandomFact);
translateBtn.addEventListener("click", handleTranslate);
saveBtn.addEventListener("click", saveCurrentFact);
copyBtn.addEventListener("click", copyFact);

renderFavorites();
