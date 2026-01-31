import { auth, clerkClient } from "@clerk/nextjs/server"
import { ShieldAlert, Trash2, Ban, Database, AlertTriangle, Users } from "lucide-react"
import { 
  banUserAction, 
  deleteUserAction, 
  resetDatabaseAction 
} from "./actions"

// 🔒 SUPER ADMIN SECURITY CHECK
const SUPER_ADMINS = [
  "pravinleein@gmail.com",     // <--- UPDATE THIS
  // <--- UPDATE THIS
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

  // 3. FETCH DATA (Only Users now)
  const userList = await client.users.getUserList({ limit: 50 })

  return (
    <div className="min-h-screen bg-[#0f0505] text-white p-8">
      
      {/* HEADER */}
      <div className="flex items-center justify-between mb-12 border-b border-[#2d1010] pb-6">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-red-900/20 rounded-lg border border-red-900/50">
                <ShieldAlert className="w-8 h-8 text-red-500" />
            </div>
            <div>
                <h1 className="text-3xl font-bold">Super Admin Console</h1>
                <p className="text-[#b8a0a0]">Manage database and user access.</p>
            </div>
        </div>
        <div className="text-right text-sm text-[#5a3030]">
            Logged in as <span className="text-white font-mono">{email}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* SECTION 1: DANGER ZONE (Database) */}
        <div className="col-span-1 lg:col-span-2 bg-[#1a0505] border border-red-900/30 rounded-xl p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
                <Database className="w-32 h-32 text-red-500" />
            </div>
            
            <h2 className="text-2xl font-bold text-red-500 flex items-center gap-2 mb-6">
                <AlertTriangle className="w-6 h-6" />
                Danger Zone
            </h2>

            <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 p-6 border border-red-900/30 rounded-lg bg-[#2a0a0a]">
                    <h3 className="font-bold text-lg mb-2">Reset Database</h3>
                    <p className="text-[#b8a0a0] text-sm mb-4">
                        Executes <code>reset_db.py</code> to drop and recreate all Supabase tables.
                    </p>
                    
                    {/* RESET BUTTON */}
                    <form action={resetDatabaseAction}>
                        <button 
                            type="submit" 
                            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg hover:shadow-red-900/20"
                        >
                            <Trash2 className="w-4 h-4" />
                            Wipe & Re-Schema DB
                        </button>
                    </form>
                </div>
            </div>
        </div>

        {/* SECTION 2: USERS (Expanded to full width since Org is gone) */}
        <div className="col-span-1 lg:col-span-2 bg-[#1a0505] border border-[#2d1010] rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#ff8080]" />
                Users ({userList.totalCount})
            </h2>
            
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
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
                                <button type="submit" className="p-2 text-[#5a3030] hover:text-orange-500 hover:bg-orange-950/30 rounded transition-all" title="Ban User">
                                    <Ban className="w-5 h-5" />
                                </button>
                            </form>
                            
                            {/* Delete User */}
                            <form action={deleteUserAction}>
                                <input type="hidden" name="userId" value={u.id} />
                                <button type="submit" className="p-2 text-[#5a3030] hover:text-red-500 hover:bg-red-950/30 rounded transition-all" title="Delete User">
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </form>
                        </div>
                    </div>
                ))}
            </div>
        </div>

      </div>
    </div>
  )
}