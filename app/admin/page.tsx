"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ShieldAlert, Users, Briefcase, Lock, Clock } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function AdminPage() {
  // --- LOGIN STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  // --- DASHBOARD STATE ---
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch data only after login
  useEffect(() => {
    if (isAuthenticated) {
      fetch("http://127.0.0.1:5000/api/admin/users")
        .then(res => res.json())
        .then(data => {
          setUsers(data)
          setLoading(false)
        })
        .catch(err => console.error(err))
    }
  }, [isAuthenticated])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (username === "admin" && password === "1234") {
      setIsAuthenticated(true)
      setError("")
    } else {
      setError("Invalid credentials")
    }
  }

  // --- 1. SHOW LOGIN SCREEN IF NOT AUTHENTICATED ---
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background animate-fade-in">
        <Card className="w-full max-w-sm border-border bg-card shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-4">
               <div className="p-3 bg-primary/10 rounded-full">
                  <Lock className="w-6 h-6 text-primary" />
               </div>
            </div>
            <CardTitle className="text-2xl text-center font-bold">Admin Access</CardTitle>
            <CardDescription className="text-center">
              Enter your secure credentials
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input 
                  id="username" 
                  placeholder="admin" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500 text-center font-medium">{error}</p>}
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full">Sign In</Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    )
  }

  // --- 2. SHOW DASHBOARD IF AUTHENTICATED ---
  return (
    <div className="p-8 space-y-8 animate-fade-in max-w-6xl mx-auto min-h-screen">
      <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-red-500" />
            <div>
               <h1 className="text-3xl font-bold">Admin Portal</h1>
               <p className="text-muted-foreground">Real-time Auth Log & User Management</p>
            </div>
         </div>
         <Button variant="outline" onClick={() => setIsAuthenticated(false)}>Sign Out</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">Total Users</CardTitle>
               <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
               <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
         </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">Candidates</CardTitle>
               <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
               <div className="text-2xl font-bold">{users.filter(u => u.role === 'Candidate').length}</div>
            </CardContent>
         </Card>
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
               <CardTitle className="text-sm font-medium">Recruiters</CardTitle>
               <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
               <div className="text-2xl font-bold">{users.filter(u => u.role === 'Recruiter').length}</div>
            </CardContent>
         </Card>
      </div>

      <Card className="bg-card border-border">
         <CardHeader>
            <CardTitle>User Login History</CardTitle>
         </CardHeader>
         <CardContent>
            <Table>
               <TableHeader>
                  <TableRow>
                     <TableHead>Role</TableHead>
                     <TableHead>Name</TableHead>
                     <TableHead>Email</TableHead>
                     <TableHead className="text-right">Last Active</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody>
                  {loading ? (
                     <TableRow><TableCell colSpan={4} className="text-center py-4">Loading logs...</TableCell></TableRow>
                  ) : users.length === 0 ? (
                     <TableRow><TableCell colSpan={4} className="text-center py-4">No activity found yet.</TableCell></TableRow>
                  ) : (
                     users.map((user, i) => (
                        <TableRow key={i}>
                           <TableCell>
                              <Badge variant={user.role === 'Recruiter' ? 'default' : user.role === 'Candidate' ? 'secondary' : 'outline'}>
                                 {user.role}
                              </Badge>
                           </TableCell>
                           <TableCell className="font-medium">{user.name}</TableCell>
                           <TableCell>{user.email}</TableCell>
                           <TableCell className="text-right text-sm text-muted-foreground">
                              <div className="flex items-center justify-end gap-2">
                                <Clock className="w-3 h-3" /> {user.last_login}
                              </div>
                           </TableCell>
                        </TableRow>
                     ))
                  )}
               </TableBody>
            </Table>
         </CardContent>
      </Card>
    </div>
  )
}