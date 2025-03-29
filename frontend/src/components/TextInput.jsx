import React, { useState } from "react";
import "../GameRoom.css";

function TextInput({ onSendMessage }) {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);

  const handleSendMessage = () => {
    if (text || file) {
      if (typeof onSendMessage === "function") {
        onSendMessage(text, file);
        setText("");
        setFile(null);
        // 重置文件输入
      } else {
        console.error("onSendMessage is not a function");
      }
    }
  };

  return (
    <div className="chat-input">
      <input
        type="text"
        placeholder="Type a message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && text) {
            handleSendMessage();
          }
        }}
      />
      <input
        type="file"
        accept="image/*"
        onChange={(e) => {
          if (e.target.files[0]) {
            setFile(e.target.files[0]);
            handleSendMessage();
          }
        }}
      />
      <button onClick={handleSendMessage}>Send</button>
    </div>
  );
}

export default TextInput;
