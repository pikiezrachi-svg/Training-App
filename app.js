const STORAGE_KEY = "training-picker.trainings";
const RECENT_PICKS_STORAGE_KEY = "training-picker.recent-picks";
const RANDOMIZER_STATE_STORAGE_KEY = "training-picker.randomizer-state";
const COMPLETION_COUNT_STORAGE_KEY = "training-picker.completion-count";
const RECENT_PICK_LIMIT = 2;

const form = document.getElementById("training-form");
const titleInput = document.getElementById("training-title");
const contentInput = document.getElementById("training-content");
const saveButton = document.getElementById("save-button");
const cancelEditButton = document.getElementById("cancel-edit");
const formMessage = document.getElementById("form-message");
const completionCountElement = document.getElementById("completion-count");
const addPointButton = document.getElementById("add-point");
const subtractPointButton = document.getElementById("subtract-point");
const trainingList = document.getElementById("training-list");
const emptyState = document.getElementById("empty-state");
const trainingCount = document.getElementById("training-count");
const toggleEditorButton = document.getElementById("toggle-editor");
const editorContent = document.getElementById("editor-content");
const toggleTrainingsButton = document.getElementById("toggle-trainings");
const trainingsContent = document.getElementById("trainings-content");
const pickButton = document.getElementById("pick-button");
const randomResult = document.getElementById("random-result");
const installButton = document.getElementById("install-button");
const trainingModal = document.getElementById("training-modal");
const modalTitle = document.getElementById("modal-title");
const modalContent = document.getElementById("modal-content");
const closeModalButton = document.getElementById("close-modal");
const closeModalFooterButton = document.getElementById("close-modal-footer");
const completeTrainingButton = document.getElementById("complete-training");
const celebrationLayer = document.getElementById("celebration-layer");

let trainings = loadTrainings();
let completionCount = loadCompletionCount();
let editingId = null;
let deferredInstallPrompt = null;
let lastPickedTraining = null;
let recentPickIds = loadRecentPickIds();
let randomizerState = loadRandomizerState();

function loadTrainings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load trainings", error);
    return [];
  }
}

function persistTrainings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trainings));
}

function loadCompletionCount() {
  const stored = Number.parseInt(localStorage.getItem(COMPLETION_COUNT_STORAGE_KEY) || "0", 10);
  return Number.isFinite(stored) && stored > 0 ? stored : 0;
}

function persistCompletionCount() {
  localStorage.setItem(COMPLETION_COUNT_STORAGE_KEY, String(completionCount));
}

function updateCompletionCountDisplay() {
  if (completionCountElement) {
    completionCountElement.textContent = String(completionCount);
  }
}

function changeCompletionCount(amount) {
  completionCount = Math.max(0, completionCount + amount);
  persistCompletionCount();
  updateCompletionCountDisplay();
}

function loadRandomizerState() {
  try {
    const stored = localStorage.getItem(RANDOMIZER_STATE_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.error("Failed to load randomizer state", error);
    return {};
  }
}

function persistRandomizerState() {
  localStorage.setItem(RANDOMIZER_STATE_STORAGE_KEY, JSON.stringify(randomizerState));
}

function loadRecentPickIds() {
  try {
    const stored = localStorage.getItem(RECENT_PICKS_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load recent picks", error);
    return [];
  }
}

function persistRecentPickIds() {
  localStorage.setItem(RECENT_PICKS_STORAGE_KEY, JSON.stringify(recentPickIds));
}

function syncRecentPicksWithTrainings() {
  const validIds = new Set(trainings.map((training) => training.id));
  recentPickIds = recentPickIds
    .filter((id) => validIds.has(id))
    .slice(0, RECENT_PICK_LIMIT);
  persistRecentPickIds();
}

function syncRandomizerStateWithTrainings() {
  const validIds = new Set(trainings.map((training) => training.id));
  const nextState = {};

  trainings.forEach((training) => {
    nextState[training.id] = {
      skipStreak: randomizerState[training.id]?.skipStreak ?? 0,
      pickCount: randomizerState[training.id]?.pickCount ?? 0,
      lastPickedAt: randomizerState[training.id]?.lastPickedAt ?? null,
    };
  });

  randomizerState = nextState;
  persistRandomizerState();
}

function setFormMessage(message = "", type = "") {
  formMessage.textContent = message;
  formMessage.className = `form-message${type ? ` ${type}` : ""}`;
}

function formatCount(count) {
  return `${count} training${count === 1 ? "" : "s"}`;
}

function summarizeText(text, maxLength = 140) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, maxLength).trim()}...`;
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `training-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function resetForm() {
  editingId = null;
  form.reset();
  saveButton.textContent = "Save training";
  cancelEditButton.hidden = true;
}

function launchCelebration() {
  if (!celebrationLayer) {
    return;
  }

  celebrationLayer.innerHTML = "";
  const colors = ["#3767ff", "#13b36b", "#ffb020", "#ff6b6b", "#7c4dff"];

  for (let index = 0; index < 36; index += 1) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = colors[index % colors.length];
    piece.style.setProperty("--drift", `${Math.round(Math.random() * 180 - 90)}px`);
    piece.style.setProperty("--duration", `${(1.4 + Math.random() * 0.8).toFixed(2)}s`);
    piece.style.transform = `rotate(${Math.round(Math.random() * 360)}deg)`;
    celebrationLayer.append(piece);
  }

  window.setTimeout(() => {
    celebrationLayer.innerHTML = "";
  }, 1800);
}

function handleCounterAdjustment(amount) {
  const actionLabel = amount > 0 ? "add 1 point" : "subtract 1 point";
  const confirmed = window.confirm(`Are you sure you want to ${actionLabel}?`);

  if (!confirmed) {
    return;
  }

  if (amount < 0 && completionCount === 0) {
    setFormMessage("The counter is already at 0.", "warning");
    return;
  }

  changeCompletionCount(amount);
  setFormMessage(
    amount > 0 ? "Nice work — 1 point added." : "1 point was removed.",
    "success"
  );
}

function handleTrainingCompleted() {
  completeTrainingButton?.setAttribute("disabled", "disabled");
  changeCompletionCount(1);
  setFormMessage("Great job! You completed a training and earned 1 point.", "success");
  launchCelebration();

  window.setTimeout(() => {
    closeTrainingModal();
    completeTrainingButton?.removeAttribute("disabled");
  }, 900);
}

function setEditorCollapsed(isCollapsed) {
  if (!editorContent || !toggleEditorButton) {
    return;
  }

  editorContent.hidden = isCollapsed;
  toggleEditorButton.textContent = isCollapsed ? "Show form" : "Hide form";
  toggleEditorButton.setAttribute("aria-expanded", String(!isCollapsed));
}

function toggleEditorVisibility() {
  if (!editorContent) {
    return;
  }

  setEditorCollapsed(!editorContent.hidden);
}

function setTrainingsCollapsed(isCollapsed) {
  if (!trainingsContent || !toggleTrainingsButton) {
    return;
  }

  trainingsContent.hidden = isCollapsed;
  toggleTrainingsButton.textContent = isCollapsed ? "Show list" : "Hide list";
  toggleTrainingsButton.setAttribute("aria-expanded", String(!isCollapsed));
}

function toggleTrainingsVisibility() {
  if (!trainingsContent) {
    return;
  }

  setTrainingsCollapsed(!trainingsContent.hidden);
}

function closeTrainingModal() {
  if (!trainingModal) {
    return;
  }

  trainingModal.classList.remove("is-open");
  trainingModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function openTrainingModal(training) {
  if (!trainingModal || !modalTitle || !modalContent) {
    return;
  }

  completeTrainingButton?.removeAttribute("disabled");
  modalTitle.textContent = training.title;
  modalContent.textContent = training.content;
  trainingModal.hidden = false;
  trainingModal.classList.add("is-open");
  document.body.classList.add("modal-open");
  closeModalButton?.focus();
}

function updatePickerPlaceholder() {
  if (trainings.length === 0) {
    randomResult.className = "random-result empty-result";
    randomResult.textContent = "Save at least one training to start picking.";
    pickButton.disabled = true;
    lastPickedTraining = null;
    recentPickIds = [];
    randomizerState = {};
    persistRecentPickIds();
    persistRandomizerState();
    closeTrainingModal();
    return;
  }

  if (!lastPickedTraining) {
    randomResult.className = "random-result empty-result";
    randomResult.textContent = "Press the button to choose a random training.";
  }

  pickButton.disabled = false;
}

function createActionButton(label, onClick, extraClass = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.className = `action-button${extraClass ? ` ${extraClass}` : ""}`;
  button.addEventListener("click", onClick);
  return button;
}

function renderTrainings() {
  syncRecentPicksWithTrainings();
  syncRandomizerStateWithTrainings();
  trainingList.innerHTML = "";
  trainingCount.textContent = formatCount(trainings.length);

  if (trainings.length === 0) {
    emptyState.hidden = false;
    updatePickerPlaceholder();
    return;
  }

  emptyState.hidden = true;

  trainings.forEach((training) => {
    const item = document.createElement("li");
    item.className = "training-card";

    const header = document.createElement("div");
    header.className = "training-card-header";

    const title = document.createElement("h3");
    title.textContent = training.title;

    const actions = document.createElement("div");
    actions.className = "card-actions";
    actions.append(
      createActionButton("Edit", () => startEdit(training.id)),
      createActionButton("Delete", () => deleteTraining(training.id), "delete")
    );

    header.append(title, actions);

    const preview = document.createElement("p");
    preview.className = "training-preview";
    preview.textContent = summarizeText(training.content);

    const meta = document.createElement("small");
    meta.className = "training-meta";
    meta.textContent = `Last updated: ${formatDate(
      training.updatedAt || training.createdAt
    )}`;

    item.append(header, preview, meta);
    trainingList.append(item);
  });

  updatePickerPlaceholder();
}

function startEdit(id) {
  const training = trainings.find((entry) => entry.id === id);
  if (!training) {
    return;
  }

  setEditorCollapsed(false);
  editingId = id;
  titleInput.value = training.title;
  contentInput.value = training.content;
  saveButton.textContent = "Update training";
  cancelEditButton.hidden = false;
  setFormMessage(`Editing “${training.title}”.`, "success");
  titleInput.focus();
}

function deleteTraining(id) {
  const training = trainings.find((entry) => entry.id === id);
  if (!training) {
    return;
  }

  const confirmed = window.confirm(`Delete \"${training.title}\"?`);
  if (!confirmed) {
    return;
  }

  trainings = trainings.filter((entry) => entry.id !== id);
  persistTrainings();

  if (editingId === id) {
    resetForm();
  }

  if (lastPickedTraining?.id === id) {
    lastPickedTraining = null;
    closeTrainingModal();
  }

  recentPickIds = recentPickIds.filter((entryId) => entryId !== id);
  delete randomizerState[id];
  persistRecentPickIds();
  persistRandomizerState();

  renderTrainings();
  setFormMessage(`Deleted “${training.title}”.`, "success");
}

function showRandomTraining(training) {
  lastPickedTraining = training;
  randomResult.className = "random-result";
  randomResult.innerHTML = "";

  const heading = document.createElement("h3");
  heading.textContent = training.title;

  const note = document.createElement("p");
  note.textContent = "Chosen successfully. It is now open in reading mode.";

  const content = document.createElement("pre");
  content.className = "result-content";
  content.textContent = summarizeText(training.content, 220);

  const reopenButton = document.createElement("button");
  reopenButton.type = "button";
  reopenButton.className = "action-button";
  reopenButton.textContent = "Open reading window again";
  reopenButton.addEventListener("click", () => openTrainingModal(training));

  randomResult.append(heading, note, content, reopenButton);
  openTrainingModal(training);
}

function chooseWeightedTraining(candidates) {
  const weightedCandidates = candidates.map((training) => {
    const skipStreak = randomizerState[training.id]?.skipStreak ?? 0;
    const weight = 1 + skipStreak * 2;
    return { training, weight };
  });

  const totalWeight = weightedCandidates.reduce((sum, entry) => sum + entry.weight, 0);
  let threshold = Math.random() * totalWeight;

  for (const entry of weightedCandidates) {
    threshold -= entry.weight;
    if (threshold <= 0) {
      return entry.training;
    }
  }

  return weightedCandidates[weightedCandidates.length - 1].training;
}

function getRandomTrainingChoice() {
  if (trainings.length === 1) {
    return trainings[0];
  }

  const recentLimit = Math.min(RECENT_PICK_LIMIT, Math.max(trainings.length - 1, 1));
  const blockedIds = recentPickIds.slice(0, recentLimit);

  let availableTrainings = trainings.filter(
    (training) => !blockedIds.includes(training.id)
  );

  if (availableTrainings.length === 0) {
    availableTrainings = trainings.filter(
      (training) => training.id !== recentPickIds[0]
    );
  }

  return chooseWeightedTraining(availableTrainings);
}

function updateRandomizerState(selectedTrainingId) {
  syncRandomizerStateWithTrainings();

  Object.keys(randomizerState).forEach((trainingId) => {
    if (trainingId === selectedTrainingId) {
      randomizerState[trainingId].skipStreak = 0;
      randomizerState[trainingId].pickCount += 1;
      randomizerState[trainingId].lastPickedAt = new Date().toISOString();
      return;
    }

    randomizerState[trainingId].skipStreak += 1;
  });

  persistRandomizerState();
}

function rememberPickedTraining(trainingId) {
  recentPickIds = [trainingId, ...recentPickIds.filter((id) => id !== trainingId)].slice(
    0,
    RECENT_PICK_LIMIT
  );
  persistRecentPickIds();
}

function pickRandomTraining() {
  if (trainings.length === 0) {
    updatePickerPlaceholder();
    setFormMessage("Add at least one training first.", "warning");
    return;
  }

  const selectedTraining = getRandomTrainingChoice();
  updateRandomizerState(selectedTraining.id);
  rememberPickedTraining(selectedTraining.id);
  showRandomTraining(selectedTraining);
}

async function handleInstallClick() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;

    if (choice.outcome === "accepted") {
      setFormMessage("The app is being installed on your device.", "success");
    }

    deferredInstallPrompt = null;
    return;
  }

  const isAppleMobile = /iphone|ipad|ipod/i.test(window.navigator.userAgent);

  if (isAppleMobile) {
    setFormMessage(
      "On iPhone, open this page in Safari, tap Share, then choose ‘Add to Home Screen’.",
      "success"
    );
    return;
  }

  setFormMessage(
    "Open the hosted page on your phone and use the browser menu to choose ‘Install app’ or ‘Add to Home Screen’.",
    "success"
  );
}

function registerServiceWorker() {
  const supportedHost =
    location.protocol === "https:" ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";

  if (!("serviceWorker" in navigator) || !supportedHost) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .catch((error) => console.error("Service worker registration failed", error));
  });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const content = contentInput.value.trim();

  if (!title || !content) {
    setFormMessage("Please add both a title and training text.", "warning");
    return;
  }

  const timestamp = new Date().toISOString();

  if (editingId) {
    trainings = trainings.map((entry) =>
      entry.id === editingId
        ? {
            ...entry,
            title,
            content,
            updatedAt: timestamp,
          }
        : entry
    );
    setFormMessage(`Updated “${title}”.`, "success");
  } else {
    trainings.unshift({
      id: createId(),
      title,
      content,
      createdAt: timestamp,
      updatedAt: timestamp,
    });
    setFormMessage(`Saved “${title}”.`, "success");
  }

  persistTrainings();
  renderTrainings();
  resetForm();
});

cancelEditButton?.addEventListener("click", () => {
  resetForm();
  setFormMessage("Edit cancelled.");
});

pickButton?.addEventListener("click", pickRandomTraining);
addPointButton?.addEventListener("click", () => handleCounterAdjustment(1));
subtractPointButton?.addEventListener("click", () => handleCounterAdjustment(-1));
toggleEditorButton?.addEventListener("click", toggleEditorVisibility);
toggleTrainingsButton?.addEventListener("click", toggleTrainingsVisibility);
installButton?.addEventListener("click", handleInstallClick);
closeModalButton?.addEventListener("click", (event) => {
  event.preventDefault();
  closeTrainingModal();
});
closeModalFooterButton?.addEventListener("click", (event) => {
  event.preventDefault();
  closeTrainingModal();
});
completeTrainingButton?.addEventListener("click", handleTrainingCompleted);
trainingModal?.addEventListener("click", (event) => {
  if (event.target === trainingModal) {
    closeTrainingModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && trainingModal && !trainingModal.hidden) {
    closeTrainingModal();
  }
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  setFormMessage("Training Picker was installed on your device.", "success");
});

renderTrainings();
updateCompletionCountDisplay();
setEditorCollapsed(true);
setTrainingsCollapsed(true);
updatePickerPlaceholder();
registerServiceWorker();
