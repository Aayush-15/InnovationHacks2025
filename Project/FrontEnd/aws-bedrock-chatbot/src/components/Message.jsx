import React from 'react';
import SlowText from './SlowText';
// Make sure react-icons is installed
import { FiThumbsUp, FiThumbsDown, FiCopy } from 'react-icons/fi';
// Make sure react-markdown is installed: npm install react-markdown
import ReactMarkdown from 'react-markdown';

const Message = ({ message, isNew }) => {
  const { sender, text, timestamp } = message;
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(text);
  };
  
  return (
    <div className={`message-container ${sender === 'user' ? 'user-message-container' : 'bot-message-container'}`}>
      <div className="message-avatar">
        {sender === 'user' ? 'A' : '🤖'}
      </div>
      <div className="message-content">
        <div className="message-sender">
          {sender === 'user' ? 'You' : 'DevilNet'}
        </div>
        <div className="message-text">
          {isNew && sender === 'bot' ? (
            <SlowText text={text} />
          ) : (
            <ReactMarkdown>{text}</ReactMarkdown>
          )}
        </div>
        
        {sender === 'bot' && (
          <div className="message-actions">
            <button className="message-action-button">
              <FiThumbsUp />
            </button>
            <button className="message-action-button">
              <FiThumbsDown />
            </button>
            <button className="message-action-button" onClick={copyToClipboard}>
              <FiCopy />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;
