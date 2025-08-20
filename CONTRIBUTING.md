# 🤝 Contributing to GitHub Workflow Best Practices

Thank you for your interest in contributing to this project! This repository demonstrates communication-first GitHub workflows designed to improve team collaboration through structured templates and quality gates.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Issue Guidelines](#issue-guidelines)
- [Pull Request Guidelines](#pull-request-guidelines)
- [Coding Standards](#coding-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation Standards](#documentation-standards)

## 📜 Code of Conduct

This project adheres to a code of conduct that we expect all contributors to follow. Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## 🚀 Getting Started

### Prerequisites

- Git installed on your machine
- GitHub account
- Basic understanding of GitHub workflows
- Familiarity with YAML syntax

### Setup

1. **Fork the repository**
   ```bash
   # Click the "Fork" button on GitHub or use GitHub CLI
   gh repo fork your-org/github-workflow-best-practices
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/github-workflow-best-practices.git
   cd github-workflow-best-practices
   ```

3. **Set up upstream remote**
   ```bash
   git remote add upstream https://github.com/your-org/github-workflow-best-practices.git
   ```

4. **Verify your setup**
   ```bash
   git remote -v
   # Should show both origin (your fork) and upstream (original repo)
   ```

## 🔄 Development Workflow

### Branch Naming Convention

Use the following branch naming patterns:

- **Features**: `feature/short-description`
- **Bug fixes**: `bugfix/short-description`
- **Documentation**: `docs/short-description`
- **Maintenance**: `chore/short-description`

### Workflow Steps

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow our coding standards
   - Add tests if applicable
   - Update documentation

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```
   
   Follow [Conventional Commits](https://www.conventionalcommits.org/) format:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation changes
   - `chore:` for maintenance tasks
   - `refactor:` for code refactoring
   - `test:` for adding tests

4. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Create a Pull Request**
   - Use our PR template
   - Provide clear description
   - Link to related issues
   - Request appropriate reviewers

## 🐛 Issue Guidelines

### Before Creating an Issue

1. **Search existing issues** to avoid duplicates
2. **Check documentation** to ensure it's not already covered
3. **Use the appropriate template** (Bug Report, Feature Request, or Task)

### Issue Types

#### Bug Reports
- Use the bug report template
- Provide clear reproduction steps
- Include environment details
- Add relevant logs or screenshots

#### Feature Requests
- Use the feature request template
- Explain the problem you're trying to solve
- Provide use cases and acceptance criteria
- Consider alternative solutions

#### Tasks
- Use the task template
- Break down complex work into smaller tasks
- Define clear acceptance criteria
- Estimate effort required

### Issue Labels

Issues will be automatically labeled, but you can suggest:
- **Priority**: `priority: low/medium/high/critical`
- **Type**: `type: bug/feature/task/documentation`
- **Component**: Based on affected area
- **Size**: Based on estimated effort

## 🔀 Pull Request Guidelines

### Before Submitting

- [ ] **Self-review** your code changes
- [ ] **Run tests** and ensure they pass
- [ ] **Update documentation** if needed
- [ ] **Check code style** compliance
- [ ] **Link to related issue** using keywords like "Closes #123"

### PR Requirements

1. **Use our PR template** - Fill out all relevant sections
2. **Provide clear description** - Explain what changes you made and why
3. **Keep changes focused** - One feature/fix per PR
4. **Write good commit messages** - Follow conventional commit format
5. **Update tests** - Add or modify tests for your changes
6. **Update documentation** - Keep docs in sync with code changes

### PR Size Guidelines

- **XS (< 50 lines)**: Simple bug fixes, documentation updates
- **S (50-200 lines)**: Small features, minor refactoring
- **M (200-500 lines)**: Medium features, significant changes
- **L (500-1000 lines)**: Large features (consider breaking down)
- **XL (> 1000 lines)**: Should be avoided (break into smaller PRs)

### Review Process

1. **Automated checks** must pass
2. **At least one reviewer** approval required
3. **Address feedback** promptly and professionally
4. **Squash commits** if requested before merge

## 💻 Coding Standards

### YAML Files

```yaml
# Use 2 spaces for indentation
name: Workflow Name
on:
  push:
    branches: [main]

jobs:
  job-name:
    name: Job Display Name
    runs-on: ubuntu-latest
    steps:
      - name: Step name
        run: echo "Use descriptive names"
```

### Documentation

- Use clear, concise language
- Include code examples where helpful
- Keep README.md up to date
- Use proper markdown formatting
- Add table of contents for long documents

### Commit Messages

```bash
# Good examples
feat: add automated label assignment workflow
fix: resolve PR template validation issue
docs: update contributing guidelines with review process
chore: update GitHub Actions to latest versions

# Bad examples
fixed stuff
update
changes
wip
```

## 🧪 Testing Requirements

### Workflow Testing

1. **Validate YAML syntax** before committing
2. **Test workflows** in your fork before submitting
3. **Verify template rendering** for issue and PR templates
4. **Check label configuration** syntax

### Testing Commands

```bash
# Validate YAML files
yamllint .github/workflows/*.yml
yamllint .github/labels.yml

# Test workflow syntax (if you have act installed)
act -n

# Validate GitHub CLI commands
gh auth status
gh label list --repo your-fork/repo-name
```

## 📚 Documentation Standards

### README Structure

- Clear project description
- Table of contents for navigation
- Installation/setup instructions
- Usage examples
- Contributing guidelines link
- License information

### Code Comments

- Explain complex workflow logic
- Document non-obvious configuration choices
- Provide context for decisions
- Keep comments up to date with code changes

### Template Documentation

- Explain template purpose and usage
- Provide examples of good vs bad submissions
- Document any special requirements
- Include troubleshooting tips

## 🔍 Review Checklist

### For Reviewers

- [ ] Code follows project conventions
- [ ] Changes are well-tested
- [ ] Documentation is updated
- [ ] No breaking changes (or properly documented)
- [ ] Security considerations addressed
- [ ] Performance impact considered

### For Contributors

- [ ] All tests pass
- [ ] Code is self-reviewed
- [ ] Documentation is updated
- [ ] Commit messages are clear
- [ ] PR description is complete
- [ ] Related issues are linked

## 🆘 Getting Help

### Resources

- **GitHub Discussions**: For questions and community support
- **Issues**: For bug reports and feature requests
- **Documentation**: Comprehensive guides and examples
- **GitHub Actions Docs**: Official GitHub Actions documentation

### Contact

- Create an issue for bugs or feature requests
- Use GitHub Discussions for questions
- Tag maintainers in urgent issues

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Recognition

Contributors will be recognized in:
- README.md contributors section
- Release notes for significant contributions
- GitHub contributors graph

Thank you for contributing to making GitHub workflows better for everyone! 🎉