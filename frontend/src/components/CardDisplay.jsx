import React, { useEffect } from "react";

function CardDisplay({
  cards,
  setCards,
  usedCards,
  setUsedCards,
  sendJsonMessage,
  readyState,
  generateNewCardsTrigger,
  onRequestCardChange,
  cardChangeRequest, // 新增 prop：当前请求的发起者
  username, // 新增 prop：当前用户的 username
  gameStarted
}) {
  // 生成随机卡牌
  const generateRandomCards = () => {
    console.log("Generating new cards");
    const suits = ["hearts", "diamonds", "clubs", "spades"];
    const numbers = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
    const usedCardsSet = new Set();
    const newCards = [];

    while (newCards.length < 4) {
      const suit = suits[Math.floor(Math.random() * suits.length)];
      const number = numbers[Math.floor(Math.random() * numbers.length)];
      const cardKey = `${suit}-${number}`;

      if (!usedCardsSet.has(cardKey)) {
        usedCardsSet.add(cardKey);
        newCards.push({ suit, number });
      }
    }

    console.log("New cards generated:", newCards);
    setCards(newCards);
    setUsedCards(new Array(newCards.length).fill(false));
    if (readyState === WebSocket.OPEN) {
      sendJsonMessage({ type: "game", subtype: "cards", cards: newCards });
    }
  };

  // 初始生成卡牌
  useEffect(() => {
    if (cards.length === 0 && readyState === WebSocket.OPEN) {
      console.log("Initial card generation");
      generateRandomCards();
    }
  }, [readyState]);

  // 外部触发生成新卡牌
  useEffect(() => {
    console.log("generateNewCardsTrigger changed:", generateNewCardsTrigger);
    generateRandomCards();
  }, [generateNewCardsTrigger]);

  return (
    <div className="card-display">
      <button
        onClick={() => onRequestCardChange()}
        disabled={cardChangeRequest === username || !gameStarted} // 游戏未开始时禁用
        style={{ opacity: (cardChangeRequest === username || !gameStarted) ? 0.5 : 1 }}
      >
        {cardChangeRequest === username ? "Request Pending..." : "Request to Change Cards"}
      </button>
    </div>
  );
}

export default CardDisplay;
