---
name: weekly-brief
description: Generate week-in-review for founders. Use when user says "weekly brief", "week summary", or on Mondays.
---
Query Supabase for last 7 days:
- Total jars produced (SUM production_logs.jar_count where is_simulated=false)
- QC pass rate (water_tests pass / total × 100)
- New customers added (customers where customer_type='active' and conversion_date in last 7 days)
- Open issues count (issues where status != 'resolved')
- Incomplete project tasks due this week
Format as markdown:
# Week of [date range]
## Production: X jars produced (Y% of target)
## Quality: Z% pass rate
## Growth: N new customers, M$ revenue
## Open issues: [top 3 with owners]
## Next week focus: [pull from project_tasks due in next 7 days]
Save to /mnt/user-data/outputs/ as weekly-brief-YYYY-MM-DD.md or show inline.
