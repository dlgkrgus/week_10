const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: '파일이 업로드되지 않았습니다.' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, imageUrl });
});

// 방 정보 관리 (enteredNicks 배열을 추가해 중복 입장 메시지 방지)
const rooms = {};

io.on('connection', (socket) => {
  console.log('사용자가 연결되었습니다:', socket.id);

  socket.on('get_rooms', () => {
    socket.emit('room_list', rooms);
  });

  socket.on('create_room', ({ roomName, category }) => {
    if (!roomName || roomName.trim() === '') return;
    if (!rooms[roomName]) {
      rooms[roomName] = {
        status: '찾는 중',
        category: category || '기타',
        host: socket.id,
        users: [],
        messages: [],
        enteredNicks: [] // 🌟 중복 입장 체크용 닉네임 목록
      };
    }
    io.emit('room_list', rooms);
  });

  socket.on('join_room', ({ room, nickname }) => {
    socket.join(room);
    console.log(`${nickname}님이 ${room} 방에 입장했습니다.`);

    if (rooms[room]) {
      const existingUser = rooms[room].users.find(u => u.id === socket.id);
      if (!existingUser) {
        rooms[room].users.push({ id: socket.id, nickname });
      }

      const isHost = rooms[room] && rooms[room].host === socket.id;
      
      socket.emit('room_info', {
        status: rooms[room].status,
        isHost: isHost
      });

      // 기존 대화 내역 전송
      socket.emit('chat_history', rooms[room].messages);

      io.to(room).emit('update_users', rooms[room].users);

      // 🌟 해당 닉네임으로 최초 입장한 경우에만 입장 메시지 생성
      if (!rooms[room].enteredNicks.includes(nickname)) {
        rooms[room].enteredNicks.push(nickname);

        const time = new Date().toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: true });
        const joinMsg = {
          sender: '시스템',
          text: `${nickname}님이 입장하셨습니다.`,
          time: time
        };

        rooms[room].messages.push(joinMsg);
        io.to(room).emit('message', joinMsg);
      }
    }
  });

  socket.on('send_message', ({ room, nickname, message, imageUrl }) => {
    if (!message && !imageUrl) return;
    
    const time = new Date().toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: true });
    const msgData = {
      sender: nickname,
      text: message,
      imageUrl: imageUrl,
      time: time
    };

    if (rooms[room]) {
      rooms[room].messages.push(msgData);
    }

    io.to(room).emit('message', msgData);
  });

  socket.on('complete_room', (room) => {
    if (rooms[room]) {
      if (rooms[room].host === socket.id) {
        rooms[room].status = '주인 완료';
        io.to(room).emit('room_status', rooms[room].status);

        const time = new Date().toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: true });
        const completeMsg = {
          sender: '시스템',
          text: '방장(신고자)에 의해 분실물이 해결 완료 처리되었습니다.',
          time: time
        };

        rooms[room].messages.push(completeMsg);
        io.to(room).emit('message', completeMsg);
        io.emit('room_list', rooms);
      } else {
        socket.emit('message', {
          sender: '시스템',
          text: '방장(방 개설자)만 완료 처리할 수 있습니다.'
        });
      }
    }
  });

  socket.on('disconnect', () => {
    console.log('사용자가 연결을 해제했습니다:', socket.id);
    Object.keys(rooms).forEach(room => {
      const roomData = rooms[room];
      const index = roomData.users.findIndex(u => u.id === socket.id);
      if (index !== -1) {
        roomData.users.splice(index, 1);
        io.to(room).emit('update_users', roomData.users);
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});