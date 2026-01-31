# ResumeX Anti-Cheat System (Phase 2)

## Overview
Browser-based anti-cheat monitoring that **detects and logs violations without blocking candidates**. All violations are stored for recruiter review and scoring penalties.

**Key Principle:** Detection + Logging, NOT Prevention

---

## Architecture

### Frontend (Client-Side)
- **Hook:** `useAntiCheat()` in `hooks/use-anti-cheat.ts`
- **Integration:** Integrated into IDE component (`app/.../ide/page.tsx`)
- **Detection Methods:**
  1. Camera monitoring (permission + stream)
  2. Tab/window visibility tracking
  3. Copy/paste/keyboard event logging

### Backend (Server-Side)
- **Model:** `AntiCheatLog` in `backend/models.py`
- **Endpoints:** `/api/anti-cheat/logs` (POST/GET)
- **Storage:** Database logs linked to `EvaluationSession`

---

## Violation Types

### 1. Camera Violations
```json
{
  "type": "CAMERA_VIOLATION",
  "reason": "PERMISSION_DENIED | CAMERA_STOPPED | NO_FACE",
  "timestamp": 1710000000
}
```

**Detection:**
- User denies camera permission
- Camera stream stops during test
- Face detection fails (optional, not implemented yet)

**Action:** Log only, no blocking

### 2. Tab Switching
```json
{
  "type": "TAB_SWITCH",
  "reason": "TAB_HIDDEN | TAB_VISIBLE",
  "duration": 12,
  "timestamp": 1710000000
}
```

**Detection:**
- `document.visibilitychange` event
- Tracks duration of tab hidden

**Action:** Log duration, recruiter can review

### 3. Window Blur/Focus Loss
```json
{
  "type": "WINDOW_BLUR",
  "duration": 5,
  "timestamp": 1710000000
}
```

**Detection:**
- `window.blur()` event
- `window.focus()` event
- Tracks focus loss duration

**Action:** Log duration for pattern analysis

### 4. Copy/Paste/Cut Events
```json
{
  "type": "PASTE_ATTEMPT",
  "context": "EDITOR | UNKNOWN",
  "timestamp": 1710000000
}
```

**Detection:**
- `document.copy` event
- `document.paste` event
- `document.cut` event
- Keyboard shortcuts: `Ctrl+C`, `Ctrl+V`

**Action:** Log attempt, NOT blocked in editor

---

## Frontend Integration

### 1. Initialize Hook
```typescript
const antiCheat = useAntiCheat(sessionId, true)
```

### 2. Request Camera Permission
```typescript
// Called when test starts
antiCheat.initializeCamera()
```

### 3. Send Logs on Completion
```typescript
await antiCheat.sendLogsOnCompletion()
```

### 4. Display Violation Count
```tsx
{antiCheat.violationCount > 0 && (
  <Badge variant="destructive">
    {antiCheat.violationCount} violations
  </Badge>
)}
```

---

## Backend Integration

### 1. Store Logs
**POST** `/api/anti-cheat/logs`

Request:
```json
{
  "session_id": "session_1710000000",
  "violations": [
    {
      "type": "TAB_SWITCH",
      "reason": "TAB_HIDDEN",
      "duration": 12,
      "timestamp": 1710000000
    }
  ]
}
```

Response:
```json
{
  "status": "logged",
  "count": 1
}
```

### 2. Retrieve Logs (for Recruiter)
**GET** `/api/anti-cheat/violations/{session_id}`

Response:
```json
{
  "session_id": "session_1710000000",
  "total_violations": 5,
  "violations": [
    {
      "type": "TAB_SWITCH",
      "reason": "TAB_HIDDEN",
      "duration": 12,
      "timestamp": 1710000000,
      "logged_at": "2025-01-31T15:30:00Z"
    }
  ]
}
```

---

## Database Schema

### AntiCheatLog Table
```python
class AntiCheatLog(Base):
    __tablename__ = "anti_cheat_logs"
    id = Column(Integer, primary_key=True)
    session_id = Column(String, index=True)
    evaluation_id = Column(String, FK)
    
    violation_type = Column(String)      # CAMERA_VIOLATION, TAB_SWITCH, etc.
    reason = Column(String, nullable=True)
    duration = Column(Integer, nullable=True)  # seconds
    context = Column(String, nullable=True)
    
    violation_timestamp = Column(Integer)      # Unix timestamp (ms)
    logged_at = Column(DateTime)               # Server timestamp
```

---

## Logging Pipeline

### Client-Side Buffer
```typescript
let violations = []

// Violations added to buffer
violations.push({
  type: "TAB_SWITCH",
  duration: 12,
  timestamp: Date.now()
})
```

### Periodic Sending (Every 15 seconds)
```typescript
setInterval(async () => {
  if (violations.length > 0) {
    await fetch("/api/anti-cheat/logs", {
      method: "POST",
      body: JSON.stringify({ sessionId, violations })
    })
  }
}, 15000)
```

### On Test Completion
```typescript
async handleFinishTechnical() {
  // Submit code for judging
  const result = await fetch("/api/evaluate", ...)
  
  // Send all remaining logs
  await antiCheat.sendLogsOnCompletion()
}
```

---

## Scoring Penalties

### Current Implementation
- All violations are **logged only**, no automatic penalties
- Recruiters can manually review violations and decide penalties

### Future Implementation (Optional)
```python
# In ScoringEngine
penalty = 0

if violations.copy_paste > 0:
    penalty += 5  # 5 points per copy/paste
    
if violations.tab_switches > 3:
    penalty += 10  # 10 points if more than 3 tab switches
    
if violations.camera_denied:
    penalty += 15  # 15 points if camera denied
    
final_score = max(0, base_score - penalty)
```

---

## Recruiter Dashboard

### View Violations
- Link violations to `EvaluationSession.evaluation_id`
- Display timeline of suspicious activity
- Show violation count in results panel
- Option to apply manual penalties

### Example Workflow
1. Recruiter views candidate score: 85/100
2. Clicks "View Activity Log"
3. Sees: "5 tab switches, 2 copy/paste attempts"
4. Can decide: "Deduct 10 points for suspicious activity"
5. Final score: 75/100

---

## Security Notes

### What We CAN'T Do
- ❌ Identify the person on camera (privacy)
- ❌ Record video (privacy violation)
- ❌ Prevent Alt+Tab (OS-level, not detectable)
- ❌ Block paste globally (UX nightmare)
- ❌ Prevent VPN/proxy usage

### What We CAN Do
- ✅ Detect camera permission denials
- ✅ Detect when stream stops
- ✅ Detect tab switches reliably
- ✅ Detect window blur/focus loss
- ✅ Log copy/paste/keyboard shortcuts
- ✅ Create audit trail for review

### Privacy Compliance
- Camera stream **never saved/transmitted**
- Only binary flags logged (face present: yes/no)
- Logs stored encrypted in database
- Recruiter-only access to violation logs

---

## Testing the System

### 1. Test Tab Switching
- Open IDE, switch to another tab
- Should see violation logged
- Check console: `[AntiCheat] type: TAB_SWITCH`

### 2. Test Copy/Paste
- Try `Ctrl+C` / `Ctrl+V` in editor
- Should see violation logged
- Check violation count badge in header

### 3. Test Camera Permission
- Test should request camera on start
- If denied → logs `CAMERA_VIOLATION`
- If allowed → monitors stream for 5 seconds

### 4. Test Log Sending
- Submit code
- Check backend logs table: `SELECT * FROM anti_cheat_logs WHERE session_id='...'`
- Should see all violations stored

---

## Configuration

### Enable/Disable Anti-Cheat
```typescript
// In IDE component
const antiCheat = useAntiCheat(sessionId, true)  // Set to false to disable
```

### Adjust Log Sending Interval
```typescript
// In use-anti-cheat.ts
setInterval(async () => {...}, 15000)  // Change from 15 seconds
```

### Add New Violation Types
```typescript
// Add to ViolationLog type
type: "YOUR_NEW_TYPE"

// Add detection in useAntiCheat hook
logViolation({
  type: "YOUR_NEW_TYPE",
  timestamp: Date.now()
})
```

---

## Future Enhancements

### Phase 3: AI-Based Analysis
- Analyze violation patterns (rate of violations over time)
- Detect coordinated cheating (multiple candidates similar patterns)
- Risk scoring (0-100 likelihood of cheating)

### Phase 4: Screen Sharing Detection
- Detect if screen is being shared (limited browser API)
- Detect screen recording tools (Obs, Camtasia)

### Phase 5: Biometric Verification
- Face ID on start and periodic verification
- Gait recognition (advanced)
- Voice verification (for interviews)

---

## Troubleshooting

### Camera Permission Dialog Not Showing
- Check browser camera permissions: Settings → Privacy → Camera
- Ensure HTTPS in production (camera requires secure context)

### Violations Not Being Logged
- Check console for errors
- Verify anti-cheat enabled: `useAntiCheat(sessionId, true)`
- Check network tab: POST to `/api/anti-cheat/logs`

### Backend Not Receiving Logs
- Verify AntiCheatLog table created: `SELECT * FROM anti_cheat_logs`
- Check CORS headers allow POST
- Verify session_id is passed correctly

---

## References

- [MediaDevices.getUserMedia()](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [Focus Management](https://developer.mozilla.org/en-US/docs/Web/API/Window/blur_event)
- [Clipboard Events](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard_API)
