"use client"

import { useState, useEffect } from "react"
import { Database, Trash2, RefreshCw, Edit2, Save, X, AlertTriangle, Table2, Eye, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"

interface TableInfo {
    table_name: string
    row_count: number
    error?: string
}

interface TableData {
    table_name: string
    total_count: number
    returned_count: number
    data: Record<string, any>[]
}

const MANAGED_TABLES = [
    { name: "recruiters", icon: "👔", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
    { name: "candidates", icon: "👤", color: "bg-green-500/20 text-green-400 border-green-500/30" },
    { name: "jobs", icon: "💼", color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
    { name: "applications", icon: "📋", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
    { name: "problems", icon: "🧩", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
]

export default function DatabaseManager() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL 
    const [tables, setTables] = useState<TableInfo[]>([])
    const [selectedTable, setSelectedTable] = useState<string | null>(null)
    const [tableData, setTableData] = useState<TableData | null>(null)
    const [editingRecord, setEditingRecord] = useState<Record<string, any> | null>(null)
    const [loading, setLoading] = useState(false)
    const [expandedTable, setExpandedTable] = useState<string | null>(null)

    useEffect(() => {
        fetchTables()
    }, [])

    const fetchTables = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/tables`)
            const data = await res.json()
            setTables(data.tables || [])
        } catch (error) {
            console.error("Failed to fetch tables:", error)
        }
    }

    const fetchTableData = async (tableName: string) => {
        setLoading(true)
        try {
            const res = await fetch(`${API_URL}/api/admin/table/${tableName}?limit=100`)

            if (!res.ok) {
                console.error(`Failed to fetch table data: ${res.status} ${res.statusText}`)
                alert(`Error: ${res.status} - Unable to fetch table data`)
                setLoading(false)
                return
            }

            const data = await res.json()

            if (!data || !data.data) {
                console.error("Invalid response format:", data)
                alert("Error: Invalid response from server")
                setLoading(false)
                return
            }

            setTableData(data)
            setSelectedTable(tableName)
            setExpandedTable(tableName)
        } catch (error) {
            console.error("Failed to fetch table data:", error)
            alert("Error: Unable to connect to backend. Make sure it's running on port 8000.")
        } finally {
            setLoading(false)
        }
    }

    const deleteRecord = async (tableName: string, recordId: string) => {
        if (!confirm(`Delete record ${recordId} from ${tableName}?`)) return

        try {
            const res = await fetch(`${API_URL}/api/admin/table/${tableName}/record/${recordId}`, {
                method: "DELETE"
            })

            if (res.ok) {
                alert("Record deleted successfully")
                fetchTableData(tableName)
                fetchTables() // Refresh counts
            } else {
                alert("Failed to delete record")
            }
        } catch (error) {
            console.error("Delete error:", error)
            alert("Error deleting record")
        }
    }

    const updateRecord = async (tableName: string, recordId: string, updates: Record<string, any>) => {
        try {
            const res = await fetch(`${API_URL}/api/admin/table/${tableName}/record/${recordId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ updates })
            })

            if (res.ok) {
                alert("Record updated successfully")
                setEditingRecord(null)
                fetchTableData(tableName)
            } else {
                alert("Failed to update record")
            }
        } catch (error) {
            console.error("Update error:", error)
            alert("Error updating record")
        }
    }

    const clearTable = async (tableName: string) => {
        if (!confirm(`⚠️ Clear ALL data from ${tableName}?\n\nNote: This will also clear dependent tables to avoid foreign key errors.\n\nThis cannot be undone!`)) return

        try {
            const res = await fetch(`${API_URL}/api/admin/table/${tableName}/clear`, {
                method: "DELETE"
            })

            if (res.ok) {
                const result = await res.json()

                // Show detailed deletion info
                let message = `✅ Cleared ${result.deleted_count} records from ${tableName}`

                if (result.all_deletions) {
                    message += "\n\n📊 Deletion Details:\n"
                    for (const [table, count] of Object.entries(result.all_deletions)) {
                        message += `\n• ${table}: ${count} records`
                    }
                }

                alert(message)
                fetchTableData(tableName)
                fetchTables()
            } else {
                const error = await res.json()
                alert(`Error: ${error.detail || 'Failed to clear table'}`)
            }
        } catch (error) {
            console.error("Clear error:", error)
            alert("Error clearing table: " + error)
        }
    }

    const resetAllTables = async () => {
        if (!confirm("⚠️ DANGER: This will delete ALL data from ALL tables! Are you absolutely sure?")) return
        if (!confirm("⚠️ FINAL WARNING: This action cannot be undone. Type YES to confirm.")) return

        try {
            const res = await fetch(`${API_URL}/api/admin/reset-all-tables`, {
                method: "POST"
            })

            if (res.ok) {
                const result = await res.json()
                alert("Database reset successfully!\n" + JSON.stringify(result.deleted_counts, null, 2))
                fetchTables()
                setTableData(null)
                setSelectedTable(null)
            }
        } catch (error) {
            console.error("Reset error:", error)
            alert("Error resetting database")
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a0505] to-[#0a0a0a] text-white p-8">

            {/* Header */}
            <div className="max-w-7xl mx-auto mb-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-900/20 rounded-lg border border-red-900/50">
                            <Database className="w-8 h-8 text-red-500" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">Database Manager</h1>
                            <p className="text-[#b8a0a0]">Manage all tables with CRUD operations</p>
                        </div>
                    </div>

                    <Button
                        onClick={resetAllTables}
                        variant="destructive"
                        className="bg-red-600 hover:bg-red-700"
                    >
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Reset All Tables
                    </Button>
                </div>
            </div>

            {/* Tables Grid */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {MANAGED_TABLES.map((table) => {
                    const tableInfo = tables.find(t => t.table_name === table.name)
                    const isExpanded = expandedTable === table.name

                    return (
                        <Card key={table.name} className={`bg-[#1a0505] border ${table.color} overflow-hidden`}>
                            <CardHeader className="cursor-pointer" onClick={() => fetchTableData(table.name)}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-2xl">{table.icon}</span>
                                        <div>
                                            <CardTitle className="text-lg">{table.name}</CardTitle>
                                            <CardDescription className="text-xs">
                                                {tableInfo?.row_count || 0} records
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm">
                                        <Eye className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardHeader>

                            {selectedTable === table.name && isExpanded && tableData && (
                                <CardContent className="space-y-2">
                                    <div className="flex gap-2 mb-3">
                                        <Button
                                            onClick={() => fetchTableData(table.name)}
                                            size="sm"
                                            variant="outline"
                                            className="flex-1"
                                        >
                                            <RefreshCw className="w-3 h-3 mr-1" />
                                            Refresh
                                        </Button>
                                        <Button
                                            onClick={() => clearTable(table.name)}
                                            size="sm"
                                            variant="destructive"
                                            className="flex-1"
                                        >
                                            <Trash2 className="w-3 h-3 mr-1" />
                                            Clear All
                                        </Button>
                                    </div>

                                    <ScrollArea className="h-[300px] rounded border border-[#2d1010] bg-[#0f0505] p-3">
                                        {!tableData || !tableData.data || tableData.data.length === 0 ? (
                                            <div className="text-center text-[#5a3030] py-8">No records found</div>
                                        ) : (
                                            <div className="space-y-2">
                                                {tableData.data.map((record, idx) => {
                                                    const primaryKey = Object.keys(record)[0]
                                                    const recordId = record[primaryKey]

                                                    return (
                                                        <div key={idx} className="p-3 bg-[#1a0505] rounded border border-[#2d1010] hover:border-[#5a3030] transition-colors">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <Badge variant="outline" className="text-xs">
                                                                    ID: {recordId}
                                                                </Badge>
                                                                <div className="flex gap-1">
                                                                    <Dialog>
                                                                        <DialogTrigger asChild>
                                                                            <Button
                                                                                size="sm"
                                                                                variant="ghost"
                                                                                onClick={() => setEditingRecord(record)}
                                                                            >
                                                                                <Edit2 className="w-3 h-3" />
                                                                            </Button>
                                                                        </DialogTrigger>
                                                                        <DialogContent className="bg-[#1a0505] border-[#2d1010] text-white max-w-2xl max-h-[80vh] overflow-y-auto">
                                                                            <DialogHeader>
                                                                                <DialogTitle>Edit Record</DialogTitle>
                                                                                <DialogDescription>
                                                                                    Editing {table.name} - ID: {recordId}
                                                                                </DialogDescription>
                                                                            </DialogHeader>

                                                                            {editingRecord && (
                                                                                <div className="space-y-3">
                                                                                    {Object.entries(editingRecord).map(([key, value]) => (
                                                                                        <div key={key} className="space-y-1">
                                                                                            <label className="text-sm text-[#b8a0a0]">{key}</label>
                                                                                            <Input
                                                                                                value={value?.toString() || ""}
                                                                                                onChange={(e) => setEditingRecord({
                                                                                                    ...editingRecord,
                                                                                                    [key]: e.target.value
                                                                                                })}
                                                                                                className="bg-[#0f0505] border-[#2d1010]"
                                                                                            />
                                                                                        </div>
                                                                                    ))}

                                                                                    <div className="flex gap-2 pt-4">
                                                                                        <Button
                                                                                            onClick={() => updateRecord(table.name, recordId, editingRecord)}
                                                                                            className="flex-1 bg-green-600 hover:bg-green-700"
                                                                                        >
                                                                                            <Save className="w-4 h-4 mr-2" />
                                                                                            Save Changes
                                                                                        </Button>
                                                                                        <Button
                                                                                            onClick={() => setEditingRecord(null)}
                                                                                            variant="outline"
                                                                                            className="flex-1"
                                                                                        >
                                                                                            <X className="w-4 h-4 mr-2" />
                                                                                            Cancel
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </DialogContent>
                                                                    </Dialog>

                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => deleteRecord(table.name, recordId)}
                                                                        className="text-red-400 hover:text-red-500"
                                                                    >
                                                                        <Trash2 className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            <div className="text-xs space-y-1">
                                                                {Object.entries(record).slice(0, 3).map(([key, value]) => (
                                                                    <div key={key} className="flex gap-2">
                                                                        <span className="text-[#5a3030] font-mono min-w-[100px]">{key}:</span>
                                                                        <span className="text-[#b8a0a0] truncate">
                                                                            {value?.toString().substring(0, 50) || "null"}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </CardContent>
                            )}
                        </Card>
                    )
                })}
            </div>

            {/* All Tables List */}
            <div className="max-w-7xl mx-auto">
                <Card className="bg-[#1a0505] border-[#2d1010]">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Table2 className="w-5 h-5" />
                            All Tables in Database
                        </CardTitle>
                        <CardDescription>
                            Complete list of all tables with row counts
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {tables.map((table) => (
                                <div
                                    key={table.table_name}
                                    className="p-3 bg-[#0f0505] rounded border border-[#2d1010] hover:border-[#5a3030] transition-colors cursor-pointer"
                                    onClick={() => fetchTableData(table.table_name)}
                                >
                                    <div className="text-sm font-mono text-white">{table.table_name}</div>
                                    <div className="text-xs text-[#5a3030]">
                                        {table.error ? "Error" : `${table.row_count} rows`}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
