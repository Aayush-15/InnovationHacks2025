import React from 'react';
// Make sure react-icons is installed: npm install react-icons
import { FiPlus, FiBook, FiGrid, FiFolder } from 'react-icons/fi';

const SideBar = ({ conversations, activeConversation, onNewChat, onSelectConversation }) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <button className="new-chat-button" onClick={onNewChat}>
          <FiPlus />
          <span>New chat</span>
        </button>
      </div>

      <div className="conversation-list">
        <div className="conversation-section">
          <h3>Recent</h3>
          {conversations.map((conv, index) => (
            <div 
              key={conv.id} 
              className={`conversation-item ${activeConversation === conv.id ? 'active' : ''}`}
              onClick={() => onSelectConversation(conv.id)}
            >
              <div className="conversation-icon">
                {conv.icon || '🤖'}
              </div>
              <div className="conversation-title">
                {conv.title || `Conversation ${index + 1}`}
              </div>
            </div>
          ))}
        </div>

        <div className="sidebar-section">
          <h3>Explore</h3>
          <div className="sidebar-item">
            <FiGrid />
            <span>Explore Our More Agents</span>
          </div>
        </div>

        <div className="sidebar-section">
          <h3>Projects</h3>
          <div className="sidebar-item">
            <FiFolder />
            <span>Project 1</span>
          </div>
          <div className="sidebar-item">
            <FiFolder />
            <span>Project 2</span>
          </div>
        </div>

        <div className="sidebar-section">
          <h3>Library</h3>
          <div className="sidebar-item">
            <FiBook />
            <span>All chats</span>
          </div>
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">A</div>
          <div className="user-name">Aayush</div>
        </div>
      </div>
    </div>
  );
};

export default SideBar;
