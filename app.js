const net = require('net');
const http = require('http');

const port = parseInt(process.env.PORT) || 3000;
const host = '127.0.0.1';
const sockets = [];

const httpServer = http.createServer((request, response) => {
    const ipAddress = request.connection.localAddress;
    response.setHeader('Content-Type', 'text/plain');
    response.end(ipAddress);
});
httpServer.listen(port, () => {
    console.log('HTTP Server is running on port ' + port + '.');
})
setTimeout(createTcpServer, 3000);

function createTcpServer() {
    httpServer.close();
    const tcpServer = net.createServer();
    tcpServer.listen(port,() => {
        console.log('TCP Server is running on port ' + port + '.');
    });
    tcpServer.on('connection', function(socket) {
        // socket.setEncoding('binary');
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
                console.log(object)
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
}
