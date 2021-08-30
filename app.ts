const net = require('net');
import {Socket} from "net";

const port = 7070;
const host = '127.0.0.1';
const sockets: Socket[] = [];

const server = net.createServer();
server.listen(port, host, () => {
    console.log('TCP Server is running on port ' + port + '.');
});

server.on('connection', function(socket: any): void {
    // socket.setEncoding('binary');
    console.log('CONNECTED: ' + socket.remoteAddress + ':' + socket.remotePort);
    sockets.push(socket);
    let data = '';
    socket.on('data', function(bytes: any): void {
        data += bytes;
        if (bytes.includes('}')) {
            handleData(data);
            data = data.split('}')[1];
        }
    });

    socket.on('close', () => {
        let index = sockets.findIndex(function(o: any) {
            return o.remoteAddress === socket.remoteAddress && o.remotePort === socket.remotePort;
        })
        if (index !== -1) sockets.splice(index, 1);
        // console.log('CLOSED: ' + socket.remoteAddress + ' ' + socket.remotePort);
    });
});

function handleData(data: string) {
    try {
        const object = JSON.parse(data);
        // console.log(object)
        sockets.forEach(sock => {
            sock.write(data);
        });
    } catch (ignore) {
        console.log('error: ' + data);
        console.log(ignore);
    }
}
