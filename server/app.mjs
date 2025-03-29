import { WebSocketServer } from "ws";
import http from "http";
import { v4 as uuidv4 } from "uuid";
import url from "url";
import "./config/db.js";
import Message from "./models/message.js";

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control Allow Origin", "*");
  res.setHeader("Access-Control Allow Methods", "OPTIONS, GET");
  res.setHeader("Access-Control-Max-Age", 2592000); // 30 days
  res.end();
});

const port = 53840;
const wsServer = new WebSocketServer({ server });

const connections = {};
const users = {};

const gameState = {
  cards: [],
  scores: {},
  winner: null,
  roundWin: null,
  cardChangeRequest: null,
  agreedUsers: [],
  startedUsers: [],
};

let DEFAULT_ROOM_UUID = "老公老婆在一起";

async function getChatHistory() {
  try {
    const messages = await Message.find({ system: false })
      .sort({ sentTime: -1 })
      .limit(11); // acquire latest 5 + n messages
    return messages.reverse();
  } catch (error) {
    console.error("retrieve history error:", error);
    return [];
  }
}

function broadcastToRoom(message) {
  Object.keys(connections).forEach((uuid) => {
    const connection = connections[uuid];
    if (connection.readyState === 1) {
      connection.send(JSON.stringify(message));
    }
  });
}

function broadcastUserList() {
  const roomUsers = Object.keys(users)
    .map((uuid) => users[uuid].username)
    .filter((username) => username);
  broadcastToRoom({ type: "userList", users: roomUsers });
}

async function handleMessage(messageStr, connection) {
  const message = JSON.parse(messageStr);
  const user = users[connection.uuid];

  if (message.type === "start_game") {
    console.log("Received start_game message from:", message.username);
    if (!gameState.startedUsers.includes(message.username)) {
      gameState.startedUsers.push(message.username);
    }
    broadcastToRoom({
      sender: "System",
      type: "game",
      subtype: "start_game_status",
      startedUsers: gameState.startedUsers,
      system: true,
    });

    const allUsers = Object.keys(users).map((uuid) => users[uuid].username);
    if (gameState.startedUsers.length === allUsers.length) {
      console.log("All users have started the game!");
      broadcastToRoom({
        sender: "System",
        type: "game",
        subtype: "game_start",
        system: true,
      });
      gameState.cards = [];
      gameState.cardChangeRequest = null; // 清空更换卡牌请求
      gameState.agreedUsers = []; // 清空同意用户列表
      broadcastToRoom({
        sender: "System",
        type: "game",
        subtype: "new_round",
        system: true,
      });
    }
  } else if (message.type === "set_name") {
    user.username = message.name;
    console.log(`User ${message.name} joined the room!`);

    if (!gameState.scores[user.username]) {
      gameState.scores[user.username] = 0;
    }

    broadcastToRoom({
      sender: "System",
      content: `${user.username} joined!`,
      sentTime: new Date(),
      system: true,
    });

    broadcastUserList();

    broadcastToRoom({
      sender: "System",
      type: "game",
      subtype: "score",
      scores: gameState.scores,
      winner: gameState.winner,
      system: true,
    });

    if (gameState.cards.length > 0) {
      broadcastToRoom({
        sender: "System",
        type: "game",
        subtype: "cards",
        cards: gameState.cards,
        system: true,
      });
    }
  } else if (message.type === "chat") {
    console.log("Received chat message:", message);
    if (!message.content_type || !["text", "image"].includes(message.content_type )) {
      console.error("Invalid chat message content_type:", message.content_type );
      return;
    }
    const newMessage = new Message({
      sender: user.username,
      type: "chat",
      content_type: message.content_type,
      content: message.content,
      sentTime: new Date().toISOString(),
      system: false,
    });

    console.log("Broadcasting chat message:", {
      type: "chat",
      sender: newMessage.sender,
      content_type: message.content_type,
      content: newMessage.content,
      sentTime: newMessage.sentTime,
      system: newMessage.system,
    });
    broadcastToRoom({
      type: "chat",
      sender: newMessage.sender,
      content_type: message.content_type,
      content: newMessage.content,
      sentTime: newMessage.sentTime,
      system: newMessage.system,
    });

    try {
      await newMessage.save();
      console.log(`message saved: ${newMessage.sender}: ${newMessage.content}`);
    } catch (error) {
      console.error("message save error:", error);
    }
  } else if (message.type === "game") {
    if (message.subtype === "cards") {
      gameState.cards = message.cards;
      broadcastToRoom({
        sender: "System",
        type: "game",
        subtype: "cards",
        cards: gameState.cards,
        system: true,
      });
    } else if (message.subtype === "score") {
      gameState.scores = message.scores;
      if (message.winner) {
        gameState.winner = message.winner;
      } else {
        gameState.roundWin = message.roundWin;
      }
      broadcastToRoom({
        sender: "System",
        type: "game",
        subtype: "score",
        scores: gameState.scores,
        winner: gameState.winner,
        roundWin: gameState.roundWin,
        countdown: 5,
        expression: message.expression, // 广播答案
        emoji: "🎉", // 广播表情
        system: true,
      });
    } else if (message.subtype === "new_round") {
      gameState.cards = [];
      gameState.cardChangeRequest = null; // 清空更换卡牌请求
      gameState.agreedUsers = []; // 清空同意用户列表
      broadcastToRoom({
        sender: "System",
        type: "game",
        subtype: "new_round",
        system: true,
      });
    } else if (message.subtype === "request_card_change") {
      if (!message.agreedUser) {
        // 发起更换卡牌请求
        gameState.cardChangeRequest = message.requester;
        gameState.agreedUsers = [message.requester]; // 发起者默认同意
      } else {
        // 其他用户同意更换
        if (!gameState.agreedUsers.includes(message.agreedUser)) {
          gameState.agreedUsers.push(message.agreedUser);
        }
      }
      broadcastToRoom({
        sender: "System",
        type: "game",
        subtype: "request_card_change",
        requester: gameState.cardChangeRequest,
        agreedUsers: gameState.agreedUsers,
        system: true,
      });

      const allUsers = Object.keys(users)
        .map((uuid) => users[uuid].username)
        .filter((username) => username);
      if (gameState.agreedUsers.length === allUsers.length) {
        // 所有用户同意，触发更换卡牌
        broadcastToRoom({
          sender: "System",
          type: "game",
          subtype: "new_round",
          system: true,
        });

        gameState.cardChangeRequest = null;
        gameState.agreedUsers = [];
        gameState.cards = []; // 清空卡牌，触发前端生成新卡牌
      }
    }
  }
}

async function handleClose(connection) {
  const uuid = connection.uuid;
  const username = users[uuid]?.username;

  if (username) {
    console.log(`User ${username} disconnected`);
    delete gameState.scores[username];

    if (gameState.cardChangeRequest === username) {
      gameState.cardChangeRequest = null;
      gameState.agreedUsers = [];
      broadcastToRoom({
        sender: username,
        type: "game",
        subtype: "request_card_change",
        requester: null,
        agreedUsers: [],
        system: false,
      });
    }

    broadcastToRoom({
      sender: "System",
      type: "game",
      subtype: "score",
      scores: gameState.scores,
      winner: gameState.winner,
      system: true,
    });
  }
  delete connections[uuid];
  delete users[uuid];
  broadcastUserList();
}

wsServer.on("connection", (connection, request) => {
  const connectionId = uuidv4();
  connection.uuid = connectionId;
  connections[connectionId] = connection;
  users[connectionId] = { roomUUID: DEFAULT_ROOM_UUID };
  const { username } = url.parse(request.url, true).query;

  if (username) {
    users[connectionId].username = username;
    console.log(`user ${username} connect successfully`);
    broadcastUserList(); // broadcast the userlist
    getChatHistory().then((history) => {
      connection.send(JSON.stringify({ type: "history", messages: history }));
    });
  }

  console.log(`New connection: ${connectionId}`);

  broadcastUserList();

  if (gameState.cards.length > 0) {
    connection.send(
      JSON.stringify({
        sender: "System",
        type: "game",
        subtype: "cards",
        cards: gameState.cards,
        system: true,
      })
    );
  }
  if (gameState.scores) {
    connection.send(
      gameState.winner
        ? JSON.stringify({
            sender: "System",
            type: "game",
            subtype: "score",
            scores: gameState.scores,
            winner: gameState.winner,
            system: true,
          })
        : JSON.stringify({
            sender: "System",
            type: "game",
            subtype: "score",
            scores: gameState.scores,
            roundWin: gameState.roundWin,
            system: true,
          })
    );
  }

  connection.on("message", (message) => {
    handleMessage(message.toString(), connection);
  });

  connection.on("close", () => {
    handleClose(connection);
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

