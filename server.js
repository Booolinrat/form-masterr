const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors'); // Import cors
const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const fs = require('fs');
const path = require('path');

// Enable CORS for all origins
app.use(cors());  // Allow all origins by default

// Load the blacklist file into an array
const blacklist = fs.readFileSync(path.join(__dirname, 'blacklist.txt'), 'utf8')
    .split('\n')
    .map(word => word.trim().toLowerCase())
    .filter(word => word); // Remove empty lines

// Store session data
let sessions = {}; // This will hold the session data, including students

app.use(express.static('public')); // Serve static files from 'public' folder

// Handle the generation of a new session code
app.post('/generate-code', (req, res) => {
    const code = generateSessionCode(); // Implement your code generation logic
    sessions[code] = {
        teacher: null,   // Teacher will join later
        students: [],    // Array to store students for this sessio
        questions: []    // Array to store questions for this session
    };
    res.json({ code });
});

// Generate a random session code (you can improve this as per your needs)
function generateSessionCode() {
    return Math.random().toString(36).substring(2, 8); // Random 6-character code
}

// Socket event: Teacher joins a session
io.on('connection', (socket) => {
    console.log('a user connected');

    // Check if session code is valid
    socket.on('check-session', (code, callback) => {
        // Check if the session exists
        if (sessions[code]) {
            callback(true);  // Valid session code
        } else {
            callback(false); // Invalid session code
        }
    });

    // When a teacher or student joins a session
    socket.on('join-session', (code) => {
        if (!sessions[code]) {
            console.log('Session not found');
            return;
        }

        if (!sessions[code].teacher) {
            sessions[code].teacher = socket; // Assign teacher to the session
            console.log(`Teacher joined session: ${code}`);
        } else {
            sessions[code].students.push(socket); // Add student to the session
            console.log(`Student joined session: ${code}`);
        }
    });

    // Handle receiving and broadcasting student questions
    socket.on('submit-question', (code, question) => {
        if (!sessions[code]) {
            console.log('Session not found');
            return;
        }

        // Filter inappropriate words
        const isBlacklisted = blacklist.some(word => 
            question.toLowerCase().includes(word)
        );

        if (isBlacklisted) {
            console.log(`Blocked inappropriate question: ${question}`);
            return; // Do not broadcast or store the question
        }

        // Generate a unique ID for each question
        const questionId = `question-${Date.now()}`;
        const questionData = { id: questionId, text: question };

        // Add the question to the session's question list
        sessions[code].questions.push(questionData);

        // Broadcast the question to the teacher
        io.to(sessions[code].teacher.id).emit('new-question', questionData);  // Updated event name
        console.log(`Question submitted: ${question}`);
    });

    // Handle question deletion from teacher
    socket.on('delete-question', (code, questionId) => {
        if (!sessions[code]) {
            console.log('Session not found');
            return;
        }

        const questionIndex = sessions[code].questions.findIndex(q => q.id === questionId);
        if (questionIndex !== -1) {
            // Remove the question from the list
            const question = sessions[code].questions.splice(questionIndex, 1)[0];
            console.log(`Question removed: ${question.text}`);

            // Broadcast the removal to the teacher
            io.to(sessions[code].teacher.id).emit('remove-question', questionId);
        }
    });

    // Handle disconnect event
    socket.on('disconnect', () => {
        console.log('a user disconnected');
        // Cleanup when user disconnects (optional)
        for (let code in sessions) {
            sessions[code].students = sessions[code].students.filter(s => s !== socket);
            if (sessions[code].teacher === socket) {
                sessions[code].teacher = null;
            }
        }
    });
});

// Start the server
server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});


