// Removed: import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { PerformanceOverview } from "@/components/recruiter/performance-overview"
import { Card, CardContent } from "@/components/ui/card"
import { BarChart3, TrendingUp, Users, Target } from "lucide-react"

// Additional analytics stats
const analyticsStats = [
  { label: "Conversion Rate", value: "18.2%", icon: Target, change: "+2.1%" },
  { label: "Avg. Time to Hire", value: "23 days", icon: TrendingUp, change: "-3 days" },
  { label: "Active Pipelines", value: "12", icon: Users, change: "+2" },
]

export default function AnalyticsPage() {
  return (
    // FIX: Removed <DashboardLayout> wrapper. 
    // The main Layout.tsx now handles the Sidebar and Header automatically.
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <BarChart3 className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">Track recruitment performance and metrics</p>
        </div>
      </div>

      {/* Analytics Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {analyticsStats.map((stat, index) => (
          <Card
            key={stat.label}
            className="group hover:border-primary/30 transition-all duration-300 hover:shadow-lg animate-fade-in"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs font-medium text-success">{stat.change} from last month</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance Overview Chart */}
      <PerformanceOverview />
    </div>
  )
}