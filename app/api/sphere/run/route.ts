import { NextResponse } from "next/server"

const SPHERE_API = "https://api.compilers.sphere-engine.com/api/v4"
const TOKEN = process.env.SPHERE_COMPILERS_TOKEN

export async function POST(req: Request) {
  const { code, language, stdin } = await req.json()

  // 1. Submit
  const submitRes = await fetch(
    `${SPHERE_API}/submissions?access_token=${TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sourceCode: code,
        language: 116, // Python 3 (Sphere Engine ID)
        input: stdin || "",
      }),
    }
  )

  const submitData = await submitRes.json()
  const id = submitData.id

  // 2. Poll
  while (true) {
    const res = await fetch(
      `${SPHERE_API}/submissions/${id}?access_token=${TOKEN}`
    )
    const data = await res.json()

    if (data.status?.name !== "running") {
      return NextResponse.json({
        stdout: data.output,
        stderr: data.error,
        time: data.time,
        memory: data.memory,
        status: data.status?.name,
      })
    }

    await new Promise(r => setTimeout(r, 800))
  }
}
