# Repository Pattern Usage Examples

This document provides practical examples of how to use the new repository pattern implementation for common operations in FocusTrack.

## Basic Setup

```javascript
// Import repositories
const EntityRepository = require('../src/main/storage/repositories/EntityRepository');
const SettingsRepository = require('../src/main/storage/repositories/SettingsRepository');
const MetadataRepository = require('../src/main/storage/repositories/MetadataRepository');

// Create and initialize repositories
const entityRepository = new EntityRepository({
  storagePath: '/path/to/storage',
  encryptionService // Optional encryption service
});

const settingsRepository = new SettingsRepository({
  storagePath: '/path/to/storage',
  encryptionService // Optional encryption service
});

const metadataRepository = new MetadataRepository({
  storagePath: '/path/to/storage'
});

// Initialize repositories
await Promise.all([
  entityRepository.initialize(),
  settingsRepository.initialize(),
  metadataRepository.initialize()
]);
```

## Entity Operations

### Creating Entities

```javascript
// Create a task entity
const taskData = {
  title: 'Implement repository pattern',
  description: 'Refactor StorageManager to use repository pattern',
  status: 'in-progress',
  priority: 'high',
  dueDate: '2023-12-31T23:59:59Z'
};

const createdTask = await entityRepository.createEntity('tasks', taskData);

// With encryption for sensitive fields
const noteData = {
  title: 'Private note',
  content: 'This is a confidential note',
  tags: ['private', 'confidential']
};

const options = {
  encryptFields: ['content'] // Specify fields to encrypt
};

const createdNote = await entityRepository.createEntity('notes', noteData, options);
```

### Retrieving Entities

```javascript
// Get a single entity by ID
const task = await entityRepository.getEntity('tasks', taskId);

// List all entities of a type
const allTasks = await entityRepository.listEntities('tasks');

// Filter entities (client-side filtering)
const completedTasks = (await entityRepository.listEntities('tasks'))
  .filter(task => task.status === 'completed');
```

### Updating Entities

```javascript
// Update a task
const taskId = 'task-123';
const updateData = {
  status: 'completed',
  completedAt: new Date().toISOString()
};

const updatedTask = await entityRepository.updateEntity('tasks', taskId, updateData);

// Update with field encryption
const noteId = 'note-456';
const noteUpdateData = {
  content: 'Updated confidential content'
};

const options = {
  encryptFields: ['content']
};

const updatedNote = await entityRepository.updateEntity('notes', noteId, noteUpdateData, options);
```

### Deleting Entities

```javascript
// Delete an entity
const success = await entityRepository.deleteEntity('tasks', taskId);

if (success) {
  console.log('Task deleted successfully');
} else {
  console.log('Task not found or could not be deleted');
}
```

## Settings Management

### Working with Settings

```javascript
// Get a setting with default value
const theme = await settingsRepository.getSetting('theme', 'light');

// Update a setting
await settingsRepository.setSetting('theme', 'dark');

// Get all settings
const allSettings = await settingsRepository.getAllSettings();
console.log('Current settings:', allSettings);

// Delete a setting
await settingsRepository.deleteSetting('unused-setting');
```

### Encrypted Settings

```javascript
// Store an encrypted setting
await settingsRepository.setSetting('apiKey', 'secret-api-key-123', { encrypt: true });

// Retrieve an encrypted setting (decryption happens automatically)
const apiKey = await settingsRepository.getSetting('apiKey');
```

## Metadata Management

```javascript
// Store application metadata
const syncMetadata = {
  lastSyncTime: new Date().toISOString(),
  syncStatus: 'success',
  itemsSynced: 42
};

await metadataRepository.storeMetadata('sync-status', syncMetadata);

// Retrieve metadata with fallback
const lastSyncInfo = await metadataRepository.getMetadata('sync-status', { 
  lastSyncTime: null, 
  syncStatus: 'never', 
  itemsSynced: 0 
});

// Delete metadata
await metadataRepository.deleteMetadata('old-metadata');
```

## Event Handling

```javascript
// Subscribe to entity events
entityRepository.on('entityCreated', (event) => {
  console.log(`Entity created: ${event.entityType} ${event.id}`);
  // Trigger UI updates, sync, etc.
});

entityRepository.on('entityUpdated', (event) => {
  console.log(`Entity updated: ${event.entityType} ${event.id}`);
  // Update cache, trigger UI refresh, etc.
});

entityRepository.on('entityDeleted', (event) => {
  console.log(`Entity deleted: ${event.entityType} ${event.id}`);
  // Clean up related data, update UI, etc.
});

// Subscribe to settings events
settingsRepository.on('settingChanged', (event) => {
  console.log(`Setting changed: ${event.key} = ${event.value}`);
  // Apply new setting, update UI, etc.
});

// Handle errors
entityRepository.on('error', (event) => {
  console.error(`Error in ${event.operation}: ${event.error}`);
  // Log error, show notification, etc.
});
```

## Using the Adapter

For backwards compatibility with code that expects the original StorageManager API:

```javascript
const StorageManagerAdapter = require('../src/main/storage/adapters/StorageManagerAdapter');

// Create adapter with repositories
const storageManagerAdapter = new StorageManagerAdapter({
  entityRepository,
  settingsRepository,
  metadataRepository
});

await storageManagerAdapter.initialize();

// Use original API
const task = await storageManagerAdapter.createEntity('tasks', { 
  title: 'New task',
  status: 'pending'
});

const theme = await storageManagerAdapter.getSetting('theme', 'light');
```

## Advanced Usage

### Batch Operations

```javascript
// Batch create multiple entities
async function batchCreateTasks(tasks) {
  const creationPromises = tasks.map(task => 
    entityRepository.createEntity('tasks', task)
  );
  
  return Promise.all(creationPromises);
}

// Usage
const newTasks = [
  { title: 'Task 1', priority: 'high' },
  { title: 'Task 2', priority: 'medium' },
  { title: 'Task 3', priority: 'low' }
];

const createdTasks = await batchCreateTasks(newTasks);
```

### Transaction-like Pattern

This isn't a true database transaction, but achieves a similar result for local operations:

```javascript
async function moveTaskToProject(taskId, projectId) {
  try {
    // Get current data
    const task = await entityRepository.getEntity('tasks', taskId);
    const project = await entityRepository.getEntity('projects', projectId);
    
    if (!task || !project) {
      throw new Error('Task or project not found');
    }
    
    // Update task
    const updatedTask = await entityRepository.updateEntity('tasks', taskId, {
      projectId,
      updatedAt: new Date().toISOString()
    });
    
    // Update project
    const updatedTaskIds = [...(project.taskIds || []), taskId];
    const updatedProject = await entityRepository.updateEntity('projects', projectId, {
      taskIds: updatedTaskIds,
      updatedAt: new Date().toISOString()
    });
    
    return { task: updatedTask, project: updatedProject };
  } catch (error) {
    console.error('Failed to move task to project:', error);
    throw error;
  }
}
```

### Custom Queries

For more complex queries that are not directly supported by the repositories:

```javascript
// Find tasks by tag
async function findTasksByTag(tag) {
  const allTasks = await entityRepository.listEntities('tasks');
  return allTasks.filter(task => 
    task.tags && task.tags.includes(tag)
  );
}

// Find overdue tasks
async function findOverdueTasks() {
  const allTasks = await entityRepository.listEntities('tasks');
  const now = new Date().toISOString();
  
  return allTasks.filter(task => 
    task.dueDate && 
    task.status !== 'completed' && 
    task.dueDate < now
  );
}
```

## Migrating from Direct Access

If you're updating existing code:

```javascript
// Before
const task = await storageManager.getEntity('tasks', taskId);
await storageManager.setSetting('theme', 'dark');

// After (using repositories directly)
const task = await entityRepository.getEntity('tasks', taskId);
await settingsRepository.setSetting('theme', 'dark');

// After (using adapter for backwards compatibility)
const task = await storageManagerAdapter.getEntity('tasks', taskId);
await storageManagerAdapter.setSetting('theme', 'dark');
```