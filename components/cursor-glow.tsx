"use client"

import { useEffect, useState } from "react"

export function CursorGlow() {
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY })
      setIsVisible(true)
    }

    const handleMouseLeave = () => {
      setIsVisible(false)
    }

    window.addEventListener("mousemove", handleMouseMove)
    document.body.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      document.body.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [])

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{
        opacity: isVisible ? 1 : 0,
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -50%)",
        transition: "opacity 0.5s ease",
      }}
    >
      <div
        className="absolute"
        style={{
          width: "250px",
          height: "250px",
          background:
            "radial-gradient(circle at 50% 50%, rgba(232, 160, 160, 0.06) 0%, rgba(232, 160, 160, 0.02) 40%, transparent 70%)",
          transform: "translate(-50%, -50%)",
          filter: "blur(30px)",
        }}
      />
    </div>
  )
}
