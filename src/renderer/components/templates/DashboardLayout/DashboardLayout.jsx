/**
 * DashboardLayout Component
 * 
 * A template component for dashboard layout with sidebar navigation and main content.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { Text } from '../../atoms';
import './DashboardLayout.css';

const DashboardLayout = ({
  title,
  sidebar,
  children,
  toolbar,
  footer,
  sidebarWidth = 240,
  sidebarCollapsed = false,
  onToggleSidebar,
  className = '',
  ...props
}) => {
  const baseClass = 'ft-dashboard-layout';
  
  const classes = [
    baseClass,
    sidebarCollapsed ? `${baseClass}--sidebar-collapsed` : '',
    className
  ].filter(Boolean).join(' ');
  
  const sidebarStyle = {
    width: sidebarCollapsed ? '64px' : `${sidebarWidth}px`
  };
  
  // Hamburger menu icon
  const hamburgerIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  );
  
  return (
    <div className={classes} {...props}>
      {/* Sidebar */}
      <aside className={`${baseClass}__sidebar`} style={sidebarStyle}>
        {sidebar}
      </aside>
      
      {/* Main content */}
      <main className={`${baseClass}__main`}>
        {/* Header */}
        <header className={`${baseClass}__header`}>
          <button 
            className={`${baseClass}__sidebar-toggle`}
            onClick={onToggleSidebar}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {hamburgerIcon}
          </button>
          
          {title && (
            <div className={`${baseClass}__title`}>
              {typeof title === 'string' ? <Text variant="h4">{title}</Text> : title}
            </div>
          )}
          
          {toolbar && (
            <div className={`${baseClass}__toolbar`}>
              {toolbar}
            </div>
          )}
        </header>
        
        {/* Content */}
        <div className={`${baseClass}__content`}>
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <footer className={`${baseClass}__footer`}>
            {footer}
          </footer>
        )}
      </main>
    </div>
  );
};

DashboardLayout.propTypes = {
  title: PropTypes.node,
  sidebar: PropTypes.node,
  children: PropTypes.node,
  toolbar: PropTypes.node,
  footer: PropTypes.node,
  sidebarWidth: PropTypes.number,
  sidebarCollapsed: PropTypes.bool,
  onToggleSidebar: PropTypes.func,
  className: PropTypes.string
};

export default DashboardLayout;