# ⚡ GitHub Workflow Quick Reference

**Print this page and keep it at your desk for instant reference!**

---

## 🌿 Branch Naming

**Format:** `{issue-id}-short-description`

```bash
# Examples
123-add-user-auth
456-fix-login-bug
789-refactor-api
```

**Rules:**
- Always start with issue ID
- Use kebab-case (lowercase with hyphens)
- Keep it short and descriptive
- No special characters except hyphens

---

## 💬 Commit Messages

**Format:** `type(scope): description (refs #issue)`

### Types
| Type | When to Use | Example |
|------|------------|---------|
| `feat` | New feature | `feat(auth): add OAuth login (refs #123)` |
| `fix` | Bug fix | `fix(api): resolve timeout (fixes #456)` |
| `docs` | Documentation | `docs: update README (refs #789)` |
| `refactor` | Code refactoring | `refactor(db): optimize queries (refs #234)` |
| `test` | Adding tests | `test(auth): add login tests (refs #567)` |
| `chore` | Maintenance | `chore: update dependencies (refs #890)` |

### Issue Keywords
| Keyword | Effect |
|---------|--------|
| `refs #123` | References issue |
| `fixes #123` | Closes issue when merged |
| `closes #123` | Closes issue when merged |

---

## 🏷️ Label System

### Priority Labels (Required)
```
🔴 priority: critical  - Drop everything
🟠 priority: high      - Important for sprint
🟡 priority: medium    - Standard priority
🟢 priority: low       - Nice to have
```

### Type Labels (Auto-applied)
```
type: bug       - Something isn't working
type: feature   - New feature or request
type: task      - General work item
type: docs      - Documentation
```

### Status Labels
```
📋 status: backlog       - Not started
📝 status: todo          - Ready to start
🏃 status: in-progress   - Currently working
🚫 status: blocked       - Can't progress
👀 status: review        - Code review needed
✅ status: done          - Completed
```

### Area Labels
```
FE    - Frontend
BE    - Backend
ML    - Machine Learning
API   - API/Backend services
```

---

## 📝 Issue Templates

### Bug Report - Required Fields
```
✅ Priority: Critical/High/Medium/Low
✅ Component: Frontend/Backend/API/etc
✅ Environment: Production/Staging/Dev
✅ Steps to Reproduce
✅ Expected vs Actual Behavior
```

### Feature Request - Required Fields
```
✅ Problem Statement
✅ Proposed Solution
✅ Alternatives Considered
✅ Use Cases
✅ Acceptance Criteria
✅ Effort Estimate: XS/S/M/L/XL
```

---

## 🔀 Pull Request Template

### Required Checklist
```
✅ Description: What and why
✅ Related Issue: Closes #123
✅ Type of Change: Bug/Feature/Refactor/etc
✅ Testing: Pass locally + manually tested
✅ Self-Review: Complete
✅ Code Style: Follows guidelines
✅ Documentation: Updated if needed
```

---

## 🚀 Essential Git Commands

### Daily Commands
```bash
# Start of day - Update main
git checkout main
git pull origin main

# Create new branch
git checkout -b 123-feature-name

# Check what changed
git status
git diff

# Stage and commit
git add .
git commit -m "feat(scope): description (refs #123)"

# Push to remote
git push origin branch-name

# First time push
git push -u origin branch-name
```

### Common Workflows

#### Starting Work
```bash
git checkout main
git pull origin main
git checkout -b 123-new-feature
```

#### Making Changes
```bash
git add .
git status
git commit -m "feat: add feature (refs #123)"
git push origin 123-new-feature
```

#### Updating Branch from Main
```bash
git checkout main
git pull origin main
git checkout your-branch
git merge main
git push origin your-branch
```

#### Fixing Merge Conflicts
```bash
# After git merge main shows conflicts
# 1. Open files with conflicts in editor
# 2. Resolve conflicts
# 3. Stage resolved files
git add .
git commit -m "merge: resolve conflicts with main"
git push origin your-branch
```

---

## 🔄 Complete Workflow Diagram

```
📋 Issue Created
    ↓
🏷️ Auto-labeled (type + status: triage)
    ↓
👤 Assigned to Developer
    ↓
🌿 Create Branch: 123-feature-name
    ↓
💻 Write Code + Tests
    ↓
💬 Commit: feat(scope): message (refs #123)
    ↓
🚀 Push to Remote
    ↓
🔀 Create Pull Request
    ↓
✅ Automated Checks Run
    ↓
👀 Code Review
    ↓
🔄 Address Feedback (if needed)
    ↓
✅ PR Approved
    ↓
🎉 Merge to Main
    ↓
🧹 Delete Branch + Update Board
```

---

## ⚡ Quick Daily Routine

### Morning (5 min)
```bash
1. git checkout main && git pull origin main
2. Check GitHub notifications
3. Review project board
4. Update task status
```

### Before Starting Task (2 min)
```bash
1. Verify issue assigned to you
2. Read acceptance criteria
3. Create branch: git checkout -b 123-task-name
```

### Before Committing
```bash
1. Run tests: npm test
2. Run linter: npm run lint
3. Review changes: git diff
4. Commit with proper message
```

### Before Creating PR
```bash
1. Push: git push origin branch-name
2. Fill out PR template completely
3. Assign reviewers
4. Link to issue
```

---

## 🎯 Size Estimates

| Size | Lines Changed | Days | Example |
|------|--------------|------|---------|
| XS | < 50 | < 1 | Small bug fix |
| S | 50-200 | 1-2 | Simple feature |
| M | 200-500 | 3-5 | Medium feature |
| L | 500-1000 | 5-10 | Large feature |
| XL | > 1000 | > 10 | Epic/Multi-feature |

**Rule:** If PR > 500 lines, consider breaking it down!

---

## 📊 Project Board Workflow

### Column Flow
```
📋 Backlog → 📝 Todo → 🏃 In Progress → 🚫 Blocked → 👀 Review → ✅ Done
```

### Daily Updates
- Move started tasks to "In Progress"
- Move completed tasks to "Done"
- Flag blockers immediately
- Add comments on progress

---

## ❌ Common Mistakes

| ❌ Don't Do | ✅ Do This |
|------------|-----------|
| `git commit -m "updates"` | `git commit -m "feat(auth): add login (refs #123)"` |
| Create PR without issue | Link PR to issue: `Closes #123` |
| Branch: `my-feature` | Branch: `123-feature-name` |
| Large 1000+ line PRs | Break into smaller PRs |
| Work without testing | Test before committing |
| Ignore review comments | Address feedback promptly |
| Skip PR template | Fill out all sections |

---

## 🚨 Hotfix Process

```bash
# 1. Create critical issue
# 2. Notify team lead
# 3. Create hotfix branch
git checkout main
git pull origin main
git checkout -b 999-hotfix-critical-bug

# 4. Make minimal fix
# 5. Test thoroughly
# 6. Commit and push
git commit -m "fix: resolve critical bug (fixes #999)"
git push origin 999-hotfix-critical-bug

# 7. Create PR with priority: critical
# 8. Get urgent review
# 9. Merge and monitor
```

---

## 🔍 Useful GitHub URLs

| Purpose | URL Pattern |
|---------|------------|
| My Issues | `github.com/org/repo/issues/assigned/@me` |
| Create Issue | `github.com/org/repo/issues/new` |
| Create PR | `github.com/org/repo/compare/branch-name` |
| Project Board | `github.com/users/username/projects/X` |

---

## 💡 Pro Tips

1. **Branch Names** - Start with issue ID for easy tracking
2. **Small PRs** - Easier to review, faster to merge
3. **Self Review** - Review your own PR before requesting others
4. **Update Board** - Keep project board current for visibility
5. **Ask Early** - Don't wait until stuck to ask questions
6. **Test Locally** - Always test before pushing
7. **Clear Commits** - One logical change per commit
8. **Link Issues** - Always reference issue numbers

---

## 📞 Quick Help

| Need Help With | Check This |
|---------------|-----------|
| Detailed setup | DEVELOPER_GUIDE.md |
| Step-by-step | DEVELOPER_CHECKLIST.md |
| Real examples | WORKFLOW_EXAMPLES.md |
| Project board | PROJECT_BOARD_SETUP.md |
| Contributing | CONTRIBUTING.md |

**Questions?** Contact @Hanzla or @Amna

---

## 🎓 Keyboard Shortcuts (GitHub Web)

| Action | Shortcut |
|--------|----------|
| Search | `/` |
| Go to issues | `g` + `i` |
| Go to PRs | `g` + `p` |
| Create issue | `c` |
| Submit comment | `Ctrl/Cmd + Enter` |

---

**Last Updated:** 2025-01-15
**Version:** 1.0
**Maintained by:** Hanzla & Amna

---

**📌 PRINT THIS AND PIN IT TO YOUR DESK! 📌**
