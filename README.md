# 🚀 GitHub Workflow Best Practices Demo

A comprehensive repository demonstrating industry-standard GitHub workflow best practices, including label taxonomies, issue templates, PR templates, and quality gates.

## 📋 Repository Structure

```
.github/
├── ISSUE_TEMPLATE/
│   ├── bug_report.yml          # Bug report template
│   ├── feature_request.yml     # Feature request template
│   ├── task.yml               # Task template
│   └── config.yml             # Issue template configuration
├── PULL_REQUEST_TEMPLATE.md   # PR template
├── workflows/
│   ├── pr-validation.yml      # PR validation checks
│   ├── auto-assign-labels.yml # Auto-labeling workflow
│   └── quality-gates.yml      # Quality gate enforcement
└── labels.yml                 # Label taxonomy definition
```

## 🏷️ Label Taxonomy

Our label system follows a hierarchical structure:

### Priority Labels
- `priority: critical` - Critical issues requiring immediate attention
- `priority: high` - High priority issues
- `priority: medium` - Medium priority issues
- `priority: low` - Low priority issues

### Type Labels
- `type: bug` - Something isn't working
- `type: feature` - New feature or request
- `type: task` - General task or work item
- `type: enhancement` - Enhancement to existing functionality
- `type: documentation` - Documentation improvements
- `type: maintenance` - Code maintenance and technical debt
- `type: security` - Security-related issues
- `type: performance` - Performance improvements

### Status Labels
- `status: triage` - Needs initial assessment
- `status: backlog` - Approved and ready for development
- `status: in-progress` - Currently being worked on
- `status: blocked` - Blocked by dependencies
- `status: ready-for-review` - Ready for code review
- `status: approved` - Approved and ready for QA
- `status: qa` - In quality assurance testing
- `status: done` - Completed and verified

### Development Area Labels
- `FE` - Frontend (UI, components, client-side logic)
- `BE` - Backend (Server, APIs, database)
- `ML` - Machine Learning (Modeling, feature engineering, evaluation)
- `Design` - Design, wireframes, mockups
- `Documentation` - Docs, guides, README updates
- `Testing` - QA, unit/integration tests
- `DevOps` - Deployment scripts, CI/CD, infrastructure
- `Security` - Vulnerabilities, audits, fixes

### Size/Effort Labels
- `size: xs` - Extra small effort (< 1 day)
- `size: s` - Small effort (1-2 days)
- `size: m` - Medium effort (3-5 days)
- `size: l` - Large effort (1-2 weeks)
- `size: xl` - Extra large effort (> 2 weeks)

## 📝 Issue Templates

### Bug Report Template
- Pre-submission checklist
- Contact details
- Problem description with priority and component selection
- Steps to reproduce
- Expected vs actual behavior
- Environment details
- Log output
- Additional context

### Feature Request Template
- Pre-submission checklist
- Priority and component selection
- Problem statement
- Proposed solution
- Alternative solutions considered
- Use cases and acceptance criteria
- Effort estimation
- Breaking change indication

### Task Template
- Pre-submission checklist
- Priority and development area selection
- Task description and requirements
- Acceptance criteria
- Effort estimation
- Dependencies tracking

## 🔄 Pull Request Template

Comprehensive PR template including:
- **Pre-review checklist** - Issue linking, self-review, code style, tests
- **Change description** - Clear description and issue linking
- **Change type** - Bug fix, feature, breaking change, etc.
- **Priority and development area** - Categorization
- **Testing coverage** - Unit, integration, manual testing
- **Performance impact** - Assessment of performance changes
- **Database changes** - Schema and migration tracking
- **Deployment notes** - Special deployment requirements
- **Reviewer guidelines** - Focus areas and estimated review time
- **Breaking changes** - Documentation of breaking changes
- **Post-merge tasks** - Follow-up actions

## 🚪 Quality Gates

### PR Validation Workflow
- **PR Metadata Check**
  - Automatic size labeling (XS, S, M, L, XL)
  - Issue linking validation
  - Empty PR detection
- **Branch Name Validation**
  - Conventional branch naming enforcement
  - Soft warnings for non-compliance
- **Commit Message Validation**
  - Conventional commit format checking
  - Guidance for proper commit messages
- **Code Quality Checks**
  - Linting enforcement
  - Debug statement detection
- **Build and Test**
  - Automated testing
  - Build verification
- **Review Requirements**
  - Required reviewer enforcement
  - Automatic status labeling

### Quality Gates Workflow
- **Security Scanning**
  - Trivy vulnerability scanning
  - NPM audit for dependency vulnerabilities
- **Code Quality**
  - ESLint enforcement
  - Prettier code formatting
  - TypeScript type checking
- **Testing**
  - Multi-version Node.js testing
  - Unit and integration tests
  - Coverage reporting
- **Build Verification**
  - Production build testing
  - Build size analysis
- **Performance Testing**
  - Lighthouse CI integration
- **Accessibility Testing**
  - A11y compliance checking
- **Dependency Analysis**
  - Outdated dependency detection
  - License compliance

### Auto-labeling Workflow
- Automatic label assignment based on content
- Type detection from titles and descriptions
- Component identification
- Priority assessment
- Status management

## 🛠️ Implementation Guide

### 1. Label Setup
```bash
# Install GitHub CLI
gh auth login

# Apply labels to your repository
gh label create --repo your-org/your-repo -f .github/labels.yml
```

### 2. Workflow Integration
1. Copy `.github/` directory to your repository
2. Customize organization and repository names in workflows
3. Adjust quality gate thresholds as needed
4. Configure required status checks in repository settings

### 3. Branch Protection Rules
Set up branch protection for `main` and `develop`:
- Require PR reviews (minimum 1)
- Require status checks to pass
- Require branches to be up to date
- Include administrators
- Restrict pushes

### 4. Repository Settings
- Enable issue templates
- Configure auto-merge requirements
- Set up CODEOWNERS file
- Configure branch deletion after merge

## 📊 Metrics and Monitoring

Track these key metrics:
- **Lead Time** - Time from issue creation to deployment
- **Deployment Frequency** - How often code is deployed
- **Mean Time to Recovery** - Time to recover from failures
- **Change Failure Rate** - Percentage of deployments causing failures
- **Code Quality Metrics** - Test coverage, code complexity
- **Review Metrics** - Review time, iteration count

## 🔧 Customization

### Adapting for Your Team
1. **Modify label colors and descriptions** in `labels.yml`
2. **Adjust PR template sections** based on your workflow
3. **Configure quality gate thresholds** in workflow files
4. **Add team-specific issue templates**
5. **Customize branch naming conventions**

### Technology-Specific Adaptations
- **Python projects** - Replace npm commands with pip/poetry
- **Java projects** - Use Maven/Gradle build commands
- **Docker projects** - Add container scanning
- **Mobile projects** - Include device testing matrices

## 🚀 Advanced Features

### Semantic Release Integration
```yaml
- name: Semantic Release
  uses: cycjimmy/semantic-release-action@v3
  with:
    semantic_version: 19
    extra_plugins: |
      @semantic-release/changelog
      @semantic-release/git
```

### Automated Dependency Updates
```yaml
- name: Dependabot
  uses: dependabot/dependabot-core@v1
  with:
    package-manager: npm
    directory: /
    schedule: daily
```

### Security Policy Integration
```yaml
- name: Security Policy Check
  run: |
    if [ -f SECURITY.md ]; then
      echo "✅ Security policy exists"
    else
      echo "⚠️ Consider adding a SECURITY.md file"
    fi
```

## 📚 Best Practices Summary

1. **Consistent Labeling** - Use standardized labels across all repositories
2. **Comprehensive Templates** - Ensure all necessary information is captured
3. **Automated Quality Gates** - Prevent issues from reaching production
4. **Clear Documentation** - Maintain up-to-date process documentation
5. **Regular Reviews** - Periodically review and update workflows
6. **Team Training** - Ensure all team members understand the workflows
7. **Metrics Tracking** - Monitor and improve process efficiency
8. **Incremental Adoption** - Implement changes gradually to avoid disruption

## 🤝 Contributing

This repository serves as a template and reference. Contributions are welcome to improve the workflows and add new best practices.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 References

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [DORA Metrics](https://www.devops-research.com/research.html)