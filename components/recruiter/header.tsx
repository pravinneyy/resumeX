"use client"

import { UserButton } from "@clerk/nextjs"
import { Bell, Search, Settings } from "lucide-react"
import { Input } from "@/components/ui/input"

export function Header() {
  return (
    // FIX: Using 'bg-card' and 'border-border' matches your CSS variables
    <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between sticky top-0 z-40">
      
      {/* Search Bar */}
      <div className="flex items-center w-full max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search candidates, jobs, or analytics..."
            // FIX: 'bg-secondary' makes the input slightly lighter than the header, typical for dark mode
            className="w-full bg-secondary border-none pl-9 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
          />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-4">
        <button className="text-muted-foreground hover:text-foreground transition-colors relative">
          <Bell className="h-5 w-5" />
          {/* Notification Dot */}
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-primary text-[10px] text-primary-foreground flex items-center justify-center rounded-full font-bold">
            2
          </span>
        </button>
        
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="h-5 w-5" />
        </button>

        <div className="h-6 w-px bg-border mx-2" />

        {/* FIX: Clerk User Profile Button */}
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