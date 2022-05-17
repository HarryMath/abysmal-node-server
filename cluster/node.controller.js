const http = require('http');
const { exec } = require('child_process');

const clusterHttpPort = 8079;

const handleServerLogs = (port) => {
  return (err, stdout, stderr) => {
    if (err) {
      console.error(`node not started on port ${port}. ${err}`);
    }
    if (stdout && stdout.length) {
      console.debug(`stdout [${port}]: ${stdout}`);
    }
    if (stderr && stderr.length) {
      console.warn(`stderr [${port}]: ${stderr}`);
    }
  };
};

const createServer = ( arguments = '' ) => {
  const serverPort = getFreePort();
  // const command = `node server/server.js port:${serverPort} ${arguments}`.trim();
  const command = `pm2 start server/server.js -- port:${serverPort} ${arguments}`.trim();
  console.debug('trying to launch server: ' + command);
  let process = exec(command, handleServerLogs(serverPort));
  process.on('exit', code => {
    console.debug(`node on port ${serverPort} closed with code ${code}`);
    process = null;
  });
};

const requestHandler = function (req, res) {
  if (req.url.startsWith('/nodes/create') && req.method === 'POST') {
    createServer();
    console.log('new server requested');
    res.writeHead(200);
  } else {
    res.writeHead(404);
  }
  res.end();
}

const bootstrap = () => {
  http.createServer(requestHandler).listen(clusterHttpPort);
  createServer('first');
}

const getFreePort = () => {
  const server = http.createServer(((req, res) => {
    res.writeHead(404);
    res.end();
  }));
  server.listen(0);
  const freePort = server.address().port;
  server.close();
  return freePort;
}

bootstrap();
