# ✅ Developer Workflow Checklist

A simple, actionable checklist to follow for every task. Print this and keep it handy!

---

## 🌅 Daily Start-of-Day Checklist

**Time Required: 5 minutes**

- [ ] Update local main branch: `git checkout main && git pull origin main`
- [ ] Review assigned issues on GitHub or project board
- [ ] Check notifications for PR reviews or mentions
- [ ] Update project board (move completed items to Done)
- [ ] Identify today's priorities and move to "In Progress"
- [ ] Check for any blockers and communicate them

---

## 📝 Before Starting Work on an Issue

**Time Required: 2 minutes**

- [ ] Issue is assigned to you
- [ ] Issue has clear acceptance criteria
- [ ] Issue priority is set (Critical/High/Medium/Low)
- [ ] You understand the requirements (ask if not clear)
- [ ] Dependencies are identified
- [ ] Issue is moved to "In Progress" on project board

---

## 🌿 Creating a Branch

**Branch Naming: `{issue-id}-short-description`**

- [ ] Main branch is up to date: `git checkout main && git pull`
- [ ] Branch name starts with issue ID: `123-feature-name`
- [ ] Branch name is descriptive and kebab-case
- [ ] Branch created: `git checkout -b 123-feature-name`
- [ ] Verify branch: `git branch` shows your new branch

**Examples:**
```bash
✅ 123-add-user-authentication
✅ 456-fix-login-error
✅ 789-refactor-payment-service
❌ feature-branch
❌ my-updates
❌ fix
```

---

## 💻 During Development

**Best Practices**

- [ ] Write clean, readable code
- [ ] Follow project coding standards
- [ ] Add comments for complex logic
- [ ] Write/update tests for your changes
- [ ] Test your changes locally
- [ ] Remove debug statements and console.logs
- [ ] Check for potential security issues
- [ ] Consider performance implications

---

## 📦 Before Committing

**Quality Checks**

- [ ] Run linter: `npm run lint` or equivalent
- [ ] Run tests: `npm test` or equivalent
- [ ] Build succeeds: `npm run build` or equivalent
- [ ] No console errors in browser/terminal
- [ ] Code is formatted properly
- [ ] No commented-out code left behind
- [ ] No sensitive data (passwords, keys, tokens) committed

---

## 💬 Committing Changes

**Commit Message Format: `type(scope): description (refs #issue)`**

- [ ] Stage changes: `git add .` or stage specific files
- [ ] Review staged changes: `git diff --staged`
- [ ] Write meaningful commit message
- [ ] Include issue reference: `(refs #123)` or `(fixes #123)`
- [ ] Commit: `git commit -m "feat(auth): add login (refs #123)"`

**Commit Message Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance

**Examples:**
```bash
✅ feat(auth): add OAuth2 support (refs #123)
✅ fix(api): resolve timeout issue (fixes #456)
✅ docs: update installation guide (refs #789)
❌ updated code
❌ changes
❌ wip
```

---

## 🚀 Before Pushing

**Final Checks**

- [ ] All changes committed
- [ ] Commit messages follow convention
- [ ] Branch is up to date with main (if needed)
- [ ] Tests still passing after final changes
- [ ] Ready for code review

**Push Command:**
```bash
git push origin your-branch-name

# First time pushing
git push -u origin your-branch-name
```

---

## 🔀 Creating a Pull Request

**PR Template Completion**

### Description Section
- [ ] Clear summary of what changed
- [ ] Explanation of why change was needed
- [ ] Link to issue: `Closes #123`

### Type of Change
- [ ] Select appropriate type (Bug/Feature/Refactor/etc)
- [ ] Mark if breaking change

### Testing Section
- [ ] Tests pass locally
- [ ] Manually tested
- [ ] Added new tests (if applicable)
- [ ] Test coverage is adequate

### Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed your own code
- [ ] Commented complex code sections
- [ ] Documentation updated (if needed)
- [ ] No breaking changes (or documented)
- [ ] No debug/console statements left
- [ ] PR description is complete

### Visual Preview
- [ ] Screenshots attached (if UI changes)
- [ ] Before/after comparison (if applicable)

### Additional Steps
- [ ] Assign at least 1 reviewer
- [ ] Add relevant labels
- [ ] Link to project board
- [ ] Set milestone (if applicable)

---

## 👀 While PR is Under Review

**Monitoring and Responding**

- [ ] Monitor automated checks (CI/CD)
- [ ] Fix any failing checks immediately
- [ ] Respond to review comments within 24 hours
- [ ] Make requested changes promptly
- [ ] Re-request review after making changes
- [ ] Keep PR description updated if scope changes
- [ ] Resolve merge conflicts if main branch moves ahead

---

## 🔄 Updating PR Based on Feedback

**Making Changes**

- [ ] Checkout your branch: `git checkout your-branch`
- [ ] Make requested changes
- [ ] Test changes locally
- [ ] Commit: `git commit -m "refactor: address review comments"`
- [ ] Push: `git push origin your-branch`
- [ ] Re-request review from reviewers
- [ ] Add comment summarizing changes made

**If Main Branch Has Moved Ahead:**
```bash
git checkout main
git pull origin main
git checkout your-branch
git merge main
# Resolve conflicts if any
git push origin your-branch
```

---

## ✅ After PR is Merged

**Cleanup and Follow-up**

- [ ] Delete your feature branch on GitHub
- [ ] Delete local branch: `git branch -d branch-name`
- [ ] Update local main: `git checkout main && git pull`
- [ ] Update project board (move issue to Done)
- [ ] Close related issue (if not auto-closed)
- [ ] Update documentation (if needed)
- [ ] Notify stakeholders (if needed)
- [ ] Verify deployment (if applicable)

---

## 🔍 Code Review Checklist (As Reviewer)

**When Reviewing PRs**

### Initial Review
- [ ] PR description is clear and complete
- [ ] Issue is properly linked
- [ ] Changes match PR description
- [ ] PR size is reasonable (not too large)

### Code Quality
- [ ] Code follows project standards
- [ ] Code is readable and maintainable
- [ ] No unnecessary complexity
- [ ] Proper error handling
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed

### Testing
- [ ] Tests are included
- [ ] Tests cover edge cases
- [ ] All tests pass
- [ ] Manual testing done (if needed)

### Documentation
- [ ] Code comments where needed
- [ ] Documentation updated (if needed)
- [ ] API changes documented

### Final Steps
- [ ] Provide constructive feedback
- [ ] Approve or request changes
- [ ] Follow up if changes requested

---

## 🚨 Hotfix Checklist

**For Critical Production Issues**

- [ ] Create issue with `priority: critical` label
- [ ] Notify team lead immediately
- [ ] Create hotfix branch: `999-hotfix-critical-bug`
- [ ] Make minimal, targeted fix only
- [ ] Test thoroughly in production-like environment
- [ ] Create PR with detailed explanation
- [ ] Request urgent review from team lead
- [ ] Monitor deployment closely
- [ ] Document incident and resolution
- [ ] Plan follow-up improvements if needed

---

## 📊 Project Board Management

**Keep Board Updated**

### Daily Updates
- [ ] Move items you start to "In Progress"
- [ ] Move completed items to "Done"
- [ ] Add comments on blockers
- [ ] Update estimates if needed

### Weekly Review
- [ ] Review your backlog items
- [ ] Clear completed items
- [ ] Update priorities with team lead
- [ ] Flag stale items

---

## ❌ Common Mistakes to Avoid

- ❌ Working without an issue
- ❌ Not linking PR to issue
- ❌ Vague commit messages
- ❌ Not testing before pushing
- ❌ Ignoring code review feedback
- ❌ Committing sensitive data
- ❌ Creating PRs that are too large
- ❌ Not updating project board
- ❌ Working on wrong branch
- ❌ Force pushing without caution

---

## 🎯 Quick Daily Workflow Summary

**The Complete Flow:**

1. ✅ Update main and review tasks → 5 min
2. ✅ Pick issue and create branch → 2 min
3. ✅ Code, test, commit → Variable
4. ✅ Push and create PR → 5 min
5. ✅ Address review feedback → Variable
6. ✅ Merge and cleanup → 2 min

**Total Overhead:** ~15 minutes per task
**Benefit:** Clear tracking, better collaboration, fewer bugs

---

## 📞 Need Help?

**If you're stuck:**

1. Check DEVELOPER_GUIDE.md for detailed instructions
2. Review WORKFLOW_EXAMPLES.md for real examples
3. Ask in team chat/Slack
4. Contact @Hanzla or @Amna

---

## 🎓 Mastery Checklist

**You've mastered the workflow when you can:**

- [ ] Create properly formatted issues consistently
- [ ] Follow branch naming conventions without thinking
- [ ] Write conventional commit messages naturally
- [ ] Create complete PRs using the template
- [ ] Provide constructive code reviews
- [ ] Keep project board up to date daily
- [ ] Help other team members with the workflow

**Congratulations!** You're now a workflow champion! 🎉

---

**Last Updated:** 2025-01-15
**Maintained by:** Hanzla & Amna

**Print this checklist and keep it visible at your desk!**
