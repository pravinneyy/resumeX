import { auth, clerkClient } from "@clerk/nextjs/server"
import { ShieldAlert, Database, Users } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DatabaseManager from "./database-manager"
import {
    banUserAction,
    deleteUserAction,
    resetDatabaseAction
} from "./actions"
import { Button } from "@/components/ui/button"
import { Trash2, Ban } from "lucide-react"

// 🔒 SUPER ADMIN SECURITY CHECK
const SUPER_ADMINS = [
    "pravinleein@gmail.com",
    "adarshsr2210703@gmail.com"

]

export default async function AdminDashboard() {
    const { userId } = await auth()
    const client = await clerkClient()

    // 1. GET USER EMAIL
    const user = await client.users.getUser(userId!)
    const email = user.emailAddresses[0].emailAddress

    // 2. CHECK AUTHORIZATION
    if (!SUPER_ADMINS.includes(email)) {
        return (
            <div className="h-screen w-full bg-[#0f0505] flex flex-col items-center justify-center text-white p-4 text-center">
                <ShieldAlert className="w-16 h-16 text-red-600 mb-4" />
                <h1 className="text-3xl font-bold mb-2">ACCESS DENIED</h1>
                <p className="text-[#b8a0a0]">You are not authorized to view the Super Admin Console.</p>
                <p className="text-xs text-[#5a3030] mt-4">Current User: {email}</p>
            </div>
        )
    }

    // 3. FETCH DATA
    const userList = await client.users.getUserList({ limit: 50 })

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a0505] to-[#0a0a0a] text-white">

            {/* HEADER */}
            <div className="border-b border-[#2d1010] bg-[#0f0505]/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-red-900/20 rounded-lg border border-red-900/50">
                                <ShieldAlert className="w-8 h-8 text-red-500" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold">Super Admin Console</h1>
                                <p className="text-[#b8a0a0]">Complete system management</p>
                            </div>
                        </div>
                        <div className="text-right text-sm text-[#5a3030]">
                            Logged in as <span className="text-white font-mono">{email}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* TABS */}
            <div className="max-w-7xl mx-auto px-8 py-8">
                <Tabs defaultValue="database" className="w-full">
                    <TabsList className="bg-[#1a0505] border border-[#2d1010] mb-8">
                        <TabsTrigger value="database" className="data-[state=active]:bg-red-900/20">
                            <Database className="w-4 h-4 mr-2" />
                            Database Manager
                        </TabsTrigger>
                        <TabsTrigger value="users" className="data-[state=active]:bg-red-900/20">
                            <Users className="w-4 h-4 mr-2" />
                            User Management
                        </TabsTrigger>
                    </TabsList>

                    {/* DATABASE MANAGER TAB */}
                    <TabsContent value="database">
                        <DatabaseManager />
                    </TabsContent>

                    {/* USER MANAGEMENT TAB */}
                    <TabsContent value="users">
                        <div className="bg-[#1a0505] border border-[#2d1010] rounded-xl p-6">
                            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <Users className="w-5 h-5 text-[#ff8080]" />
                                Users ({userList.totalCount})
                            </h2>

                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                                {userList.data.map((u) => (
                                    <div key={u.id} className="flex items-center justify-between p-4 bg-[#0f0505] rounded-lg border border-[#2d1010] group hover:border-[#5a3030] transition-colors">
                                        <div className="flex items-center gap-3">
                                            <img src={u.imageUrl} className="w-10 h-10 rounded-full bg-[#2d1010]" alt="" />
                                            <div>
                                                <h4 className="font-bold text-white">{u.firstName} {u.lastName}</h4>
                                                <p className="text-xs text-[#5a3030] font-mono">{u.emailAddresses[0]?.emailAddress}</p>
                                                <p className="text-[10px] text-[#402020] mt-1">ID: {u.id}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {/* Ban User */}
                                            <form action={banUserAction}>
                                                <input type="hidden" name="userId" value={u.id} />
                                                <Button type="submit" variant="ghost" size="sm" className="text-[#5a3030] hover:text-orange-500">
                                                    <Ban className="w-5 h-5" />
                                                </Button>
                                            </form>

                                            {/* Delete User */}
                                            <form action={deleteUserAction}>
                                                <input type="hidden" name="userId" value={u.id} />
                                                <Button type="submit" variant="ghost" size="sm" className="text-[#5a3030] hover:text-red-500">
                                                    <Trash2 className="w-5 h-5" />
                                                </Button>
                                            </form>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}