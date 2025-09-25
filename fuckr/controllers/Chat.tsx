import React, { useState, useEffect, useRef } from 'react';
import { chatService, uploadImageService } from './services'; // Assuming services are in a 'services.ts' file

interface Message {
  // Define your message structure
}

interface Conversation {
  id: string;
  messages: Message[];
  // Other conversation properties
}

interface ChatProps {
  routeParams: {
    id?: string;
  };
}

const Chat: React.FC<ChatProps> = ({ routeParams }) => {
  const [latestConversations, setLatestConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(routeParams.id || null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [sentImages, setSentImages] = useState<string[] | null>(null);
  const [message, setMessage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const socket = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Establish WebSocket connection
    // Replace 'wss://your-websocket-url.com' with your actual WebSocket server URL
    socket.current = new WebSocket('wss://your-websocket-url.com');

    // Handle incoming messages
    socket.current.onmessage = (event) => {
      const incomingData = JSON.parse(event.data);

      // Assuming the server sends a 'type' to distinguish events
      if (incomingData.type === 'new_message') {
        console.log('New message received:', incomingData.payload);

        // Refresh the current conversation if it's the one being updated
        if (conversationId && incomingData.payload.conversationId === conversationId) {
          setConversation(chatService.getConversation(conversationId));
        }
        
        // Always refresh the list of latest conversations
        setLatestConversations(chatService.latestConversations());
      }
    };

    // Handle connection open
    socket.current.onopen = () => {
      console.log('WebSocket connection established.');
      // You might want to send an authentication token here
    };

    // Handle errors
    socket.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // Cleanup: close the connection when the component unmounts
    return () => {
      if (socket.current) {
        console.log('Closing WebSocket connection.');
        socket.current.close();
      }
    };
  }, [conversationId]); // Re-run effect if conversationId changes, to potentially subscribe to different channels

  useEffect(() => {
    setLatestConversations(chatService.latestConversations());
  }, []);

  useEffect(() => {
    if (conversationId) {
      setConversation(chatService.getConversation(conversationId));
      setSentImages(null);
    }
  }, [conversationId]);

  useEffect(() => {
    const upload = async () => {
      if (imageFile) {
        setUploading(true);
        try {
          const imageHash = await uploadImageService.uploadChatImage(imageFile);
          if (imageHash) {
            setSentImages(prev => [...(prev || []), imageHash]);
          }
        } finally {
          setUploading(false);
        }
      }
    };
    upload();
  }, [imageFile]);

  const handleSendText = () => {
    if (conversationId) {
      chatService.sendText(message, conversationId);
      // You might also send the message via WebSocket directly
      // if (socket.current && socket.current.readyState === WebSocket.OPEN) {
      //   socket.current.send(JSON.stringify({ type: 'send_message', payload: { message, conversationId } }));
      // }
      setMessage('');
    }
  };
  
  // ... (rest of the handler functions: handleShowSentImages, handleSendImage, etc.)

  return (
    <div>
      {/* Your Chat UI */}
    </div>
  );
};

export default Chat;
