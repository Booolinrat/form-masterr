// Frontend (React Example)
// A basic implementation of the homepage with options to generate or enter a code

import React, { useState } from 'react';
import './app.css'; // Importing the CSS file

function App() {
  const [code, setCode] = useState("");
  const [isGenerated, setIsGenerated] = useState(false);

  const generateCode = async () => {
    const response = await fetch("/api/generate", { method: "POST" });
    const data = await response.json();
    setCode(data.code);
    setIsGenerated(true);
  };

  const joinForum = () => {
    if (code.trim() === "") {
      alert("Please enter a valid code.");
      return;
    }
    window.location.href = `/forum/${code}`;
  };

  return (
    <div className="app-container">
      <h1 className="app-title">Welcome to the Question Forum</h1>
      {!isGenerated ? (
        <div className="form-container">
          <button className="button" onClick={generateCode}>Generate a Code</button>
          <br />
          <input
            className="input"
            type="text"
            placeholder="Enter a Code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button className="button" onClick={joinForum}>Enter</button>
        </div>
      ) : (
        <div className="generated-container">
          <h2 className="generated-code">Your Code: {code}</h2>
          <p className="instructions">Share this code with others to submit questions.</p>
          <button className="button" onClick={() => joinForum(code)}>Go to Forum</button>
        </div>
      )}
    </div>
  );
}

export default App;

// Backend (Node.js with Express)
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");

app.use(cors());
app.use(bodyParser.json());

// Simulating a database
const forums = {};

// Generate a new code
app.post("/api/generate", (req, res) => {
  const code = uuidv4().slice(0, 6); // Shorten UUID to 6 characters
  forums[code] = [];
  res.json({ code });
});

// Submit a question
app.post("/api/submit", (req, res) => {
  const { code, question } = req.body;
  if (!forums[code]) {
    return res.status(404).json({ error: "Forum not found." });
  }
  forums[code].push({ question, timestamp: Date.now() });
  res.status(200).json({ success: true });
});

// Get all questions for a code
app.get("/api/questions/:code", (req, res) => {
  const code = req.params.code;
  if (!forums[code]) {
    return res.status(404).json({ error: "Forum not found." });
  }
  res.json(forums[code]);
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));