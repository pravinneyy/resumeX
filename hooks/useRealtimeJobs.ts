import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useRealtimeJobs(initialJobs: any[]) {
    const [jobs, setJobs] = useState(initialJobs)

    useEffect(() => {
        // Update state when initial data changes
        setJobs(initialJobs)
    }, [initialJobs])

    useEffect(() => {
        let channel: RealtimeChannel

        const setupRealtimeSubscription = async () => {
            // Subscribe to jobs table changes
            channel = supabase
                .channel('jobs-channel')
                .on(
                    'postgres_changes',
                    {
                        event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
                        schema: 'public',
                        table: 'jobs'
                    },
                    (payload) => {
                        console.log('📡 Realtime job update:', payload)

                        if (payload.eventType === 'INSERT') {
                            setJobs((prev) => {
                                // Avoid duplicates
                                if (prev.some(j => j.id === payload.new.id)) {
                                    return prev
                                }
                                return [payload.new, ...prev]
                            })
                        } else if (payload.eventType === 'UPDATE') {
                            setJobs((prev) =>
                                prev.map((job) =>
                                    job.id === payload.new.id ? { ...job, ...payload.new } : job
                                )
                            )
                        } else if (payload.eventType === 'DELETE') {
                            setJobs((prev) => prev.filter((job) => job.id !== payload.old.id))
                        }
                    }
                )
                .subscribe((status) => {
                    console.log('📡 Jobs subscription status:', status)
                })
        }

        setupRealtimeSubscription()

        // Cleanup subscription on unmount
        return () => {
            if (channel) {
                supabase.removeChannel(channel)
            }
        }
    }, []) // Empty dependency array - only setup once

    return jobs
}
