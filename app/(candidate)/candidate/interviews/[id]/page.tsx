"use client"

import { useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function InterviewRedirect({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter()
    const { id } = use(params)

    useEffect(() => {
        if (id) {
            router.replace(`/candidate/interviews/${id}/psychometric`)
        }
    }, [id, router])

    return (
        <div className="min-h-screen bg-[#1e1e1e] flex items-center justify-center text-white">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                <p className="text-gray-400">Loading assessment...</p>
            </div>
        </div>
    )
}