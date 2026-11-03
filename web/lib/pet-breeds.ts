export const DOG_BREEDS = [
  "Indie / Mixed",
  "Labrador Retriever",
  "Golden Retriever",
  "German Shepherd",
  "Beagle",
  "Pug",
  "Shih Tzu",
  "Pomeranian",
  "Indian Pariah",
  "Rottweiler",
  "Doberman",
  "Dachshund",
  "Cocker Spaniel",
  "Boxer",
  "Husky",
  "Other",
] as const

export const CAT_BREEDS = [
  "Indie / Mixed",
  "Domestic Shorthair",
  "Persian",
  "Siamese",
  "Maine Coon",
  "Bengal",
  "British Shorthair",
  "Ragdoll",
  "Sphynx",
  "Other",
] as const

export function breedsForSpecies(species: "Dog" | "Cat"): readonly string[] {
  return species === "Cat" ? CAT_BREEDS : DOG_BREEDS
}
