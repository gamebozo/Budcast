import { io } from 'socket.io-client';

const host = io('http://localhost:4000', { transports: ['websocket'] });

host.on('connect', () => {
  host.emit('create_room', { mode: 'video', title: 'Test Room' }, (res) => {
    const roomId = res.roomId;
    console.log('Created room:', roomId);

    const client = io('http://localhost:4000', { transports: ['websocket'] });
    client.on('connect', () => {
      client.emit('join_room', { roomId, name: 'Tester', device: 'AirPods' }, () => {
        console.log('Client joined room');

        client.on('sync_event', (e) => {
          console.log('Client received sync_event:', e);
        });

        setTimeout(() => {
          console.log('Host emitting PLAY...');
          host.emit('host_action', { roomId, action: 'PLAY', currentTime: 0 });
        }, 300);

        setTimeout(() => {
          console.log('Host emitting SEEK...');
          host.emit('host_action', { roomId, action: 'SEEK', currentTime: 10 });
        }, 800);

        setTimeout(() => {
          console.log('Host emitting PAUSE...');
          host.emit('host_action', { roomId, action: 'PAUSE', currentTime: 10 });
        }, 1300);

        setTimeout(() => {
          host.disconnect();
          client.disconnect();
          process.exit(0);
        }, 1800);
      });
    });
  });
});
