# FocusTrack Developer Guidelines

This document outlines the guidelines and best practices for contributing to the FocusTrack application. Following these standards ensures consistency across the codebase and a smoother development workflow.

## Table of Contents

1. [Code Style Guidelines](#code-style-guidelines)
2. [State Management Patterns](#state-management-patterns)
3. [Error Handling Standards](#error-handling-standards)
4. [Testing Requirements](#testing-requirements)
5. [Pull Request Process](#pull-request-process)
6. [Version Control Workflow](#version-control-workflow)
7. [Dependency Management](#dependency-management)

## Code Style Guidelines

### General Guidelines

- Follow the established ESLint and Prettier configurations.
- Use meaningful and descriptive variable, function, and component names.
- Write self-documenting code with comments only where necessary to explain complex logic.
- Keep functions and components small and focused on a single responsibility.

### JavaScript / React Guidelines

- Use ES6+ features where appropriate (arrow functions, destructuring, spread operators, etc.).
- Prefer `const` over `let`; avoid `var`.
- Use JSDoc style comments for functions and components.
- Follow React's functional component pattern with hooks.
- Component structure should follow the Atomic Design pattern (atoms, molecules, organisms, templates, pages).

### File Structure

- Place components in their appropriate folders based on the Atomic Design methodology.
- Keep related functionality together in the same directory.
- Each component should have its own directory with supporting files.

Example component structure:
```
ComponentName/
  ├── index.js
  ├── ComponentName.js
  ├── ComponentName.test.js
  └── ComponentName.module.css (if applicable)
```

### Code Formatting

FocusTrack uses Prettier for consistent code formatting. Settings include:
- Single quotes
- 2-space indentation
- 100 character line length
- Trailing commas in ES5 mode
- No trailing spaces

Run `npm run format` to format your code before committing.

## State Management Patterns

FocusTrack uses Redux with Redux Toolkit for state management.

### Redux Guidelines

- Organize Redux code using the Redux Toolkit slice pattern.
- Keep slices focused on specific domains of the application.
- Use the dynamic slice loading pattern for performance optimization.
- Leverage createSelector for memoized selectors to optimize renders.
- Follow the established naming conventions for actions and state properties.

### State Structure

- Separate application state into logical slices.
- Ensure proper normalization of data to avoid duplication.
- Consider which state belongs in Redux vs. local component state.

### Data Flow

1. UI events trigger actions
2. Actions are processed by reducers/slices
3. Reducers update the store
4. Components react to store changes

### Middleware Usage

- Use middleware for side effects (API calls, etc.).
- Follow established middleware patterns for analytics, logging, and IPC communication.
- Document middleware additions and their purpose.

## Error Handling Standards

FocusTrack implements a centralized error handling service.

### Error Handling Principles

- All errors should be captured, logged, and handled appropriately.
- Use the ErrorService for consistent error handling across the application.
- Categorize errors appropriately to aid debugging and user communication.
- Transform technical errors into user-friendly messages.

### Error Categories

- RUNTIME: General application errors
- NETWORK: Connection and API related errors
- STORAGE: File system and data persistence errors
- UI: Interface rendering issues
- AUTH: Authentication and permissions errors
- INPUT: User input validation errors
- RESOURCE: System resource limitations
- CRITICAL: Severe application errors

### Error Handling Patterns

- Use try/catch blocks for synchronous code.
- Use promise chains with `.catch()` or async/await with try/catch for async code.
- Leverage the error service's wrapper functions for consistent error handling.

```javascript
// Synchronous example
try {
  // Code that might throw
} catch (error) {
  errorService.captureError(error, {
    category: ErrorCategory.RUNTIME,
    source: 'componentName.functionName',
  });
}

// Async example
try {
  await asyncFunction();
} catch (error) {
  errorService.captureError(error, {
    category: ErrorCategory.NETWORK,
    source: 'componentName.asyncFunctionName',
  });
}

// Using wrapper functions
const safeFunction = errorService.wrapFunction(riskyFunction, {
  category: ErrorCategory.STORAGE,
  source: 'storageManager.writeData',
});
```

### User Feedback

- Always provide appropriate user feedback for errors.
- Use the ErrorService's createFriendlyMessage method to generate user-facing messages.
- Include actions users can take to resolve the error when possible.

## Testing Requirements

FocusTrack has comprehensive testing requirements to ensure application stability.

### Testing Coverage Requirements

- Unit tests: Minimum 80% statement coverage
- 75% branch coverage
- 80% function coverage
- 80% line coverage

### Testing Types

1. **Unit Tests**: Test individual functions and components in isolation.
2. **Integration Tests**: Test interactions between multiple components or systems.
3. **E2E Tests**: Test complete user workflows across the entire application.

### Testing Guidelines

- Write tests as you develop, not afterward.
- Focus on testing behavior, not implementation details.
- Use descriptive test names that explain what the test is checking.
- Follow the arrange-act-assert pattern.
- Mock external dependencies appropriately.

### Example Test Structure

```javascript
describe('ComponentName', () => {
  describe('functionName', () => {
    it('should handle valid input correctly', () => {
      // Arrange
      const input = validInput;
      
      // Act
      const result = functionName(input);
      
      // Assert
      expect(result).toEqual(expectedOutput);
    });
    
    it('should handle invalid input gracefully', () => {
      // Test error cases
    });
  });
});
```

### Running Tests

- `npm test`: Run all tests
- `npm run test:unit`: Run unit tests only
- `npm run test:integration`: Run integration tests only
- `npm run test:e2e`: Run end-to-end tests
- `npm run test:coverage`: Generate coverage report

## Pull Request Process

### Pull Request Guidelines

1. Create a new branch from the appropriate base branch (usually `develop`).
2. Make focused changes addressing a specific feature, bug, or improvement.
3. Ensure your code follows all guidelines in this document.
4. Write appropriate tests for your changes.
5. Update documentation as needed.
6. Submit a pull request with a clear description of the changes.

### PR Requirements Checklist

- [ ] Code follows style guidelines
- [ ] Appropriate tests written and passing
- [ ] Documentation updated
- [ ] No new warnings or errors introduced
- [ ] All existing tests pass
- [ ] Feature properly implemented according to requirements
- [ ] Minimum test coverage maintained or improved

### PR Review Process

1. At least one required reviewer must approve the PR.
2. All automated tests must pass.
3. Code review comments must be addressed.
4. Merge conflicts must be resolved.
5. Upon approval, the PR can be merged to the target branch.

## Version Control Workflow

FocusTrack follows a modified GitFlow workflow.

### Branch Structure

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: New features or enhancements
- `bugfix/*`: Bug fixes
- `hotfix/*`: Critical production fixes
- `release/*`: Release preparation

### Branch Naming Convention

- Feature branches: `feature/short-description`
- Bug fix branches: `bugfix/issue-number-short-description`
- Hotfix branches: `hotfix/issue-number-short-description`
- Release branches: `release/vX.Y.Z`

### Commit Guidelines

- Write clear, concise commit messages
- Begin with a verb in present tense (Add, Fix, Update, Remove, etc.)
- Reference issue numbers when applicable
- Keep commits focused and logical

Example commit message:
```
Add timer pause functionality

- Add pause button to timer controls
- Implement pause state in Redux
- Add tests for pause functionality

Closes #123
```

### Git Hooks

FocusTrack uses Husky to enforce quality standards:

- **pre-commit**: Runs lint-staged to lint and format staged files
- **pre-push**: Runs tests to prevent pushing failing code

## Dependency Management

### Adding Dependencies

1. Consider necessity and impact before adding a new dependency.
2. Prefer smaller, focused packages over larger ones when possible.
3. Check license compatibility.
4. Evaluate maintenance status and community support.
5. Document why the dependency was added.

### Dependency Types

- Use `dependencies` for runtime requirements.
- Use `devDependencies` for development and build tools.

### Updating Dependencies

1. Regularly update dependencies to receive security patches and improvements.
2. Test thoroughly after updating dependencies, especially major versions.
3. Update in logical groups rather than all at once.
4. Document significant dependency updates in release notes.

### Commands

- `npm outdated`: Check for outdated dependencies
- `npm update`: Update dependencies to their latest compatible version
- `npm audit`: Check for known security vulnerabilities

---

These guidelines aim to create a consistent, high-quality codebase. If you have questions or suggestions about these guidelines, please discuss with the team.