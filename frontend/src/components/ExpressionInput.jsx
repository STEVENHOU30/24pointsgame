import React, { useState, useEffect } from "react";
import "../GameRoom.css";

function ExpressionInput({
  cards,
  usedCards,
  setUsedCards,
  onExpressionResult,
  clearInput,
  setClearInput,
}) {
  const [expression, setExpression] = useState("");
  const [usedNumbers, setUsedNumbers] = useState([]); // 记录表达式中使用的数字
  const [error, setError] = useState("");

  // 清空输入框
  useEffect(() => {
    if (clearInput) {
      setExpression("");
      setUsedNumbers([]);
      setClearInput(false);
    }
  }, [clearInput, setClearInput]);

  // 将卡牌值转换为数字（A=1，其他按面值）
  const getCardValue = (number) => {
    return number === "A" ? 1 : parseInt(number);
  };

  // 点击卡牌时添加数字到表达式
  const handleCardClick = (index, card) => {
    if (usedCards[index]) return; // 如果卡牌已使用，不执行任何操作

    const value = getCardValue(card.number);
    setExpression((prev) => (prev ? `${prev} ${value}` : value.toString()));
    setUsedNumbers((prev) => [...prev, value]);

    // 更新已使用状态
    const newUsedCards = [...usedCards];
    newUsedCards[index] = true;
    setUsedCards(newUsedCards);
  };

  const handleOperatorClick = (operator) => {
    setExpression((prev) => (prev ? `${prev} ${operator}` : operator));
  };

  const calculateResult = (expr) => {
    try {
      const processedExpr = expr.replace(/÷/g, "/");
      if (!processedExpr.match(/^[0-9+\-*/() ]+$/)) {
        throw new Error("表达式包含非法字符");
      }

      const brackets = processedExpr.match(/[()]/g) || [];
      const openBrackets = brackets.filter((b) => b === "(").length;
      const closeBrackets = brackets.filter((b) => b === ")").length;
      if (openBrackets !== closeBrackets) {
        throw new Error("括号不匹配");
      }

      const result = eval(processedExpr);
      if (isNaN(result) || !isFinite(result)) {
        throw new Error("计算结果无效");
      }

      setError("");
      return result;
    } catch (err) {
      setError(err.message || "计算错误");
      return null;
    }
  };

  const handleSubmit = () => {
    if (!expression) {
      setError("表达式不能为空");
      return;
    }

    // 检查是否每张牌都使用了
    const allCardsUsed = usedCards.every((used) => used);
    if (!allCardsUsed) {
      setError("Error: You must use all cards!");
      return;
    }

    // 检查输入的数字是否与卡牌点数匹配（无重复、无遗漏）
    const cardValues = cards
      .map((card) => getCardValue(card.number))
      .sort((a, b) => a - b);
    const sortedUsedNumbers = [...usedNumbers].sort((a, b) => a - b);

    if (
      usedNumbers.length !== cardValues.length ||
      !cardValues.every((num, idx) => num === sortedUsedNumbers[idx])
    ) {
      setError("Error: Input must use each card exactly once!");
      return;
    }

    const result = calculateResult(expression);
    if (result !== null) {
      onExpressionResult(result, expression, usedNumbers);
    }
  };

  return (
    <div className="input-container">
      <div className="calculator-section">
        <h3>Expression Input</h3>
        <div className="card-container">
          {cards.map((card, index) => (
            <div
              key={index}
              className="card"
              onClick={() => handleCardClick(index, card)}
              style={{
                width: "100px",
                height: "120px",
                border: "1px solid black",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                backgroundColor: usedCards[index] ? "#d3d3d3" : "white",
                pointerEvents: usedCards[index] ? "none" : "auto",
              }}
            >
              <span
                className={`card-value ${
                  card.suit === "hearts" || card.suit === "diamonds"
                    ? "red"
                    : "black"
                }`}
              >
                {card.number}
              </span>
              <span
                className={`card-suit ${
                  card.suit === "hearts" || card.suit === "diamonds"
                    ? "red"
                    : "black"
                }`}
              >
                {card.suit === "hearts"
                  ? "♥"
                  : card.suit === "diamonds"
                  ? "♦"
                  : card.suit === "clubs"
                  ? "♣"
                  : "♠"}
              </span>
            </div>
          ))}
        </div>
        <input
          type="text"
          value={expression}
          readOnly
          className="expression-input"
          placeholder="Click cards and operators to build expression..."
        />
        {error && <p className="error">{error}</p>}
        <div className="operators">
          <button onClick={() => handleOperatorClick("+")}>+</button>
          <button onClick={() => handleOperatorClick("-")}>-</button>
          <button onClick={() => handleOperatorClick("*")}>*</button>
          <button onClick={() => handleOperatorClick("÷")}>÷</button>
          <button onClick={() => handleOperatorClick("(")}>(</button>
          <button onClick={() => handleOperatorClick(")")}>)</button>
          <button onClick={() => {
            setExpression("");
            setUsedNumbers([]);
            setUsedCards(new Array(cards.length).fill(false));
          }}>
            Clear
          </button>
          <button onClick={handleSubmit} className="submit-btn">
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExpressionInput;