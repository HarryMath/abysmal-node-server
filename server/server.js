const udp = require('dgram');
const http = require('http');
const axios = require('axios');
const encoder = require('./encoder');
const mainServer = "https://abysmal-space.herokuapp.com";

const maxTimeout = 10 * 1000; /*  10 s  */
const checkInterval = 60 * 1000; /*  1 min  */

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
    httpServer.close();
    udpServer.close();
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
    registerServer();
  });
  server.on('message', (message, info) => {
    handleData(message, info, server);
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
  return await axios.patch(`${mainServer}/nodes`, {
    ip: '', udpPort, seed,
    tcpPort: httpServer.address().port,
    playersAmount: players.length
  });
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
        if (data.includes('state', 0)) {
          player.update(data);
          playerFound = true;
          lastPackageTime = new Date().getTime();
        } else {
          server.send(data, info.port, info.address);
        }
      } else {
        if (player.isActive()) {
          server.send(data, info.port, info.address);
        } else {
          console.log(`removed player: ${info.address}:${info.port}`);
          players.splice(i--, 1);
          sendPlayersAmount();
        }
      }
    }
    if (data.includes('state', 0)) {
      if (!playerFound) {
        console.log(`new player: ${playerInfo.address}:${playerInfo.port}`);
        players.push(new Player(data, playerInfo));
        sendPlayersAmount();
      }
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

class Player {

  constructor(dataPackage, info) {
    this.update(dataPackage);
    this.info = info;
  }

  update(dataPackage) {
    const encodedTimestamp = dataPackage
      .subarray(dataPackage.lastIndexOf(-127) + 1, dataPackage.length);
    // const data = dataPackage
    //   .subarray(6, dataPackage.length - 1)
    //   .toString().split(',');
    //this.timestamp = encoder.getLong(data[11]);
    //console.log(encodedTimestamp.toString());
    this.timestamp = encoder.getLong(encodedTimestamp);
    //console.log(this.timestamp);
  }

  isActive() {
    return lastPackageTime - this.timestamp < maxTimeout;
  }
}
