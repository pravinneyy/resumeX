import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeCandidatesOptions {
    jobId?: number
}

export function useRealtimeCandidates(
    initialCandidates: any[],
    options?: UseRealtimeCandidatesOptions
) {
    const [candidates, setCandidates] = useState(initialCandidates)

    useEffect(() => {
        setCandidates(initialCandidates)
    }, [initialCandidates])

    useEffect(() => {
        let channel: RealtimeChannel

        const setupRealtimeSubscription = async () => {
            // Subscribe to applications table for candidate updates
            channel = supabase
                .channel('candidates-channel')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'applications',
                        ...(options?.jobId && {
                            filter: `job_id=eq.${options.jobId}`
                        })
                    },
                    (payload) => {
                        console.log('📡 Realtime candidate update:', payload)

                        if (payload.eventType === 'INSERT') {
                            setCandidates((prev) => {
                                if (prev.some(c => c.id === payload.new.id)) {
                                    return prev
                                }
                                return [payload.new, ...prev]
                            })
                        } else if (payload.eventType === 'UPDATE') {
                            setCandidates((prev) =>
                                prev.map((candidate) =>
                                    candidate.id === payload.new.id
                                        ? { ...candidate, ...payload.new }
                                        : candidate
                                )
                            )
                        } else if (payload.eventType === 'DELETE') {
                            setCandidates((prev) =>
                                prev.filter((candidate) => candidate.id !== payload.old.id)
                            )
                        }
                    }
                )
                .subscribe((status) => {
                    console.log('📡 Candidates subscription status:', status)
                })
        }

        setupRealtimeSubscription()

        return () => {
            if (channel) {
                supabase.removeChannel(channel)
            }
        }
    }, [options?.jobId])

    return candidates
}
