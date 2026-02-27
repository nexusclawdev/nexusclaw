name: Pull Request
description: Submit a pull request
body:
  - type: markdown
    attributes:
      value: |
        Thanks for contributing to NexusClaw! 🐾

  - type: dropdown
    id: pr-type
    attributes:
      label: Type of Change
      description: What type of change does this PR introduce?
      options:
        - Bug fix
        - New feature
        - Enhancement
        - Documentation
        - Refactoring
        - Performance improvement
        - Testing
        - CI/CD
        - Other
    validations:
      required: true

  - type: textarea
    id: description
    attributes:
      label: Description
      description: Please describe your changes
      placeholder: This PR adds/fixes/improves...
    validations:
      required: true

  - type: textarea
    id: motivation
    attributes:
      label: Motivation and Context
      description: Why is this change required? What problem does it solve?
      placeholder: This change is needed because...
    validations:
      required: true

  - type: textarea
    id: testing
    attributes:
      label: How Has This Been Tested?
      description: Please describe the tests you ran
      placeholder: |
        - [ ] Unit tests
        - [ ] Integration tests
        - [ ] Manual testing
    validations:
      required: true

  - type: checkboxes
    id: checklist
    attributes:
      label: Checklist
      description: Please check all that apply
      options:
        - label: My code follows the project's style guidelines
          required: true
        - label: I have performed a self-review of my code
          required: true
        - label: I have commented my code, particularly in hard-to-understand areas
          required: false
        - label: I have made corresponding changes to the documentation
          required: false
        - label: My changes generate no new warnings
          required: true
        - label: I have added tests that prove my fix is effective or that my feature works
          required: false
        - label: New and existing unit tests pass locally with my changes
          required: true

  - type: textarea
    id: breaking-changes
    attributes:
      label: Breaking Changes
      description: Does this PR introduce any breaking changes?
      placeholder: List any breaking changes or write "None"

  - type: textarea
    id: related-issues
    attributes:
      label: Related Issues
      description: Link any related issues
      placeholder: "Closes #123, Fixes #456"

  - type: textarea
    id: additional
    attributes:
      label: Additional Notes
      description: Any additional information
      placeholder: Screenshots, benchmarks, etc.
