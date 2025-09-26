import React from 'react';
import ReactDOM from 'react-dom/client';
import ChatForm from './communication/Components/ChatForm'; // Your component

// Simple test container - ONLY YOUR CODE
const TestApp = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>🚀 Testing ONLY My ChatForm Component</h1>
      <p>This is completely separate from the main app!</p>
      <ChatForm />
    </div>
  );
};

// Render only your component
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<TestApp />);