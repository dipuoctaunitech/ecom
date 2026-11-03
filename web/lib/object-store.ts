import { promises as fs } from "fs"
import path from "path"

const STORAGE_ROOT = path.resolve(
  process.cwd(),
  process.env.UPLOAD_STORAGE_DIR ?? "../storage/uploads"
)

function resolveKeyPath(key: string) {
  if (
    !key ||
    key.includes("..") ||
    key.startsWith("/") ||
    key.includes("\\")
  ) {
    throw new Error("Invalid storage key.")
  }
  return path.join(STORAGE_ROOT, key)
}

export async function putStoredObject(
  key: string,
  body: Buffer,
  contentType: string
) {
  const dest = resolveKeyPath(key)
  await fs.mkdir(path.dirname(dest), { recursive: true })
  await fs.writeFile(dest, body)
  await fs.writeFile(
    `${dest}.meta.json`,
    JSON.stringify({ contentType }),
    "utf8"
  )
}

export async function getStoredObject(key: string) {
  const dest = resolveKeyPath(key)
  try {
    const body = await fs.readFile(dest)
    let contentType: string | undefined
    try {
      const meta = JSON.parse(await fs.readFile(`${dest}.meta.json`, "utf8")) as {
        contentType?: string
      }
      contentType = meta.contentType
    } catch {
      contentType = undefined
    }
    return { body, contentType }
  } catch {
    return null
  }
}
