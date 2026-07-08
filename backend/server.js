const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const CryptoJS = require('crypto-js');
const { encryptData, decryptData } = require('./cryptoHelper');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const SECRET_KEY = process.env.SOCKET_ENCRYPTION_KEY || 'default-fallback-key-32chars-for-aes';
const SECRET_CHAT_KEY = "CollabZ_Secure_Vault_2026";

// In-memory data stores for Meet module
const cachedFiles = new Map();       // fileId -> { roomId, fileId, fileName, fileType, fileSize, senderName, totalChunks, chunks: [] }
const explainModeActive = new Map(); // roomId -> { isExplainMode, speakerId, speakerName }

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // --- Meet Module Socket Handlers ---
    socket.on('join-meeting', (data) => {
        const { roomId, userName } = data;
        socket.join(roomId);
        console.log(`[MEET] User ${userName} (${socket.id}) joined meeting: ${roomId}`);
        
        // Notify others
        socket.to(roomId).emit('user-joined-meeting', { userId: socket.id, userName });
        
        // Send existing explain mode state
        if (explainModeActive.has(roomId)) {
            socket.emit('explain-mode-changed', explainModeActive.get(roomId));
        }

        // Send existing file list
        const filesInRoom = Array.from(cachedFiles.values())
            .filter(f => f.roomId === roomId)
            .map(f => ({
                fileId: f.fileId,
                fileName: f.fileName,
                fileType: f.fileType,
                fileSize: f.fileSize,
                senderName: f.senderName,
                totalChunks: f.totalChunks,
                isComplete: f.chunks.filter(Boolean).length === f.totalChunks
            }));
        socket.emit('file-list', filesInRoom);
    });

    socket.on('leave-meeting', (data) => {
        const { roomId, userName } = data;
        socket.leave(roomId);
        console.log(`[MEET] User ${userName} (${socket.id}) left meeting: ${roomId}`);
        socket.to(roomId).emit('user-left-meeting', { userId: socket.id, userName });
    });

    socket.on('explain-mode-toggle', (data) => {
        const { roomId, isExplainMode, speakerName } = data;
        explainModeActive.set(roomId, { isExplainMode, speakerId: socket.id, speakerName });
        console.log(`[MEET] Explain Mode in room ${roomId} set to ${isExplainMode} by ${speakerName}`);
        socket.to(roomId).emit('explain-mode-changed', { isExplainMode, speakerId: socket.id, speakerName });
    });

    socket.on('file-share-chunk', (data) => {
        const { roomId, fileId, fileName, fileType, fileSize, chunkIndex, totalChunks, chunkData, senderName } = data;
        
        if (!cachedFiles.has(fileId)) {
            cachedFiles.set(fileId, {
                roomId,
                fileId,
                fileName,
                fileType,
                fileSize,
                senderName,
                totalChunks,
                chunks: new Array(totalChunks)
            });
        }
        
        const fileRecord = cachedFiles.get(fileId);
        fileRecord.chunks[chunkIndex] = chunkData;
        
        // Broadcast the chunk to everyone else in the room
        socket.to(roomId).emit('receive-file-chunk', {
            fileId,
            chunkIndex,
            totalChunks,
            chunkData,
            fileName,
            fileType,
            fileSize,
            senderName
        });
        
        // Check if file is complete
        const completedChunks = fileRecord.chunks.filter(Boolean).length;
        if (completedChunks === totalChunks) {
            console.log(`[FILE] File ${fileName} (${fileSize} bytes) fully received and cached for room ${roomId}`);
            io.in(roomId).emit('file-complete', {
                fileId,
                fileName,
                fileType,
                fileSize,
                senderName
            });
        }
    });

    socket.on('request-file-download', (data) => {
        const { fileId } = data;
        const fileRecord = cachedFiles.get(fileId);
        if (fileRecord && fileRecord.chunks.filter(Boolean).length === fileRecord.totalChunks) {
            console.log(`[FILE] Streaming download chunks for file: ${fileRecord.fileName}`);
            fileRecord.chunks.forEach((chunkData, index) => {
                socket.emit('download-file-chunk', {
                    fileId,
                    chunkIndex: index,
                    totalChunks: fileRecord.totalChunks,
                    chunkData
                });
            });
        }
    });

    // Secure OTP Send
    socket.on('send-otp', (encryptedPayload) => {
        try {
            const decryptedString = decryptData(encryptedPayload, SECRET_KEY);
            const { email } = JSON.parse(decryptedString);
            console.log(`[SECURE AUTH] OTP requested for email: ${email}`);

            const response = encryptData(JSON.stringify({ message: 'Verification code sent successfully.' }), SECRET_KEY);
            socket.emit('otp-sent', response);
        } catch (error) {
            console.error('[SECURE AUTH ERROR] send-otp failed:', error.message);
            const errResponse = encryptData(JSON.stringify({ message: 'Encryption error. Failed to send OTP.' }), SECRET_KEY);
            socket.emit('otp-error', errResponse);
        }
    });

    // Secure OTP Verify
    socket.on('verify-otp', (encryptedPayload) => {
        try {
            const decryptedString = decryptData(encryptedPayload, SECRET_KEY);
            const { email, otp } = JSON.parse(decryptedString);
            console.log(`[SECURE AUTH] Verification attempt for: ${email}`);

            if (otp === "241202") {
                const successResponse = encryptData(JSON.stringify({ message: 'Workspace unlocked! Redirecting...' }), SECRET_KEY);
                socket.emit('auth-success', successResponse);
            } else {
                const failResponse = encryptData(JSON.stringify({ message: 'Invalid OTP code. Please enter 241202.' }), SECRET_KEY);
                socket.emit('otp-error', failResponse);
            }
        } catch (error) {
            console.error('[SECURE AUTH ERROR] verify-otp failed:', error.message);
            const errResponse = encryptData(JSON.stringify({ message: 'Encryption error. Verification failed.' }), SECRET_KEY);
            socket.emit('otp-error', errResponse);
        }
    });

    // Encrypted Chat Relay
    socket.on('new-chat-message', (encryptedPayload) => {
        try {
            let decryptedString;
            try {
                // Attempt CryptoJS decryption first (New E2E Chat flow)
                const decryptedBytes = CryptoJS.AES.decrypt(encryptedPayload, SECRET_CHAT_KEY);
                decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);
                if (!decryptedString) throw new Error("Empty decrypted string");
                
                const message = JSON.parse(decryptedString);
                console.log(`[SECURE E2E CHAT] Decrypted message from ${message.user}: "${message.text}"`);
            } catch (cryptoErr) {
                // Fall back to original GCM decryption helper (Legacy/Whiteboard chat flow)
                decryptedString = decryptData(encryptedPayload, SECRET_KEY);
                const message = JSON.parse(decryptedString);
                console.log(`[SECURE CHAT GCM] Decrypted message from ${message.user}: "${message.text}"`);
            }

            // Broadcast the ENCRYPTED payload to other connected clients (End-to-End Transit Security)
            socket.broadcast.emit('receive-chat-message', encryptedPayload);
        } catch (error) {
            console.error('[SECURE CHAT ERROR] Failed to process chat message:', error.message);
        }
    });

    // Encrypted Canvas Draw Stroke Relay (Zero-Knowledge: supports room scope)
    socket.on('draw-stroke', (data) => {
        if (typeof data === 'object' && data.roomId) {
            socket.to(data.roomId).emit('receive-draw-stroke', data.encryptedPayload);
        } else {
            socket.broadcast.emit('receive-draw-stroke', data);
        }
    });

    // --- WebRTC Signaling Handlers ---
    socket.on('join-room', (data) => {
        const { roomId, userName } = data;
        socket.join(roomId);
        console.log(`[SIGNALLING] User ${userName} (${socket.id}) joined room: ${roomId}`);
        socket.to(roomId).emit('user-joined-room', { userId: socket.id, userName });
    });

    socket.on('video-offer', (data) => {
        const { roomId } = data;
        console.log(`[SIGNALLING] forwarding video-offer in room ${roomId}`);
        socket.to(roomId).emit('video-offer', data);
    });

    socket.on('video-answer', (data) => {
        const { roomId } = data;
        console.log(`[SIGNALLING] forwarding video-answer in room ${roomId}`);
        socket.to(roomId).emit('video-answer', data);
    });

    socket.on('new-ice-candidate', (data) => {
        const { roomId } = data;
        console.log(`[SIGNALLING] forwarding new-ice-candidate in room ${roomId}`);
        socket.to(roomId).emit('new-ice-candidate', data);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

server.listen(5000, () => {
    console.log('🚀 Secure Real-Time Server running on port 5000');
});