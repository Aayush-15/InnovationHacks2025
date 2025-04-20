// src/components/ChatArea.jsx
import React, { useRef, useEffect } from 'react';
import Message from './Message';
import ChatHeader from './ChatHeader';
import ChatInput from './ChatInput';

const ChatArea = ({ 
  messages, 
  onSendMessage, 
  isLoading, 
  activeConversation, 
  conversations,
  user
}) => {
  const messagesEndRef = useRef(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Find current conversation
  const currentConversation = conversations.find(conv => conv.id === activeConversation) || {};

  return (
    <div className="chat-area">
      <ChatHeader 
        title={currentConversation.title || 'New Chat'} 
        model="AWS Bedrock Agent"
      />
      
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <h1>Hi, How can I help?</h1>
          </div>
        ) : (
          <>
            {messages.map((message, index) => (
              <Message 
                key={`${message.id}-${index}`}
                message={message} 
                isNew={index === messages.length - 1 && message.sender === 'bot' && message.isStreaming}
              />
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <ChatInput onSendMessage={onSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default ChatArea;