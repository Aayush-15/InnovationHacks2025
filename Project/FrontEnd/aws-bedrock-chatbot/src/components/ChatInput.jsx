import React, { useState, useRef } from 'react';
// Make sure react-icons is installed
import { FiSend, FiMic, FiPaperclip, FiSearch } from 'react-icons/fi';

const ChatInput = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const autoResizeTextarea = () => {
    const textarea = textareaRef.current;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    autoResizeTextarea();
  };

  return (
    <div className="chat-input-container">
      <form onSubmit={handleSubmit} className="chat-input-form">
        <div className="chat-input-wrapper">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            disabled={isLoading}
            rows={1}
            className="chat-textarea"
          />
          
          <div className="chat-input-buttons">
            <button type="button" className="input-action-button">
              <FiPaperclip />
            </button>
            <button type="button" className="input-action-button">
              <FiMic />
            </button>
            <button 
              type="submit" 
              className={`send-button ${(!input.trim() || isLoading) ? 'disabled' : ''}`}
              disabled={!input.trim() || isLoading}
            >
              <FiSend />
            </button>
          </div>
        </div>
      </form>
      
      <div className="input-footer">
        <button className="search-button">
          <FiSearch />
          <span>Search</span>
        </button>
        <div className="model-info">
          DevilNet may produce inaccurate information about people, places, or facts.
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
