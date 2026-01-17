
"use client"

import { useEffect, useState } from "react"

interface ParticleStyle {
  left: string
  top: string
  animationDelay: string
  animationDuration: string
}

export function ParticleBackground() {
  const [particles, setParticles] = useState<ParticleStyle[]>([])

  useEffect(() => {
    const newParticles: ParticleStyle[] = []
    for (let i = 0; i < 20; i++) {
      newParticles.push({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 3}s`,
        animationDuration: `${2 + Math.random() * 3}s`,
      })
    }
    setParticles(newParticles)
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden">
      {particles.map((style, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-[#e8a0a0]/30 rounded-full animate-pulse"
          style={style}
        />
      ))}
    </div>
  )
}
