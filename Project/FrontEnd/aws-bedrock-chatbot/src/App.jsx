// src/App.jsx
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Sidebar from './components/SideBar';
import ChatArea from './components/ChatArea';
import LoginPage from './components/LoginPage';
import { streamFromBedrockAgent, generateSessionId } from './services/bedrockAgentService';
import './App.css';

// Login component with navigation
function Login({ onLogin }) {
  const navigate = useNavigate();
  
  const handleLogin = (userData) => {
    onLogin(userData);
    navigate('/chat');
  };
  
  return <LoginPage onLogin={handleLogin} />;
}

// Chat interface component with navigation
function Chat({ user, onLogout }) {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([
    { id: 'default', title: 'New Chat', messages: [], icon: '🤖' },
    { id: 'conv1', title: 'Chat History 1', messages: [], icon: '📚' },
    { id: 'conv2', title: 'Technical Support', messages: [], icon: '💻' },
    { id: 'conv3', title: 'Project Ideas', messages: [], icon: '💡' },
  ]);
  
  const [activeConversation, setActiveConversation] = useState('default');
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(generateSessionId());
  
  // If no user is logged in, redirect to login
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);
  
  // Handle logout
  const handleLogout = () => {
    onLogout();
    navigate('/login');
  };

  // Load messages for active conversation
  useEffect(() => {
    const currentConv = conversations.find(c => c.id === activeConversation);
    if (currentConv) {
      setMessages(currentConv.messages || []);
    }
  }, [activeConversation, conversations]);

  const handleNewChat = () => {
    const newId = `conv-${Date.now()}`;
    const newConversation = {
      id: newId,
      title: 'New Chat',
      messages: [],
      icon: '🤖'
    };
    
    setConversations([newConversation, ...conversations]);
    setActiveConversation(newId);
    setMessages([]);
  };
  

  const updateConversationMessages = (convId, newMessages) => {
    setConversations(prev => 
      prev.map(conv => 
        conv.id === convId 
          ? { ...conv, messages: newMessages } 
          : conv
      )
    );
  };

  // Create a full conversation context from messages
  const createConversationContext = (messages) => {
    return messages.map(msg => 
      `${msg.sender === 'user' ? 'User' : 'Assistant'}: ${msg.text}`
    ).join('\n');
  };

  const handleSendMessage = async (text) => {
    if (!text.trim() || isLoading) return;
    
    // Create user message
    const userMessage = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
    };
    
    // Update messages state
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    // Update conversation's messages
    updateConversationMessages(activeConversation, updatedMessages);
    
    // Set loading state
    setIsLoading(true);
    
    try {
      // Create bot placeholder for streaming
      const botPlaceholderId = `msg-${Date.now() + 1}`;
      const botPlaceholder = {
        id: botPlaceholderId,
        sender: 'bot',
        text: '',
        timestamp: new Date().toISOString(),
        isStreaming: true,
      };
      
      // Add placeholder message
      setMessages([...updatedMessages, botPlaceholder]);
      
      // Update conversation title if it's a new conversation
      const currentConv = conversations.find(c => c.id === activeConversation);
      if (currentConv && currentConv.messages && currentConv.messages.length === 0) {
        const newTitle = text.length > 30 ? `${text.substring(0, 27)}...` : text;
        setConversations(prev => 
          prev.map(conv => 
            conv.id === activeConversation 
              ? { ...conv, title: newTitle } 
              : conv
          )
        );
      }
      
      // Generate conversation context for agent
      const conversationContext = createConversationContext(updatedMessages);
      
      // Streaming function to update UI with each chunk
      let responseText = '';
      const handleChunk = (chunk) => {
        responseText += chunk;
        
        // Update the bot message with the latest chunk
        setMessages(currentMessages => {
          return currentMessages.map(msg => 
            msg.id === botPlaceholderId 
              ? { ...msg, text: responseText } 
              : msg
          );
        });
      };
      
      // Stream from Bedrock Agent
      await streamFromBedrockAgent(sessionId, conversationContext, handleChunk);
      
      // Update the placeholder with final message and remove streaming flag
      setMessages(currentMessages => {
        return currentMessages.map(msg => 
          msg.id === botPlaceholderId 
            ? { ...msg, text: responseText, isStreaming: false } 
            : msg
        );
      });
      
      // Update conversation messages
      const finalMessages = updatedMessages.concat([{
        id: botPlaceholderId,
        sender: 'bot',
        text: responseText,
        timestamp: new Date().toISOString(),
      }]);
      
      updateConversationMessages(activeConversation, finalMessages);
      
    } catch (error) {
      // Handle error
      console.error('Error sending message to Bedrock agent:', error);
      
      // Update with error message
      setMessages(currentMessages => {
        return currentMessages.map(msg => 
          msg.sender === 'bot' && msg.isStreaming
            ? { 
                ...msg, 
                text: 'Sorry, I encountered an error while communicating with AWS Bedrock. Please try again.', 
                isStreaming: false,
                isError: true
              } 
            : msg
        );
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      <Sidebar 
        conversations={conversations}
        activeConversation={activeConversation}
        onNewChat={handleNewChat}
        onSelectConversation={setActiveConversation}
        onLogout={handleLogout}
        user={user}
      />
      <ChatArea 
        messages={messages}
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        activeConversation={activeConversation}
        conversations={conversations}
        user={user}
      />
    </div>
  );
}

// Main App component with routing
function App() {
  const [user, setUser] = useState(null);
  
  // Check for user in localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('chatUser');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error('Error parsing saved user:', e);
        localStorage.removeItem('chatUser');
      }
    }
  }, []);

  // Login handler
  const handleLogin = (userData) => {
    // Save user to state and localStorage
    setUser(userData);
    localStorage.setItem('chatUser', JSON.stringify(userData));
  };
  
  // Logout handler
  const handleLogout = () => {
    // Clear user from state and localStorage
    setUser(null);
    localStorage.removeItem('chatUser');
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/chat" element={<Chat user={user} onLogout={handleLogout} />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;