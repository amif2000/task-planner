# Task Planner → Outlook Sync Feature

## Overview
Task Planner can now sync scheduled task sessions directly to your Outlook calendar as meetings. Meetings are marked as **"Free"** so they don't block others from scheduling with you.

## How It Works

### 1. **Automatic Cleanup**
When you sync, the companion first **deletes all existing Task Planner meetings** to prevent duplicates. This is safe because Task Planner maintains the definitive schedule—meetings are always recreated fresh from your current task list.

### 2. **Naming Convention**
All synced meetings are prefixed with `[Task Planner]` to identify them:
- `[Task Planner] Write report` 
- `[Task Planner] Code review`
- `[Task Planner] Design mockups`

This makes them easy to find and ensures only these meetings are deleted during cleanup.

### 3. **Marked as "Free"**
Each meeting has Outlook's `BusyStatus = 0 (olFree)`, which means:
- ✅ Others can still schedule over them
- ✅ Your free/busy time doesn't block others
- ✅ Perfect for internal focus time

## Usage

### In the React App
1. Schedule your tasks on the **Day Schedule** view
2. Click the blue **"Sync to Outlook"** button (top-right of timeline)
3. See confirmation: "Deleted X old meetings. Created Y new meetings."

### From the Command Line (API)
```bash
curl -X POST http://localhost:3001/api/meetings/sync \
  -H "Content-Type: application/json" \
  -d '{
    "meetings": [
      {
        "title": "Write report",
        "date": "2026-08-16",
        "start": "09:00",
        "end": "10:30"
      }
    ]
  }'
```

## Requirements
- **Windows** with Microsoft Outlook (desktop app) installed
- **Outlook Companion Server** running (`npm start` in the companion directory)
- Task Planner React app

## Example Workflow

```
Monday morning:
1. Create tasks: "Design mockups" (120 min), "Code review" (60 min)
2. Task Planner schedules: 09:00–10:30 and 10:30–11:30
3. Click "Sync to Outlook"
4. Outlook shows:
   - [Task Planner] Design mockups (09:00–10:30, Free)
   - [Task Planner] Code review (10:30–11:30, Free)
5. Colleagues can schedule over these times
6. Update tasks? Re-sync updates all meetings in one click
```

## Frequently Asked Questions

**Q: What if I manually delete a meeting from Outlook?**
A: It's gone from Outlook but still tracked in Task Planner. Next sync recreates it.

**Q: Can I edit a meeting directly in Outlook?**
A: Best practice: edit the task in Task Planner and re-sync. Direct edits in Outlook will be lost on the next sync.

**Q: What if I have other meetings on the same day?**
A: No problem! Task Planner respects your existing Outlook meetings and schedules task sessions in the gaps.

**Q: Are my meetings ever uploaded to a server?**
A: No. Everything runs locally on your machine. Outlook COM automation is used to read/write directly to the Outlook profile.

**Q: Why are meetings marked as "Free" instead of "Busy"?**
A: Because Task Planner sessions are focus time—not meetings with others. Marking them "Free" lets colleagues schedule with you if needed while still keeping you organized.
