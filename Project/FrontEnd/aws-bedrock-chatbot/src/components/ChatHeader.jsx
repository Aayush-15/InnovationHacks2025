import React from 'react';
// Make sure react-icons is installed
import { FiSettings, FiSave } from 'react-icons/fi';

const ChatHeader = ({ title, model }) => {
  return (
    <div className="chat-header">
      <div className="chat-header-left">
        <h2>{title || 'New Chat'}</h2>
      </div>
      <div className="chat-header-right">
        <div className="model-selector">
          <span>{model || 'DevilNet'}</span>
        </div>
        <button className="icon-button">
          <FiSave />
        </button>
        <button className="icon-button">
          <FiSettings />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
