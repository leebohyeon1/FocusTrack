import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [focusSessions, setFocusSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [timer, setTimer] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [settings, setSettings] = useState({
    sessionDuration: 25, // minutes
    breakDuration: 5     // minutes
  });

  // Timer effect
  useEffect(() => {
    let interval = null;
    
    if (isRunning) {
      interval = setInterval(() => {
        setTimer(timer => timer + 1);
      }, 1000);
    } else if (!isRunning && timer !== 0) {
      clearInterval(interval);
    }
    
    return () => clearInterval(interval);
  }, [isRunning, timer]);

  // Load initial data
  useEffect(() => {
    loadSessions();
    loadSettings();
  }, []);

  const loadSessions = async () => {
    const result = await window.electronAPI.focusSession.getAll();
    if (result.success) {
      setFocusSessions(result.data || []);
    }
  };

  const loadSettings = async () => {
    const sessionDurationResult = await window.electronAPI.settings.get('sessionDuration');
    const breakDurationResult = await window.electronAPI.settings.get('breakDuration');
    
    if (sessionDurationResult.success && sessionDurationResult.data !== null) {
      setSettings(prev => ({ ...prev, sessionDuration: sessionDurationResult.data }));
    }
    if (breakDurationResult.success && breakDurationResult.data !== null) {
      setSettings(prev => ({ ...prev, breakDuration: breakDurationResult.data }));
    }
  };

  const startSession = async () => {
    const sessionData = {
      startTime: new Date().toISOString(),
      duration: 0,
      completed: false,
      plannedDuration: settings.sessionDuration * 60
    };
    
    const result = await window.electronAPI.focusSession.create(sessionData);
    
    if (result.success) {
      setCurrentSession(result.data);
      setIsRunning(true);
      setTimer(0);
    }
  };

  const stopSession = async () => {
    if (currentSession) {
      const updates = {
        endTime: new Date().toISOString(),
        duration: timer,
        completed: timer >= (settings.sessionDuration * 60)
      };
      
      const result = await window.electronAPI.focusSession.update(currentSession.id, updates);
      
      if (result.success) {
        setCurrentSession(null);
        setIsRunning(false);
        setTimer(0);
        loadSessions();
      }
    }
  };

  const saveSettings = async () => {
    await window.electronAPI.settings.set('sessionDuration', settings.sessionDuration);
    await window.electronAPI.settings.set('breakDuration', settings.breakDuration);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>FocusTrack</h1>
      </header>

      <main className="App-main">
        <div className="timer-section">
          <div className="timer-display">
            {formatTime(timer)}
          </div>
          
          <div className="timer-controls">
            {!isRunning ? (
              <button onClick={startSession} className="btn btn-primary">
                Start Session
              </button>
            ) : (
              <button onClick={stopSession} className="btn btn-danger">
                Stop Session
              </button>
            )}
          </div>
        </div>

        <div className="sessions-section">
          <h2>Recent Sessions</h2>
          <div className="sessions-list">
            {focusSessions.length === 0 ? (
              <p>No sessions yet</p>
            ) : (
              focusSessions.map((session) => (
                <div key={session.id} className="session-item">
                  <span className="session-time">
                    {new Date(session.startTime).toLocaleString()}
                  </span>
                  <span className="session-duration">
                    {Math.round(session.duration / 60)} minutes
                  </span>
                  {session.completed && (
                    <span className="session-completed">✓</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="settings-section">
          <h2>Settings</h2>
          <div className="setting-item">
            <label>
              Session Duration (minutes):
              <input
                type="number"
                value={settings.sessionDuration}
                onChange={(e) => setSettings({
                  ...settings,
                  sessionDuration: parseInt(e.target.value)
                })}
                onBlur={saveSettings}
              />
            </label>
          </div>
          <div className="setting-item">
            <label>
              Break Duration (minutes):
              <input
                type="number"
                value={settings.breakDuration}
                onChange={(e) => setSettings({
                  ...settings,
                  breakDuration: parseInt(e.target.value)
                })}
                onBlur={saveSettings}
              />
            </label>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;