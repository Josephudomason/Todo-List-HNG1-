"use client";

import { useEffect, useState } from "react";

const TASK = {
  title: "Prepare Q2 launch checklist",
  description:
    "Finalize stakeholder notes, confirm design handoff, and schedule the final launch-readiness review for the product team.",
  priority: "High",
  dueDate: "2026-04-14T17:00:00",
  status: "In Progress",
  tags: ["work", "urgent", "design"],
};

function getTimeRemainingText(dueDate) {
  const due = new Date(dueDate).getTime();
  const now = Date.now();
  const diff = due - now;
  const absDiff = Math.abs(diff);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (absDiff < minute) {
    return "Due now!";
  }

  if (diff < 0) {
    const overdueDays = Math.floor(absDiff / day);
    const overdueHours = Math.floor(absDiff / hour);

    if (overdueDays >= 1) {
      return `Overdue by ${overdueDays} day${overdueDays === 1 ? "" : "s"}`;
    }

    return `Overdue by ${Math.max(1, overdueHours)} hour${overdueHours === 1 ? "" : "s"}`;
  }

  if (diff < day) {
    const hoursLeft = Math.ceil(diff / hour);
    if (hoursLeft <= 1) {
      return "Due in 1 hour";
    }

    if (hoursLeft < 24) {
      return `Due in ${hoursLeft} hours`;
    }

    return "Due tomorrow";
  }

  const daysLeft = Math.ceil(diff / day);
  return `Due in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`;
}

function formatDueDate(dueDate) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dueDate));
}

export default function Home() {
  const [isComplete, setIsComplete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [task, setTask] = useState(TASK);
  const [timeRemaining, setTimeRemaining] = useState(() =>
    getTimeRemainingText(TASK.dueDate),
  );

  useEffect(() => {
    const updateTimeRemaining = () => {
      setTimeRemaining(getTimeRemainingText(task.dueDate));
    };

    updateTimeRemaining();
    const intervalId = window.setInterval(updateTimeRemaining, 30000);

    return () => window.clearInterval(intervalId);
  }, [task.dueDate]);

  const status = isComplete ? "Done" : task.status;
  const dueDateIso = new Date(task.dueDate).toISOString();

  function handleEditToggle() {
    setIsEditing((value) => !value);
  }

  function handleDelete() {
    setIsDeleted(true);
    setIsEditing(false);
  }

  function handleFieldChange(event) {
    const { name, value } = event.target;
    setTask((currentTask) => ({
      ...currentTask,
      [name]: value,
    }));
  }

  if (isDeleted) {
    return (
      <main className="page-shell">
        <section className="empty-state" aria-live="polite">
          <p className="eyebrow">Task removed</p>
          <h2 className="empty-state-title">This todo card has been deleted.</h2>
          <button
            type="button"
            className="action-button action-button-secondary"
            onClick={() => {
              setTask(TASK);
              setIsComplete(false);
              setIsDeleted(false);
            }}
          >
            Restore task
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <article
        className={`todo-card${isComplete ? " todo-card-complete" : ""}`}
        data-testid="test-todo-card"
        aria-labelledby="todo-title"
      >
        <div className="card-top">
          <div className="card-copy">
            <p className="eyebrow">Today&apos;s focus</p>
            {isEditing ? (
              <>
                <label className="sr-only" htmlFor="todo-title-input">
                  Task title
                </label>
                <input
                  id="todo-title-input"
                  name="title"
                  className="text-input title-input"
                  value={task.title}
                  onChange={handleFieldChange}
                  data-testid="test-todo-title"
                />
                <label className="sr-only" htmlFor="todo-description-input">
                  Task description
                </label>
                <textarea
                  id="todo-description-input"
                  name="description"
                  className="text-input description-input"
                  value={task.description}
                  onChange={handleFieldChange}
                  rows={4}
                  data-testid="test-todo-description"
                />
              </>
            ) : (
              <>
                <h2
                  id="todo-title"
                  className="todo-title"
                  data-testid="test-todo-title"
                >
                  {task.title}
                </h2>
                <p
                  className="todo-description"
                  data-testid="test-todo-description"
                >
                  {task.description}
                </p>
              </>
            )}
          </div>

          <label className="toggle-wrap" htmlFor="todo-complete-toggle">
            <input
              id="todo-complete-toggle"
              type="checkbox"
              checked={isComplete}
              onChange={() => setIsComplete((value) => !value)}
              data-testid="test-todo-complete-toggle"
            />
            <span>Mark complete</span>
          </label>
        </div>

        <div className="meta-row" aria-label="Task metadata">
          <span
            className="badge badge-priority"
            data-testid="test-todo-priority"
            aria-label={`Priority ${task.priority}`}
          >
            {task.priority}
          </span>
          <span
            className="badge badge-status"
            data-testid="test-todo-status"
            aria-label={`Status ${status}`}
          >
            {status}
          </span>
        </div>

        <div className="time-block">
          <time
            className="due-date"
            dateTime={dueDateIso}
            data-testid="test-todo-due-date"
          >
            Due {formatDueDate(task.dueDate)}
          </time>
          <time
            className="time-remaining"
            dateTime={dueDateIso}
            data-testid="test-todo-time-remaining"
            aria-live="polite"
          >
            {timeRemaining}
          </time>
        </div>

        <ul className="tag-list" role="list" data-testid="test-todo-tags">
          {task.tags.map((tag) => (
            <li
              key={tag}
              className="tag-chip"
              data-testid={tag === "work" || tag === "urgent" ? `test-todo-tag-${tag}` : undefined}
            >
              {tag}
            </li>
          ))}
        </ul>

        <div className="actions-row">
          <button
            type="button"
            className="action-button action-button-secondary"
            data-testid="test-todo-edit-button"
            onClick={handleEditToggle}
          >
            {isEditing ? "Save" : "Edit"}
          </button>
          <button
            type="button"
            className="action-button action-button-danger"
            data-testid="test-todo-delete-button"
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      </article>
    </main>
  );
}
