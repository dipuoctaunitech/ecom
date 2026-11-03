"use client"

import { FormEvent, useState, useTransition } from "react"
import { PawPrint, Pencil, Plus, Trash2, X } from "lucide-react"
import {
  createCustomerPet,
  deleteCustomerPet,
  updateCustomerPet,
  type CustomerPet,
  type CustomerPetInput,
} from "@/app/actions/account"

const SPECIES_OPTIONS = [
  "Dog",
  "Cat",
  "Bird",
  "Rabbit",
  "Fish",
  "Reptile",
  "Small pet",
  "Other",
]

const SEX_OPTIONS = ["Female", "Male", "Unknown"]

const fieldClass =
  "w-full border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-muted focus:border-ink/40"

const emptyForm: CustomerPetInput = {
  name: "",
  species: "Dog",
  breed: "",
  sex: "",
  dateOfBirth: "",
  weightKg: "",
  color: "",
  microchipId: "",
  vaccinatedAt: "",
  dewormedAt: "",
  diagnosis: "",
  bbmpLicense: "",
  insurancePolicy: "",
  notes: "",
  imageUrl: "",
}

function petToForm(pet: CustomerPet): CustomerPetInput {
  return {
    name: pet.name,
    species: pet.species,
    breed: pet.breed ?? "",
    sex: pet.sex ?? "",
    dateOfBirth: pet.dateOfBirth ?? "",
    weightKg: pet.weightKg ?? "",
    color: pet.color ?? "",
    microchipId: pet.microchipId ?? "",
    vaccinatedAt: pet.vaccinatedAt ?? "",
    dewormedAt: pet.dewormedAt ?? "",
    diagnosis: pet.diagnosis ?? "",
    bbmpLicense: pet.bbmpLicense ?? "",
    insurancePolicy: pet.insurancePolicy ?? "",
    notes: pet.notes ?? "",
    imageUrl: pet.imageUrl ?? "",
  }
}

function ageLabel(dateOfBirth: string | null): string | null {
  if (!dateOfBirth) return null
  const born = new Date(`${dateOfBirth}T00:00:00.000Z`)
  if (Number.isNaN(born.getTime())) return null
  const years = Math.floor(
    (Date.now() - born.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  )
  if (years < 1) {
    const months = Math.max(
      1,
      Math.floor((Date.now() - born.getTime()) / (30.4 * 24 * 60 * 60 * 1000))
    )
    return `${months} mo`
  }
  return `${years} yr${years === 1 ? "" : "s"}`
}

export default function BuyerPets({
  initialPets,
  onChanged,
}: {
  initialPets: CustomerPet[]
  onChanged?: (pets: CustomerPet[]) => void
}) {
  const [pets, setPets] = useState(initialPets)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<CustomerPetInput>(emptyForm)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isPending, startTransition] = useTransition()

  function syncPets(next: CustomerPet[]) {
    setPets(next)
    onChanged?.(next)
  }

  function openAdd() {
    setAdding(true)
    setEditingId(null)
    setForm(emptyForm)
    setMessage("")
    setError("")
  }

  function openEdit(pet: CustomerPet) {
    setAdding(false)
    setEditingId(pet.id)
    setForm(petToForm(pet))
    setMessage("")
    setError("")
  }

  function closeForm() {
    setAdding(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  function setField<K extends keyof CustomerPetInput>(
    key: K,
    value: CustomerPetInput[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setMessage("")
    setError("")

    startTransition(async () => {
      try {
        if (editingId) {
          const updated = await updateCustomerPet(editingId, form)
          syncPets(pets.map((pet) => (pet.id === editingId ? updated : pet)))
          setMessage(`${updated.name} updated.`)
        } else {
          const created = await createCustomerPet(form)
          syncPets([...pets, created])
          setMessage(`${created.name} added.`)
        }
        closeForm()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save pet.")
      }
    })
  }

  function handleDelete(pet: CustomerPet) {
    if (!window.confirm(`Remove ${pet.name} from your pets?`)) return
    setMessage("")
    setError("")

    startTransition(async () => {
      try {
        await deleteCustomerPet(pet.id)
        syncPets(pets.filter((item) => item.id !== pet.id))
        if (editingId === pet.id) closeForm()
        setMessage(`${pet.name} removed.`)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not remove pet.")
      }
    })
  }

  const showForm = adding || editingId != null

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <h2 className="font-display text-xl font-medium tracking-tight text-ink sm:text-2xl">
            Pets
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-muted sm:mt-2">
            Profiles for grooming, clinic visits, and shopping preferences.
          </p>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex h-11 w-full items-center justify-center gap-2 bg-ink px-5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 sm:w-auto"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            Add pet
          </button>
        )}
      </div>

      {message && (
        <p className="mb-4 border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800 sm:px-4">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-4 border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700 sm:px-4">
          {error}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 border border-line bg-surface-elevated p-4 sm:mb-8 sm:bg-surface sm:p-5"
        >
          <div className="mb-4 flex items-center justify-between gap-3 sm:mb-5">
            <h3 className="font-display text-base font-medium text-ink sm:text-lg">
              {editingId ? "Edit pet" : "New pet"}
            </h3>
            <button
              type="button"
              onClick={closeForm}
              className="inline-flex min-h-10 items-center gap-1 text-sm text-ink-muted hover:text-ink"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
              Cancel
            </button>
          </div>

          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted sm:text-xs">
                Name
              </span>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                required
                maxLength={80}
                className={`${fieldClass} mt-1.5 min-h-11`}
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted sm:text-xs">
                Species
              </span>
              <select
                value={form.species}
                onChange={(e) => setField("species", e.target.value)}
                className={`${fieldClass} mt-1.5 min-h-11`}
              >
                {SPECIES_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted sm:text-xs">
                Breed
              </span>
              <input
                type="text"
                value={form.breed ?? ""}
                onChange={(e) => setField("breed", e.target.value)}
                maxLength={80}
                className={`${fieldClass} mt-1.5 min-h-11`}
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted sm:text-xs">
                Sex
              </span>
              <select
                value={form.sex ?? ""}
                onChange={(e) => setField("sex", e.target.value)}
                className={`${fieldClass} mt-1.5 min-h-11`}
              >
                <option value="">—</option>
                {SEX_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted sm:text-xs">
                Date of birth
              </span>
              <input
                type="date"
                value={form.dateOfBirth ?? ""}
                onChange={(e) => setField("dateOfBirth", e.target.value)}
                className={`${fieldClass} mt-1.5 min-h-11`}
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted sm:text-xs">
                Weight (kg)
              </span>
              <input
                type="number"
                step="0.1"
                min="0"
                inputMode="decimal"
                value={form.weightKg ?? ""}
                onChange={(e) => setField("weightKg", e.target.value)}
                className={`${fieldClass} mt-1.5 min-h-11`}
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted sm:text-xs">
                Color
              </span>
              <input
                type="text"
                value={form.color ?? ""}
                onChange={(e) => setField("color", e.target.value)}
                maxLength={60}
                className={`${fieldClass} mt-1.5 min-h-11`}
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted sm:text-xs">
                Microchip ID
              </span>
              <input
                type="text"
                value={form.microchipId ?? ""}
                onChange={(e) => setField("microchipId", e.target.value)}
                maxLength={64}
                className={`${fieldClass} mt-1.5 min-h-11`}
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted sm:text-xs">
                Vaccination date
              </span>
              <input
                type="date"
                value={form.vaccinatedAt ?? ""}
                onChange={(e) => setField("vaccinatedAt", e.target.value)}
                className={`${fieldClass} mt-1.5 min-h-11`}
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted sm:text-xs">
                Deworm date
              </span>
              <input
                type="date"
                value={form.dewormedAt ?? ""}
                onChange={(e) => setField("dewormedAt", e.target.value)}
                className={`${fieldClass} mt-1.5 min-h-11`}
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted sm:text-xs">
                BBMP license
              </span>
              <input
                type="text"
                value={form.bbmpLicense ?? ""}
                onChange={(e) => setField("bbmpLicense", e.target.value)}
                maxLength={80}
                className={`${fieldClass} mt-1.5 min-h-11`}
              />
            </label>

            <label className="block">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted sm:text-xs">
                Insurance policy
              </span>
              <input
                type="text"
                value={form.insurancePolicy ?? ""}
                onChange={(e) => setField("insurancePolicy", e.target.value)}
                maxLength={80}
                className={`${fieldClass} mt-1.5 min-h-11`}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted sm:text-xs">
                Photo URL
              </span>
              <input
                type="url"
                value={form.imageUrl ?? ""}
                onChange={(e) => setField("imageUrl", e.target.value)}
                maxLength={500}
                placeholder="https://…"
                className={`${fieldClass} mt-1.5 min-h-11`}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted sm:text-xs">
                Diagnosis
              </span>
              <textarea
                value={form.diagnosis ?? ""}
                onChange={(e) => setField("diagnosis", e.target.value)}
                maxLength={1000}
                rows={2}
                className={`${fieldClass} mt-1.5 resize-y`}
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-muted sm:text-xs">
                Notes
              </span>
              <textarea
                value={form.notes ?? ""}
                onChange={(e) => setField("notes", e.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Temperament, allergies, preferences…"
                className={`${fieldClass} mt-1.5 resize-y`}
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-4 inline-flex h-12 w-full items-center justify-center bg-ink px-6 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50 sm:mt-5 sm:h-11 sm:w-auto"
          >
            {isPending
              ? "Saving…"
              : editingId
                ? "Save changes"
                : "Add pet"}
          </button>
        </form>
      )}

      {pets.length === 0 && !showForm ? (
        <div className="border border-line bg-surface-elevated px-4 py-12 text-center sm:bg-surface sm:px-6 sm:py-16">
          <PawPrint
            className="mx-auto h-8 w-8 text-ink-muted"
            strokeWidth={1.5}
          />
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            No pets yet. Add one so staff know who they&apos;re caring for.
          </p>
          <button
            type="button"
            onClick={openAdd}
            className="mt-6 inline-flex h-11 w-full max-w-xs items-center justify-center gap-2 bg-ink px-6 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} />
            Add pet
          </button>
        </div>
      ) : (
        <ul className="space-y-3 sm:space-y-4">
          {pets.map((pet) => {
            const age = ageLabel(pet.dateOfBirth)
            return (
              <li
                key={pet.id}
                className="flex flex-col gap-3 border border-line bg-surface-elevated p-3 sm:flex-row sm:items-start sm:gap-4 sm:bg-surface sm:p-4"
              >
                {pet.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pet.imageUrl}
                    alt=""
                    className="h-36 w-full shrink-0 object-cover sm:h-28 sm:w-28"
                  />
                ) : (
                  <div className="flex h-28 w-full shrink-0 items-center justify-center border border-dashed border-line bg-surface sm:h-28 sm:w-28 sm:bg-surface-elevated">
                    <PawPrint
                      className="h-6 w-6 text-ink-muted"
                      strokeWidth={1.5}
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-display text-lg font-medium text-ink">
                        {pet.name}
                      </p>
                      <p className="mt-0.5 text-sm text-ink-muted">
                        {[pet.species, pet.breed, pet.sex, age]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:w-auto">
                      <button
                        type="button"
                        onClick={() => openEdit(pet)}
                        disabled={isPending}
                        className="inline-flex min-h-10 items-center justify-center gap-1.5 border border-line bg-surface px-3 py-2 text-xs font-medium uppercase tracking-wide text-ink hover:border-ink/30 disabled:opacity-50 sm:bg-surface-elevated"
                      >
                        <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(pet)}
                        disabled={isPending}
                        className="inline-flex min-h-10 items-center justify-center gap-1.5 px-3 py-2 text-xs text-ink-muted hover:text-red-700 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Remove
                      </button>
                    </div>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    {pet.weightKg != null && (
                      <div>
                        <dt className="text-[10px] uppercase tracking-wide text-ink-muted sm:text-xs">
                          Weight
                        </dt>
                        <dd className="text-ink">{pet.weightKg} kg</dd>
                      </div>
                    )}
                    {pet.color && (
                      <div>
                        <dt className="text-[10px] uppercase tracking-wide text-ink-muted sm:text-xs">
                          Color
                        </dt>
                        <dd className="text-ink">{pet.color}</dd>
                      </div>
                    )}
                    {pet.microchipId && (
                      <div className="sm:col-span-2">
                        <dt className="text-[10px] uppercase tracking-wide text-ink-muted sm:text-xs">
                          Microchip
                        </dt>
                        <dd className="break-all font-mono text-xs text-ink">
                          {pet.microchipId}
                        </dd>
                      </div>
                    )}
                    {pet.vaccinatedAt && (
                      <div>
                        <dt className="text-[10px] uppercase tracking-wide text-ink-muted sm:text-xs">
                          Vaccinated
                        </dt>
                        <dd className="text-ink">{pet.vaccinatedAt}</dd>
                      </div>
                    )}
                    {pet.dewormedAt && (
                      <div>
                        <dt className="text-[10px] uppercase tracking-wide text-ink-muted sm:text-xs">
                          Dewormed
                        </dt>
                        <dd className="text-ink">{pet.dewormedAt}</dd>
                      </div>
                    )}
                    {pet.bbmpLicense && (
                      <div>
                        <dt className="text-[10px] uppercase tracking-wide text-ink-muted sm:text-xs">
                          BBMP license
                        </dt>
                        <dd className="text-ink">{pet.bbmpLicense}</dd>
                      </div>
                    )}
                    {pet.insurancePolicy && (
                      <div>
                        <dt className="text-[10px] uppercase tracking-wide text-ink-muted sm:text-xs">
                          Insurance
                        </dt>
                        <dd className="text-ink">{pet.insurancePolicy}</dd>
                      </div>
                    )}
                    {pet.diagnosis && (
                      <div className="sm:col-span-2">
                        <dt className="text-[10px] uppercase tracking-wide text-ink-muted sm:text-xs">
                          Diagnosis
                        </dt>
                        <dd className="whitespace-pre-wrap text-ink">
                          {pet.diagnosis}
                        </dd>
                      </div>
                    )}
                    {pet.notes && (
                      <div className="sm:col-span-2">
                        <dt className="text-[10px] uppercase tracking-wide text-ink-muted sm:text-xs">
                          Notes
                        </dt>
                        <dd className="leading-relaxed text-ink-muted">
                          {pet.notes}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
