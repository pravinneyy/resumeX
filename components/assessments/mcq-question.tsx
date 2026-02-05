"use client"

import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

interface MCQQuestionProps {
    id: string
    question: string
    options: { value: string; label: string }[]
    value: string
    onChange: (value: string) => void
    className?: string
}

export function MCQQuestion({ id, question, options, value, onChange, className }: MCQQuestionProps) {
    return (
        <div className={cn("space-y-3 p-4 border rounded-lg bg-card", className)}>
            <Label className="text-base font-medium leading-relaxed">
                {question}
            </Label>

            <RadioGroup value={value} onValueChange={onChange} className="space-y-2 mt-2">
                {options.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2 p-2 rounded hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value={option.value} id={`${id}-${option.value}`} />
                        <Label htmlFor={`${id}-${option.value}`} className="flex-1 cursor-pointer font-normal">
                            {option.label}
                        </Label>
                    </div>
                ))}
            </RadioGroup>
        </div>
    )
}
