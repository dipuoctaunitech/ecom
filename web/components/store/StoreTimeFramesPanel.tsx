"use client"

import { useMemo, useState, useTransition } from "react"
import { Plus, Trash2 } from "lucide-react"
import {
  createTimeFrame,
  deleteTimeFrame,
  getTimeFrameBoard,
  setTimeFrameActive,
  updateTimeFrame,
  type ManagedTimeFrame,
  type TimeFrameBoard,
  type TimeFrameInput,
} from "@/app/actions/store-timeframes"
import { DAY_LABELS, timeToDayPercent } from "@/lib/roster"
import type { ServiceVertical } from "@prisma/client"

type Draft = {
  name: string
  startTime: string
  endTime: string
  slotDurationMins: string
  daysOfWeek: number[]
  isActive: boolean
  staffIds: string[]
}

function emptyDraft(): Draft {
  return {
    name: "",
    startTime: "09:00",
    endTime: "12:00",
    slotDurationMins: "30",
    daysOfWeek: [1, 2, 3, 4, 5, 6],
    isActive: true,
    staffIds: [],
  }
}

function fromFrame(frame: ManagedTimeFrame): Draft {
  return {
    name: frame.name,
    startTime: frame.startTime,
    endTime: frame.endTime,
    slotDurationMins: String(frame.slotDurationMins),
    daysOfWeek: [...frame.daysOfWeek],
    isActive: frame.isActive,
    staffIds: [...frame.staffIds],
  }
}

function toInput(draft: Draft, vertical: ServiceVertical): TimeFrameInput {
  return {
    vertical,
    name: draft.name,
    startTime: draft.startTime,
    endTime: draft.endTime,
    slotDurationMins: Number(draft.slotDurationMins),
    daysOfWeek: draft.daysOfWeek,
    isActive: draft.isActive,
    staffIds: draft.staffIds,
  }
}

const HOUR_MARKS = [0, 3, 6, 9, 12, 15, 18, 21, 24]

export default function StoreTimeFramesPanel({
  initialBoard,
}: {
  initialBoard: TimeFrameBoard
}) {
  const [board, setBoard] = useState(initialBoard)
  const [vertical, setVertical] = useState<ServiceVertical>(
    initialBoard.vertical
  )
  const [editingId, setEditingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState("")
  const [saved, setSaved] = useState("")

  const roleLabel = vertical === "GROOMING" ? "groomer" : "doctor"
  const activeStaff = useMemo(
    () => board.staff.filter((member) => member.isActive),
    [board.staff]
  )

  function reload(nextVertical = vertical) {
    startTransition(async () => {
      try {
        const next = await getTimeFrameBoard(nextVertical)
        setBoard(next)
        setVertical(next.vertical)
        setError("")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load frames")
      }
    })
  }

  function resetForm() {
    setCreating(false)
    setEditingId(null)
    setDraft(emptyDraft())
  }

  function startCreate() {
    setCreating(true)
    setEditingId(null)
    setDraft({
      ...emptyDraft(),
      staffIds: activeStaff.map((member) => member.id),
    })
    setError("")
    setSaved("")
  }

  function startEdit(frame: ManagedTimeFrame) {
    setCreating(false)
    setEditingId(frame.id)
    setDraft(fromFrame(frame))
    setError("")
    setSaved("")
  }

  function save() {
    setError("")
    setSaved("")
    const input = toInput(draft, vertical)
    startTransition(async () => {
      try {
        if (editingId) {
          await updateTimeFrame(editingId, input)
          setSaved("Time frame updated.")
        } else {
          await createTimeFrame(input)
          setSaved("Time frame created.")
        }
        const next = await getTimeFrameBoard(vertical)
        setBoard(next)
        resetForm()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed")
      }
    })
  }

  function remove(frame: ManagedTimeFrame) {
    if (!window.confirm(`Delete “${frame.name}”?`)) return
    setError("")
    setSaved("")
    startTransition(async () => {
      try {
        await deleteTimeFrame(frame.id)
        const next = await getTimeFrameBoard(vertical)
        setBoard(next)
        if (editingId === frame.id) resetForm()
        setSaved("Time frame deleted.")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed")
      }
    })
  }

  function toggleActive(frame: ManagedTimeFrame) {
    setError("")
    setSaved("")
    startTransition(async () => {
      try {
        await setTimeFrameActive(frame.id, !frame.isActive)
        const next = await getTimeFrameBoard(vertical)
        setBoard(next)
        setSaved(frame.isActive ? "Frame hidden." : "Frame activated.")
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed")
      }
    })
  }

  function toggleDay(day: number) {
    setDraft((current) => {
      const has = current.daysOfWeek.includes(day)
      return {
        ...current,
        daysOfWeek: has
          ? current.daysOfWeek.filter((value) => value !== day)
          : [...current.daysOfWeek, day].sort((a, b) => a - b),
      }
    })
  }

  function toggleStaff(staffId: string) {
    setDraft((current) => {
      const has = current.staffIds.includes(staffId)
      return {
        ...current,
        staffIds: has
          ? current.staffIds.filter((id) => id !== staffId)
          : [...current.staffIds, staffId],
      }
    })
  }

  const showForm = creating || editingId !== null
  const timelineFrames = board.frames.filter((frame) => frame.isActive)

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-ink-muted">
            Store ops
          </p>
          <h2 className="mt-1 font-display text-2xl font-medium tracking-tight text-ink">
            Day time frames
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-ink-muted">
            The day is a 24-hour line. Create open windows (start–end), map{" "}
            {roleLabel}s to each window, and customers get those slots.
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          disabled={isPending || creating}
          className="inline-flex items-center gap-2 border border-ink bg-ink px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
          Add time frame
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "GROOMING", label: "Grooming" },
            { id: "CLINIC", label: "Clinic" },
          ] as const
        ).map((item) => {
          const active = vertical === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                resetForm()
                setVertical(item.id)
                reload(item.id)
              }}
              className={`border px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-ink bg-ink text-white"
                  : "border-line bg-surface text-ink-muted hover:border-ink/30 hover:text-ink"
              }`}
            >
              {item.label}
            </button>
          )
        })}
      </div>

      {(error || saved) && (
        <div
          className={`border px-4 py-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {error || saved}
        </div>
      )}

      {/* 24-hour timeline */}
      <section className="border border-line bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-medium text-ink">
            24-hour day
          </h3>
          <p className="text-xs text-ink-muted">
            {timelineFrames.length} active frame
            {timelineFrames.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="mt-6">
          <div className="relative h-14 w-full bg-line/40">
            {timelineFrames.map((frame) => {
              const left = timeToDayPercent(frame.startTime)
              const right = timeToDayPercent(frame.endTime)
              const width = Math.max(right - left, 0.8)
              const selected = editingId === frame.id
              return (
                <button
                  key={frame.id}
                  type="button"
                  title={`${frame.name} · ${frame.startTime}–${frame.endTime}`}
                  onClick={() => startEdit(frame)}
                  className={`absolute top-2 bottom-2 truncate px-2 text-left text-[10px] font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-90 sm:text-xs ${
                    selected ? "bg-highlight ring-2 ring-ink" : "bg-ink"
                  }`}
                  style={{ left: `${left}%`, width: `${width}%` }}
                >
                  <span className="block truncate">{frame.name}</span>
                  <span className="hidden truncate opacity-80 sm:block">
                    {frame.startTime}–{frame.endTime}
                  </span>
                </button>
              )
            })}
            {creating && (
              <div
                className="pointer-events-none absolute top-2 bottom-2 border-2 border-dashed border-highlight bg-highlight/20"
                style={{
                  left: `${timeToDayPercent(draft.startTime)}%`,
                  width: `${Math.max(
                    timeToDayPercent(draft.endTime) -
                      timeToDayPercent(draft.startTime),
                    0.8
                  )}%`,
                }}
              />
            )}
          </div>
          <div className="relative mt-2 h-5 w-full text-[10px] text-ink-muted">
            {HOUR_MARKS.map((hour) => (
              <span
                key={hour}
                className="absolute -translate-x-1/2 tabular-nums"
                style={{ left: `${(hour / 24) * 100}%` }}
              >
                {String(hour).padStart(2, "0")}:00
              </span>
            ))}
          </div>
        </div>
      </section>

      {showForm && (
        <form
          className="space-y-5 border border-line bg-surface p-5"
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
        >
          <h3 className="font-display text-lg font-medium text-ink">
            {editingId ? "Edit time frame" : "New time frame"}
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm md:col-span-2">
              <span className="font-medium text-ink">Name</span>
              <input
                required
                value={draft.name}
                placeholder="Morning · Afternoon · Evening"
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="mt-1 block w-full border border-line bg-surface-elevated px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-ink">Start</span>
              <input
                required
                type="time"
                value={draft.startTime}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    startTime: event.target.value,
                  }))
                }
                className="mt-1 block w-full border border-line bg-surface-elevated px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-ink">End</span>
              <input
                required
                type="time"
                value={draft.endTime}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    endTime: event.target.value,
                  }))
                }
                className="mt-1 block w-full border border-line bg-surface-elevated px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-ink">
                Slot step (minutes)
              </span>
              <input
                required
                type="number"
                min={10}
                max={180}
                step={5}
                value={draft.slotDurationMins}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    slotDurationMins: event.target.value,
                  }))
                }
                className="mt-1 block w-full border border-line bg-surface-elevated px-3 py-2 text-sm"
              />
            </label>

            <label className="inline-flex items-end gap-2 pb-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
              />
              Active
            </label>
          </div>

          <div>
            <p className="text-sm font-medium text-ink">Days of week</p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Leave none selected to mean every day.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {DAY_LABELS.map((label, day) => {
                const checked = draft.daysOfWeek.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${
                      checked
                        ? "border-ink bg-ink text-white"
                        : "border-line text-ink-muted hover:border-ink/30 hover:text-ink"
                    }`}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-ink">
              Map {roleLabel}s to this frame
            </p>
            {activeStaff.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">
                No active {roleLabel}s yet.
              </p>
            ) : (
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {activeStaff.map((member) => {
                  const checked = draft.staffIds.includes(member.id)
                  return (
                    <li key={member.id}>
                      <label className="flex cursor-pointer items-start gap-3 border border-line px-3 py-3 text-sm hover:border-ink/30">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleStaff(member.id)}
                          className="mt-0.5"
                        />
                        <span>
                          <span className="font-medium text-ink">
                            {member.name}
                          </span>
                          {member.title ? (
                            <span className="mt-0.5 block text-xs text-ink-muted">
                              {member.title}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="border border-ink bg-ink px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-white disabled:opacity-50"
            >
              {isPending ? "Saving…" : editingId ? "Save frame" : "Create frame"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={isPending}
              className="border border-line px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-ink-muted hover:border-ink/30 hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {board.frames.length === 0 ? (
        <p className="text-sm text-ink-muted">
          No time frames yet. Add morning/afternoon windows on the 24-hour
          line.
        </p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {board.frames.map((frame) => (
            <li key={frame.id} className="space-y-3 py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-base font-medium text-ink">
                      {frame.name}
                    </h3>
                    {!frame.isActive ? (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">
                        Inactive
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm tabular-nums text-ink">
                    {frame.startTime}–{frame.endTime}
                    <span className="text-ink-muted">
                      {" "}
                      · every {frame.slotDurationMins} min
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">
                    {frame.daysOfWeek.length === 0
                      ? "Every day"
                      : frame.daysOfWeek
                          .slice()
                          .sort((a, b) => a - b)
                          .map((day) => DAY_LABELS[day])
                          .join(" · ")}
                  </p>
                  <p className="mt-2 text-sm text-ink-muted">
                    {frame.staffNames.length === 0
                      ? `No ${roleLabel}s mapped`
                      : frame.staffNames.join(", ")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startEdit(frame)}
                    className="border border-line px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink hover:border-ink"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => toggleActive(frame)}
                    className="border border-line px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-ink-muted hover:border-ink/30 hover:text-ink"
                  >
                    {frame.isActive ? "Hide" : "Show"}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => remove(frame)}
                    className="border border-line p-2 text-ink-muted hover:border-red-300 hover:text-red-700"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                  </button>
                </div>
              </div>

              {frame.previewSlots.length > 0 ? (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">
                    Slots in this frame
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {frame.previewSlots.map((slot) => (
                      <span
                        key={slot}
                        className="border border-line bg-surface-elevated px-2 py-1 text-xs tabular-nums text-ink"
                      >
                        {slot}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
