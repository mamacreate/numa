export const setupSocket = (io) => {
    io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);
  
      // スマホからのリクエスト受信処理
      socket.on('request-play', (data) => {
        console.log(`[Request] Playing: ${data.filename}`);
        
        // 全員（PC画面）へ通知
        io.emit('play-trigger', data);
      });
  
      socket.on('disconnect', () => {
        console.log('User disconnected');
      });
    });
  };