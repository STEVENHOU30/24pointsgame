import React, { useEffect, useState, useRef } from "react";
import CardDisplay from "./CardDisplay";
import ExpressionInput from "./ExpressionInput";
import ChatDialog from "./ChatDialog";
import useWebSocket from "react-use-websocket";
import throttle from "lodash.throttle";
import { useNavigate, useLocation } from "react-router-dom";
import "../GameRoom.css";

export function GameRoom({ onError }) {
  const location = useLocation();
  const username = location.state?.username || "Guest";
  const navigate = useNavigate();

  const WS_URL = "ws://localhost:53840";
  const { sendJsonMessage, lastJsonMessage, readyState } = useWebSocket(
    WS_URL,
    {
      share: true,
      queryParams: { username },
      shouldReconnect: () => true,
    }
  );

  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [scores, setScores] = useState({});
  const [currentCards, setCurrentCards] = useState([]);
  const [usedCards, setUsedCards] = useState([]);
  const [winner, setWinner] = useState(null);
  const [roundWin, setroundWin] = useState("");
  const [countdown, setCountdown] = useState(null);
  const [clearInput, setClearInput] = useState(false);
  const [generateNewCards, setGenerateNewCards] = useState(false);
  const [cardChangeRequest, setCardChangeRequest] = useState(null);
  const [agreedUsers, setAgreedUsers] = useState([]);
  const [generateNewCardsTrigger, setGenerateNewCardsTrigger] = useState(0);
  const [winningExpression, setWinningExpression] = useState(null);
  const sendJsonMessageThrottled = useRef(throttle(sendJsonMessage, 50));
  const [gameStarted, setGameStarted] = useState(false);
  const [hasClickedStart, setHasClickedStart] = useState(false);
  const [startedUsers, setStartedUsers] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [latestMessages, setLatestMessages] = useState({});

  const getAvatarColor = (username) => {
    const safeUsername = username || "Unknown";
    const colors = ["#FFD700", "#1E90FF", "#FF69B4", "#32CD32"];
    const index = safeUsername.charCodeAt(0) % colors.length;
    return colors[index];
  };

  useEffect(() => {
    if (lastJsonMessage) {
      console.log("Received WebSocket message:", lastJsonMessage);
      if (lastJsonMessage.type === "history") {
        setMessages((prevMessages) => [
          ...prevMessages,
          ...lastJsonMessage.messages
            .filter((msg) => msg && !msg.system)
            .map((msg) => ({
              ...msg,
              content_type: msg.content_type || "text", // 为历史消息设置默认 subtype
              system: msg.system || false, // 为历史消息设置默认 system
            })),
        ]);
      } else if (lastJsonMessage.type === "userList") {
        setOnlineUsers(lastJsonMessage.users);
        const initialScores = lastJsonMessage.users.reduce((acc, user) => {
          acc[user] = 0;
          return acc;
        }, {});
        setScores(initialScores);
      } else if (lastJsonMessage.type === "chat") {
        const newMessage = {
          ...lastJsonMessage,
          content_type: lastJsonMessage.content_type || "text", // 确保实时消息有 subtype
          system: lastJsonMessage.system || false, // 确保实时消息有 system
        };
        if (!newMessage.system) {
          setMessages((prevMessages) => [...prevMessages, newMessage]);
          setLatestMessages((prev) => ({
            ...prev,
            [newMessage.sender]: {
              content: newMessage.content,
              sentTime: newMessage.sentTime,
            },
          }));
        }
      } else if (lastJsonMessage.type === "game") {
        if (lastJsonMessage.subtype === "cards") {
          setCurrentCards(lastJsonMessage.cards);
          setUsedCards(new Array(lastJsonMessage.cards.length).fill(false));
        } else if (lastJsonMessage.subtype === "score") {
          setScores(lastJsonMessage.scores);
          if (lastJsonMessage.winner) {
            setWinner(lastJsonMessage.winner);
          } else {
            setroundWin(lastJsonMessage.roundWin);
            setCountdown(lastJsonMessage.countdown);
            if (lastJsonMessage.expression) {
              setWinningExpression({
                expression: lastJsonMessage.expression,
                emoji: lastJsonMessage.emoji,
                roundWin: lastJsonMessage.roundWin,
              });
            }
          }
        } else if (lastJsonMessage.subtype === "new_round") {
          setCurrentCards([]);
          setUsedCards([]);
          setroundWin("");
          setCardChangeRequest(null);
          setAgreedUsers([]);
          setGenerateNewCardsTrigger((prev) => prev + 1);
          setCountdown(null);
          setWinningExpression(null);
        } else if (lastJsonMessage.subtype === "request_card_change") {
          setCardChangeRequest(lastJsonMessage.requester);
          setAgreedUsers(lastJsonMessage.agreedUsers || []);
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              sender: "System",
              type: "game",
              subtype: "request_card_change",
              content: `${lastJsonMessage.requester} requests to change cards!`,
              sentTime: new Date(),
              system: true,
            },
          ]);
        } else if (lastJsonMessage.subtype === "start_game_status") {
          console.log("Processing start_game_status:", lastJsonMessage);
          setStartedUsers(lastJsonMessage.startedUsers);
        } else if (lastJsonMessage.subtype === "game_start") {
          console.log("Game started!");
          setGameStarted(true);
          setCurrentCards([]);
          setUsedCards([]);
          setroundWin("");
          setCardChangeRequest(null);
          setAgreedUsers([]);
          setGenerateNewCardsTrigger((prev) => prev + 1);
        }
      }
    }
  }, [lastJsonMessage]);

  useEffect(() => {
    if (readyState === WebSocket.OPEN) {
      sendJsonMessage({ type: "set_name", name: username });
    }
  }, [readyState, username, sendJsonMessage]);

  useEffect(() => {
    return () => {
      sendJsonMessageThrottled.current.cancel();
    };
  }, []);

  useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setGenerateNewCards(true);
      setCountdown(null);
      setroundWin("");
      sendJsonMessage({ type: "game", subtype: "new_round" });
    }
  }, [countdown, sendJsonMessage]);

  const handleStartPlay = () => {
    if (!hasClickedStart) {
      sendJsonMessage({
        type: "start_game",
        username: username,
      });
      setHasClickedStart(true);
    }
  };

  const handleExpressionResult = (result, expression) => {
    setClearInput(true);
    if (result === 24) {
      const newScores = { ...scores, [username]: scores[username] + 1 };
      setScores(newScores);

      if (newScores[username] >= 2) {
        setWinner(username);
        sendJsonMessage({
          type: "game",
          subtype: "score",
          scores: newScores,
          winner: username,
        });
      } else {
        setroundWin(username);
        sendJsonMessage({
          type: "game",
          subtype: "score",
          scores: newScores,
          roundWin: username,
          countdown: 5,
          expression: expression,
        });
      }
    }
  };

  const handleRequestCardChange = () => {
    if (!gameStarted) return;
    if (cardChangeRequest) {
      if (!agreedUsers.includes(username)) {
        setGenerateNewCards(true);
        sendJsonMessage({
          type: "game",
          subtype: "request_card_change",
          requester: cardChangeRequest,
          agreedUser: username,
          system:true,
        });
      }
    } else {
      sendJsonMessage({
        type: "game",
        subtype: "request_card_change",
        requester: username,
        system: true,
      });
    }
  };

  const handleSendMessage = (content, file) => {
    console.log("handleSendMessage:", { content, file, readyState });
    if (readyState === WebSocket.OPEN) {
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target.result.split(",")[1];
          console.log("Sending image message:", { type: "chat", content_type: "image", content: base64 });
          sendJsonMessageThrottled.current({
            type: "chat",
            content_type: "image",
            content: base64,
          });
        };
        reader.readAsDataURL(file);
      } else if (content && !file) {
        console.log("Sending text message:", { type: "chat", content_type: "text", content });
        sendJsonMessageThrottled.current({
          type: "chat",
          content_type: "text",
          content,
        });
      } else {
        console.error("Invalid message: both content and file are empty or file exists with content");
      }
    } else {
      console.error("WebSocket is not open:", readyState);
    }
  };

  const handleExit = () => {
    if (onError) {
      onError("You have exited the game.");
    }
    navigate("/", { state: { error: "You have exited the game." } });
  };

  const renderUserList = () => {
    return onlineUsers.map((user) => (
      <div key={user} className="user-info">
        <span
          className="user-avatar"
          style={{ backgroundColor: getAvatarColor(user) }}
        >
          {user.charAt(0).toUpperCase()}
        </span>
        <span className="user-name">{user}</span>
        {latestMessages[user] && (
          <span className="latest-message">
            {latestMessages[user].content}{" "}
            {latestMessages[user].sentTime
              ? new Date(latestMessages[user].sentTime).toLocaleTimeString()
              : "No Time"}
          </span>
        )}
        <span className="user-score">Score: {scores[user] || 0}</span>
      </div>
    ));
  };

  return (
    <div className="room-info">
      {!gameStarted && (
        <div className="overlay">
          <div className="start-game-section">
            <p>Please click the button below to start the game.</p>
            <button onClick={handleStartPlay} disabled={hasClickedStart}>
              {hasClickedStart ? "Waiting for others..." : "Start Play"}
            </button>
          </div>
        </div>
      )}

      {winner && (
        <div className="overlay">
          <div className="winner-message-overlay">
            <h3>{winner} wins the game! Kiss Kiss~~😘</h3>
            <button onClick={handleExit}>Exit to Login</button>
          </div>
        </div>
      )}

      <div className={`game-content ${!gameStarted || winner ? "disabled" : ""}`}>
        <h2>Game Room!</h2>
        <p className="welcome-message">Welcome, {username}!</p>
        <button className="chat-button" onClick={() => setShowChat(true)}>
          💬
        </button>

        {roundWin && (
          <div className="overlay">
            <div className="round-winner-message-overlay">
              <h3>{roundWin} wins this round!</h3>
              {countdown !== null && winningExpression && (
                <p>
                  Winning Expression: {winningExpression.expression} 🐮
                </p>
              )}
              {countdown !== null && (
                <p>new round will begin in {countdown} s !!!</p>
              )}
            </div>
          </div>
        )}

        <div className="online-users">
          <h3>Online Users ({onlineUsers.length})</h3>
          {renderUserList()}
        </div>

        {cardChangeRequest && cardChangeRequest !== username && !agreedUsers.includes(username) && (
          <div className="card-change-request">
            <p>{cardChangeRequest} requests to change cards. Do you agree?</p>
            <button onClick={handleRequestCardChange}>
              Agree to Change Cards
            </button>
          </div>
        )}

        {showChat && (
          <div className="chat-dialog-overlay">
            <ChatDialog
              messages={messages}
              onClose={() => setShowChat(false)}
              onSendMessage={handleSendMessage}
            />
          </div>
        )}

        <CardDisplay
          cards={currentCards}
          setCards={setCurrentCards}
          usedCards={usedCards}
          setUsedCards={setUsedCards}
          sendJsonMessage={sendJsonMessage}
          readyState={readyState}
          generateNewCardsTrigger={generateNewCardsTrigger}
          onRequestCardChange={handleRequestCardChange}
          cardChangeRequest={cardChangeRequest}
          username={username}
          gameStarted={gameStarted}
        />

        <ExpressionInput
          cards={currentCards}
          usedCards={usedCards}
          setUsedCards={setUsedCards}
          onExpressionResult={handleExpressionResult}
          clearInput={clearInput}
          setClearInput={setClearInput}
        />
      </div>

      <footer className="websocket-info">Powered by WebSocket</footer>
    </div>
  );
}

export default GameRoom;
