# CI/CD Workflows

tags: #ci-cd #github-actions #automation #workflows

## Overview

This document provides an overview of the CI/CD workflows used in the Memory Bank MCP Server project. These workflows automate various aspects of the development process, from testing and building to deployment and release management.

## Workflow Templates

Workflow related templates are stored in a dedicated directory to maintain clear separation from application templates:

- **Location**: `.github/workflow-templates/`
- **Purpose**: Strictly for GitHub Actions workflow use
- **Examples**: PR templates for automated workflows like develop-to-master PRs

Application templates provided as part of the software functionality remain in the `src/templates/` directory.

### Template Structure

```
.github/workflow-templates/
  ├── develop-to-master-pr-template.md      # Japanese template
  └── develop-to-master-pr-template-en.md   # English template

src/templates/
  ├── pull-request-template.md           # Application template (JP)
  ├── pull-request-template-en.md        # Application template (EN)
  ├── rules-ja.md                      # Memory bank rules (JP)
  └── rules-en.md                      # Memory bank rules (EN)
```

This separation ensures clear responsibility boundaries and prevents confusion as the project grows.

## GitHub Actions Workflows

Our CI/CD pipeline consists of the following GitHub Actions workflows:

### 1. Test Workflow (`test.yml`)

**Purpose**: Runs tests on pull requests and pushes to main branches.

**Triggers**:
- Pull requests to `develop` or `master` branches
- Direct pushes to `develop` or `master` branches

**Key Features**:
- Runs on multiple Node.js versions (16.x, 18.x, 20.x)
- Builds the project
- Executes test suite

**Usage Notes**:
- All PRs must pass this workflow before merging
- Test failures block the PR from being merged

### 2. Auto PR Workflow (`auto-pr.yml`)

**Purpose**: Automatically creates pull requests from feature/fix branches based on memory bank information.

**Triggers**:
- Push to a `feature/*` or `fix/*` branch
- Presence of `pullRequest.md` file in the branch's memory bank

**Key Features**:
- Extracts PR information from memory bank
- Supports custom titles, target branches, reviewers, and labels
- Creates well-formatted PR with memory bank content
- Automatically removes `pullRequest.md` after successful PR creation
- Works with both English and Japanese content

**Usage Notes**:
- To trigger this workflow, create a `pullRequest.md` file in your branch's memory bank directory
- Use metadata tags like `#title:`, `#targetBranch:`, `#reviewers:`, and `#labels:` for customization

### 3. Develop to Master PR Workflow (`develop-to-master-pr.yml`)

**Purpose**: Automatically creates a PR from `develop` to `master` when changes are pushed to `develop`.

**Triggers**:
- Push to the `develop` branch

**Key Features**:
- Checks for existing PRs before creating a new one
- Determines PR type and labels based on commit messages
- Generates change log from commit history
- Uses language-specific templates based on repository name
- Adds appropriate emoji and labels based on change type

**Usage Notes**:
- Skips PR creation if an open PR already exists
- Can be skipped by including `[skip ci]` in the commit message

### 4. Release Workflow (`release.yml`)

**Purpose**: Automates the release process when changes are pushed to `master`.

**Triggers**:
- Push to the `master` branch

**Key Features**:
- Runs tests to ensure quality
- Builds the project
- Creates a Git tag based on `package.json` version
- Creates a GitHub release with auto-generated notes
- Publishes to npm

**Usage Notes**:
- Requires npm publishing credentials
- Can be skipped by including `[skip ci]` in the commit message

### 5. Version Bump Workflow (`version-bump.yml`)

**Purpose**: Manually increment version numbers.

**Triggers**:
- Manual workflow dispatch

**Key Features**:
- Supports patch, minor, and major version bumps
- Updates `package.json`
- Creates a commit and tag for the new version

**Usage Notes**:
- Run from the GitHub Actions tab
- Select bump type (patch, minor, major)
- Select target branch (usually `develop`)

## Workflow Integration

The workflows are designed to work together to create a complete CI/CD pipeline:

1. Developers work on feature/fix branches
2. Tests run on all PRs to ensure quality
3. Completed features are merged to `develop`
4. When ready for release, `develop-to-master-pr.yml` creates a PR to `master`
5. After review, merging to `master` triggers the release process
6. Version bumps are performed manually as needed

## Concurrency Control

Workflows use concurrency controls to prevent simultaneous runs of the same workflow on the same branch, which helps avoid race conditions and resource conflicts.

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## Best Practices

When working with these workflows:

1. **Use conventional commit messages** (e.g., `feat: add new feature` or `fix: resolve bug`) to help with automatic PR categorization and release notes.

2. **Keep PR templates updated** - The templates in `.github/workflow-templates/` directory are used for GitHub Actions, while templates in `src/templates/` are used for application functionality.

3. **Include proper test coverage** for new features to ensure the test workflow passes.

4. **Skip CI when appropriate** by adding `[skip ci]` to commit messages for minor documentation changes or version bumps.

5. **Check workflow logs** in GitHub Actions tab when troubleshooting CI/CD issues.

## Customizing Workflows

To modify these workflows:

1. Edit the corresponding `.yml` file in the `.github/workflows/` directory.
2. Follow GitHub Actions syntax and best practices.
3. Update this documentation when making significant changes.

## Troubleshooting

Common issues and solutions:

1. **Tests failing** - Check test output for specific failures and fix the underlying code issues.

2. **Workflow not triggering** - Verify the trigger conditions in the workflow file match your actions.

3. **Release not publishing** - Ensure npm credentials are properly configured as repository secrets.

4. **PR creation failing** - Check that the branch memory bank contains the required information.

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Conventional Commits Specification](https://www.conventionalcommits.org/)
