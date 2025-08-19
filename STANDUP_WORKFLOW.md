# 📊 MOSD Standup Workflow Guide

## Project Board Overview

**Project URL**: https://github.com/users/hanzlahabib/projects/2

The **MOSD Drug Control - Sprint Board** is designed for daily standup meetings and sprint management. It provides complete visibility into team progress, blockers, and sprint goals.

## 🏛️ Board Structure

### Status Columns
- **📋 Todo** - Items planned for the sprint but not started
- **🏃 In Progress** - Items currently being worked on
- **✅ Done** - Completed items ready for review/testing

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
   - Move completed items to "Done" 
   - Update progress on "In Progress" items
   - Add any new blockers as comments

2. **Scrum Master reviews board**:
   - Check for overdue items
   - Identify potential blockers
   - Prepare discussion points

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
1. **Sprint Progress**: Review burn-down of story points
2. **Blockers**: Address critical blockers with action items
3. **Sprint Goals**: Check alignment with sprint objectives

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
- **Issue creation** → Auto-assigned to "Todo"
- **PR linked** → Moves to "In Progress" 
- **PR merged** → Moves to "Done"
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

| Issue | Type | Priority | Status | Assignee | Story Points |
|-------|------|----------|---------|----------|--------------|
| #15 | Task | High | Blocked | Ahmed | 5 |
| #12 | Subtask | High | Ready for Review | Fatima | 3 |
| #10 | Task | High | In Progress | Fatima | 5 |
| #11 | Task | Medium | Todo | Ahmed | 8 |
| #8 | Story | High | In Progress | Team | 13 |

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

**Fatima**: "Yesterday I finished the consultation booking form component #10. Today I'm working on the form validation logic #12, which is ready for review. I have no blockers, but I'll need Ahmed's API endpoints by Wednesday to complete the integration testing."

**Dr. Mohammad**: "Yesterday I reviewed Fatima's PR for the form component and provided feedback. Today I'm starting work on the case status tracking component #6. No blockers on my end."

**Scrum Master**: "Great progress team! I'll follow up on Ahmed's blocker with the DBA team this morning. We're on track with 12 out of 25 story points completed. Let's keep the momentum going!"

---

*This workflow is designed to maximize team efficiency while maintaining transparency and accountability in the MOSD Drug Control project.*