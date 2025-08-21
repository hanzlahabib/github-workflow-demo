# 🎯 GitHub Project Board Manual Setup Guide

## 📍 Public Project Board Access

**🌐 Public URL**: https://github.com/users/hanzlahabib/projects/2

This project board is now **publicly accessible** and can be viewed by anyone without requiring repository access.

## 🏗️ Manual Board Setup Instructions

### Step 1: Access Your Project Board

1. Navigate to **GitHub.com**
2. Go to your profile → **"Projects"** tab
3. Click **"New project"** 
4. Choose **"Board"** layout
5. Name it: **"MOSD Drug Control - Sprint Board"**

### Step 2: Create Custom Fields

#### A. Priority Field
1. Click **"+ Add field"** (top right of project)
2. **Field name**: `Priority`
3. **Field type**: `Single select`
4. **Options**:
   - 🔴 **Critical** (color: red)
   - 🟠 **High** (color: orange)  
   - 🟡 **Medium** (color: yellow)
   - 🟢 **Low** (color: green)

#### B. Sprint Field  
1. Click **"+ Add field"**
2. **Field name**: `Sprint`
3. **Field type**: `Single select`
4. **Options**:
   - 📅 **Sprint 1** (color: blue)
   - 📅 **Sprint 2** (color: purple)
   - 📅 **Sprint 3** (color: pink)
   - 📅 **Sprint 4** (color: cyan)
   - 📦 **Backlog** (color: gray)

#### C. Story Points Field
1. Click **"+ Add field"**
2. **Field name**: `Story Points`
3. **Field type**: `Number`
4. **Description**: "Effort estimation using Fibonacci sequence"

#### D. Workflow Status Field (Most Important!)
1. Click **"+ Add field"**
2. **Field name**: `Workflow Status`
3. **Field type**: `Single select`
4. **Options** (with emojis for visual clarity):
   - 📋 **Backlog** (color: gray)
   - 📝 **Todo** (color: blue)
   - 🏃 **In Progress** (color: yellow)
   - 🚫 **Blocked** (color: red)
   - 👀 **In Review** (color: purple)
   - ✅ **Done** (color: green)
   - 🚀 **Released** (color: cyan)

### Step 3: Configure Board View

#### Create Standup Board View
1. Click **"View"** dropdown (top left)
2. Click **"New view"**
3. **View name**: `Standup Board`
4. **Layout**: `Board`
5. Click **"Create"**

#### Set Up Columns
1. **Group by**: Select **"Workflow Status"**
2. This creates 7 columns automatically:
   ```
   📋 Backlog → 📝 Todo → 🏃 In Progress → 🚫 Blocked → 👀 In Review → ✅ Done → 🚀 Released
   ```

#### Column Limits (Recommended)
1. **📝 Todo**: Max 3 items per person
2. **🏃 In Progress**: Max 2 items per person  
3. **🚫 Blocked**: No limit (needs immediate attention)
4. **👀 In Review**: No limit (waiting for reviewers)

### Step 4: Add Items to Project

#### Link Repository Issues
1. Click **"Add item"** (bottom of any column)
2. Search for repository: `hanzlahabib/github-workflow-demo`
3. Select issues to add to project
4. They'll appear in "📋 Backlog" by default

#### Bulk Add Items
1. Go to **"Add items"** button
2. **"Add from repository"**
3. Select multiple issues at once
4. Click **"Add selected items"**

## 🗂️ Sprint & Milestone Setup

### Creating Milestones (Repository Level)

#### Method 1: GitHub Web Interface
1. Go to your repository
2. Click **"Issues"** tab
3. Click **"Milestones"**
4. Click **"New milestone"**
5. Fill in details:
   - **Title**: `Sprint 1 - Consultation Booking MVP`
   - **Description**: Goal and scope
   - **Due date**: Sprint end date

#### Method 2: GitHub CLI
```bash
# Create milestone via API
gh api repos/OWNER/REPO/milestones -X POST \
  -f title="Sprint 1 - Consultation Booking MVP" \
  -f description="Initial consultation booking system" \
  -f due_on="2025-09-02T23:59:59Z"
```

### Sprint Planning Structure

#### Sprint 1 - Consultation Booking MVP (Aug 19 - Sep 2)
**Goal**: Basic consultation booking functionality
- Core booking form frontend
- API endpoints for booking  
- Basic validation logic
- User authentication

#### Sprint 2 - Advanced Features (Sep 2 - Sep 16)  
**Goal**: Enhanced booking system
- Conflict detection
- Notifications system
- Schedule management
- Integration between systems

#### Sprint 3 - Performance & Security (Sep 16 - Sep 30)
**Goal**: Production readiness
- Performance optimization
- Security enhancements  
- Comprehensive testing
- Deployment preparation

### Assigning Issues to Milestones

#### Via Web Interface
1. Open any issue
2. Click **"Milestone"** in right sidebar
3. Select appropriate sprint milestone

#### Via GitHub CLI
```bash
gh issue edit ISSUE_NUMBER --milestone "Sprint 1 - Consultation Booking MVP"
```

## 🎨 Board Customization

### Visual Enhancements

#### Column Colors
- **📋 Backlog**: Gray (#6B7280)
- **📝 Todo**: Blue (#3B82F6)
- **🏃 In Progress**: Yellow (#F59E0B)
- **🚫 Blocked**: Red (#EF4444)
- **👀 In Review**: Purple (#8B5CF6)
- **✅ Done**: Green (#10B981)
- **🚀 Released**: Cyan (#06B6D4)

#### Card Information Display
1. **Always show**: Title, Priority, Assignee
2. **Optional**: Story Points, Sprint, Labels
3. **Hover details**: Description preview

### Automation Setup

#### GitHub Actions Integration
Add to `.github/workflows/project-automation.yml`:

```yaml
name: Project Board Automation
on:
  issues:
    types: [opened, assigned, closed]
  pull_request:
    types: [opened, closed, merged]

jobs:
  update-project:
    runs-on: ubuntu-latest
    steps:
      - name: Auto-assign to project
        uses: actions/add-to-project@v0.4.0
        with:
          project-url: https://github.com/users/hanzlahabib/projects/2
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## 📊 Board Views for Different Purposes

### 1. Daily Standup View
- **Layout**: Board
- **Group by**: Workflow Status
- **Filter**: Current Sprint only
- **Sort**: Priority (High to Low)

### 2. Sprint Planning View  
- **Layout**: Table
- **Group by**: Sprint
- **Show**: Title, Priority, Story Points, Assignee
- **Filter**: All items

### 3. Team Capacity View
- **Layout**: Board  
- **Group by**: Assignee
- **Show**: Workflow Status, Story Points
- **Filter**: In Progress + Todo

### 4. Blocker Management View
- **Layout**: Table
- **Filter**: Workflow Status = "🚫 Blocked"
- **Sort**: Priority + Created Date
- **Show**: Title, Priority, Assignee, Created Date

## 🚀 Quick Setup Checklist

### Initial Setup (30 minutes)
- [ ] Create project with Board layout
- [ ] Add 4 custom fields (Priority, Sprint, Story Points, Workflow Status)
- [ ] Create "Standup Board" view grouped by Workflow Status
- [ ] Add repository issues to project
- [ ] Create 3 sprint milestones

### Sprint Planning (15 minutes per sprint)
- [ ] Review backlog items
- [ ] Estimate story points for new items
- [ ] Assign items to current sprint
- [ ] Set sprint milestone on issues
- [ ] Update Workflow Status to "📝 Todo"

### Daily Maintenance (5 minutes)
- [ ] Update item status based on progress
- [ ] Move completed items to "✅ Done"
- [ ] Flag any new blockers as "🚫 Blocked"
- [ ] Assign reviewers for "👀 In Review" items

## 🔗 Useful URLs

- **Public Project Board**: https://github.com/users/hanzlahabib/projects/2
- **Repository Issues**: https://github.com/hanzlahabib/github-workflow-demo/issues
- **Sprint 1 Milestone**: https://github.com/hanzlahabib/github-workflow-demo/milestone/1
- **Sprint 2 Milestone**: https://github.com/hanzlahabib/github-workflow-demo/milestone/2
- **Sprint 3 Milestone**: https://github.com/hanzlahabib/github-workflow-demo/milestone/3

## 🎯 Pro Tips

### For Scrum Masters
1. **Use filters** to focus on specific sprints or priorities
2. **Create saved views** for different meeting types
3. **Set up notifications** for blocked items
4. **Use @ mentions** in comments for follow-ups

### For Developers  
1. **Update status** before daily standup
2. **Add time estimates** in comments
3. **Link PRs** to issues for automatic updates
4. **Use draft PRs** to signal work in progress

### For Product Owners
1. **Prioritize backlog** weekly
2. **Add detailed acceptance criteria** in issue descriptions
3. **Review "👀 In Review"** items promptly
4. **Plan 2-3 sprints** ahead for predictability

---

*This setup provides enterprise-level project management capabilities while maintaining simplicity for daily use.*