"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, TrendingUp } from "lucide-react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

const performanceData = [
  { month: "Jan", applications: 120, hired: 18, interviews: 45 },
  { month: "Feb", applications: 150, hired: 22, interviews: 58 },
  { month: "Mar", applications: 180, hired: 28, interviews: 72 },
  { month: "Apr", applications: 165, hired: 25, interviews: 65 },
  { month: "May", applications: 210, hired: 35, interviews: 88 },
  { month: "Jun", applications: 245, hired: 42, interviews: 102 },
  { month: "Jul", applications: 280, hired: 48, interviews: 115 },
]

function CustomTooltip({
  active,
  payload,
  label,
}: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium mb-2">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-xs" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export function PerformanceOverview() {
  return (
    <Card className="animate-fade-in" style={{ animationDelay: "400ms" }}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg font-semibold">Candidate Performance Overview</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="6months">
            <SelectTrigger className="w-[140px] h-9 bg-secondary/50">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30days">Last 30 days</SelectItem>
              <SelectItem value="3months">Last 3 months</SelectItem>
              <SelectItem value="6months">Last 6 months</SelectItem>
              <SelectItem value="1year">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="gap-1.5 bg-transparent">
            <TrendingUp className="w-4 h-4" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={performanceData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#d97756" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#d97756" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorInterviews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5b8def" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#5b8def" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorHired" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4ade80" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4ade80" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="month" stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#888" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="applications"
                stroke="#d97756"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorApplications)"
                name="Applications"
              />
              <Area
                type="monotone"
                dataKey="interviews"
                stroke="#5b8def"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorInterviews)"
                name="Interviews"
              />
              <Area
                type="monotone"
                dataKey="hired"
                stroke="#4ade80"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorHired)"
                name="Hired"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#d97756]" />
            <span className="text-sm text-muted-foreground">Applications</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#5b8def]" />
            <span className="text-sm text-muted-foreground">Interviews</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#4ade80]" />
            <span className="text-sm text-muted-foreground">Hired</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
