# Phase 2: Browser Anti-Cheat System - Implementation Summary

## What Was Implemented

### 1. **Client-Side Anti-Cheat Hook** (`hooks/use-anti-cheat.ts`)
A comprehensive React hook that monitors:
- **Camera Detection**: Requests permission, monitors stream, detects if camera stops
- **Tab/Window Switching**: Tracks tab hidden events and window blur/focus
- **Copy/Paste/Keyboard**: Logs Ctrl+C, Ctrl+V, paste/copy/cut attempts
- **Periodic Log Sending**: Sends violations to backend every 15 seconds
- **Completion Logging**: Sends all remaining logs when test finishes

### 2. **Backend Data Model** (`backend/models.py`)
New `AntiCheatLog` table stores:
- `session_id`: Links to evaluation session
- `violation_type`: Type of violation detected
- `reason`: Additional context (e.g., "TAB_HIDDEN", "PERMISSION_DENIED")
- `duration`: For tab/blur events (in seconds)
- `violation_timestamp`: When violation occurred (ms)
- `logged_at`: Server timestamp

### 3. **Backend Endpoints** (`backend/routes/assessments.py`)

**POST** `/api/anti-cheat/logs`
- Receives violation logs from client
- Stores them in database
- Response: `{ "status": "logged", "count": N }`

**GET** `/api/anti-cheat/violations/{session_id}`
- Retrieves all violations for a session
- Used by recruiters to review activity
- Returns timeline with timestamps

### 4. **IDE Integration** (`app/.../ide/page.tsx`)
- Imports `useAntiCheat` hook
- Requests camera permission on test start
- Displays violation count badge in header
- Sends all logs on test submission

### 5. **Documentation** (`ANTI_CHEAT_SYSTEM.md`)
Complete guide including:
- Architecture overview
- Violation types and examples
- Frontend/backend integration details
- Database schema
- Testing procedures
- Security notes
- Future enhancement ideas

---

## How It Works

### Timeline of Events

1. **Test Starts**
   - Anti-cheat hook initializes
   - Camera permission requested
   - Monitoring listeners attached

2. **During Test**
   - Violations logged to in-memory array
   - Every 15 seconds: batch send to backend
   - Violation count displayed in header badge

3. **Test Ends**
   - Code submitted to judge
   - All remaining logs sent to backend
   - Logs stored linked to EvaluationSession

4. **Recruiter Review**
   - Can call `GET /api/anti-cheat/violations/{session_id}`
   - Reviews activity timeline
   - Can manually apply scoring penalties

---

## Violation Types Detected

| Type | Reason | Context | Duration |
|------|--------|---------|----------|
| CAMERA_VIOLATION | PERMISSION_DENIED, CAMERA_STOPPED | - | - |
| TAB_SWITCH | TAB_HIDDEN, TAB_VISIBLE | - | ✓ |
| WINDOW_BLUR | - | - | ✓ |
| COPY_ATTEMPT | - | EDITOR, UNKNOWN | - |
| PASTE_ATTEMPT | - | EDITOR, UNKNOWN | - |
| CUT_ATTEMPT | - | EDITOR, UNKNOWN | - |
| CTRL_C | - | - | - |
| CTRL_V | - | - | - |

---

## Key Features

✅ **Detection Only** - No blocking of user actions
✅ **Privacy Compliant** - No video recording, no face identification
✅ **Audit Trail** - Complete timestamp history for compliance
✅ **Flexible Penalties** - Recruiters decide penalties manually
✅ **Scalable** - Periodic batching reduces database load
✅ **Non-Blocking** - Async logging doesn't slow IDE

---

## Testing Checklist

- [ ] Camera permission requested on test start
- [ ] Tab switch detection working (view console)
- [ ] Copy/paste events logged
- [ ] Violation count badge updates in header
- [ ] Logs sent every 15 seconds to backend
- [ ] Final logs sent on test submission
- [ ] Database stores all violations
- [ ] GET endpoint retrieves logs correctly
- [ ] Violations linked to evaluation_id

---

## Files Modified/Created

### Created
- `hooks/use-anti-cheat.ts` (200 lines)
- `ANTI_CHEAT_SYSTEM.md` (300+ lines)

### Modified
- `backend/models.py` - Added `AntiCheatLog` model
- `backend/routes/assessments.py` - Added 2 endpoints + schemas
- `app/(candidate)/.../ide/page.tsx` - Integrated hook + UI badge

---

## Security Guarantees

**What We Protect Against:**
- Tab switching (reliable detection)
- Window focus loss (reliable detection)
- Copy/paste attempts (reliable detection)
- Camera denial (reliable detection)
- Keyboard shortcuts (Ctrl+C/V detection)

**What We Cannot Prevent:**
- Alt+Tab at OS level
- External monitor/camera (not visible to browser)
- Collaborative hacking via screen share
- VPN/proxy masking IP

**Privacy Protections:**
- No video storage
- No biometric data
- No keystroke logging
- No screen capture
- Only violation flags logged

---

## Next Steps

1. **Database Migration**: Run migration to create `anti_cheat_logs` table
   ```sql
   CREATE TABLE anti_cheat_logs (
     id INT PRIMARY KEY AUTO_INCREMENT,
     session_id VARCHAR(255) NOT NULL,
     evaluation_id VARCHAR(255),
     violation_type VARCHAR(100),
     reason VARCHAR(100),
     duration INT,
     context VARCHAR(100),
     violation_timestamp BIGINT,
     logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     INDEX (session_id),
     FOREIGN KEY (evaluation_id) REFERENCES evaluation_sessions(evaluation_id)
   );
   ```

2. **Test Locally**: Run test submission and verify logs stored

3. **Recruiter Dashboard**: Add violation viewing to recruiter assessment review page

4. **Penalties**: Implement scoring deductions based on violation types

---

## API Examples

### Send Logs (Client → Server)
```bash
POST http://localhost:8000/api/anti-cheat/logs
Content-Type: application/json

{
  "session_id": "session_1710000000",
  "violations": [
    {
      "type": "TAB_SWITCH",
      "reason": "TAB_HIDDEN",
      "duration": 12,
      "timestamp": 1710000000
    },
    {
      "type": "PASTE_ATTEMPT",
      "context": "UNKNOWN",
      "timestamp": 1710000002
    }
  ]
}
```

### Retrieve Logs (Recruiter)
```bash
GET http://localhost:8000/api/anti-cheat/violations/session_1710000000
```

---

## Configuration Variables

```typescript
// Adjust in use-anti-cheat.ts
const LOG_INTERVAL = 15000  // 15 seconds
const CAMERA_CHECK_INTERVAL = 2000  // 2 seconds

// Enable/disable in IDE component
const antiCheat = useAntiCheat(sessionId, true)  // true = enabled
```

---

## Future Enhancements

- **Phase 3**: AI pattern analysis for coordinated cheating
- **Phase 4**: Screen sharing detection
- **Phase 5**: Biometric verification (Face ID)
- **Phase 6**: Gait/Voice recognition for interviews

---

## Support

For issues or questions:
1. Check `ANTI_CHEAT_SYSTEM.md` for detailed documentation
2. Review console logs for client-side errors
3. Check database `anti_cheat_logs` table for storage issues
4. Test individual violation types in isolation
