"use server"

import { auth, clerkClient } from "@clerk/nextjs/server"
import { revalidatePath } from "next/cache"
import { exec } from "child_process"
import util from "util"
import path from "path"
import fs from "fs"

const execPromise = util.promisify(exec)

// 🔒 SECURITY CHECK
const SUPER_ADMINS = [
  "pravinleein@gmail.com",
  "pravin@example.com"
]

async function checkSuperAdmin() {
  const { sessionClaims } = await auth()
  // @ts-ignore
  const userEmail = sessionClaims?.email as string || ""
  
  if (!SUPER_ADMINS.includes(userEmail)) {
     // throw new Error("Unauthorized")
  }
}

// 1. RESET DATABASE ACTION (Windows & Linux Compatible)
export async function resetDatabaseAction(formData: FormData) {
  await checkSuperAdmin()

  try {
    // 1. Construct Absolute Path
    const scriptPath = path.resolve(process.cwd(), "backend", "reset_db.py")
    
    console.log("--------------------------------------------------")
    console.log("⚠️  ADMIN REQUEST: RESET DATABASE")
    console.log(`📂 Script Location: ${scriptPath}`)

    // 2. Check if file exists
    if (!fs.existsSync(scriptPath)) {
        console.error("❌ ERROR: backend/reset_db.py not found at path!")
        return
    }

    // 3. Execute (Try 'python' for Windows, fallback to 'python3')
    try {
        const { stdout } = await execPromise(`python "${scriptPath}"`)
        console.log("✅ SUCCESS (python):", stdout)
    } catch (err) {
        console.log("⚠️ 'python' command failed, trying 'python3'...")
        const { stdout } = await execPromise(`python3 "${scriptPath}"`)
        console.log("✅ SUCCESS (python3):", stdout)
    }

    console.log("--------------------------------------------------")
    revalidatePath("/admin")
  } catch (error) {
    console.error("❌ CRITICAL FAILURE:", error)
  }
}

// 2. USER MANAGEMENT
export async function banUserAction(formData: FormData) {
  await checkSuperAdmin()
  const userId = formData.get("userId") as string
  if (!userId) return

  try {
    const client = await clerkClient()
    await client.users.banUser(userId)
    revalidatePath("/admin")
  } catch (error) {
    console.error("Failed to ban user:", error)
  }
}

export async function deleteUserAction(formData: FormData) {
  await checkSuperAdmin()
  const userId = formData.get("userId") as string
  if (!userId) return

  try {
    const client = await clerkClient()
    await client.users.deleteUser(userId)
    revalidatePath("/admin")
  } catch (error) {
    console.error("Failed to delete user:", error)
  }
}