# FocusTrack

FocusTrack is a desktop application that automatically tracks and manages your time. It helps you record your time spent on activities without disruption, allowing you to boost productivity and manage your time more efficiently.

<div align="center">
  <img src="./assets/icon.png" alt="FocusTrack Logo" width="128" />
</div>

## Key Features

- **Automatic Time Tracking**: Runs in the background to automatically record your work time
- **Pomodoro Timer**: 25-minute work + 5-minute break timer to enhance focus
- **Productivity Reports**: Daily/weekly/monthly productivity trend analysis
- **Dark Mode/Light Mode**: System settings integration and manual switching
- **Shortcut System**: Start/stop tasks, switch categories, quick notes
- **Calendar Integration**: Google Calendar and Outlook integration
- **Security & Privacy**: Local data encryption, hiding sensitive categories
- **Cross-Platform**: Runs on Windows, macOS, and Linux

## Installation

### Download Pre-built Application

Download the latest version for your platform from the [Releases](https://github.com/leebohyeon1/FocusTrack/releases) page.

### Build from Source

```bash
# Clone repository
git clone https://github.com/leebohyeon1/FocusTrack.git
cd FocusTrack

# Install dependencies
npm install

# Run in development mode
npm start

# Build application
npm run build
```

## Quick Start

1. **Install FocusTrack** using the appropriate installer for your platform
2. **Launch the application** - it will start in the system tray
3. **Set up categories** for different types of work
4. **Start tracking** by selecting an activity or using the Pomodoro timer
5. **View reports** to analyze your productivity patterns

## Documentation

Comprehensive documentation is available in the [docs](./docs) directory:

- [User Guide](./docs/user-documentation.md) - Getting started with FocusTrack
- [Developer Guide](./docs/development-environment.md) - Setting up the development environment
- [Architecture](./docs/architecture.md) - Overview of the application architecture
- [API Reference](./docs/api-reference.md) - Documentation for the internal APIs
- [Testing Guide](./docs/testing-guide.md) - Information about testing procedures
- [Platform-specific Information](./docs/platform-specific.md) - Features and considerations for each platform

For a complete list of documentation, see the [Documentation Index](./docs/README.md).

## Development

FocusTrack is built with:

- Electron
- React
- Redux
- Material-UI

### Development Scripts

- `npm start`: Run in development mode with hot reload
- `npm test`: Run all tests
- `npm run package`: Create a local build
- `npm run make`: Generate installable packages
- `npm run build`: Build for all platforms

For more detailed development information, refer to the [Development Guide](./docs/development-environment.md).

## Contributing

We welcome contributions! Please check the [CONTRIBUTING.md](./CONTRIBUTING.md) file for guidelines.

To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Roadmap

### Phase 1: MVP (Completed)
- Automatic time tracking
- Basic timer
- Simple reports
- Basic interface
- System tray integration
- Dark mode

### Phase 2: Core Features (In Progress)
- Detailed reports
- Data export
- Shortcut system
- Calendar integration
- Notification system
- Backup/restore

### Phase 3: Advanced Features (Planned)
- Data encryption
- Sensitive information protection
- Access control
- Performance improvements
- Battery optimization
- Memory usage optimization

## Acknowledgements

- All contributors to the project
- Open source libraries used in the application
- Users who provided valuable feedback