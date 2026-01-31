# Anti-Cheat System - Quick Start Guide

## For Developers

### Enable Anti-Cheat in Your Component
```typescript
import { useAntiCheat } from "@/hooks/use-anti-cheat"

export default function MyComponent() {
  const sessionId = `session_${Date.now()}`
  const antiCheat = useAntiCheat(sessionId, true)  // true = enabled
  
  // Request camera permission on start
  useEffect(() => {
    antiCheat.initializeCamera()
  }, [])
  
  // Send logs on completion
  const handleFinish = async () => {
    await antiCheat.sendLogsOnCompletion()
  }
  
  return (
    <div>
      {/* Display violation count */}
      {antiCheat.violationCount > 0 && (
        <p>Violations: {antiCheat.violationCount}</p>
      )}
    </div>
  )
}
```

---

## For Recruiters

### View Candidate Activity
1. After candidate submits test
2. Click "View Activity Log" in results panel
3. See violation timeline with timestamps
4. Decide if penalties should apply

### Example Activity Log
```
Session: evaluation_abc123

TAB_SWITCH (hidden): 12 seconds away
PASTE_ATTEMPT: at 10:15:32
TAB_SWITCH (visible): returned after 12s
CTRL_C: at 10:15:45

Total Violations: 3
```

---

## For Compliance/Security

### What Gets Logged
- ✅ Tab switches + duration
- ✅ Window blur/focus + duration
- ✅ Copy/paste attempts
- ✅ Keyboard shortcuts (Ctrl+C/V)
- ✅ Camera permission status

### What Does NOT Get Logged
- ❌ Video/audio content
- ❌ User identity/biometrics
- ❌ Screen content
- ❌ Keystroke content (only that shortcut occurred)

### Storage & Retention
- Logs stored in `anti_cheat_logs` table
- Linked to `evaluation_sessions` for audit trail
- Retention: TBD by policy (recommend 1 year minimum)
- Access: Recruiter/Admin only

---

## Common Use Cases

### Scenario 1: Student Looks Away from Screen
```
WINDOW_BLUR: 5 seconds
WINDOW_FOCUS: returned

Action: Monitor only, not unusual. Typical for bathroom breaks.
```

### Scenario 2: Student Pastes Code from Clipboard
```
PASTE_ATTEMPT: in editor
PASTE_ATTEMPT: in editor (repeated 3 times)

Action: Red flag. May indicate copying from external source.
Penalty: Consider -10 to -15 points.
```

### Scenario 3: Student Switches Tabs Multiple Times
```
TAB_SWITCH: 2 seconds away
TAB_SWITCH: back
TAB_SWITCH: 8 seconds away (3x)
TAB_SWITCH: back

Action: Suspicious pattern. May be looking at other resources.
Penalty: Consider -5 to -10 points depending on frequency.
```

### Scenario 4: Student Denies Camera Permission
```
CAMERA_VIOLATION: PERMISSION_DENIED

Action: Flag for review. May want to require camera for integrity.
Penalty: Consider disqualification or -20 points.
```

---

## Database Queries

### Get all violations for a candidate
```sql
SELECT 
  sl.*, 
  es.candidate_id,
  es.final_score
FROM anti_cheat_logs sl
JOIN evaluation_sessions es ON sl.evaluation_id = es.evaluation_id
WHERE es.candidate_id = 'candidate_123'
ORDER BY sl.logged_at DESC;
```

### Get violations by type
```sql
SELECT 
  violation_type,
  COUNT(*) as count,
  AVG(duration) as avg_duration
FROM anti_cheat_logs
WHERE logged_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY violation_type;
```

### Get suspicious sessions
```sql
SELECT 
  session_id,
  COUNT(*) as total_violations,
  GROUP_CONCAT(DISTINCT violation_type) as types
FROM anti_cheat_logs
GROUP BY session_id
HAVING COUNT(*) > 5
ORDER BY total_violations DESC;
```

---

## API Reference

### POST /api/anti-cheat/logs
Send violations from client
```bash
curl -X POST http://localhost:8000/api/anti-cheat/logs \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "session_1710000000",
    "violations": [
      {
        "type": "TAB_SWITCH",
        "reason": "TAB_HIDDEN",
        "duration": 12,
        "timestamp": 1710000000
      }
    ]
  }'
```

### GET /api/anti-cheat/violations/{session_id}
Retrieve violations for a session
```bash
curl http://localhost:8000/api/anti-cheat/violations/session_1710000000
```

Response:
```json
{
  "session_id": "session_1710000000",
  "total_violations": 3,
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

## Troubleshooting

### Camera Permission Not Requested
- ✅ Check browser camera settings
- ✅ Ensure HTTPS in production (browsers require secure context for camera)
- ✅ Try a different browser (Chrome/Edge recommended)

### No Violations Being Logged
- ✅ Verify hook is initialized: `useAntiCheat(sessionId, true)`
- ✅ Open browser console (F12) and check for errors
- ✅ Check Network tab: POST requests should go to `/api/anti-cheat/logs`

### Logs Not Appearing in Database
- ✅ Verify table exists: `SELECT * FROM anti_cheat_logs LIMIT 1`
- ✅ Check backend is running on port 8000
- ✅ Verify CORS allows POST from frontend domain
- ✅ Check database connection string in `backend/db.py`

### High Volume of Logs
- ✅ Adjust sending interval: Change `15000` to `30000` in `use-anti-cheat.ts`
- ✅ Add database indexes on `session_id` and `violation_timestamp`
- ✅ Implement log retention policy (keep only 90 days)

---

## Performance Considerations

### Client-Side
- Memory: ~50KB per 1000 violations (in buffer)
- Network: ~2KB per batch send (every 15 seconds)
- CPU: Minimal, all async/non-blocking

### Server-Side
- Database inserts: Batch 50-100 violations at once
- Recommended index: `(session_id, logged_at)`
- Query performance: <100ms for typical queries

### Optimization Tips
1. Increase batch interval from 15s to 30s for high-traffic deployments
2. Implement database partitioning by date
3. Add async job processor for log archival
4. Consider separate analytics database for reporting

---

## Compliance Checklist

- [ ] Privacy policy mentions anti-cheat monitoring
- [ ] Candidates consent to monitoring before test
- [ ] No personally identifiable information logged (only session IDs)
- [ ] No video/audio content stored
- [ ] Logs encrypted at rest (implement if needed)
- [ ] Access controls: Recruiter/Admin only
- [ ] Audit trail: All log access logged
- [ ] Retention policy: Set retention period (e.g., 1 year)
- [ ] Data deletion: Implement GDPR right-to-be-forgotten
- [ ] Security review: Penetration test completed

---

## Support & Resources

- Main Docs: `ANTI_CHEAT_SYSTEM.md`
- Implementation Details: `ANTI_CHEAT_IMPLEMENTATION.md`
- Hook Source: `hooks/use-anti-cheat.ts`
- IDE Integration: `app/(candidate)/.../ide/page.tsx`
- Backend: `backend/routes/assessments.py`

---

## FAQ

**Q: Can I disable anti-cheat for certain candidates?**
A: Yes, pass `false` to hook: `useAntiCheat(sessionId, false)`

**Q: Can I apply automatic penalties?**
A: Currently manual. Future phase will have configurable penalty rules.

**Q: Is the camera recording?**
A: No, only monitoring stream status. No frames captured or stored.

**Q: Can candidates see the logs?**
A: No, logs are recruiter-only. Candidates don't see violations.

**Q: What if a candidate doesn't have a camera?**
A: Log `CAMERA_VIOLATION: PERMISSION_DENIED`. Recruiter decides penalty.

**Q: Can I export violation data?**
A: Yes, via `GET /api/anti-cheat/violations/{session_id}` and database queries.
