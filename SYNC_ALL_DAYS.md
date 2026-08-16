# Sync All Days Until Tasks Are Allocated

## Overview

You now have **two sync options** on the Day Schedule:

1. **"Today" button (blue)** — Sync only today's scheduled task sessions
2. **"All Days" button (purple)** — Sync across multiple days until all tasks are fully allocated

## How It Works

### "All Days" Sync

When you click **"Sync All Days"**:

1. **Calculate allocation horizon** — Task Planner figures out how many days are needed to schedule all active tasks
2. **Simulate each day** — Starting from today, it plans task sessions respecting your work settings, meetings, and constraints
3. **Collect all sessions** — Every task session across all necessary days is gathered
4. **Clean up & sync** — All existing Task Planner meetings are deleted, new ones are created for every day needed

### Example

```
Tasks:
  • "Write report" (120 min)
  • "Code review" (60 min)
  • "Design mockups" (90 min)

Work hours: 09:00–17:00 (8 hours/day)
Existing meeting: Tomorrow 14:00–15:00

Result after "Sync All Days":

Today (Friday):
  • 09:00–10:30 [Task Planner] Write report
  • 10:30–12:00 [Task Planner] Code review

Tomorrow (Saturday):
  • 09:00–10:30 [Task Planner] Design mockups
  (14:00–15:00 is blocked by existing meeting)

All 3 tasks fully allocated!
```

## When to Use

### Use "Today" When:
- You want to sync only today's schedule
- You're planning daily, not planning ahead
- You want quick feedback on today's work blocks

### Use "All Days" When:
- You want complete visibility of all planned work in Outlook
- You want to commit to deadlines across multiple days
- You're planning a sprint or project
- You want colleagues to see when you're blocked across the week

## Key Features

✅ **Complete allocation** — Stops only when all tasks are scheduled  
✅ **Respects constraints** — Honors work hours, meetings, session limits  
✅ **Multi-week capable** — Can plan across weeks if needed  
✅ **One-click sync** — Handles all cleanup and creation automatically  
✅ **Marked as "Free"** — All meetings don't block others  

## Example Workflow

```
Morning (Friday):
1. Create 5 tasks
2. Task Planner auto-schedules them
3. Not all fit today
4. Click "Sync All Days" button
5. See: "Synced across multiple days. Deleted 0 old meetings. Created 12 new meetings."

Outlook now shows:
• Friday: [Task Planner] Task 1, Task 2 (09:00–17:00 → all fit!)
• Saturday: [Task Planner] Task 3, Task 4
• Monday: [Task Planner] Task 5 (skipped Sunday)

All tasks visible to colleagues across the week!
```

## How Days Are Selected

Task Planner skips **non-work days** by default:
- Weekends (by convention, can be adjusted in settings)
- Public holidays (if configured)
- Days with full calendars (if no free time available)

The algorithm:
1. Start with today
2. Plan as many tasks as fit today
3. Move to next eligible day
4. Repeat until all tasks are scheduled
5. Return that list of dates

## Error Handling

### "No active tasks to sync"
- Means all tasks are marked "done"
- Create new tasks or mark some as "todo"

### "Outlook companion server is not running"
- Companion process crashed or wasn't started
- Run: `npm start` in the companion directory

### Tasks Don't Appear in Outlook
- Check Outlook's default calendar settings
- Refresh Outlook (F5)
- Look for `[Task Planner]` prefix in meetings
- Check companion server logs

## Re-Syncing

Changed your tasks? **Just click "Sync All Days" again!**

The system:
1. Recalculates the allocation horizon
2. Deletes all old Task Planner meetings
3. Creates fresh meetings for the new schedule
4. No manual cleanup needed

## Tips

**Tip 1: Check before committing**
- Use "Today" first to preview today's schedule
- Use "All Days" once you're happy with the plan

**Tip 2: Use with Outlook views**
- Group meetings by category ("Task Planner")
- Use calendar filtering to see only your task sessions

**Tip 3: Adjust constraints if needed**
- If tasks don't fit, reduce session duration limits
- If dates are too far out, add more meetings
- If scheduling is too tight, increase work hours

**Tip 4: Update regularly**
- Re-sync daily to account for new tasks or blocked time
- Outlook stays in sync with Task Planner

## FAQ

**Q: Can I pick specific dates instead of "all days"?**  
A: Not yet. Use "Today" button to sync specific dates, or "All Days" to sync complete allocation.

**Q: What if I finish a task early?**  
A: Mark it "done" in Task Planner and re-sync. Meetings are auto-cleaned and recreated.

**Q: What if a meeting gets added to Outlook?**  
A: Task Planner will avoid it. Next sync respects the new meeting slot.

**Q: How far ahead will it sync?**  
A: Up to 365 days in the future. If tasks need more, reduce their estimated duration.

**Q: Can I manually edit meetings in Outlook after sync?**  
A: Not recommended. Edits will be lost on the next sync. Edit the task in Task Planner instead.

## Implementation Details

- Multi-day sync uses the same `getScheduleForDate()` function as daily view
- Carries forward unscheduled minutes day by day
- Respects all task constraints (min/max session, sessions per day)
- Respects work settings (work hours, break duration)
- All created meetings have `BusyStatus = 0` (Free)
- Prefixed with `[Task Planner]` for safe cleanup

---

**Ready to plan ahead?** Click "All Days" to sync your complete task allocation! 📅
