const DESCRIPTION_COLLAPSE_LIMIT = 132;
const STATUS_OPTIONS = ["Pending", "In Progress", "Done"];
const PRIORITY_OPTIONS = ["Low", "Medium", "High"];
const COLLAPSIBLE_SECTION_ID = "todo-collapsible-section";

const INITIAL_TASK = {
  title: "Prepare Q2 launch checklist",
  description:
    "Finalize stakeholder notes, confirm design handoff, schedule the final launch-readiness review, align owners across design and product, and confirm every blocker has a named follow-up before launch day.",
  priority: "High",
  dueDate: "2026-04-14T17:00",
  status: "In Progress",
  tags: ["work", "urgent", "design"],
};

const appRoot = document.querySelector("[data-app-root]");

const state = {
  task: cloneTask(INITIAL_TASK),
  draftTask: cloneTask(INITIAL_TASK),
  isEditing: false,
  isDeleted: false,
  isExpanded:
    INITIAL_TASK.description.length <= DESCRIPTION_COLLAPSE_LIMIT,
};

let timeIntervalId = null;
let pendingFocusTestId = null;

function cloneTask(task) {
  return {
    title: task.title,
    description: task.description,
    priority: task.priority,
    dueDate: task.dueDate,
    status: task.status,
    tags: [...task.tags],
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function focusByTestId(testId) {
  const target = document.querySelector(`[data-testid="${testId}"]`);

  if (target instanceof HTMLElement) {
    target.focus();
  }
}

function getPriorityClass(priority) {
  return priority.toLowerCase().replace(/\s+/g, "-");
}

function getStatusClass(status) {
  return status.toLowerCase().replace(/\s+/g, "-");
}

function isTaskDone(task) {
  return task.status === "Done";
}

function isTaskOverdue(task) {
  return !isTaskDone(task) && new Date(task.dueDate).getTime() < Date.now();
}

function formatDueDate(dueDate) {
  const date = new Date(dueDate);

  if (Number.isNaN(date.getTime())) {
    return "No due date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getRelativeUnit(absDiff, diff, unitMs, unitLabel) {
  const raw = absDiff / unitMs;
  const rounded = diff < 0 ? Math.floor(raw) : Math.ceil(raw);
  const value = Math.max(1, rounded);
  return `${value} ${unitLabel}${value === 1 ? "" : "s"}`;
}

function getTimeRemainingText(task) {
  if (isTaskDone(task)) {
    return "Completed";
  }

  const due = new Date(task.dueDate).getTime();

  if (Number.isNaN(due)) {
    return "No due date";
  }

  const now = Date.now();
  const diff = due - now;
  const absDiff = Math.abs(diff);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (absDiff < minute) {
    return diff < 0 ? "Overdue by 1 minute" : "Due in 1 minute";
  }

  if (absDiff < hour) {
    const relative = getRelativeUnit(absDiff, diff, minute, "minute");
    return diff < 0 ? `Overdue by ${relative}` : `Due in ${relative}`;
  }

  if (absDiff < day) {
    const relative = getRelativeUnit(absDiff, diff, hour, "hour");
    return diff < 0 ? `Overdue by ${relative}` : `Due in ${relative}`;
  }

  const relative = getRelativeUnit(absDiff, diff, day, "day");
  return diff < 0 ? `Overdue by ${relative}` : `Due in ${relative}`;
}

function getLocalDateTimeValue(dateValue) {
  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function shouldCollapseDescription(description) {
  return description.length > DESCRIPTION_COLLAPSE_LIMIT;
}

function ensureCollapseState() {
  if (!shouldCollapseDescription(state.task.description)) {
    state.isExpanded = true;
  }
}

function getDisplayTitleMarkup(task) {
  return `
    <h2 id="todo-title" class="todo-title" data-testid="test-todo-title">
      ${escapeHtml(task.title)}
    </h2>
  `;
}

function getDisplayDescriptionMarkup(task) {
  const canCollapse = shouldCollapseDescription(task.description);
  const isExpanded = !canCollapse || state.isExpanded;

  return `
    <div
      class="description-shell"
      id="${COLLAPSIBLE_SECTION_ID}"
      data-testid="test-todo-collapsible-section"
    >
      <p
        class="todo-description${isExpanded ? "" : " todo-description-clamped"}"
        data-testid="test-todo-description"
      >
        ${escapeHtml(task.description)}
      </p>
    </div>
  `;
}

function getEditFormMarkup(draftTask, task) {
  return `
    <div class="field-stack sr-only" aria-hidden="true">
      <span data-testid="test-todo-title">${escapeHtml(task.title)}</span>
      <span data-testid="test-todo-description">${escapeHtml(task.description)}</span>
    </div>
    <form class="edit-form" data-testid="test-todo-edit-form">
      <div class="field-stack">
        <label for="todo-edit-title-input">Task title</label>
        <input
          id="todo-edit-title-input"
          name="title"
          class="text-input title-input"
          value="${escapeHtml(draftTask.title)}"
          data-testid="test-todo-edit-title-input"
        />
      </div>
      <div class="field-stack">
        <label for="todo-edit-description-input">Description</label>
        <textarea
          id="todo-edit-description-input"
          name="description"
          class="text-input description-input"
          rows="6"
          data-testid="test-todo-edit-description-input"
        >${escapeHtml(draftTask.description)}</textarea>
      </div>
      <div class="field-grid">
        <div class="field-stack">
          <label for="todo-edit-priority-select">Priority</label>
          <select
            id="todo-edit-priority-select"
            name="priority"
            class="text-input select-input"
            data-testid="test-todo-edit-priority-select"
          >
            ${PRIORITY_OPTIONS.map(
    (priority) => `
                <option value="${escapeHtml(priority)}"${draftTask.priority === priority ? " selected" : ""
      }>${escapeHtml(priority)}</option>
              `,
  ).join("")}
          </select>
        </div>
        <div class="field-stack">
          <label for="todo-edit-due-date-input">Due date</label>
          <input
            id="todo-edit-due-date-input"
            type="datetime-local"
            name="dueDate"
            class="text-input"
            value="${escapeHtml(getLocalDateTimeValue(draftTask.dueDate))}"
            data-testid="test-todo-edit-due-date-input"
          />
        </div>
      </div>
    </form>
  `;
}

function getPrioritySummaryMarkup(task) {
  const priorityClass = getPriorityClass(task.priority);

  return `
    <div class="meta-cluster meta-cluster-priority">
      <span
        class="priority-indicator priority-${priorityClass}"
        data-testid="test-todo-priority-indicator"
        aria-hidden="true"
      ></span>
      <span
        class="badge badge-priority badge-priority-${priorityClass}"
        data-testid="test-todo-priority"
        aria-label="Priority ${escapeHtml(task.priority)}"
      >
        ${escapeHtml(task.priority)}
      </span>
    </div>
  `;
}

function getStatusSummaryMarkup(task, overdue) {
  const statusClass = getStatusClass(task.status);

  return `
    <div class="meta-cluster">
      <span
        class="badge badge-status badge-status-${statusClass}"
        data-testid="test-todo-status"
        aria-label="Status ${escapeHtml(task.status)}"
      >
        ${escapeHtml(task.status)}
      </span>
      ${overdue
      ? `
            <span class="badge badge-overdue" data-testid="test-todo-overdue-indicator">
              Overdue
            </span>
          `
      : ""
    }
    </div>
  `;
}

function renderEmptyState() {
  appRoot.innerHTML = `
    <section class="empty-state" aria-live="polite">
      <p class="eyebrow">Task removed</p>
      <h2 class="empty-state-title">This todo card has been deleted.</h2>
      <button
        type="button"
        class="action-button action-button-secondary"
        data-action="restore-task"
      >
        Restore task
      </button>
    </section>
  `;
}

function renderCard() {
  const task = state.task;
  const draftTask = state.draftTask;
  const isDone = isTaskDone(task);
  const isOverdue = isTaskOverdue(task);
  const needsCollapse = shouldCollapseDescription(task.description);
  const isExpanded = !needsCollapse || state.isExpanded;
  const dueDateIso = new Date(task.dueDate).toISOString();
  const cardClasses = [
    "todo-card",
    `todo-card-priority-${getPriorityClass(task.priority)}`,
    `todo-card-status-${getStatusClass(task.status)}`,
    isDone ? "todo-card-complete" : "",
    isOverdue ? "todo-card-overdue" : "",
  ]
    .filter(Boolean)
    .join(" ");

  appRoot.innerHTML = `
    <article
      class="${cardClasses}"
      data-testid="test-todo-card"
      aria-labelledby="todo-title"
    >
      <header class="card-header">
        <div class="title-stack">
          <p class="eyebrow">Today's focus</p>
          <p class="card-kicker">Single task card with live state transitions</p>
        </div>
        <div class="toolbar" aria-label="Todo controls">
          <label class="toggle-wrap toolbar-item" for="todo-complete-toggle">
            <input
              id="todo-complete-toggle"
              type="checkbox"
              ${isDone ? "checked" : ""}
              data-testid="test-todo-complete-toggle"
            />
            <span>Mark complete</span>
          </label>

          <div class="field-stack compact-field toolbar-item">
            <label for="todo-status-control">Task status</label>
            <select
              id="todo-status-control"
              class="text-input select-input"
              data-testid="test-todo-status-control"
              aria-label="Task status"
            >
              ${STATUS_OPTIONS.map(
    (status) => `
                  <option value="${escapeHtml(status)}"${task.status === status ? " selected" : ""
      }>${escapeHtml(status)}</option>
                `,
  ).join("")}
            </select>
          </div>

          <button
            type="button"
            class="ghost-button toolbar-item"
            data-testid="test-todo-expand-toggle"
            aria-expanded="${isExpanded}"
            aria-controls="${COLLAPSIBLE_SECTION_ID}"
            ${!needsCollapse ? "disabled" : ""}
          >
            ${isExpanded ? "Collapse details" : "Expand details"}
          </button>

          <div class="toolbar-actions">
            ${state.isEditing
      ? `
                  <button
                    type="button"
                    class="action-button action-button-primary"
                    data-testid="test-todo-save-button"
                    data-action="save-task"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    class="action-button action-button-secondary"
                    data-testid="test-todo-cancel-button"
                    data-action="cancel-edit"
                  >
                    Cancel
                  </button>
                `
      : `
                  <button
                    type="button"
                    class="action-button action-button-secondary"
                    data-testid="test-todo-edit-button"
                    data-action="start-edit"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    class="action-button action-button-danger"
                    data-testid="test-todo-delete-button"
                    data-action="delete-task"
                  >
                    Delete
                  </button>
                `
    }
          </div>
        </div>
      </header>

      <section class="card-body">
        <div class="content-panel">
          ${state.isEditing
      ? getEditFormMarkup(draftTask, task)
      : `${getDisplayTitleMarkup(task)}${getDisplayDescriptionMarkup(task)}`
    }
        </div>

        <aside class="summary-panel" aria-label="Task summary">
          <div class="meta-row">
            ${getPrioritySummaryMarkup(task)}
            ${getStatusSummaryMarkup(task, isOverdue)}
          </div>

          <div class="time-block">
            <time
              class="due-date"
              dateTime="${dueDateIso}"
              data-testid="test-todo-due-date"
            >
              Due ${escapeHtml(formatDueDate(task.dueDate))}
            </time>
            <time
              class="time-remaining${isOverdue ? " time-remaining-overdue" : ""}"
              dateTime="${dueDateIso}"
              data-testid="test-todo-time-remaining"
              aria-live="polite"
            >
              ${escapeHtml(getTimeRemainingText(task))}
            </time>
          </div>

          <ul class="tag-list" role="list" data-testid="test-todo-tags">
            ${task.tags
      .map((tag) => {
        const testId =
          tag === "work" || tag === "urgent"
            ? ` data-testid="test-todo-tag-${escapeHtml(tag)}"`
            : "";

        return `<li class="tag-chip"${testId}>${escapeHtml(tag)}</li>`;
      })
      .join("")}
          </ul>
        </aside>
      </section>
    </article>
  `;

  if (pendingFocusTestId) {
    focusByTestId(pendingFocusTestId);
    pendingFocusTestId = null;
  }
}

function syncTimer() {
  if (timeIntervalId) {
    window.clearInterval(timeIntervalId);
    timeIntervalId = null;
  }

  if (state.isDeleted || isTaskDone(state.task)) {
    return;
  }

  timeIntervalId = window.setInterval(() => {
    if (state.isDeleted || isTaskDone(state.task)) {
      syncTimer();
      render();
      return;
    }

    render();
  }, 30000);
}

function render() {
  ensureCollapseState();

  if (state.isDeleted) {
    renderEmptyState();
  } else {
    renderCard();
  }

  syncTimer();
}

function startEditing() {
  state.draftTask = cloneTask(state.task);
  state.isEditing = true;
  pendingFocusTestId = "test-todo-edit-title-input";
  render();
}

function cancelEditing() {
  state.draftTask = cloneTask(state.task);
  state.isEditing = false;
  pendingFocusTestId = "test-todo-edit-button";
  render();
}

function saveDraft() {
  const safeDueDate = state.draftTask.dueDate || state.task.dueDate;

  state.task = {
    ...state.task,
    title: state.draftTask.title.trim() || state.task.title,
    description: state.draftTask.description.trim() || state.task.description,
    priority: state.draftTask.priority,
    dueDate: safeDueDate,
  };

  state.isEditing = false;
  state.isExpanded = !shouldCollapseDescription(state.task.description)
    ? true
    : state.isExpanded;
  pendingFocusTestId = "test-todo-edit-button";
  render();
}

function restoreTask() {
  state.task = cloneTask(INITIAL_TASK);
  state.draftTask = cloneTask(INITIAL_TASK);
  state.isEditing = false;
  state.isDeleted = false;
  state.isExpanded =
    INITIAL_TASK.description.length <= DESCRIPTION_COLLAPSE_LIMIT;
  pendingFocusTestId = null;
  render();
}

function updateDraftField(target) {
  if (!state.isEditing) {
    return;
  }

  if (target.matches('[data-testid="test-todo-edit-title-input"]')) {
    state.draftTask.title = target.value;
  }

  if (target.matches('[data-testid="test-todo-edit-description-input"]')) {
    state.draftTask.description = target.value;
  }

  if (target.matches('[data-testid="test-todo-edit-priority-select"]')) {
    state.draftTask.priority = target.value;
  }

  if (target.matches('[data-testid="test-todo-edit-due-date-input"]')) {
    state.draftTask.dueDate = target.value;
  }
}

appRoot.addEventListener("click", (event) => {
  const actionTarget = event.target.closest("[data-action]");
  const expandToggle = event.target.closest(
    '[data-testid="test-todo-expand-toggle"]',
  );

  if (expandToggle instanceof HTMLButtonElement && !expandToggle.disabled) {
    state.isExpanded = !state.isExpanded;
    render();
    return;
  }

  if (!actionTarget) {
    return;
  }

  const action = actionTarget.dataset.action;

  if (action === "start-edit") {
    startEditing();
  }

  if (action === "save-task") {
    saveDraft();
  }

  if (action === "cancel-edit") {
    cancelEditing();
  }

  if (action === "delete-task") {
    state.isDeleted = true;
    state.isEditing = false;
    render();
  }

  if (action === "restore-task") {
    restoreTask();
  }
});

appRoot.addEventListener("change", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  if (target.matches('[data-testid="test-todo-complete-toggle"]')) {
    state.task.status = target.checked ? "Done" : "Pending";
    render();
    return;
  }

  if (target.matches('[data-testid="test-todo-status-control"]')) {
    state.task.status = target.value;
    render();
    return;
  }

  updateDraftField(target);
});

appRoot.addEventListener("input", (event) => {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  updateDraftField(target);
});

appRoot.addEventListener("submit", (event) => {
  event.preventDefault();
  saveDraft();
});

render();
