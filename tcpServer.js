const net = require('net');

const port = (process.env && process.env.PORT) ? parseInt(process.env.PORT) : 8080;
console.log('port: ' + port);
const host = '0.0.0.0';
const players = [];
// const pack = require('./sizeOf.js');
// pack.sayHi('Niki');

createTcpServer();

function createTcpServer() {
    const tcpServer = net.createServer();
    tcpServer.listen(port, host, () => {
        console.log('TCP Server is running on port ' + port + '.');
    });
    tcpServer.on('connection', function (socket) {
        const player = {socket, generationId: false, ship: {}};
        players.push(player);
        socket.setNoDelay(true);

        console.log('CONNECTED: ' + socket.remoteAddress);
        console.log('players amount: ' + players.length);

        let data = '';
        socket.on('data', function (bytes) {
            data += bytes;
            if (bytes.includes('}')) {
                const packageLength = data.indexOf('}');
                if (packageLength !== -1) {
                    handleData(player, data.substring(0, packageLength + 1));
                    data = data.substring(packageLength + 1);
                }

            }
        });

        const handleDisconnect = () => {
            let index = players.findIndex(p => {
                return p.generationId === player.generationId || (
                    p.socket.remoteAddress === socket.remoteAddress &&
                    p.socket.remotePort === socket.remotePort);
            })
            if (index !== -1) {players.splice(index, 1);}
            console.log('players amount: ' + players.length);
        }

        socket.on('error', handleDisconnect);
        socket.on('close', handleDisconnect);
    });
}


function handleData(player, data) {
    try {
        const dataPackage = JSON.parse(data);
        console.log(data);
        if (dataPackage.hasOwnProperty('playerId')) { // request other player data
            const requestedPlayer = players.find(p => p.generationId === dataPackage.playerId);
            if (requestedPlayer) {
                player.socket.write(JSON.stringify({
                    shipId: requestedPlayer.ship.shipId,
                    x: requestedPlayer.ship.state.x,
                    y: requestedPlayer.ship.state.y,
                    generationId: requestedPlayer.generationId
                }));
            }
        }
        else {
            players.forEach(p => {
                const s = p.socket;
                if (
                    s.remoteAddress !== player.socket.remoteAddress ||
                    s.remotePort !== player.socket.remotePort
                ) {
                    s.write(data);
                }
            });
            if (dataPackage.hasOwnProperty('aX')) { // state package
                player.ship.state = dataPackage;
            }
            else if (dataPackage.hasOwnProperty('shipId')) { // initialising package
                player.generationId = dataPackage.generationId;
                player.ship = {
                    shipId: dataPackage.shipId,
                    state: {}
                };
            }
        }
    } catch (ignore) {
        console.log('parsing error: ' + data);
    }
}
