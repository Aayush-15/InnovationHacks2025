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
    console.log('Setting loading state to true'); // Debug log
    setIsLoading(true);
    
    try {
      // Generate conversation context for agent
      const conversationContext = createConversationContext(updatedMessages);
      
      // Prepare for streaming response
      let responseText = '';
      const handleChunk = (chunk) => {
        responseText += chunk;
      };
      
      console.log('Calling Bedrock Agent...'); // Debug log
      // Stream from Bedrock Agent
      const fullResponse = await streamFromBedrockAgent(sessionId, conversationContext, handleChunk);
      console.log('Received full response from Bedrock'); // Debug log
      
      // After receiving the complete response, add it as a new message
      const botMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'bot',
        text: fullResponse,
        timestamp: new Date().toISOString(),
      };
      
      // Update messages with the bot response
      const finalMessages = [...updatedMessages, botMessage];
      setMessages(finalMessages);
      
      // Update conversation messages
      updateConversationMessages(activeConversation, finalMessages);
      
    } catch (error) {
      console.error('Error sending message to Bedrock agent:', error);
      
      // Add error message
      const errorMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'bot',
        text: 'Sorry, I encountered an error while communicating with AWS Bedrock. Please try again.',
        timestamp: new Date().toISOString(),
        isError: true
      };
      
      const withError = [...updatedMessages, errorMessage];
      setMessages(withError);
      
      // Update conversation's messages
      updateConversationMessages(activeConversation, withError);
    } finally {
      console.log('Setting loading state to false'); // Debug log
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