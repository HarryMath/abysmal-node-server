const net = require('dgram');
const port = (process.env && process.env.PORT) ? parseInt(process.env.PORT) : 8080;
const players = [];
let lastPackageTime = 0;

createUdpServer();

function createUdpServer() {
    const server = net.createSocket('udp4');
    server.on('listening', () => {
        let address = server.address();
        console.log('UPD Server ' + address.address + ' is running on port ' + address.port + '.');
    });
    server.on('message', (message, info) => {
        handleData(message, info, server);
    });
    server.on('connect', function (socket) {
        console.log('connect: ' + socket);
    });
    server.bind(port);
}

function handleData(data, playerInfo, server) {
    try {
        const dataPackage = JSON.parse(data);
        let player, info;
        let playerFound = false;
        for (let i = 0; i < players.length; i++) {
            player = players[i];
            info = player.info;
            if (info.address === playerInfo.address && info.port === playerInfo.port) {
                if (dataPackage.hasOwnProperty('aX') && dataPackage.hasOwnProperty('h')) {
                    player.ship = dataPackage;
                    playerFound = true;
                }
            } else if (player.ship.hasOwnProperty('t')) {
                if (lastPackageTime - player.ship.t < 10000) {
                    server.send(data, info.port, info.address);
                } else {
                    console.log(`removed player: ${info.address}:${info.port}`);
                    players.splice(i--, 1);
                }
            }
        }
        if (dataPackage.hasOwnProperty('t')) {
            if (!playerFound && dataPackage.hasOwnProperty('aX')) {
                console.log(`new player: ${playerInfo.address}:${playerInfo.port}`);
                players.push({
                    info: playerInfo,
                    ship: dataPackage
                });
            } else {
                lastPackageTime = dataPackage.t;
            }
        }
    } catch (ignore) {
        console.log('parsing error: ' + data);
        console.log(ignore);
    }
}
