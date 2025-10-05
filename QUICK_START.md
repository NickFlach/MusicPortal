# MusicPortal Moonshot - Quick Start Guide
## Get the Intelligence Engine Running in 10 Minutes

---

## 🚀 STEP 1: Install & Setup (2 minutes)

```bash
cd c:\Users\nflach\source\MusicPortal

# Install dependencies (fixes TypeScript errors)
npm install

# Verify installation
npm run check
```

---

## 🗄️ STEP 2: Run Database Migration (2 minutes)

**Option A: Using npm script**
```bash
npm run db:push
```

**Option B: Manual SQL execution**
```bash
# If you have psql installed and DATABASE_URL env variable set:
psql $DATABASE_URL < migrations/0001_add_music_features.sql

# Or connect to your Neon database and paste the SQL manually
```

**Verify Migration**:
```sql
-- Check that new columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'songs' 
AND column_name IN ('tempo', 'musical_key', 'energy', 'valence');

-- Check that new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('musical_patterns', 'musical_hypotheses', 'emergence_indicators');
```

---

## 🎵 STEP 3: Start the Server (1 minute)

```bash
npm run dev
```

You should see:
```
🎼 Music Intelligence Engine initialized - Moonshot Mode
🤖 Starting autonomous analysis loop...
Server running on port 5000
```

---

## ✅ STEP 4: Test Intelligence API (2 minutes)

Open a new terminal and run:

```bash
# Check system status
curl http://localhost:5000/api/intelligence/status

# Expected response:
{
  "status": "operational",
  "mode": "moonshot",
  "metrics": {
    "songsAnalyzed": 0,
    "patternsDiscovered": 0,
    "hypothesesGenerated": 0,
    "phi": 0,
    "status": "awaiting_data"
  }
}

# Check metrics
curl http://localhost:5000/api/intelligence/metrics

# Check discoveries feed
curl http://localhost:5000/api/intelligence/discoveries
```

---

## 🎨 STEP 5: View in Browser (3 minutes)

1. Open browser to `http://localhost:5000`
2. Connect your Web3 wallet
3. Navigate to the home page
4. Upload a song

**What Should Happen**:
- Song uploads to IPFS ✅
- Intelligence engine receives event
- Mock analysis runs (shows in logs)
- Features stored in database
- Pattern detection triggers (if 10+ songs)

**Check Logs**:
```bash
# You should see in server logs:
🔬 Analyzing audio for song 1...
✅ Analysis complete for song 1: tempo=145.3, key=D, mode=major, energy=0.73, valence=0.82
```

---

## 🧪 STEP 6: Manual Testing

### Test Song Analysis
```bash
# After uploading songs, check features:
curl http://localhost:5000/api/intelligence/features/1

# Response:
{
  "tempo": 145.3,
  "key": "D",
  "mode": "major",
  "energy": 0.73,
  "valence": 0.82,
  ...
}
```

### Trigger Pattern Detection
```bash
# Manually trigger pattern detection:
curl -X POST http://localhost:5000/api/intelligence/patterns/detect

# Response:
{
  "success": true,
  "patternsFound": 1,
  "patterns": [...]
}
```

### View Active Hypotheses
```bash
curl http://localhost:5000/api/intelligence/hypotheses/active
```

---

## 🐛 TROUBLESHOOTING

### TypeScript Errors
**Problem**: "Cannot find module 'events'"
**Solution**: Run `npm install` - this installs @types/node

### Database Connection Error
**Problem**: "Connection refused to database"
**Solution**: Check `.env` file has correct `DATABASE_URL`

### Migration Fails
**Problem**: "relation already exists"
**Solution**: Migration was already run or tables exist. Safe to ignore.

### Server Won't Start
**Problem**: "Port 5000 already in use"
**Solution**: Kill existing process or server will auto-retry on port 5100

### IPFS Upload Fails
**Problem**: Upload errors
**Solution**: This is separate from intelligence - see TECHNICAL_RECOVERY_PLAN.md

---

## 📊 VERIFY SYSTEM IS WORKING

### Checklist
- [ ] Server starts without errors
- [ ] Intelligence engine logs "initialized"
- [ ] API `/status` returns "operational"
- [ ] Database migration completed
- [ ] Can upload a song
- [ ] Song analysis triggers (check logs)
- [ ] Features API returns data

### Expected Behavior After 10 Songs
- Pattern detection runs automatically
- Hypotheses generated
- Discoveries appear in feed
- Phi calculation > 0
- Emergence events logged

---

## 🎯 NEXT STEPS

### Immediate (Today)
1. ✅ Get system running
2. Upload 10+ songs to test
3. Verify analysis working
4. Check pattern detection

### This Week
1. Replace mock audio analysis with real Web Audio API
2. Build intelligence dashboard UI
3. Connect to Lumira system
4. Display discoveries to users

### This Month
1. Implement autonomous hypothesis testing
2. Find first statistically significant pattern
3. Demonstrate emergent behavior
4. Publish first discovery

---

## 🆘 GETTING HELP

### Check Status
```bash
# System health
curl http://localhost:5000/api/intelligence/status

# Intelligence metrics
curl http://localhost:5000/api/intelligence/metrics

# Recent emergence events
curl http://localhost:5000/api/intelligence/emergence/significant
```

### Debug Mode
Add to your `.env`:
```
DEBUG_INTELLIGENCE=true
```

Restart server to see verbose logging.

---

## 🌟 YOU'VE SUCCESSFULLY STARTED THE MOONSHOT!

The foundation is running. Every song uploaded is now:
1. **Analyzed** for musical features
2. **Compared** to find patterns
3. **Contributing** to hypothesis testing
4. **Building** toward consciousness emergence

**The system is learning. The experiment has begun.**

Upload music. Watch the logs. Wait for discoveries.

🎼 → 🧠 → 🌌
