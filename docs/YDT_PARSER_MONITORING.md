# YDT Parser Monitoring Guide

**Date:** December 26, 2024  
**Status:** ✅ Auto-Watch Mode Available

---

## 🎯 Overview

Monitor YDT parser progress in real-time with automatic updates every 15 seconds.

---

## 🚀 Quick Start

### Watch Mode (Automatic Updates)
```bash
npm run parse:watch
```

Or directly:
```bash
npx tsx scripts/monitor-parser-progress.ts --watch
```

### Single Check
```bash
npm run parse:status
```

Or directly:
```bash
npx tsx scripts/monitor-parser-progress.ts
```

---

## 📊 What It Monitors

### Knowledge Base (`knowledge-base.json`)
- ✅ Files parsed count
- ✅ Workflows extracted
- ✅ Algorithms extracted
- ✅ Components extracted
- ✅ Fabrication knowledge:
  - Processes
  - Assembly sequences
  - System packs
  - Profile roles
  - Cutting rules
  - Connection angles
- ✅ File size changes
- ✅ Last update timestamp

### Code Structure (`code-structure.json`)
- ✅ Files parsed count
- ✅ Files by type (TypeScript, Python, etc.)
- ✅ Total lines processed
- ✅ Error count
- ✅ File size changes

---

## 🔔 Change Detection

The watch mode automatically detects and highlights:
- 📦 Knowledge base size changes
- 🔄 New workflows discovered
- ⚙️ New algorithms discovered
- 🧩 New components discovered
- 🔧 New fabrication processes extracted
- 📄 Code structure updates
- 📝 New code files parsed

---

## 📈 Example Output

```
👀 YDT Parser Progress Monitor - Watch Mode
============================================================
Monitoring parser progress every 15 seconds...
Press Ctrl+C to stop

✅ Knowledge Base Status (3:45:23 PM):
   Files parsed: 653
   Workflows: 5
   Algorithms: 12
   Components: 28
   File size: 156.23 KB
   Last updated: 2025-12-26T15:45:20.123Z

📐 Fabrication Knowledge:
   🔨 Processes: 47
   🔩 Assembly sequences: 23
   📦 System packs: 8
   🎭 Profile roles: 25
   ✂️  Cutting rules: 15
   📐 Connection angles: 6

🆕 Changes detected:
   🔄 Workflows: 4 → 5
   ⚙️  Algorithms: 11 → 12
   📦 KB size: 152.45 KB → 156.23 KB (+3.78 KB)
```

---

## 🛑 Stopping the Monitor

Press `Ctrl+C` to stop the watch mode gracefully.

---

## 💡 Tips

1. **Run in separate terminal**: Keep the monitor running while the parser executes
2. **Watch for changes**: The monitor highlights what's new since last check
3. **Check file sizes**: Growing file size indicates progress
4. **Fabrication knowledge**: Watch for increasing counts in fabrication domains

---

## 🔧 Troubleshooting

### Monitor shows old data
- The parser may still be running
- Wait a few minutes and check again
- Verify parser process is active

### No changes detected
- Parser may have completed
- Check if knowledge base timestamp is recent
- Re-run parser if needed: `npm run parse:documentation`

### File not found errors
- Parser hasn't started yet
- Check if parser is running: `ps aux | grep parse`
- Start parser: `npm run parse:documentation`

---

## 📝 Related Commands

```bash
# Run markdown parser
npm run parse:documentation

# Run code structure parser
npx tsx scripts/run-multisource-parser.ts

# Check status once
npm run parse:status

# Watch continuously
npm run parse:watch
```

---

## ✅ Status

- ✅ Watch mode implemented
- ✅ Change detection working
- ✅ Fabrication knowledge monitoring
- ✅ Code structure monitoring
- ✅ Auto-refresh every 15 seconds
- ✅ Graceful shutdown (Ctrl+C)

