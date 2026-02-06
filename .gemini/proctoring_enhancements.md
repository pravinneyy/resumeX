# Proctoring & Anti-Cheat System Enhancements

## Overview

This document outlines the improvements made to the proctoring and anti-cheat system for the assessment/interview feature.

---

## 🐛 Issues Fixed

### 1. Copy-Paste False Positives (CRITICAL FIX)

**Problem**: The system was flagging ALL copy-paste operations, even when candidates copied their own code within the IDE and pasted it elsewhere in the same IDE.

**Solution**: Implemented **smart clipboard tracking** that:
- Tracks what the candidate copies internally
- Compares paste content against the internal clipboard
- Only flags pastes from **external sources** (ChatGPT, Stack Overflow, etc.)
- Ignores small pastes (<50 chars) to avoid false positives on variable names

**Files Modified**:
- `hooks/useEnhancedAntiCheat.ts`
- `hooks/use-anti-cheat.ts`

### 2. Multiple Faces Rapid Increment (FIXED)

**Problem**: When 2+ faces were detected, the violation count was incrementing every frame (extremely rapidly).

**Solution**: Added **10-second cooldown** for `MULTIPLE_FACES` violations. Now only logs once every 10 seconds instead of every frame.

### 3. Proctoring Missing on Assessment Pages (FIXED)

**Problem**: Proctoring was only enabled on the IDE/Coding page, not on Psychometric or Technical Text pages.

**Solution**: Added `useEnhancedAntiCheat` hook with camera initialization to:
- **Psychometric Page** (`/candidate/interviews/[id]/psychometric`)
- **Technical Text Page** (`/candidate/interviews/[id]/technical-text`)

Both pages now show a proctoring status indicator in the header.

### 4. Exam Lockdown Mode Missing on Assessment Pages (FIXED)

**Problem**: The Psychometric and Technical Text pages allowed candidates to:
- Exit the test freely via the Exit button
- Switch between assessment tabs freely
- Navigate away using browser back/forward buttons

**Solution**: Added `useExam` context integration to:
- **Psychometric Page** - Activates lockdown on load, ends on unmount or submit
- **Technical Text Page** - Activates lockdown on load, ends on unmount or submit
- **AssessmentTabs Component** - Shows warning before switching tabs during active exam

**Lockdown features**:
- Browser back/forward navigation is blocked
- Closing tab/browser shows warning dialog
- Exit button shows confirmation dialog
- Tab switching shows confirmation dialog

### 5. Missing Real Proctoring Features

**Problem**: Compared to real proctoring software (e.g., ProctorU, Examity), our system lacked:
- DevTools blocking
- Right-click blocking
- Print Screen detection
- Fullscreen enforcement
- Audio monitoring
- Severity levels

**Solution**: Created new `useSmartAntiCheat.ts` hook with all these features.

---

## ✅ Features Added

### New Hook: `useSmartAntiCheat.ts`

A comprehensive proctoring hook with professional-grade features:

#### 1. Smart Copy-Paste Detection
```typescript
// Internal paste (from within IDE) - ALLOWED
// External paste (from ChatGPT, etc.) - FLAGGED
// Suspicious paste (>500 chars) - CRITICAL violation
```

#### 2. Severity Levels
| Severity | Violation Types |
|----------|-----------------|
| LOW | Window blur, Right-click, Looking away |
| MEDIUM | Tab switch, No face, Fullscreen exit, Print screen, Audio detected |
| HIGH | Camera violation, External paste, Multiple faces |
| CRITICAL | Suspicious large paste, DevTools attempt |

#### 3. Cooldown Periods
Prevents spam logging:
- `NO_FACE`: 10 seconds between logs
- `LOOKING_AWAY`: 5 seconds between logs
- `WINDOW_BLUR`: 3 seconds between logs
- `RIGHT_CLICK`: 2 seconds between logs

#### 4. Minimum Duration Thresholds
Only logs temporal violations lasting longer than:
- Tab switch: 2+ seconds
- Window blur: 2+ seconds

#### 5. Security Features
- **DevTools Blocking**: Prevents F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
- **Right-Click Blocking**: Prevents context menu
- **Print Screen Detection**: Logs when PrintScreen key is pressed
- **Fullscreen Enforcement**: Optional, detects fullscreen exits

#### 6. Optional Audio Monitoring
```typescript
useSmartAntiCheat({
    enableAudioMonitoring: true,  // Detects speaking/help
})
```

#### 7. Violation Summary
```typescript
const { getViolationSummary } = useSmartAntiCheat({ ... })

const summary = getViolationSummary()
// {
//   total: 5,
//   bySeverity: { LOW: 2, MEDIUM: 1, HIGH: 1, CRITICAL: 1 },
//   byType: { TAB_SWITCH: 2, EXTERNAL_PASTE: 1, ... }
// }
```

---

## 📁 Files Changed/Created

### Created
- `hooks/useSmartAntiCheat.ts` - New comprehensive hook

### Modified
- `hooks/useEnhancedAntiCheat.ts` - Added smart paste detection, DevTools blocking
- `hooks/use-anti-cheat.ts` - Added smart paste detection, DevTools blocking

---

## 🔧 Usage

### Basic Usage (Existing Hooks - Now Fixed)
```typescript
import { useEnhancedAntiCheat } from "@/hooks/useEnhancedAntiCheat"

const { violations, initializeCamera } = useEnhancedAntiCheat({
    sessionId: "session-123",
    candidateId: "user-456",
    jobId: 789,
})
```

### Advanced Usage (New Smart Hook)
```typescript
import { useSmartAntiCheat } from "@/hooks/useSmartAntiCheat"

const {
    violations,
    violationCount,
    getViolationSummary,
    initializeCamera,
    requestFullscreen,
    cameraActive,
    isFullscreen,
} = useSmartAntiCheat({
    sessionId: "session-123",
    candidateId: "user-456",
    jobId: 789,
    enableFullscreenLock: true,   // Optional
    enableAudioMonitoring: true,  // Optional
    maxViolations: 10,
    onViolation: (v, count) => console.log(`Violation #${count}:`, v),
    onAutoFail: () => alert("Too many critical violations!"),
})
```

---

## 🧪 Testing The Fixes

### Test 1: Internal Copy-Paste (Should NOT flag)
1. Type some code in the IDE
2. Select and copy (Ctrl+C)
3. Paste elsewhere in the same IDE (Ctrl+V)
4. ✅ Should see: `"[AntiCheat] Internal paste detected - ALLOWED"`

### Test 2: External Paste (Should flag)
1. Copy code from an external source (e.g., browser, ChatGPT)
2. Paste into the IDE
3. ✅ Should see: `PASTE_ATTEMPT` violation logged (if >50 chars)

### Test 3: DevTools Blocked
1. Press F12 or Ctrl+Shift+I
2. ✅ Should be blocked, violation logged

### Test 4: Right-Click Blocked
1. Right-click anywhere
2. ✅ Context menu should not appear

---

## 📊 Violation Types Reference

| Type | Description | Severity |
|------|-------------|----------|
| `CAMERA_VIOLATION` | Camera disconnected or access denied | HIGH |
| `TAB_SWITCH` | Switched to another tab (>2s) | MEDIUM |
| `WINDOW_BLUR` | Window lost focus (>2s) | LOW |
| `EXTERNAL_PASTE` | Pasted 50-500 chars from external source | HIGH |
| `SUSPICIOUS_PASTE` | Pasted >500 chars from external source | CRITICAL |
| `DEVTOOLS_ATTEMPT` | Tried to open browser DevTools | CRITICAL |
| `RIGHT_CLICK` | Right-click context menu attempt | LOW |
| `PRINT_SCREEN` | Print Screen key pressed | MEDIUM |
| `FULLSCREEN_EXIT` | Exited fullscreen mode | MEDIUM |
| `NO_FACE` | No face detected by camera | MEDIUM |
| `MULTIPLE_FACES` | Multiple faces detected | HIGH |
| `LOOKING_AWAY` | Candidate looking away from screen | LOW |
| `AUDIO_DETECTED` | Prolonged speech/audio detected | MEDIUM |

---

## 🚀 Future Enhancements (Optional)

1. **Screen Recording**: Record candidate's screen during exam
2. **Keystroke Analysis**: Detect copy-paste patterns in typing speed
3. **Browser Fingerprinting**: Detect if same candidate uses multiple browsers
4. **IP Tracking**: Flag if IP changes during exam
5. **AI Code Similarity**: Compare submitted code to known solutions online
