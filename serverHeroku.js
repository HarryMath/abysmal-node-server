const net = require('net');
const http = require('http');

const port = (process.env && process.env.PORT) ? parseInt(process.env.PORT) : 8080;
console.log('port: ' + port);
const host = '0.0.0.0';
const sockets = [];
const httpServer = http.createServer(((req, res) => {
    res.writeHead(200);
    res.end('Hello');
}));
httpServer.listen(port);

setTimeout(createTcpServer, 5000);

function createTcpServer() {
    httpServer.close();
    const tcpServer = net.createServer();
    tcpServer.listen(port, host, () => {
        console.log('TCP Server is running on port ' + port + '.');
    });
    tcpServer.on('connection', function (socket) {
        console.log('CONNECTED: ' + socket.remoteAddress);
        console.log('players amount: ' + sockets.length);
        sockets.push(socket);
        let data = '';
        socket.on('data', function (bytes) {
            data += bytes;
            if (bytes.includes('}')) {
                const packageLength = data.indexOf('}');
                if (packageLength !== -1) {
                    handleData(data.substring(0, packageLength + 1));
                    data = data.split('}')[1];
                    socket.write("oki");
                }

            }
        });

        const handleData = (data) => {
            try {
                const object = JSON.parse(data);
                // console.log('size of data is: ' + sizeOf(object));
                sockets.forEach(s => {
                    if (s.remoteAddress !== socket.remoteAddress || s.remotePort !== socket.remotePort) {
                        s.write(data);
                    }
                });
            } catch (ignore) {
                console.log('parsing error: ' + data);
            }
        }

        const handleDisconnect = () => {
            let index = sockets.findIndex(function (o) {
                return o.remoteAddress === socket.remoteAddress && o.remotePort === socket.remotePort;
            })
            if (index !== -1) {sockets.splice(index, 1);}
            console.log('players amount: ' + sockets.length);
        }

        socket.on('error', error => {
            console.log('error connection on ' + socket.remoteAddress + ':');
            console.log(error);
            handleDisconnect();
        });
        socket.on('close', () => {
            console.log('closed connection on ' + socket.remoteAddress);
            handleDisconnect();
        });
    });
}
