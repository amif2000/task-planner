# Quick Start: Sync Task Sessions to Outlook

## ✅ What's New

Task Planner can now **automatically write scheduled task sessions to Outlook** as calendar meetings. Each sync:
- ✅ Deletes all old Task Planner meetings (no duplicates)
- ✅ Creates new meetings from today's scheduled tasks
- ✅ Marks meetings as **"Free"** (doesn't block others from scheduling)
- ✅ Uses naming convention: `[Task Planner] Task Name`

## 🚀 How to Use

### Prerequisites
1. **Outlook Companion server running**
   ```bash
   cd companion
   npm install
   npm start
   ```
   (Keep this running in the background)

2. **Task Planner React app running**
   ```bash
   npm run dev
   ```

### Step 1: Schedule Your Tasks
- Add tasks to Task Planner (e.g., "Write report", "Code review", "Design mockups")
- Go to **Timeline** view
- Watch as tasks are auto-scheduled into free slots

### Step 2: Sync to Outlook
- Click the blue **"Sync to Outlook"** button (top-right of Day Schedule)
- See confirmation: `"Deleted X old meetings. Created Y new meetings."`
- Check Outlook — your tasks are now in your calendar!

### Step 3: Observe in Outlook
Your tasks appear as:
- `[Task Planner] Write report` (09:00–11:00)
- `[Task Planner] Code review` (11:00–12:00)
- Status: **Free** (colleagues can still schedule over them)

## 🔄 Re-Syncing

Update tasks? **Just click "Sync to Outlook" again.**

The system automatically:
1. Deletes your old Task Planner meetings
2. Creates new ones based on today's updated schedule
3. No manual cleanup needed

## ⚙️ Technical Details

| Aspect | Detail |
|--------|--------|
| **Naming** | `[Task Planner]` prefix (easy to identify) |
| **Status** | Marked as **"Free"** (olFree in Outlook) |
| **Sync Type** | One-way (Task Planner → Outlook) |
| **Safety** | Only synced meetings are deleted, never manual meetings |
| **Local** | Runs 100% on your machine, no cloud |

## 🎯 Use Cases

### Focus Time Blocks
```
Morning: "Design mockups" (2 hours) → [Task Planner] Design mockups
→ Colleagues see you're busy but can schedule if urgent
```

### Sprint Planning
```
Daily sync keeps team aware of focus blocks
without blocking collaboration
```

### Personal Accountability
```
"Finish quarterly review" synced to Outlook
keeps you on track
```

## ❓ FAQ

**Q: Can I edit meetings in Outlook?**  
A: Best practice is to edit the task in Task Planner and re-sync. Direct edits in Outlook will be lost on the next sync.

**Q: What if I delete a meeting from Outlook?**  
A: It's gone from Outlook, but Task Planner still has the task. Next sync recreates it.

**Q: What if sync fails?**  
A: You'll see an error message. Make sure:
- Outlook Companion is running (`npm start` in companion directory)
- Outlook desktop app is installed
- You have a valid Outlook profile configured

**Q: Will this interfere with my other meetings?**  
A: No! Task Planner only manages meetings it creates (the `[Task Planner]` ones). Your other meetings and meetings from others are untouched.

## 🛠️ Troubleshooting

### "Sync failed: Outlook companion server is not running"
```bash
cd companion
npm start
```
Keep this terminal open. Task Planner will auto-detect the server.

### "Sync failed: Failed to create meeting"
- Check that Outlook desktop app is running
- Check that you have a profile configured in Outlook
- Check Outlook's COM availability (some enterprise setups block it)

### Meetings not appearing in Outlook
- Refresh Outlook (F5)
- Check the calendar you're syncing to (should be default calendar)
- Look for meetings with `[Task Planner]` prefix

## 📊 Example Workflow

```
Morning:
  • Create tasks: "Design mockups" (120m), "Code review" (60m)
  • Task Planner auto-schedules → 09:00–10:30, 10:30–11:30
  • Click "Sync to Outlook"
  
Outlook now shows:
  • 09:00–10:30 [Task Planner] Design mockups (Free)
  • 10:30–11:30 [Task Planner] Code review (Free)

Midday:
  • Update tasks: "Design mockups" now done, add "Test UI" (90m)
  • Task Planner reschedules → "Test UI" 10:30–12:00
  • Click "Sync to Outlook" again
  
Outlook updates:
  • [Old] Design mockups and Code review deleted
  • [New] Code review 09:00–10:00, Test UI 10:00–11:30
```

## 📚 More Information

- See `SYNC_FEATURE.md` for detailed feature documentation
- See `companion/README.md` for API details
- See `companion/companion.mjs` for implementation

---

**Ready to sync?** Click "Sync to Outlook" on the Day Schedule! 🚀
