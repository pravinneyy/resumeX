import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

interface UseRealtimeInterviewsOptions {
    candidateId?: string
    recruiterId?: string
    jobId?: number
}

export function useRealtimeInterviews(
    initialInterviews: any[],
    options?: UseRealtimeInterviewsOptions
) {
    const [interviews, setInterviews] = useState(initialInterviews)

    useEffect(() => {
        setInterviews(initialInterviews)
    }, [initialInterviews])

    useEffect(() => {
        let channel: RealtimeChannel

        const setupRealtimeSubscription = async () => {
            // Build filter based on options
            let filter: string | undefined
            if (options?.candidateId) {
                filter = `candidate_id=eq.${options.candidateId}`
            } else if (options?.recruiterId) {
                filter = `recruiter_id=eq.${options.recruiterId}`
            } else if (options?.jobId) {
                filter = `job_id=eq.${options.jobId}`
            }

            channel = supabase
                .channel('interviews-channel')
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'interviews',
                        ...(filter && { filter })
                    },
                    (payload) => {
                        console.log('📡 Realtime interview update:', payload)

                        if (payload.eventType === 'INSERT') {
                            setInterviews((prev) => {
                                if (prev.some(i => i.id === payload.new.id)) {
                                    return prev
                                }
                                return [payload.new, ...prev]
                            })
                        } else if (payload.eventType === 'UPDATE') {
                            setInterviews((prev) =>
                                prev.map((interview) =>
                                    interview.id === payload.new.id
                                        ? { ...interview, ...payload.new }
                                        : interview
                                )
                            )
                        } else if (payload.eventType === 'DELETE') {
                            setInterviews((prev) =>
                                prev.filter((interview) => interview.id !== payload.old.id)
                            )
                        }
                    }
                )
                .subscribe((status) => {
                    console.log('📡 Interviews subscription status:', status)
                })
        }

        setupRealtimeSubscription()

        return () => {
            if (channel) {
                supabase.removeChannel(channel)
            }
        }
    }, [options?.candidateId, options?.recruiterId, options?.jobId])

    return interviews
}
