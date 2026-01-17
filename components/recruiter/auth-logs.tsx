"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Shield, LogIn, LogOut, UserPlus, Key, AlertTriangle, CheckCircle2, Clock, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { useState } from "react"

const authLogs = [
  {
    id: 1,
    action: "login",
    user: "admin@resumex.com",
    ip: "192.168.1.105",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    status: "success",
    device: "Chrome on Windows",
  },
  {
    id: 2,
    action: "permission_change",
    user: "hr@resumex.com",
    ip: "192.168.1.120",
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    status: "success",
    details: "Role updated to HR Manager",
  },
  {
    id: 3,
    action: "failed_login",
    user: "unknown@example.com",
    ip: "203.45.67.89",
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    status: "failed",
    details: "Invalid credentials - 3rd attempt",
  },
  {
    id: 4,
    action: "new_user",
    user: "recruiter@resumex.com",
    ip: "192.168.1.115",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    status: "success",
    details: "Account created by admin",
  },
  {
    id: 5,
    action: "logout",
    user: "manager@resumex.com",
    ip: "192.168.1.100",
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    status: "success",
    device: "Safari on macOS",
  },
  {
    id: 6,
    action: "password_reset",
    user: "staff@resumex.com",
    ip: "192.168.1.130",
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
    status: "success",
    details: "Password reset successful",
  },
]

const actionIcons = {
  login: LogIn,
  logout: LogOut,
  new_user: UserPlus,
  permission_change: Key,
  failed_login: AlertTriangle,
  password_reset: Key,
}

const actionLabels = {
  login: "User Login",
  logout: "User Logout",
  new_user: "New User Created",
  permission_change: "Permission Change",
  failed_login: "Failed Login",
  password_reset: "Password Reset",
}

export function AuthLogs() {
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = () => {
    setIsRefreshing(true)
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  return (
    <Card className="animate-fade-in" style={{ animationDelay: "500ms" }}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Auth Logs
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Live
          </Badge>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh}>
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            View All Logs
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[280px] pr-4">
          <div className="space-y-3">
            {authLogs.map((log, index) => {
              const Icon = actionIcons[log.action as keyof typeof actionIcons]
              const isFailed = log.status === "failed"

              return (
                <div
                  key={log.id}
                  className={cn(
                    "p-4 rounded-xl border transition-all duration-300 hover:shadow-md group",
                    isFailed
                      ? "bg-destructive/5 border-destructive/20 hover:border-destructive/40"
                      : "bg-secondary/50 border-transparent hover:bg-secondary hover:border-border",
                  )}
                  style={{ animationDelay: `${(index + 6) * 50}ms` }}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div
                      className={cn(
                        "p-2 rounded-lg transition-transform duration-200 group-hover:scale-110",
                        isFailed ? "bg-destructive/20" : "bg-primary/10",
                      )}
                    >
                      <Icon className={cn("w-4 h-4", isFailed ? "text-destructive" : "text-primary")} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium truncate">
                          {actionLabels[log.action as keyof typeof actionLabels]}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] shrink-0",
                            isFailed
                              ? "bg-destructive/20 text-destructive border-destructive/30"
                              : "bg-success/20 text-success border-success/30",
                          )}
                        >
                          {isFailed ? (
                            <AlertTriangle className="w-3 h-3 mr-1" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                          )}
                          {log.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="truncate">{log.user}</span>
                        <span className="text-border">•</span>
                        <span className="font-mono text-xs">{log.ip}</span>
                      </div>
                      {(log.details || log.device) && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{log.details || log.device}</p>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
