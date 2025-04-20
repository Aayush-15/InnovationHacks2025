import React, { useRef, useEffect, useState } from 'react';
import Message from './Message';
import ChatHeader from './ChatHeader';
import ChatInput from './ChatInput';
import Spinner from './Spinner';
import { streamFromBedrockAgent, generateSessionId } from '../services/bedrockAgentService';

const ChatArea = ({ 
  messages, 
  onSendMessage,
  isLoading, 
  activeConversation, 
  conversations,
  user
}) => {
  const messagesEndRef = useRef(null);
  const [sessionId] = useState(generateSessionId());
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Find current conversation
  const currentConversation = conversations.find(conv => conv.id === activeConversation) || {};

  // Get user's name for greeting
  const userName = user?.name || 'there';

  return (
    <div className="chat-area">
      <ChatHeader 
        title={currentConversation.title || 'New Chat'} 
        model="DevilNet Agent"
      />
      
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <h1>How can I help, {userName}?</h1>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <Message 
                key={`${message.id}-${index}`}
                message={message} 
                isNew={index === messages.length - 1 && message.sender === 'bot'}
              />
            ))}
            
            {/* Show spinner with text when loading */}
            {/* {isLoading && (
              <div className="bot-message-container" style={{ padding: '20px', textAlign: 'center' }}>
                <Spinner />
                <div style={{ marginTop: '10px', color: '#666' }}>Thinking....</div>
              </div>
            )} */}
            {isLoading && (
              <div className="bot-message-container" style={{ padding: '20px', textAlign: 'center' }}>
                <Spinner />
                <div style={{ marginTop: '10px', color: '#666' }}>Generating...</div>
              </div>
            )}

          </>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <ChatInput onSendMessage={onSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default ChatArea;