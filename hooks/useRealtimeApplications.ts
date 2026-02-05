import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeApplicationsOptions {
    candidateId?: string
    jobId?: number
    recruiterId?: string
}

export function useRealtimeApplications(
    initialApplications: any[],
    options?: UseRealtimeApplicationsOptions
) {
    const [applications, setApplications] = useState(initialApplications)

    useEffect(() => {
        setApplications(initialApplications)
    }, [initialApplications])

    useEffect(() => {
        let channel: RealtimeChannel

        const setupRealtimeSubscription = async () => {
            // Build filter based on options
            let filter: string | undefined
            if (options?.candidateId) {
                filter = `candidate_id=eq.${options.candidateId}`
            } else if (options?.jobId) {
                filter = `job_id=eq.${options.jobId}`
            } else if (options?.recruiterId) {
                filter = `recruiter_id=eq.${options.recruiterId}`
            }

            channel = supabase
                .channel('applications-channel')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'applications',
                        ...(filter && { filter })
                    },
                    (payload) => {
                        console.log('📡 Realtime application update:', payload)

                        if (payload.eventType === 'INSERT') {
                            setApplications((prev) => {
                                if (prev.some(a => a.id === payload.new.id)) {
                                    return prev
                                }
                                return [payload.new, ...prev]
                            })
                        } else if (payload.eventType === 'UPDATE') {
                            setApplications((prev) =>
                                prev.map((app) =>
                                    app.id === payload.new.id
                                        ? { ...app, ...payload.new }
                                        : app
                                )
                            )
                        } else if (payload.eventType === 'DELETE') {
                            setApplications((prev) =>
                                prev.filter((app) => app.id !== payload.old.id)
                            )
                        }
                    }
                )
                .subscribe((status) => {
                    console.log('📡 Applications subscription status:', status)
                })
        }

        setupRealtimeSubscription()

        return () => {
            if (channel) {
                supabase.removeChannel(channel)
            }
        }
    }, [options?.candidateId, options?.jobId, options?.recruiterId])

    return applications
}
