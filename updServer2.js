const net = require('dgram');
const port = (process.env && process.env.PORT) ? parseInt(process.env.PORT) : 8080;
const players = [];
let lastPackageTime = 0;

createUdpServer();

function createUdpServer() {
    const server = net.createSocket('udp4');
    server.on('listening', () => {
        let address = server.address();
        console.log(`UPD Server ${address.address} is running on port ${address.port}.`);
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
        let player, info;
        let playerFound = false;
        for (let i = 0; i < players.length; i++) {
            player = players[i];
            info = player.info;
            if (info.address === playerInfo.address && info.port === playerInfo.port) {
                // if it is current player just update it's state
                if (data.includes('state[', 0)) {
                    player.update(data);
                    playerFound = true;
                    lastPackageTime = player.timestamp;
                }
            } else {
                if (lastPackageTime - player.timestamp < 10000) {
                    server.send(data, info.port, info.address);
                } else {
                    console.log(`removed player: ${info.address}:${info.port}`);
                    players.splice(i--, 1);
                }
            }
        }
        if (data.includes('state[', 0)) {
            if (!playerFound) {
                console.log(`new player: ${playerInfo.address}:${playerInfo.port}`);
                players.push(new Player(data, playerInfo));
            }
        }
    } catch (ignore) {
        console.log(`parsing error: ${data}`);
        console.log(ignore);
    }
}

class Player {

    constructor(dataPackage, info) {
        this.update(dataPackage);
        this.info = info;
    }

    update(dataPackage) {
        const data = dataPackage
            .subarray(6, dataPackage.length - 1)
            .toString().split(',');
        this.timestamp = parseInt(data[11]);
    }
}
