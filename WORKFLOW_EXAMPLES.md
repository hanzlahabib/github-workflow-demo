# 🔄 GitHub Issue Workflow Examples

This document demonstrates how issues flow through different stages and link together in our MOSD project workflow.

## 🏗️ Issue Hierarchy & Linking

### Epic → Stories → Tasks → Subtasks Structure

```
📊 EPIC #1: MOSD Drug Control Management System
├── 📖 STORY #4: Case Worker Dashboard
│   ├── 📝 TASK #6: Implement case status tracking component
│   └── 📝 TASK #10: Create consultation booking form frontend component
│       ├── 🔧 SUBTASK #12: Implement form validation logic for booking form
│       └── 🔧 SUBTASK: Calendar widget integration
│
📊 EPIC #7: Online Consultation Management Platform  
├── 📖 STORY #8: Client Consultation Booking Interface
│   ├── 📝 TASK #10: Create consultation booking form frontend component
│   └── 📝 TASK #11: Build consultation booking API endpoints
│       ├── 🔧 SUBTASK #13: Create booking conflict detection logic
│       └── 🔧 SUBTASK: Email/SMS notification service
└── 📖 STORY #9: Consultant Schedule Management Dashboard
    ├── 📝 TASK: Calendar component development
    └── 📝 TASK: Schedule API integration
```

## 🔗 Cross-Reference Linking Examples

### 1. Parent-Child References
```markdown
## Parent Task
Part of #10 - Create consultation booking form frontend component
**Parent Story:** #8 - Client Consultation Booking Interface  
**Parent Epic:** #7 - Online Consultation Management Platform
```

### 2. Dependency References
```markdown
## Dependencies
- Requires #2 (User Authentication System)
- Integration with consultant schedules (#9)
- Database schema from #3
- **Blocks:** #8 (Client Booking Interface)
- **Blocked by:** #11 (API endpoints must be completed first)
```

### 3. Cross-System Integration
```markdown
**Drug Control System:** References #1 (MOSD Drug Control Management System)
**Consultation System:** References #7 (Online Consultation Management Platform)
**Authentication:** Depends on #2 (User Authentication and Authorization System)
```

## 📊 Workflow Status Progression

### Status Flow Example

1. **Epic Planning Phase**
   ```
   📊 EPIC #1: MOSD Drug Control Management System
   Labels: epic, priority: high, module: drug-control
   Status: 🟡 Planning → Stories being defined
   ```

2. **Story Development Phase**
   ```
   📖 STORY #8: Client Consultation Booking Interface  
   Labels: story, priority: high, module: consultation, sprint: 1
   Status: 🟡 Sprint Ready → Tasks being created
   ```

3. **Task Implementation Phase**
   ```
   📝 TASK #10: Create consultation booking form frontend component
   Labels: type: task, priority: high, module: consultation, sprint: 1, status: in-progress
   Status: 🟠 In Progress → Developer actively working
   ```

4. **Subtask Completion Phase**
   ```
   🔧 SUBTASK #12: Implement form validation logic for booking form
   Labels: subtask, priority: high, module: consultation, sprint: 1, status: ready-for-review
   Status: 🔵 Ready for Review → Code review pending
   ```

5. **Completion Phase**
   ```
   📝 TASK #3: Set up development database schema
   Labels: type: task, priority: medium, module: drug-control, sprint: 1, status: done
   Status: ✅ Done → Completed and verified
   ```

## 🚨 Blocking Relationships Example

### Issue #15: Performance Optimization (BLOCKED)
```markdown
## Current Status
🔴 **BLOCKED** - Waiting for #11 (API endpoints) to be completed

## Impact Chain
**Blocks:** #8 (Client Booking Interface) - Users can't complete bookings
**Blocks:** #9 (Consultant Schedule Management) - Dashboard becomes unresponsive
**Depends on:** #11 (Booking API endpoints) - API must be optimized first
```

This creates a **dependency chain**:
`Issue #11 → Issue #15 → Issues #8, #9`

## 🔄 Sprint Planning Workflow

### Sprint 1 Issues (Current Sprint)
- ✅ #3: Database schema (DONE)
- 🟠 #10: Booking form component (IN PROGRESS)
- 🔵 #12: Form validation (READY FOR REVIEW)
- 🟡 #2: Authentication system (SPRINT READY)

### Sprint 2 Issues (Next Sprint)
- 🟡 #15: Performance optimization (BLOCKED - will move to Sprint 2)
- 🟡 #9: Consultant dashboard (AWAITING DEPENDENCIES)

### Backlog Issues
- 🟡 #1: Main epic (LONG-TERM PLANNING)
- 🟡 #14: Cross-system integration (FUTURE SPRINT)

## 📈 Demo Scenarios for Presentation

### Scenario 1: Epic Breakdown Demo
1. **Show Epic #1** - Large system overview
2. **Navigate to Story #4** - Specific user story
3. **Drill down to Task #6** - Development work
4. **Show Subtask relationship** - Granular implementation details

### Scenario 2: Cross-Dependency Tracking
1. **Start with Issue #15** (Performance) - Show blocked status
2. **Navigate to blocking Issue #11** (API) - Show what's preventing progress
3. **Show impact on Issues #8, #9** - Demonstrate cascade effects
4. **Explain workflow implications** - How team prioritizes work

### Scenario 3: Sprint Planning Flow
1. **Filter by `sprint: 1`** - Show current sprint work
2. **Demonstrate status progression** - From ready → in progress → review → done
3. **Show blocked items** - Items that need to move to next sprint
4. **Explain capacity planning** - How labels help with workload distribution

### Scenario 4: Module-Based Organization
1. **Filter by `module: drug-control`** - Show all drug control work
2. **Filter by `module: consultation`** - Show consultation system work  
3. **Show integration tasks** - Cross-module dependencies
4. **Demonstrate team assignment** - How different teams work on different modules

## 🏷️ Label-Based Workflow Management

### Priority-Based Filtering
```bash
# Show only high-priority items
Filter: priority: high

# Show current sprint work
Filter: sprint: 1

# Show blocked items needing attention
Filter: status: blocked
```

### Team Assignment Examples
```bash
# Frontend team work
Filter: module: consultation AND type: task (frontend components)

# Backend team work  
Filter: module: drug-control AND type: task (API development)

# DevOps team work
Filter: type: task AND (infrastructure OR deployment)
```

## 📋 Best Practices Demonstrated

1. **Clear Hierarchy**: Epic → Story → Task → Subtask with proper linking
2. **Meaningful References**: Each issue links to related issues with context
3. **Status Tracking**: Clear workflow states with appropriate labels
4. **Dependency Management**: Explicit blocking relationships
5. **Sprint Organization**: Issues organized by sprint with realistic capacity
6. **Cross-System Integration**: How different system components interconnect
7. **Team Coordination**: Labels enable effective team workflow management

This structure allows teams to:
- 📊 Track progress from high-level goals to implementation details
- 🔄 Manage dependencies and prevent bottlenecks
- 🎯 Focus on current sprint work while planning future sprints
- 👥 Coordinate across different teams and system modules
- 📈 Measure progress at different granularity levels