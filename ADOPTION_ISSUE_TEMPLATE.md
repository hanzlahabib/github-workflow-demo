# GitHub Workflow Adoption - [Repository Name]

**Team Lead:** @username
**Target Date:** YYYY-MM-DD

---

## Quick Setup Checklist

### 1. Templates
- [ ] Copy [issue templates](https://github.com/rihal-om/template/tree/main/.github/ISSUE_TEMPLATE) to `.github/ISSUE_TEMPLATE/`
  - [ ] `epic.yml`
  - [ ] `feature_request.yml`
  - [ ] `task.yml`
  - [ ] `bug_report.yml`
- [ ] Copy [pull_request_template.md](https://github.com/rihal-om/template/blob/main/.github/pull_request_template.md) to `.github/`
- [ ] Test creating one issue with each template
- [ ] Test creating one PR to verify template loads

### 2. Labels
Create these labels in your repository:

**Development Areas:**
- [ ] `area: fe`, `area: be`, `area: ml`, `area: mobile/android`, `area: mobile/ios`, `area: security`

**Categories:**
- [ ] `category: design`, `category: ci/cd`, `category: documentation`, `category: chores`, `category: refactor`

**Types:**
- [ ] `type: bug`, `type: feature`, `type: task`, `type: epic`

**Priorities:**
- [ ] `priority: critical`, `priority: high`, `priority: medium`, `priority: low`

**Status:**
- [ ] `status: triage`, `status: backlog`, `status: in-progress`, `status: blocked`, `status: review`, `status: done`

**Module Labels (customize for your project):**
- [ ] `module: ___` (add your own)
- [ ] `module: ___` (add your own)

### 3. Branch & Commit Standards
- [ ] Add link to [workflow guide](https://github.com/rihal-om/docs/blob/main/guides/developer_workflow.md) in repository README
- [ ] Ensure team knows branch format: `{issue-id}-short-description`
- [ ] Ensure team knows commit format: `type(scope): message (refs #issue)`

### 4. Team Training
- [ ] Share [workflow guide](https://github.com/rihal-om/docs/blob/main/guides/developer_workflow.md) with team
- [ ] Quick team walkthrough
- [ ] Answer questions

### 5. Validation
- [ ] Create one test issue with template
- [ ] Create one test branch: `999-test-workflow`
- [ ] Create one test PR with template
- [ ] Verify everything works

---

## Reference Links

- **Workflow Guide:** https://github.com/rihal-om/docs/blob/main/guides/developer_workflow.md
- **Template Repo:** https://github.com/rihal-om/template/tree/main/.github

---

**Grace Period:** 2 weeks from presentation date
**Status:** [ ] Not Started [ ] In Progress [ ] Complete

---

## Notes

(Add any issues, customizations, or questions here)
