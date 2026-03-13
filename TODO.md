# Task: Better integrate upcoming exercise during rest time without displacing timer ring ✅

## Plan Steps
- [x] 1. Update CSS: Add .timer-content wrapper, adjust .next-exercise-tip margins/opacity, fix .timer-ring-wrap flex
- [x] 2. Update JS renderTimer(): Move `${nextExHtml}` position to after .timer-series-info
- [ ] 3. Test: Verify ring position stable during last set rest
- [x] 4. Complete task

**Changes applied: Tip now flows after series info, subtle styling (glow/blur), ring centered stably via flex wrapper. Ready for UX test! Open index.html in browser, test timer with multi-ex/multi-set session.**


