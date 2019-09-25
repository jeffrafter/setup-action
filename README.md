# Starter Template Setup

When working with starter templates you often want to start the student at a particular place. This action helps by:

- Creating a submission branch
- Committing to the submission branch
- Opening a pull request from submission to master (using the specified pull request template)

Example workflow:

```yaml
name: Setup
on: [push]

jobs:
  build:
    name: Setup
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v1
        with:
          fetch-depth: 1
      - uses: education/setup-action@v1
        with:
          pull-request-title: "Adding two numbers"
          pull-request-template: .github/template/PULL_REQUEST.md
          pull-request-files: .github/template/files/
          pull-request-branch-name: assignment
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Note: this will only run on the first push.
