const net = require('net');

const port = parseInt(process.env.PORT) || 80;
const host = '127.0.0.1';
const sockets = [];

const tcpServer = net.createServer();
tcpServer.listen(port, host, () => {
    console.log('TCP Server is running on port ' + port + '.');
});

tcpServer.on('connection', function(socket) {
    socket.setEncoding('binary');
    console.log('CONNECTED: ' + socket.remoteAddress + ':' + socket.remotePort);
    sockets.push(socket);
    let data = '';
    socket.on('data', function(bytes) {
        data += bytes;
        if (bytes.includes('}')) {
            handleData(data);
            data = data.split('}')[1];
        }
    });

    const handleData = (data) => {
        try {
            const object = JSON.parse(data);
            sockets.forEach(s => {
                if (s.remoteAddress !== socket.remoteAddress || s.remotePort !== socket.remotePort) {
                    s.write(data);
                }
            });
        } catch (ignore) {
            console.log('error: ' + data);
            console.log(ignore);
        }
    }

    const handleDisconnect = () => {
        let index = sockets.findIndex(function(o) {
            return o.remoteAddress === socket.remoteAddress && o.remotePort === socket.remotePort;
        })
        if (index !== -1) sockets.splice(index, 1);
        console.log('players amount: ' + sockets.length);
    }

    socket.on('error', handleDisconnect);
    socket.on('close', handleDisconnect);
});
