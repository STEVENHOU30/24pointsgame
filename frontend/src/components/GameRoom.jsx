import React, { useEffect, useState, useRef } from "react";
import CardDisplay from "./CardDisplay";
import ExpressionInput from "./ExpressionInput";
import useWebSocket from "react-use-websocket";
import throttle from "lodash.throttle";
import "../GameRoom.css";

export function GameRoom({ username }) {
  const WS_URL = "wss://a437e01c-fbba-41c9-b9fd-a92a88a62805-00-3vf9l3c2yfjgg.pike.replit.dev";
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
  const sendJsonMessageThrottled = useRef(throttle(sendJsonMessage, 50));
  const [gameStarted, setGameStarted] = useState(false); // 新增状态：游戏是否开始
  const [hasClickedStart, setHasClickedStart] = useState(false); // 新增状态：当前用户是否点击 Start Play
  const [startedUsers, setStartedUsers] = useState([]); // 新增状态：已点击 Start Play 的用户
  const [winningExpression, setWinningExpression] = useState(null);


  const getAvatarColor = (username) => {
    const safeUsername = username || "Unknown";
    const colors = ["#FFD700", "#1E90FF", "#FF69B4", "#32CD32"];
    const index = safeUsername.charCodeAt(0) % colors.length;
    return colors[index];
  };

  useEffect(() => {
    if (lastJsonMessage) {
      if (lastJsonMessage.type === "userList") {
        setOnlineUsers(lastJsonMessage.users);
        const initialScores = lastJsonMessage.users.reduce((acc, user) => {
          acc[user] = 0;
          return acc;
        }, {});
        setScores(initialScores);
      } else if (lastJsonMessage.type === "chat") {
        setMessages((prevMessages) => [
          ...prevMessages,
          { ...lastJsonMessage, system: lastJsonMessage.system || false },
        ]);
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
            setWinningExpression({
              expression: lastJsonMessage.expression,
              emoji: lastJsonMessage.emoji,
            })
          }
        } else if (lastJsonMessage.subtype === "new_round") {
          setCurrentCards([]);
          setUsedCards([]);
          setroundWin("");
          setCardChangeRequest(null); // 清空更换卡牌请求
          setAgreedUsers([]); // 清空同意用户列表
          setGenerateNewCardsTrigger((prev) => prev + 1);
          setWinningExpression(null);
        } else if (lastJsonMessage.subtype === "request_card_change") {
          setCardChangeRequest(lastJsonMessage.requester);
          setAgreedUsers(lastJsonMessage.agreedUsers || []);
          setMessages((prevMessages) => [
            ...prevMessages,
            {
              sender: "System",
              content: `${lastJsonMessage.requester} requests to change cards!`,
              sentTime: new Date(),
              system: true,
            },
          ]);
        }else if (lastJsonMessage.subtype === "start_game_status") {
          console.log("Processing start_game_status:", lastJsonMessage);
          setStartedUsers(lastJsonMessage.startedUsers);
        } else if (lastJsonMessage.subtype === "game_start") {
          console.log("Game started!");
          setGameStarted(true);
          setCurrentCards([]);
          setUsedCards([]);
          setroundWin("");
          setCardChangeRequest(null); // 清空更换卡牌请求
          setAgreedUsers([]); // 清空同意用户列表
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

      if (newScores[username] >= 5) {
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
          countdown:5,
          expression: expression,
        });
        setCountdown(5);
      }
    }
  };

  const handleRequestCardChange = () => {
    if (!gameStarted) return;
    if (cardChangeRequest) {
      // 如果已经有请求，当前用户点击表示同意
      if (!agreedUsers.includes(username)) {
        setGenerateNewCards(true);
        sendJsonMessage({
          type: "game",
          subtype: "request_card_change",
          requester: cardChangeRequest,
          agreedUser: username,
        });
      }
    } else {
      // 如果没有请求，当前用户发起请求
      sendJsonMessage({
        type: "game",
        subtype: "request_card_change",
        requester: username,
      });
    }
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
        <span className="user-score">Score: {scores[user] || 0}</span>
      </div>
    ));
  };

  return (
    <div className="room-info">
      <h2>Game Room!</h2>
      <p className="welcome-message">Welcome, {username}!</p>
      {winner && (
        <div className="winner-message">
          <h3>{winner} wins the game! Want a kiss 😘</h3>
        </div>
      )}

      {roundWin && (
        <div className="round-winner-message">
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
      {!gameStarted && (
        <div className="start-game-section">
          <p>Please click the button below to start the game.</p>
          <button onClick={handleStartPlay} disabled={hasClickedStart}>
            {hasClickedStart ? "Waiting for others..." : "Start Play"}
          </button>
        </div>
      )}

      <footer className="websocket-info">Powered by WebSocket</footer>
    </div>
  );
}

export default GameRoom;

