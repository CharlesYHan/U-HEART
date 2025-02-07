import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { dirname } from 'path';

const __dirname = dirname(require.main.filename);

interface RoomEvent {
    roomId: string;
    offer?: RTCSessionDescriptionInit;
    answer?: RTCSessionDescriptionInit;
    candidate?: RTCIceCandidate;
}

const app = express();
const server = createServer(app);
const io = new Server(server, {
    cors: { origin: '*' }
});

// 提供静态文件
app.use(express.static(path.join(__dirname, '../public')));

// 存储房间和用户信息
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('用户连接:', socket.id);

    // 加入房间
    socket.on('join-room', (roomId: string) => {
        socket.join(roomId);
        
        const room = rooms.get(roomId) || new Set();
        room.add(socket.id);
        rooms.set(roomId, room);

        // 通知房间内其他用户
        socket.to(roomId).emit('user-connected', socket.id);
    });

    // 处理通话信令
    socket.on('offer', ({ offer, roomId }: RoomEvent) => {
        socket.to(roomId).emit('offer', offer);
    });

    socket.on('answer', ({ answer, roomId }: RoomEvent) => {
        socket.to(roomId).emit('answer', answer);
    });

    socket.on('ice-candidate', ({ candidate, roomId }: RoomEvent) => {
        socket.to(roomId).emit('ice-candidate', candidate);
    });

    // 处理断开连接
    socket.on('disconnect', () => {
        // 从所有房间中移除用户
        rooms.forEach((users, roomId) => {
            if (users.has(socket.id)) {
                users.delete(socket.id);
                if (users.size === 0) {
                    rooms.delete(roomId);
                }
                io.to(roomId).emit('user-disconnected', socket.id);
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
}); 