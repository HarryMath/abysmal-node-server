const udp = require('dgram');
const http = require('http');
const axios = require('axios');
const encoder = require('./encoder');
const mainServer = "https://abysmal-space.herokuapp.com";

const maxTimeout = 10 * 1000; /*  10 s  */
const checkInterval = 60 * 1000; /*  1 min  */

const maxRadarPower = 120;
const maxViewSizes = [
  28 * 1.4,
  28 * 1.9,
  28 * 2.3,
  28,
  28 * 2,
  28 * 2.3,
];

const players = [];
let lastPackageTime = 0;

const seed = 1 + new Date().getTime() % 1000000;
const {udpPort, isFirstServer} = parseArguments();

const httpServer = createHttpServer();
const udpServer = createUdpServer();
const scheduler = setInterval(checkActivity, checkInterval);


function checkActivity() {
  if (isFirstServer || lastPackageTime === 0) {
    return;
  }
  const timeDiff = new Date().getTime() - lastPackageTime;
  if (timeDiff > maxTimeout) {
    console.log(`no active players for ${timeDiff} ms. closing server.`)
    clearInterval(scheduler);
    closeServer();
  }
}

function createHttpServer() {
  const server = http.createServer(((req, res) => {
    let url = req.url;
    console.log(url);
    if (url.startsWith('/players')) {
      url = url.replace('/players', '');
      if (url.startsWith('/amount')) {
        res.writeHead(200);
        res.end(String(players.length));
      } else if (url.replace('/', '') === '') {
        res.writeHead(200);
        res.end(JSON.stringify(players));
      } else {
        res.writeHead(404);
        res.end();
      }
    } else {
      res.writeHead(404);
      res.end();
    }
  }));
  server.listen(0);
  return server;
}

function createUdpServer() {
  const server = udp.createSocket('udp4');
  server.on('listening', () => {
    registerServer().then(response => console.log(response.status));
  });
  server.on('message', (message, info) => {
    handleData(message, info);
  });
  server.bind(udpPort);
  return server;
}

async function registerServer() {
  const nodeDto = {
    ip: '', udpPort, seed,
    tcpPort: httpServer.address().port,
    playersAmount: 0
  }
  console.debug('server created:');
  console.debug(nodeDto);
  return await axios.post(`${mainServer}/nodes`, nodeDto);
}

async function sendPlayersAmount() {
  try {
    return await axios.patch(`${mainServer}/nodes`, {
      ip: '', udpPort, seed,
      tcpPort: httpServer.address().port,
      playersAmount: players.length
    });
  } catch (ignore) {}
}

function handleData(data, playerInfo) {
  try {
    let player;
    let playerFound = false;
    const isStatePackage = Player.isInstance(data);
    const x = isStatePackage ? encoder.getFloat(data.subarray(8, 12)) : null;
    const y = isStatePackage ? encoder.getFloat(data.subarray(12, 16)) : null;
    const simplifiedData = isStatePackage ? data.subarray(0, 16) : null;
    for (let i = 0; i < players.length; i++) {
      player = players[i];
      if (player.isTheSame(playerInfo)) {
        // if it is current player just update it's state
        if (isStatePackage) {
          player.update(data);
          playerFound = true;
          lastPackageTime = new Date().getTime();
        } else {
          player.send(data);
        }
      }
      else if (player.isActive()) {
        if (isStatePackage) {
          if (player.isReachable(x, y)) {
            if (player.isVisible(x, y)) {
              player.send(data);
            } else if (Math.random() < 0.25) {
              player.send(simplifiedData);
            }
          }
        } else {
          player.send(data);
        }
      }
      else {
        console.log(`removed player: ${player.info.address}:${player.info.port}`);
        players.splice(i--, 1);
        sendPlayersAmount();
      }
    }
    if (isStatePackage && !playerFound) {
      console.log(`new player: ${playerInfo.address}:${playerInfo.port}`);
      players.push(new Player(data, playerInfo));
      sendPlayersAmount();
    }
  } catch (ignore) {
    console.log(`parsing error: ${data}`);
    console.log(ignore);
  }
}

function parseArguments() {
  let port = false;
  let isFirstServer = false;
  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i].toLowerCase().trim();
    if (arg.startsWith('port:')) {
      port = parseInt(arg.replace('port:', ''));
    } else if (arg === 'first') {
      isFirstServer = true;
    }
  }
  if (!port) {
    throw new Error('udpPort must be specified');
  }
  return {udpPort: port, isFirstServer};
}

function closeServer() {
  axios.delete(`${mainServer}/nodes?port=${httpServer.address().port}`).catch(e => {
    console.log(e);
  });
  httpServer.close();
  udpServer.close();
}

class Player {

  constructor(dataPackage, info) {
    this.update(dataPackage);
    this.info = info;
    this.shipId = encoder.getLong(dataPackage.subarray(4, 8));
  }

  static isInstance(data) {
    return data.length === 50;
  }

  send(data) {
    udpServer.send(data, this.info.port, this.info.address);
  }

  isTheSame(networkInfo) {
    return this.info.address === networkInfo.address &&
      this.info.port === networkInfo.port;
  }

  update(dataPackage) {
    this.timestamp = encoder.getLong(dataPackage.subarray(42, 50));
    this.x = encoder.getFloat(dataPackage.subarray(8, 12));
    this.y = encoder.getFloat(dataPackage.subarray(12, 16));
  }

  isActive() {
    return lastPackageTime - this.timestamp < maxTimeout;
  }

  isReachable(px, py) {
    return Math.abs(this.x - px) < maxRadarPower &&
      Math.abs(this.y - py) < maxRadarPower;
  }

  isVisible(px, py) {
    return Math.abs(this.x - px) < (maxViewSizes[this.shipId] || 40) &&
      Math.abs(this.y - py) < (maxViewSizes[this.shipId] || 40)
  }
}
