"use client"

import { UserButton } from "@clerk/nextjs"

export function Header() {
  return (
    // FIX: Changed 'justify-between' to 'justify-end' so the profile stays on the right
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-end sticky top-0 z-40">
      
      {/* Right Side Actions */}
      <div className="flex items-center gap-4">
        
        {/* Clerk User Profile Button */}
        <UserButton 
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: "h-9 w-9",
              userButtonPopoverCard: "bg-card border border-border",
              userButtonPopoverActionButton: "hover:bg-secondary text-foreground",
              userButtonPopoverActionButtonText: "text-foreground",
              userButtonPopoverFooter: "hidden"
            }
          }}
        />
      </div>
    </header>
  )
}