export const setupSocket = (io) => {
    io.on('connection', (socket) => {
      console.log(`[Connect] User ID: ${socket.id}`);
  
      // 再生リクエスト受信
      // data = { filename: "music.wav", startTime: 65 }
      socket.on('request-play', (data) => {
        console.log(`[Request] ${data.filename} (Start: ${data.startTime}s)`);
        
        // 全員（主にPC）へ通知
        io.emit('play-trigger', data);
      });
  
      socket.on('disconnect', () => {
        // 切断時のログ（必要なら）
        // console.log('User disconnected');
      });
    });
  };