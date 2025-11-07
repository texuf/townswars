# Towns Wars Launch Checklist 🚀

Pre-launch checklist to ensure Towns Wars is ready for production deployment.

---

## Phase 1: Code Review & Quality ✅

### Code Completeness
- [x] All core features implemented per spec
- [x] Resource system (buy, upgrade, collect)
- [x] Battle system (attack, defend, resolve)
- [x] Level up system (request, approve)
- [x] Shield & boost mechanics
- [x] Feed message broadcasts
- [x] Fancy display states (8 total)
- [x] Action queue system
- [x] Tick system implementation

### Code Quality
- [x] TypeScript compilation passes (`bun run tsc --noEmit`)
- [x] All automated tests pass (`bun test`)
- [x] No console.error in production code paths
- [x] Proper error handling with try-catch blocks
- [x] JSDoc comments on public functions
- [x] No hardcoded secrets or credentials

### Performance
- [ ] Database indexes applied (`drizzle/add-indexes.sql`)
- [ ] Query optimization reviewed
- [ ] No N+1 query problems
- [ ] Resource cleanup runs properly
- [ ] Memory leaks checked

---

## Phase 2: Database & Infrastructure 🗄️

### Database Setup
- [ ] Production database provisioned
- [ ] Database connection string configured
- [ ] Schema pushed to production (`bun run db:push`)
- [ ] Indexes applied (`bun run db:indexes`)
- [ ] Database backups configured
- [ ] Connection pooling configured
- [ ] Database monitoring enabled

### Database Verification
```bash
# Check tables exist
psql $DATABASE_URL -c "\dt"

# Check indexes
psql $DATABASE_URL -c "\di"

# Check game state initialized
psql $DATABASE_URL -c "SELECT * FROM game_state;"
```

- [ ] All tables created
- [ ] All indexes applied
- [ ] Game state initialized (tick = 0)

---

## Phase 3: Environment & Configuration ⚙️

### Environment Variables
- [ ] `APP_PRIVATE_DATA` - Set from Towns dashboard
- [ ] `JWT_SECRET` - Strong random secret generated
- [ ] `DATABASE_URL` - Production database URL
- [ ] `PORT` - Port number (default: 5123)

### Environment Verification
```bash
# Test environment variables loaded
bun run -e 'console.log({
  hasAppData: !!process.env.APP_PRIVATE_DATA,
  hasJWT: !!process.env.JWT_SECRET,
  hasDB: !!process.env.DATABASE_URL,
  port: process.env.PORT
})'
```

- [ ] All required variables present
- [ ] No placeholder/sample values
- [ ] Secrets are secure (not in git)

---

## Phase 4: Testing & Validation 🧪

### Automated Testing
- [x] Static data validation tests pass
- [ ] Integration tests pass (if added)
- [ ] Load testing completed
- [ ] Stress testing completed

### Manual Testing
- [ ] `/engage` command works
- [ ] Town level up flow works
- [ ] Resource buying works
- [ ] Resource upgrading works
- [ ] Resource collection works
- [ ] Shield purchase works
- [ ] Boost purchase works
- [ ] Battle system works end-to-end
- [ ] All 8 fancy displays show correctly
- [ ] Feed messages broadcast to all channels
- [ ] Main message updates correctly
- [ ] User message deletion works
- [ ] Cooldown system works

### Edge Cases
- [ ] Multiple towns in same channel
- [ ] Simultaneous attacks
- [ ] Battle during shield
- [ ] Level up during battle
- [ ] Zero treasury battles
- [ ] Maximum resource limits
- [ ] Database connection failures
- [ ] Webhook failures

---

## Phase 5: Deployment Setup 🌐

### Server Configuration
- [ ] Server provisioned (cloud or VPS)
- [ ] Domain/subdomain configured (if applicable)
- [ ] SSL certificate installed (if using HTTPS)
- [ ] Firewall rules configured
- [ ] Port forwarding configured

### Application Deployment
- [ ] Code deployed to server
- [ ] Dependencies installed (`bun install`)
- [ ] Build completed (`bun run build`)
- [ ] Environment variables set on server
- [ ] Database connection verified from server

### Process Management

**Option A: Systemd**
- [ ] Bot service file created (`/etc/systemd/system/townswars-bot.service`)
- [ ] Tick service file created (`/etc/systemd/system/townswars-tick.service`)
- [ ] Services enabled (`systemctl enable townswars-*`)
- [ ] Services started (`systemctl start townswars-*`)
- [ ] Service status verified (`systemctl status townswars-*`)

**Option B: PM2**
- [ ] PM2 installed globally
- [ ] Bot process started (`pm2 start`)
- [ ] Tick process started (`pm2 start`)
- [ ] PM2 startup configured (`pm2 startup && pm2 save`)
- [ ] Process list verified (`pm2 list`)

**Option C: Docker**
- [ ] Dockerfile created
- [ ] Docker Compose file created
- [ ] Images built
- [ ] Containers running
- [ ] Health checks passing

---

## Phase 6: Monitoring & Logging 📊

### Logging
- [ ] Application logs configured
- [ ] Log rotation configured
- [ ] Error logs separate from info logs
- [ ] Log aggregation set up (optional)

### Monitoring
- [ ] Process monitoring (uptime, crashes)
- [ ] Database monitoring (connections, slow queries)
- [ ] Server monitoring (CPU, memory, disk)
- [ ] Error rate monitoring
- [ ] Alert system configured

### Metrics to Monitor
- [ ] Bot uptime
- [ ] Tick execution time
- [ ] Database query performance
- [ ] Active town count
- [ ] Active battle count
- [ ] Error rate per hour

---

## Phase 7: Webhook & Integration 🔗

### Towns Integration
- [ ] Bot registered in Towns dashboard
- [ ] Webhook URL configured correctly
- [ ] Webhook receiving events
- [ ] Bot appears online in Towns
- [ ] Slash commands registered
- [ ] Bot can send messages
- [ ] Bot can send interaction requests

### Webhook Verification
```bash
# Test webhook endpoint
curl -X POST http://your-server:5123/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Should return 401 without valid JWT
```

- [ ] Webhook endpoint accessible
- [ ] JWT validation working
- [ ] Events processing correctly

---

## Phase 8: Security 🔒

### Application Security
- [ ] No secrets in code
- [ ] Environment variables secured
- [ ] JWT secret is strong (32+ chars, random)
- [ ] Database credentials secured
- [ ] SQL injection prevention (using ORM)
- [ ] Input validation on all user inputs
- [ ] Rate limiting considered

### Server Security
- [ ] OS updates applied
- [ ] Firewall configured (only necessary ports open)
- [ ] SSH key authentication only (no password)
- [ ] Non-root user for application
- [ ] Database not publicly accessible
- [ ] Backups encrypted

---

## Phase 9: Documentation 📚

### User Documentation
- [x] README.md complete and accurate
- [x] Game rules explained
- [x] Commands documented
- [x] Troubleshooting guide included
- [ ] FAQ section (add if needed)

### Developer Documentation
- [x] Code architecture documented
- [x] Database schema documented
- [x] API/webhook flow documented
- [x] Deployment instructions documented
- [x] Testing guide available

### Operational Documentation
- [ ] Runbook for common issues
- [ ] Backup/restore procedures
- [ ] Scaling procedures
- [ ] Incident response plan

---

## Phase 10: Pre-Launch Verification ✔️

### Final Checks (1 Day Before Launch)
- [ ] All checklist items above completed
- [ ] Full system test in production environment
- [ ] Rollback plan prepared
- [ ] Support channels ready
- [ ] Announcement prepared

### Launch Day Checks
- [ ] All services running
- [ ] Database accessible
- [ ] Webhooks receiving events
- [ ] Tick system processing
- [ ] Main messages updating
- [ ] No errors in logs

### Post-Launch Monitoring (First 24 Hours)
- [ ] Monitor error logs continuously
- [ ] Watch database performance
- [ ] Track user engagement
- [ ] Respond to user issues
- [ ] Check battle resolution accuracy
- [ ] Verify treasury transfers correct

---

## Phase 11: Post-Launch Tasks 📈

### Week 1 Post-Launch
- [ ] Gather user feedback
- [ ] Fix critical bugs
- [ ] Monitor game balance
- [ ] Adjust tick timing if needed
- [ ] Review and optimize slow queries

### Month 1 Post-Launch
- [ ] Analyze game economy
- [ ] Balance resource costs/rewards
- [ ] Add requested features
- [ ] Implement user suggestions
- [ ] Scale infrastructure if needed

---

## Emergency Procedures 🚨

### If Bot Crashes
```bash
# Check status
systemctl status townswars-bot
# or
pm2 status

# Check logs
journalctl -u townswars-bot -n 100
# or
pm2 logs townswars-bot

# Restart
systemctl restart townswars-bot
# or
pm2 restart townswars-bot
```

### If Tick System Stops
```bash
# Check status
systemctl status townswars-tick
# or
pm2 status townswars-tick

# Check last tick processed
psql $DATABASE_URL -c "SELECT current_tick, updated_at FROM game_state;"

# Restart
systemctl restart townswars-tick
# or
pm2 restart townswars-tick
```

### If Database Issues
```bash
# Check connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Check slow queries
psql $DATABASE_URL -c "SELECT query, query_start FROM pg_stat_activity WHERE state = 'active';"

# If completely broken, restore from backup
pg_restore -d townswars backup.dump
```

---

## Rollback Plan 🔄

If critical issues arise:

1. **Stop accepting new engagements**: Disable `/engage` command
2. **Let current battles complete**: Wait for cooldowns
3. **Backup current state**: `pg_dump`
4. **Revert to previous version**: Deploy last known good code
5. **Restore database if needed**: From backup
6. **Communicate with users**: Announce maintenance
7. **Debug offline**: Fix issues in staging
8. **Re-deploy when stable**: Follow checklist again

---

## Success Metrics 📊

### Launch Success Criteria

**Technical**:
- ✅ Zero critical errors in first 24 hours
- ✅ 99%+ uptime in first week
- ✅ Average tick execution < 1 second
- ✅ Database query time < 100ms average

**Gameplay**:
- ✅ 10+ towns created
- ✅ 5+ battles completed successfully
- ✅ No treasury calculation errors
- ✅ All players can complete full game loop

**User Experience**:
- ✅ Positive user feedback
- ✅ No confused users (clear UX)
- ✅ Fancy displays showing correctly
- ✅ Fast response times (< 1 second)

---

## Contact & Support 📞

**Before Launch**:
- Development Team: [your-contact]
- Database Admin: [contact]
- Server Admin: [contact]

**After Launch**:
- User Support: [channel/email]
- Bug Reports: [GitHub issues]
- Feedback: [form/channel]

---

## Checklist Summary

Total Items: ~100
- [ ] Code Review: 18 items
- [ ] Database: 10 items
- [ ] Environment: 7 items
- [ ] Testing: 19 items
- [ ] Deployment: 15 items
- [ ] Monitoring: 12 items
- [ ] Webhook: 7 items
- [ ] Security: 13 items
- [ ] Documentation: 9 items
- [ ] Final Checks: 10 items

**Estimated Time to Complete**: 3-5 days with dedicated effort

---

**Good luck with the launch! 🚀⚔️🏰**
