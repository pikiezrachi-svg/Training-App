const STORAGE_KEY = "training-picker.trainings";

const form = document.getElementById("training-form");
const titleInput = document.getElementById("training-title");
const contentInput = document.getElementById("training-content");
const saveButton = document.getElementById("save-button");
const cancelEditButton = document.getElementById("cancel-edit");
const formMessage = document.getElementById("form-message");
const trainingList = document.getElementById("training-list");
const emptyState = document.getElementById("empty-state");
const trainingCount = document.getElementById("training-count");
const pickButton = document.getElementById("pick-button");
const randomResult = document.getElementById("random-result");
const installButton = document.getElementById("install-button");
const trainingModal = document.getElementById("training-modal");
const modalTitle = document.getElementById("modal-title");
const modalContent = document.getElementById("modal-content");
const closeModalButton = document.getElementById("close-modal");
const closeModalFooterButton = document.getElementById("close-modal-footer");

let trainings = loadTrainings();
let editingId = null;
let deferredInstallPrompt = null;
let lastPickedTraining = null;

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

function closeTrainingModal() {
  trainingModal.hidden = true;
  document.body.classList.remove("modal-open");
}

function openTrainingModal(training) {
  modalTitle.textContent = training.title;
  modalContent.textContent = training.content;
  trainingModal.hidden = false;
  document.body.classList.add("modal-open");
  closeModalButton.focus();
}

function updatePickerPlaceholder() {
  if (trainings.length === 0) {
    randomResult.className = "random-result empty-result";
    randomResult.textContent = "Save at least one training to start picking.";
    pickButton.disabled = true;
    lastPickedTraining = null;
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

function pickRandomTraining() {
  if (trainings.length === 0) {
    updatePickerPlaceholder();
    setFormMessage("Add at least one training first.", "warning");
    return;
  }

  const randomIndex = Math.floor(Math.random() * trainings.length);
  showRandomTraining(trainings[randomIndex]);
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

cancelEditButton.addEventListener("click", () => {
  resetForm();
  setFormMessage("Edit cancelled.");
});

pickButton.addEventListener("click", pickRandomTraining);
installButton.addEventListener("click", handleInstallClick);
closeModalButton.addEventListener("click", closeTrainingModal);
closeModalFooterButton.addEventListener("click", closeTrainingModal);
trainingModal.addEventListener("click", (event) => {
  if (event.target === trainingModal) {
    closeTrainingModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !trainingModal.hidden) {
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
updatePickerPlaceholder();
registerServiceWorker();
