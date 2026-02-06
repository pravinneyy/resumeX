"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Save, AlertCircle, CheckCircle } from "lucide-react"

interface WeightConfigProps {
    jobId: number
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function WeightConfig({ jobId }: WeightConfigProps) {
    const [weights, setWeights] = useState({
        psychometric: 20,
        technical: 30,
        coding: 40,
        behavioral: 10
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const { getToken } = useAuth()

    useEffect(() => {
        async function fetchWeights() {
            try {
                const token = await getToken()
                const response = await fetch(
                    `http://${API_URL}:8000/api/assessments/${jobId}/weights`,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    }
                )

                if (response.ok) {
                    const data = await response.json()
                    setWeights({
                        psychometric: data.psychometric * 100,
                        technical: data.technical * 100,
                        coding: data.coding * 100,
                        behavioral: data.behavioral * 100
                    })
                }
            } catch (error) {
                console.error('Error fetching weights:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchWeights()
    }, [jobId, getToken])

    const total = weights.psychometric + weights.technical + weights.coding + weights.behavioral
    const isValid = Math.abs(total - 100) < 0.1

    const handleWeightChange = (component: keyof typeof weights, value: number[]) => {
        setWeights(prev => ({
            ...prev,
            [component]: value[0]
        }))
        setMessage(null)
    }

    const handleSave = async () => {
        if (!isValid) {
            setMessage({ type: 'error', text: 'Weights must sum to 100%' })
            return
        }

        setSaving(true)
        setMessage(null)

        try {
            const token = await getToken()
            const response = await fetch(
                `http://${API_URL}:8000/api/assessments/${jobId}/weights`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        psychometric_weight: weights.psychometric / 100,
                        technical_weight: weights.technical / 100,
                        coding_weight: weights.coding / 100,
                        behavioral_weight: weights.behavioral / 100
                    })
                }
            )

            if (response.ok) {
                setMessage({ type: 'success', text: 'Weights updated successfully!' })
            } else {
                const error = await response.json()
                const errorText = typeof error.detail === 'string'
                    ? error.detail
                    : JSON.stringify(error.detail) || 'Failed to update weights'
                setMessage({ type: 'error', text: errorText })
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'Network error. Please try again.' })
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <Card>
                <CardContent className="py-8 flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Assessment Weight Configuration</CardTitle>
                <CardDescription>
                    Customize how much each assessment component contributes to the final score.
                    All weights must sum to 100%.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Psychometric Weight */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>Psychometric Assessment</Label>
                        <span className="text-sm font-semibold text-purple-500">
                            {weights.psychometric.toFixed(0)}%
                        </span>
                    </div>
                    <Slider
                        value={[weights.psychometric]}
                        onValueChange={(value) => handleWeightChange('psychometric', value)}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                        Personality, aptitude, and soft skills evaluation
                    </p>
                </div>

                {/* Technical Weight */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>Technical Assessment</Label>
                        <span className="text-sm font-semibold text-blue-500">
                            {weights.technical.toFixed(0)}%
                        </span>
                    </div>
                    <Slider
                        value={[weights.technical]}
                        onValueChange={(value) => handleWeightChange('technical', value)}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                        Domain knowledge and conceptual understanding
                    </p>
                </div>

                {/* Coding Weight */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>Coding Assessment</Label>
                        <span className="text-sm font-semibold text-green-500">
                            {weights.coding.toFixed(0)}%
                        </span>
                    </div>
                    <Slider
                        value={[weights.coding]}
                        onValueChange={(value) => handleWeightChange('coding', value)}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                        Programming challenges and algorithmic thinking
                    </p>
                </div>

                {/* Behavioral Weight */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label>Behavioral Assessment</Label>
                        <span className="text-sm font-semibold text-orange-500">
                            {weights.behavioral.toFixed(0)}%
                        </span>
                    </div>
                    <Slider
                        value={[weights.behavioral]}
                        onValueChange={(value) => handleWeightChange('behavioral', value)}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                        Teamwork, communication, and cultural fit
                    </p>
                </div>

                {/* Total Display */}
                <div className="pt-4 border-t">
                    <div className="flex items-center justify-between text-lg font-bold">
                        <span>Total Weight</span>
                        <span className={isValid ? 'text-green-500' : 'text-red-500'}>
                            {total.toFixed(0)}%
                        </span>
                    </div>
                    {!isValid && (
                        <p className="text-sm text-red-500 mt-1">
                            Weights must sum to exactly 100%
                        </p>
                    )}
                </div>

                {/* Messages */}
                {message && (
                    <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
                        {message.type === 'success' ? (
                            <CheckCircle className="h-4 w-4" />
                        ) : (
                            <AlertCircle className="h-4 w-4" />
                        )}
                        <AlertDescription>{message.text}</AlertDescription>
                    </Alert>
                )}

                {/* Save Button */}
                <Button
                    onClick={handleSave}
                    disabled={!isValid || saving}
                    className="w-full"
                >
                    {saving ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                    ) : (
                        <><Save className="w-4 h-4 mr-2" /> Save Weights</>
                    )}
                </Button>
            </CardContent>
        </Card>
    )
}
