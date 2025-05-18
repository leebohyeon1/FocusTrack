# Repository Pattern Implementation

## Overview

This document describes the implementation of the Repository Pattern in the FocusTrack application's storage system. The repository pattern is an architectural pattern that separates the logic that retrieves data from the underlying storage mechanism.

## Why Repository Pattern?

The repository pattern offers several key benefits:

1. **Separation of Concerns**: Isolates data access logic from business logic
2. **Testability**: Makes components easier to test in isolation
3. **Maintainability**: Centralizes data access logic for consistent implementation
4. **Flexibility**: Allows changing the underlying storage implementation without affecting business logic
5. **Scalability**: Facilitates scaling by allowing optimization at the data access layer

## Architecture

### Components

1. **Repositories**:
   - `EntityRepository`: Manages CRUD operations for application entities
   - `SettingsRepository`: Handles application settings storage and retrieval
   - `MetadataRepository`: Manages application metadata

2. **Adapters**:
   - `StorageManagerAdapter`: Adapts the repository implementations to match the original StorageManager API

3. **Integration**:
   - Hybrid implementation with feature flags to enable gradual adoption

### Implementation Details

#### EntityRepository

The `EntityRepository` is responsible for basic CRUD (Create, Read, Update, Delete) operations for all application entities.

Key features:
- Handles entity creation, retrieval, updating, and deletion
- Supports encryption integration
- Implements search functionality
- Emits events for operations

#### SettingsRepository

The `SettingsRepository` manages application settings, providing a simpler interface tailored for settings.

Key features:
- Gets and sets individual settings
- Manages bulk settings operations
- Supports encrypted settings
- Emits events for settings changes

#### MetadataRepository

The `MetadataRepository` handles application metadata like version info, state data, etc.

Key features:
- Stores and retrieves metadata objects
- Updates metadata partially
- Lists available metadata keys
- Emits events for metadata operations

#### StorageManagerAdapter

The `StorageManagerAdapter` provides backward compatibility with the original StorageManager API while using the repository implementations internally.

Key features:
- Implements the original StorageManager interface
- Delegates operations to the appropriate repositories
- Forwards events from repositories
- Maintains API compatibility

## Usage

### Creating Instances

```javascript
// Import repositories and adapter
const EntityRepository = require('./repositories/EntityRepository');
const SettingsRepository = require('./repositories/SettingsRepository');
const MetadataRepository = require('./repositories/MetadataRepository');
const StorageManagerAdapter = require('./adapters/StorageManagerAdapter');

// Create repositories
const entityRepository = new EntityRepository({
  fileUtils,
  encryptionService,
  storagePath: '/path/to/storage'
});

const settingsRepository = new SettingsRepository({
  fileUtils,
  encryptionService,
  storagePath: '/path/to/storage'
});

const metadataRepository = new MetadataRepository({
  fileUtils,
  storagePath: '/path/to/storage'
});

// Create adapter
const storageManager = new StorageManagerAdapter({
  entityRepository,
  settingsRepository,
  metadataRepository
});

// Initialize
await storageManager.initialize();
```

### Using the Adapter

```javascript
// Create entity
const task = await storageManager.createEntity('tasks', {
  title: 'Complete repository pattern implementation',
  priority: 'high',
  completed: false
});

// Get entity
const retrievedTask = await storageManager.getEntity('tasks', task.id);

// Update entity
await storageManager.updateEntity('tasks', task.id, {
  completed: true
});

// Get setting
const theme = await storageManager.getSetting('theme', 'light');

// Set setting
await storageManager.setSetting('theme', 'dark');

// Store metadata
await storageManager.storeMetadata('appState', {
  lastOpened: new Date().toISOString(),
  version: '1.0.0'
});
```

### Using Repositories Directly

```javascript
// Create entity
const task = await entityRepository.createEntity('tasks', {
  title: 'Create documentation',
  priority: 'medium',
  completed: false
});

// Get setting
const encryptionEnabled = await settingsRepository.getSetting('encryption.enabled', false);

// Update metadata
await metadataRepository.updateMetadata('appState', {
  lastScreenSize: { width: 1200, height: 800 }
});
```

## Event Handling

The repositories and adapter emit events for various operations:

```javascript
// Listen for entity events
entityRepository.on('entityCreated', ({ entityType, id, data }) => {
  console.log(`Entity created: ${entityType}/${id}`);
});

// Listen for adapter events (delegates to repositories)
storageManager.on('settingChanged', ({ key, value }) => {
  console.log(`Setting changed: ${key}`);
});

// Listen for errors
storageManager.on('error', ({ operation, error }) => {
  console.error(`Error in operation ${operation}: ${error}`);
});
```

## Gradual Adoption Strategy

To facilitate a smooth transition to the repository pattern, a hybrid approach is implemented:

1. **Feature Flag**: A feature flag determines whether to use the repository implementations
2. **Adapter Layer**: The StorageManagerAdapter maintains API compatibility
3. **Dual Implementation**: Legacy code continues using the StorageManager interface
4. **Refactoring Path**: New code can directly use the repositories

## Migration Process

1. Implement repositories and adapter with full API compatibility
2. Introduce the adapter with feature flag disabled (using original implementation)
3. Enable feature flag in test environments
4. Gradually update components to use repositories directly
5. Eventually remove legacy implementation when all code has been migrated

## Testing Strategy

1. **Unit Tests**: Test repositories and adapter in isolation
2. **Integration Tests**: Test repositories together with actual storage
3. **Migration Tests**: Ensure adapter behavior matches original StorageManager
4. **Feature Flag Tests**: Test both paths of the feature flag

## Conclusion

The repository pattern implementation in FocusTrack provides a cleaner separation of concerns while maintaining backward compatibility. This architecture will support future growth and make the codebase more maintainable and testable.