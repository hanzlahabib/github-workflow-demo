# 📊 MOSD Standup Workflow Guide

## Project Board Overview

**Project URL**: https://github.com/users/hanzlahabib/projects/2

The **MOSD Drug Control - Sprint Board** is designed for daily standup meetings and sprint management. It provides complete visibility into team progress, blockers, and sprint goals.

## 🏛️ Board Structure

### Enhanced Kanban Board View
The project board uses a comprehensive 7-column workflow that provides complete visibility into work progression and team capacity:

```
📋 Backlog → 📝 Todo → 🏃 In Progress → 🚫 Blocked → 👀 In Review → ✅ Done → 🚀 Released
```

### Workflow Status Columns
- **📋 Backlog** - Items not yet planned for current sprint
- **📝 Todo** - Items planned for current sprint, ready to start
- **🏃 In Progress** - Items currently being actively worked on
- **🚫 Blocked** - Items that cannot progress due to dependencies
- **👀 In Review** - Items completed and under code/design review
- **✅ Done** - Items completed, reviewed, and ready for deployment
- **🚀 Released** - Items deployed to production and verified

### Custom Fields

#### Priority Field
- **Critical** 🔴 - Immediate attention required
- **High** 🟠 - Important for sprint success  
- **Medium** 🟡 - Standard priority
- **Low** 🟢 - Nice to have

#### Sprint Field
- **Sprint 1** - Current sprint items
- **Sprint 2** - Next sprint planning
- **Sprint 3** - Future sprint
- **Sprint 4** - Future sprint
- **Backlog** - Unassigned items

#### Story Points
- Numeric field for effort estimation (1, 2, 3, 5, 8, 13, 21)
- Used for sprint capacity planning

## 🗣️ Daily Standup Process

### Before Standup (5 minutes)
1. **Team members update their items**:
   - Move completed items to "👀 In Review" or "✅ Done"
   - Update progress on "🏃 In Progress" items
   - Move any blocked items to "🚫 Blocked" with blocker details
   - Pull new items from "📝 Todo" if capacity allows

2. **Scrum Master reviews board**:
   - Check for items stuck in "🚫 Blocked" status
   - Review "👀 In Review" items for review assignments
   - Identify sprint progress vs goals
   - Prepare discussion points for blockers

### During Standup (15 minutes)

#### Round Robin Format
Each team member covers their items in order:

**Ahmed Al-Mansouri** (Backend Developer)
- **Yesterday**: What did you complete?
- **Today**: What will you work on?
- **Blockers**: What's preventing progress?

**Fatima Al-Zahra** (Frontend Developer)  
- **Yesterday**: Completed consultation booking form component
- **Today**: Working on form validation integration
- **Blockers**: Waiting for API endpoints from backend team

**Dr. Mohammad Al-Rashid** (Full Stack Developer)
- **Yesterday**: Fixed authentication issues in user management
- **Today**: Implementing case status tracking
- **Blockers**: None

#### Board Review (5 minutes)
1. **Sprint Progress**: Review story points across all columns
   - **📋 Backlog**: Items for future sprints
   - **📝 Todo**: Ready items (should be ≤ 3 per person)
   - **🏃 In Progress**: Active work (should be 1-2 per person)
   - **🚫 Blocked**: Items needing immediate attention
   - **👀 In Review**: Items waiting for review assignment
   - **✅ Done**: Completed items ready for deployment
2. **Blockers**: Address all "🚫 Blocked" items with action plans
3. **Sprint Goals**: Check if current progress aligns with sprint commitment

### After Standup (5 minutes)
1. **Update board** with any changes discussed
2. **Create action items** for resolving blockers
3. **Schedule follow-ups** if needed

## 📈 Sprint Management

### Sprint Planning
1. **Capacity Planning**:
   - Team velocity: ~25-30 story points per sprint
   - Individual capacity: 6-8 points per developer
   - Buffer: 20% for unplanned work

2. **Item Prioritization**:
   - Critical and High items first
   - Dependencies resolved in order
   - Technical debt balanced with features

### Sprint Review Process
1. **Demo completed items** from "Done" column
2. **Review metrics**:
   - Velocity achieved vs planned
   - Completion rate by priority
   - Blocker resolution time
3. **Identify improvements** for next sprint

## 🔄 Workflow Automation

### Automatic Updates
- **Issue creation** → Auto-assigned to "📋 Backlog"
- **Sprint assignment** → Moves to "📝 Todo"
- **PR created** → Moves to "🏃 In Progress" 
- **PR ready for review** → Moves to "👀 In Review"
- **PR merged** → Moves to "✅ Done"
- **Deployment completed** → Moves to "🚀 Released"
- **Label changes** → Updates priority field

### Integration Points
- **GitHub Issues** - Linked with full context
- **Pull Requests** - Automatic status updates
- **Notifications** - Slack/Teams integration for updates

## 📋 Issue Hierarchy Examples

### Epic → Story → Task → Subtask Structure

```
🎯 Epic: Online Consultation Management Platform (#7)
├── 📖 Story: Client Consultation Booking Interface (#8)
│   ├── 🔧 Task: Create consultation booking form frontend component (#10)
│   │   └── ⚙️ Subtask: Implement form validation logic (#12)
│   └── 🔧 Task: Build consultation booking API endpoints (#11)
└── 📖 Story: Consultant Schedule Management Dashboard (#9)
    └── 🔧 Task: Performance optimization for consultation booking system (#15)
```

### Current Sprint Items

| Issue | Type | Priority | Workflow Status | Assignee | Story Points |
|-------|------|----------|-----------------|----------|--------------|
| #15 | Task | High | 🚫 Blocked | Ahmed | 5 |
| #12 | Subtask | High | 👀 In Review | Fatima | 3 |
| #10 | Task | High | 🏃 In Progress | Fatima | 5 |
| #11 | Task | Medium | 📝 Todo | Ahmed | 8 |
| #8 | Story | High | 🏃 In Progress | Team | 13 |
| #9 | Story | Medium | 📋 Backlog | Unassigned | 8 |

## 🚀 Best Practices

### For Team Members
1. **Update status daily** before standup
2. **Be specific** about progress and blockers
3. **Link related PRs** to issues
4. **Communicate dependencies** early
5. **Break down large tasks** into smaller ones

### For Scrum Master
1. **Prepare board review** before standup
2. **Track velocity trends** across sprints
3. **Identify process improvements**
4. **Facilitate blocker resolution**
5. **Maintain sprint focus**

### For Product Owner
1. **Prioritize backlog** regularly
2. **Provide clear acceptance criteria**
3. **Be available** for clarifications
4. **Review completed items** promptly

## 📊 Metrics Tracking

### Daily Metrics
- Items completed per day
- New blockers identified
- Story points burned down

### Sprint Metrics  
- Velocity (story points completed)
- Completion rate by priority
- Average cycle time
- Blocker resolution time

### Long-term Metrics
- Team velocity trends
- Predictability (planned vs actual)
- Quality metrics (bugs per feature)
- Team satisfaction scores

## 🔧 Board Maintenance

### Weekly Tasks
- Archive completed sprints
- Update sprint assignments
- Review and groom backlog
- Clean up stale items

### Monthly Tasks
- Review team velocity
- Update workflow processes
- Archive old projects
- Team retrospective findings

## 📞 Support & Training

### New Team Members
1. **Board overview session** (30 minutes)
2. **Shadow standup** for first week  
3. **Hands-on practice** with issue management
4. **Process documentation** review

### Troubleshooting
- **Access issues**: Contact repository admin
- **Automation problems**: Check GitHub Actions logs
- **Performance issues**: Review board filtering
- **Process questions**: Ask in team Slack channel

---

## 🎯 Sample Standup Script

**Scrum Master**: "Good morning team! Let's start our daily standup. We have 15 minutes to review our sprint progress. Let's look at our project board and go around the team."

**[Screen shares project board]**

**Ahmed**: "Yesterday I worked on issue #11, the consultation booking API endpoints. I completed the basic CRUD operations. Today I'm continuing with the authentication integration. I'm blocked on issue #15 - the performance optimization - because I need the database indexing strategy from the DBA team."

**Fatima**: "Yesterday I finished the consultation booking form component #10 and moved it to 'In Review'. Today I'm working on the form validation logic #12, which is now ready for code review. I have no blockers, but I'll need Ahmed's API endpoints by Wednesday to complete the integration testing."

**Dr. Mohammad**: "Yesterday I reviewed Fatima's PR for the form component and provided feedback. Today I'm starting work on the case status tracking component #6. No blockers on my end."

**Scrum Master**: "Great progress team! I see we have one item in 'Blocked' status - I'll follow up on Ahmed's blocker with the DBA team this morning. We have 3 items 'In Progress', 1 'In Review', and we're on track with 12 out of 25 story points completed. Let's keep the momentum going!"

---

*This workflow is designed to maximize team efficiency while maintaining transparency and accountability in the MOSD Drug Control project.*