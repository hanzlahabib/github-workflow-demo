# 👨‍💻 Developer Quick Start Guide

Welcome! This guide will help you adopt our GitHub workflow standards in under 30 minutes.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Daily Workflow](#daily-workflow)
- [Creating Issues](#creating-issues)
- [Working on Tasks](#working-on-tasks)
- [Creating Pull Requests](#creating-pull-requests)
- [Code Review Process](#code-review-process)
- [Common Scenarios](#common-scenarios)

## ✅ Prerequisites

Before you start, ensure you have:
- [ ] GitHub account with repository access
- [ ] Git installed and configured
- [ ] Basic understanding of Git commands
- [ ] Repository cloned to your local machine

## 🚀 Initial Setup

### 1. Clone the Repository (If Not Already Done)

```bash
# Clone the repository
git clone https://github.com/your-org/your-repo.git
cd your-repo

# Verify your Git configuration
git config user.name
git config user.email
```

### 2. Familiarize Yourself with the Project Structure

```bash
# Check repository structure
ls -la

# View existing branches
git branch -a

# View recent commits
git log --oneline -10
```

### 3. Review Project Documentation

- [ ] Read the README.md
- [ ] Review CONTRIBUTING.md
- [ ] Check existing issues and PRs to understand patterns

## 🔄 Daily Workflow

### Morning Routine (5 minutes)

1. **Update your local repository**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Review your assigned issues**
   - Visit: `https://github.com/your-org/your-repo/issues/assigned/@me`
   - Check the project board for your tasks

3. **Update project board**
   - Move completed items to "Done"
   - Move current work to "In Progress"
   - Add comments on any blockers

### During Development

Follow the workflow: **Issue → Branch → Code → PR → Review → Merge**

## 📝 Creating Issues

### When to Create an Issue

- Reporting a bug
- Proposing a new feature
- Planning a task or improvement
- Documenting technical debt

### How to Create an Issue

1. **Navigate to Issues**
   ```
   Repository → Issues → New Issue
   ```

2. **Choose the Right Template**
   - **🐛 Bug Report** - For reporting bugs
   - **✨ Feature Request** - For new features or enhancements
   - **📝 Task** - For general work items

3. **Fill Out Required Fields**

   **For Bug Reports:**
   - Priority level (Critical/High/Medium/Low)
   - Component affected (Frontend/Backend/API/etc)
   - Environment (Production/Staging/Dev)
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots if applicable

   **For Feature Requests:**
   - Problem statement
   - Proposed solution
   - Alternative approaches
   - Use cases
   - Acceptance criteria
   - Effort estimate (XS/S/M/L/XL)

   **For Tasks:**
   - Clear description
   - Acceptance criteria
   - Dependencies
   - Estimated effort

4. **Submit and Verify**
   - Issue is auto-labeled with `type` and `status: triage`
   - Issue appears on the project board
   - Team leads will review and prioritize

## 💻 Working on Tasks

### Step 1: Pick an Issue

```bash
# Find an issue from the board or issues list
# Make sure the issue is:
# - Assigned to you
# - In "Todo" or "Ready" status
# - Has clear acceptance criteria
```

### Step 2: Create a Branch

**Branch Naming Convention: `{issue-id}-short-description`**

```bash
# Start with the issue number for easy tracking
git checkout main
git pull origin main
git checkout -b 123-add-user-authentication
```

**Examples:**
```bash
# Feature branch
git checkout -b 456-implement-dashboard

# Bug fix branch
git checkout -b 789-fix-login-error

# Hotfix branch
git checkout -b 999-hotfix-security-patch
```

### Step 3: Make Your Changes

```bash
# Write your code
# Test thoroughly
# Follow coding standards

# Check what you've changed
git status
git diff
```

### Step 4: Commit Your Changes

**Commit Message Convention:**

```
type(scope): description (refs #issue-number)
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance tasks

**Examples:**
```bash
git add .
git commit -m "feat(auth): add OAuth2 support (refs #123)"

git commit -m "fix(api): resolve null pointer exception (fixes #456)"

git commit -m "docs: update installation guide (refs #789)"
```

### Step 5: Push Your Branch

```bash
# Push to remote repository
git push origin 123-add-user-authentication

# If this is your first push
git push -u origin 123-add-user-authentication
```

## 🔀 Creating Pull Requests

### Step 1: Create PR from GitHub

1. Navigate to your repository on GitHub
2. Click "Pull requests" → "New pull request"
3. Select your branch
4. Click "Create pull request"

### Step 2: Fill Out the PR Template

The template will auto-populate. Complete all sections:

#### Required Sections:

**Description**
```markdown
## Description
Brief explanation of what this PR does and why.

Example:
This PR implements OAuth2 authentication to allow users to log in
using their social media accounts, addressing the need for easier
user onboarding.
```

**Related Issue**
```markdown
## Related Issue
Closes #123
```

**Type of Change**
- [x] Bug fix
- [ ] New feature
- [ ] Refactoring
- [ ] Documentation
- [ ] Breaking change

**Testing**
- [x] Tests pass locally
- [x] Manually tested
- [ ] Added new tests

**Checklist**
- [x] Code follows style guidelines
- [x] Self-review completed
- [x] Docs updated if needed
- [x] No breaking changes (or documented)

**Visual Preview** (if applicable)
- Attach screenshots or GIFs

### Step 3: Request Reviewers

1. Assign appropriate reviewers (at least 1 required)
2. Add relevant labels if needed
3. Link to project board
4. Submit the PR

### Step 4: Monitor Automated Checks

Your PR will automatically run:
- ✅ Linting checks
- ✅ Unit tests
- ✅ Build verification
- ✅ Security scans

Fix any failures before requesting review.

## 👀 Code Review Process

### As a PR Author

**When your PR is under review:**

1. **Respond to feedback promptly**
   - Address comments within 24 hours
   - Ask clarifying questions if needed
   - Make requested changes

2. **Update your PR**
   ```bash
   # Make changes based on feedback
   git add .
   git commit -m "refactor: address review comments"
   git push origin your-branch-name
   ```

3. **Re-request review**
   - After making changes, re-request review from reviewers
   - Add a comment summarizing what you changed

4. **Keep PR updated with main**
   ```bash
   # If main has moved ahead
   git checkout main
   git pull origin main
   git checkout your-branch-name
   git merge main
   # Resolve conflicts if any
   git push origin your-branch-name
   ```

### As a Reviewer

**When reviewing a PR:**

1. **Review within 24 hours** if possible
2. **Check for:**
   - Code quality and standards compliance
   - Test coverage
   - Documentation updates
   - Potential bugs or edge cases
   - Performance implications

3. **Provide constructive feedback**
   - Be specific and actionable
   - Suggest improvements, don't just criticize
   - Approve when ready or request changes

4. **Use review tools**
   - Add comments on specific lines
   - Suggest code changes directly
   - Use "Request changes" or "Approve" appropriately

## 🎯 Common Scenarios

### Scenario 1: Working on a Bug Fix

```bash
# 1. Find the bug issue (e.g., #456)
# 2. Create branch
git checkout main
git pull origin main
git checkout -b 456-fix-login-error

# 3. Fix the bug and test
# 4. Commit
git add .
git commit -m "fix(auth): resolve login timeout issue (fixes #456)"

# 5. Push and create PR
git push origin 456-fix-login-error
# Create PR on GitHub, referencing issue #456
```

### Scenario 2: Working on a Feature

```bash
# 1. Get assigned feature issue (e.g., #789)
# 2. Create feature branch
git checkout -b 789-add-payment-integration

# 3. Develop in small commits
git commit -m "feat(payment): add Stripe SDK (refs #789)"
git commit -m "feat(payment): implement checkout flow (refs #789)"
git commit -m "test(payment): add integration tests (refs #789)"

# 4. Push and create PR
git push origin 789-add-payment-integration
```

### Scenario 3: Handling Conflicts

```bash
# If your branch conflicts with main
git checkout main
git pull origin main
git checkout your-branch
git merge main

# Resolve conflicts in your editor
# After resolving:
git add .
git commit -m "merge: resolve conflicts with main"
git push origin your-branch
```

### Scenario 4: Making Quick Hotfixes

```bash
# For critical production issues
git checkout main
git pull origin main
git checkout -b 999-hotfix-critical-bug

# Make minimal, targeted fix
git add .
git commit -m "fix: resolve critical security vulnerability (fixes #999)"

# Push and create PR with "priority: critical" label
git push origin 999-hotfix-critical-bug
```

### Scenario 5: Updating Your Branch

```bash
# If your PR is outdated with main
git checkout main
git pull origin main
git checkout your-branch
git rebase main  # or git merge main

# If using rebase
git push origin your-branch --force-with-lease

# If using merge
git push origin your-branch
```

## ⚡ Quick Commands Reference

### Daily Commands

```bash
# Update from remote
git pull origin main

# Check status
git status

# View changes
git diff

# Create branch
git checkout -b issue-number-description

# Stage changes
git add .

# Commit
git commit -m "type(scope): message (refs #issue)"

# Push
git push origin branch-name

# Switch branches
git checkout branch-name
```

### Troubleshooting

```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Discard local changes
git checkout -- filename

# View commit history
git log --oneline

# View branch info
git branch -vv

# Update branch from main
git checkout main && git pull && git checkout your-branch && git merge main
```

## 📞 Getting Help

### When You're Stuck

1. **Check documentation**
   - README.md
   - CONTRIBUTING.md
   - Workflow examples

2. **Ask in team channels**
   - Slack/Teams project channel
   - Tag team leads

3. **Contact workflow maintainers**
   - @Hanzla
   - @Amna

4. **Create a discussion**
   - GitHub Discussions for process questions

## 🎓 Next Steps

After completing this guide, you should:

- [ ] Have created at least one issue
- [ ] Created a branch following naming conventions
- [ ] Made commits with proper messages
- [ ] Created a pull request using the template
- [ ] Participated in code review

**Remember:** Start small, ask questions, and iterate. The workflow will become second nature quickly!

---

**Last Updated:** 2025-01-15
**Maintained by:** Hanzla & Amna
