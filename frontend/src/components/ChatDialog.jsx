import React, { useEffect } from "react";
import TextInput from "./TextInput";
import "../GameRoom.css";

function ChatDialog({ messages, onClose, onSendMessage }) {
  const getAvatarColor = (username) => {
    const safeUsername = username || "Unknown";
    const colors = ["#FFD700", "#1E90FF", "#FF69B4", "#32CD32"];
    const index = safeUsername.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // 自动滚动到底部
  useEffect(() => {
    const chatMessages = document.querySelector(".chat-messages");
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="chat-dialog">
      <button className="close-button" onClick={onClose}>
        ✖
      </button>
      <h2>Chat Room</h2>
      {messages
        .filter((msg) => msg.sender !== 'System')
        .map((msg, index) => (
          <div key={index} className={"user-message"}>
            <div className="message-item">
              <div
                className="chat-user-avatar"
                style={{ backgroundColor: getAvatarColor(msg.sender) }}
              >
                {msg.sender[0].toUpperCase()}
              </div>
              <div className="message-content">
                <strong>{msg.sender}</strong>
                {msg.content_type === "text" ? (
                  msg.content
                ) : (
                  <img
                    src={`data:image/jpeg;base64,${msg.content}`}
                    alt="图片"
                  />
                )}
                <span className="timestamp">
                  {new Date(msg.sentTime).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      <TextInput onSendMessage={onSendMessage} />
    </div>
  );
}

export default ChatDialog;

