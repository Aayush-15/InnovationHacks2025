import React, { useRef, useEffect, useState } from 'react';
import Message from './Message';
import ChatHeader from './ChatHeader';
import ChatInput from './ChatInput';
import { streamFromBedrockAgent, generateSessionId } from '../services/bedrockAgentService';

const ChatArea = ({ 
  messages, 
  onSendMessage,
  isLoading, 
  activeConversation, 
  conversations 
}) => {
  const messagesEndRef = useRef(null);
  const [sessionId] = useState(generateSessionId());
  
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
        model="DevilNet Agent"
      />
      
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <h1>How can I help, Aayush?</h1>
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
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <ChatInput onSendMessage={onSendMessage} isLoading={isLoading} />
    </div>
  );
};

export default ChatArea;
