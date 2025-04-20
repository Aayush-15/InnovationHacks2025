import React, { useState, useEffect } from 'react';
import './LoadingIndicator.css';

const LoadingIndicator = () => {
  const [loadingText, setLoadingText] = useState('Thinking');
  const [dots, setDots] = useState('.');
  
  // Array of loading messages to cycle through
  const loadingMessages = [
    'Searching your calendar',
    'Processing your emails',
    'Analyzing data',
    'Checking your schedule',
    'Searching knowledge base',
    'Reviewing documents',
    'Connecting to services',
    'Generating response'
  ];
  
  // Change the loading message every 3 seconds
  useEffect(() => {
    let messageInterval;
    let dotsInterval;
    
    if (messageInterval) clearInterval(messageInterval);
    if (dotsInterval) clearInterval(dotsInterval);
    
    // Update loading message
    messageInterval = setInterval(() => {
      const randomIndex = Math.floor(Math.random() * loadingMessages.length);
      setLoadingText(loadingMessages[randomIndex]);
    }, 3000);
    
    // Update dots animation
    dotsInterval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '.';
        if (prev === '..') return '...';
        if (prev === '.') return '..';
        return '.';
      });
    }, 500);
    
    return () => {
      clearInterval(messageInterval);
      clearInterval(dotsInterval);
    };
  }, []);
  
  return (
    <div className="loading-indicator">
      <div className="loading-spinner">
        <div className="spinner"></div>
      </div>
      <div className="loading-text">
        {loadingText}{dots}
      </div>
    </div>
  );
};

export default LoadingIndicator;
