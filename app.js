const STORAGE_KEY = "gewicht-tracker-entries-v1";

const form = document.getElementById("entry-form");
const dateInput = document.getElementById("date");
const weightInput = document.getElementById("weight");
const dateErrorMessage = document.getElementById("date-error-message");
const weightErrorMessage = document.getElementById("weight-error-message");
const historyList = document.getElementById("history-list");
const emptyState = document.getElementById("empty-state");
const chartCanvas = document.getElementById("weight-chart");

let entries = loadEntries();

setTodayAsDefault();
render();

dateInput.addEventListener("input", handleDateInput);
weightInput.addEventListener("input", handleWeightInput);

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const isoDate = parseDateInputToIso(dateInput.value);
  const weight = parseWeight(weightInput.value);

  let hasError = false;

  if (!isoDate) {
    showDateError(true);
    hasError = true;
  } else {
    showDateError(false);
  }

  if (!Number.isFinite(weight) || weight <= 0 || weight > 500) {
    showWeightError(true);
    hasError = true;
  } else {
    showWeightError(false);
  }

  if (hasError) {
    return;
  }

  const normalizedWeight = roundToOneDecimal(weight);
  const newEntry = { date: isoDate, weight: normalizedWeight };

  const existingIndex = entries.findIndex((entry) => entry.date === isoDate);

  if (existingIndex >= 0) {
    entries[existingIndex] = newEntry;
  } else {
    entries.push(newEntry);
  }

  entries.sort((a, b) => a.date.localeCompare(b.date));
  saveEntries(entries);
  render();

  weightInput.value = "";
  weightInput.focus();
});

historyList.addEventListener("click", (event) => {
  const button = event.target.closest(".delete-btn");
  if (!button) return;

  const dateToDelete = button.dataset.date;
  if (!dateToDelete) return;

  entries = entries.filter((entry) => entry.date !== dateToDelete);
  saveEntries(entries);
  render();
});

window.addEventListener("resize", renderChart);

function handleDateInput(event) {
  const digitsOnly = String(event.target.value).replace(/\D/g, "").slice(0, 8);
  event.target.value = formatDateDigitsFlexible(digitsOnly);

  if (dateErrorMessage.hidden === false) {
    showDateError(false);
  }
}

function handleWeightInput(event) {
  let value = String(event.target.value);

  value = value.replace(/\./g, ",");
  value = value.replace(/[^\d,]/g, "");

  const firstCommaIndex = value.indexOf(",");
  if (firstCommaIndex !== -1) {
    const beforeComma = value.slice(0, firstCommaIndex + 1);
    const afterComma = value
      .slice(firstCommaIndex + 1)
      .replace(/,/g, "")
      .slice(0, 1);

    value = beforeComma + afterComma;
  }

  if (value.startsWith(",")) {
    value = value.slice(1);
  }

  event.target.value = value;

  if (weightErrorMessage.hidden === false) {
    showWeightError(false);
  }
}

function formatDateDigitsFlexible(digits) {
  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  }

  if (digits.length <= 6) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
  }

  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4, 8)}`;
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (entry) =>
          entry &&
          typeof entry.date === "string" &&
          typeof entry.weight === "number" &&
          Number.isFinite(entry.weight)
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

function saveEntries(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function setTodayAsDefault() {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();
  dateInput.value = `${day}.${month}.${year}`;
}

function parseWeight(value) {
  const cleaned = String(value).trim().replace(",", ".");
  return Number(cleaned);
}

function roundToOneDecimal(value) {
  return Math.round(value * 10) / 10;
}

function showDateError(visible) {
  dateErrorMessage.hidden = !visible;
}

function showWeightError(visible) {
  weightErrorMessage.hidden = !visible;
}

function render() {
  renderHistory();
  renderChart();
}

function renderHistory() {
  historyList.innerHTML = "";

  if (entries.length === 0) {
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;

  const displayEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  for (const entry of displayEntries) {
    const item = document.createElement("li");
    item.className = "history-item";

    const main = document.createElement("div");
    main.className = "history-main";

    const dateEl = document.createElement("span");
    dateEl.className = "history-date";
    dateEl.textContent = formatDate(entry.date);

    const weightEl = document.createElement("span");
    weightEl.className = "history-weight";
    weightEl.textContent = `${entry.weight.toFixed(1).replace(".", ",")} kg`;

    main.appendChild(dateEl);
    main.appendChild(weightEl);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-btn";
    deleteBtn.dataset.date = entry.date;
    deleteBtn.setAttribute("aria-label", `Eintrag vom ${formatDate(entry.date)} löschen`);
    deleteBtn.textContent = "Löschen";

    item.appendChild(main);
    item.appendChild(deleteBtn);
    historyList.appendChild(item);
  }
}

function renderChart() {
  const context = chartCanvas.getContext("2d");
  const parentWidth = chartCanvas.parentElement.clientWidth;
  const cssWidth = Math.max(280, parentWidth - 4);
  const cssHeight = 220;
  const dpr = window.devicePixelRatio || 1;

  chartCanvas.width = cssWidth * dpr;
  chartCanvas.height = cssHeight * dpr;
  chartCanvas.style.width = `${cssWidth}px`;
  chartCanvas.style.height = `${cssHeight}px`;

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, cssWidth, cssHeight);

  drawChartBackground(context, cssWidth, cssHeight);

  if (entries.length === 0) {
    return;
  }

  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const weights = sorted.map((entry) => entry.weight);

  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);
  const range = Math.max(maxWeight - minWeight, 1);

  const padding = {
    top: 20,
    right: 18,
    bottom: 36,
    left: 18,
  };

  const chartWidth = cssWidth - padding.left - padding.right;
  const chartHeight = cssHeight - padding.top - padding.bottom;

  const points = sorted.map((entry, index) => {
    const x =
      sorted.length === 1
        ? padding.left + chartWidth / 2
        : padding.left + (index / (sorted.length - 1)) * chartWidth;

    const y = padding.top + ((maxWeight - entry.weight) / range) * chartHeight;

    return { x, y, date: entry.date, weight: entry.weight };
  });

  context.beginPath();
  context.lineWidth = 2.5;
  context.strokeStyle = "#111827";

  points.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y);
    } else {
      context.lineTo(point.x, point.y);
    }
  });

  context.stroke();

  for (const point of points) {
    context.beginPath();
    context.fillStyle = "#111827";
    context.arc(point.x, point.y, 3.5, 0, Math.PI * 2);
    context.fill();
  }

  drawAxisLabels(context, cssWidth, cssHeight, sorted, minWeight, maxWeight);
}

function drawChartBackground(context, width, height) {
  context.strokeStyle = "#e5e7eb";
  context.lineWidth = 1;

  const lines = 4;
  for (let i = 1; i <= lines; i++) {
    const y = (height / (lines + 1)) * i;
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
}

function drawAxisLabels(context, width, height, sorted, minWeight, maxWeight) {
  context.fillStyle = "#6b7280";
  context.font = "12px system-ui, sans-serif";

  const firstDate = formatShortDate(sorted[0].date);
  const lastDate = formatShortDate(sorted[sorted.length - 1].date);

  context.textAlign = "left";
  context.fillText(firstDate, 10, height - 8);

  context.textAlign = "right";
  context.fillText(lastDate, width - 10, height - 8);

  context.textAlign = "left";
  context.fillText(`${maxWeight.toFixed(1).replace(".", ",")} kg`, 10, 16);

  context.textAlign = "right";
  context.fillText(`${minWeight.toFixed(1).replace(".", ",")} kg`, width - 10, 16);
}

function parseDateInputToIso(value) {
  const cleaned = String(value).trim();
  const digits = cleaned.replace(/\D/g, "");

  if (!(digits.length === 6 || digits.length === 8)) {
    return null;
  }

  const day = Number(digits.slice(0, 2));
  const month = Number(digits.slice(2, 4));

  let year;
  if (digits.length === 6) {
    const shortYear = Number(digits.slice(4, 6));
    year = 2000 + shortYear;
  } else {
    year = Number(digits.slice(4, 8));
  }

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  if (year < 1900 || year > 2100) return null;

  const testDate = new Date(year, month - 1, day);

  if (
    testDate.getFullYear() !== year ||
    testDate.getMonth() !== month - 1 ||
    testDate.getDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
}

function formatShortDate(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.`;
}
