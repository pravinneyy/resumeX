"use client"

export function BackgroundElements() {
  return (
    // FIX: Added the background color gradient HERE so particles sit on top of it
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#2d1010]">
      {/* Gradient Overlay to match your theme */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#5a2020] via-[#4a1c1c] to-[#2d1010] opacity-90" />
      
      <style jsx global>{`
        @keyframes float-around {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(80px, -50px) rotate(8deg); }
          50% { transform: translate(30px, 70px) rotate(-5deg); }
          75% { transform: translate(-60px, 30px) rotate(5deg); }
        }
        @keyframes float-around-reverse {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(-50px, 80px) rotate(-8deg); }
          50% { transform: translate(70px, 30px) rotate(5deg); }
          75% { transform: translate(30px, -60px) rotate(-5deg); }
        }
        @keyframes rotate-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.15]" 
        style={{
          backgroundImage: `
            linear-gradient(rgba(232, 160, 160, 0.6) 1px, transparent 1px),
            linear-gradient(90deg, rgba(232, 160, 160, 0.6) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Big Corner Circles */}
      <div className="absolute top-0 left-0 w-96 h-96 opacity-20" style={{ animation: "rotate-slow 80s linear infinite" }}>
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle cx="0" cy="0" r="180" fill="none" stroke="#ff8080" strokeWidth="1" opacity="0.5" />
          <circle cx="0" cy="0" r="120" fill="none" stroke="#ff8080" strokeWidth="1" opacity="0.3" />
        </svg>
      </div>

      <div className="absolute bottom-0 right-0 w-[450px] h-[450px] opacity-20" style={{ animation: "rotate-slow 70s linear infinite reverse" }}>
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle cx="200" cy="200" r="200" fill="none" stroke="#ff8080" strokeWidth="1" opacity="0.4" />
        </svg>
      </div>

      {/* --- Floating Particles (Increased Opacity) --- */}
      
      {/* 1. Square */}
      <div className="absolute top-[55%] left-[65%] w-48 h-48 opacity-25" style={{ animation: "float-around 25s ease-in-out infinite 3s" }}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <rect x="10" y="10" width="80" height="80" fill="none" stroke="#ff8080" strokeWidth="1.5" rx="10" />
        </svg>
      </div>
      
      {/* 2. Triangle */}
      <div className="absolute top-[20%] left-[10%] w-32 h-32 opacity-25" style={{ animation: "float-around 28s ease-in-out infinite" }}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <polygon points="50,15 90,85 10,85" fill="none" stroke="#ff8080" strokeWidth="1.5" />
        </svg>
      </div>

      {/* 3. Cross */}
      <div className="absolute bottom-[40%] right-[10%] w-24 h-24 opacity-30" style={{ animation: "float-around-reverse 30s ease-in-out infinite 5s" }}>
         <svg viewBox="0 0 100 100" className="w-full h-full">
          <line x1="10" y1="50" x2="90" y2="50" stroke="#ff8080" strokeWidth="3" />
          <line x1="50" y1="10" x2="50" y2="90" stroke="#ff8080" strokeWidth="3" />
        </svg>
      </div>
    </div>
  )
}