// src/services/bedrockAgentService.js
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";

// Initialize the Bedrock Agent client
const bedrockAgentClient = new BedrockAgentRuntimeClient({
  region: "us-east-1", // Change to your region
  credentials: {
    // Use AWS Amplify or another method for credentials management in production
    accessKeyId: '',
    secretAccessKey: '',
  },
});

// Configuration for the Bedrock Agent
const AGENT_ID = process.env.REACT_APP_BEDROCK_AGENT_ID || ''; // Replace with your agent ID
const AGENT_ALIAS_ID = process.env.REACT_APP_BEDROCK_AGENT_ALIAS_ID || ''; // Test alias

/**
 * Send a message to the Bedrock Agent and stream the response
 * @param {string} sessionId - Unique session identifier
 * @param {string} inputText - User's message or conversation context
 * @param {function} onChunk - Callback for each chunk of the streaming response
 * @returns {Promise<string>} - Full response text
 */
export const streamFromBedrockAgent = async (sessionId, inputText, onChunk) => {
  try {
    const params = {
      agentId: AGENT_ID,
      agentAliasId: AGENT_ALIAS_ID,
      sessionId: sessionId,
      inputText: inputText,
    };

    // Create the command to invoke the agent
    const command = new InvokeAgentCommand(params);
    
    // Send the request to AWS Bedrock
    const response = await bedrockAgentClient.send(command);
    
    // Process the streaming response
    let fullResponse = "";
    
    // The response format might differ - adapt based on actual response structure
    for await (const event of response.completion) {
      if (event.chunk) {
        // Convert chunk bytes to text
        const chunk = new TextDecoder().decode(event.chunk.bytes);
        fullResponse += chunk;
        
        // Call the callback with the chunk for streaming display
        if (onChunk) {
          onChunk(chunk);
        }
      }
    }
    
    return fullResponse;
  } catch (error) {
    console.error("Error invoking DevilNet Agent:", error);
    throw error;
  }
};

// Generate a random session ID if needed
export const generateSessionId = () => {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};
