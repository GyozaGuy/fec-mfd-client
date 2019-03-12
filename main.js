const {app, Menu, Tray} = require('electron');
const ks = require('node-key-sender');
const os = require('os');
const LocalStorage = require('node-localstorage').LocalStorage;
const WebSocket = require('ws');

ks.setOption('caseCorrection', true);

const localStorage = new LocalStorage('./settings');
let listening = localStorage.getItem('listening') === 'true';
let tray;

// Get local IP address
const interfaces = os.networkInterfaces();
let ipAddress;

if (interfaces.Ethernet) {
  const interface = interfaces.Ethernet.find(i => i.family === 'IPv4');
  ipAddress = interface ? interface.address : 'Unknown';
}

app.on('ready', () => {
  const contextMenu = Menu.buildFromTemplate([
    {label: `IP Address: ${ipAddress}`},
    {checked: listening, click: toggleListening, label: 'Listening', type: 'checkbox'},
    {click: app.quit, label: 'Quit'}
  ]);

  tray = new Tray(__dirname + '/fec.png');
  tray.setToolTip('FEC MFD Server');
  tray.setContextMenu(contextMenu);

  setupWebSocketServer();
});

function setupWebSocketServer() {
  const wss = new WebSocket.Server({port: 80});

  wss.on('connection', ws => {
    console.log('Client connected');

    ws.on('close', () => {
      console.log('Client disconnected');
    });

    ws.on('error', err => {
      console.error(err);
    });

    ws.on('message', message => {
      if (listening && message) {
        if (/\$\$/.test(message)) {
          const segments = message.split(/\s?\$\$\s?/i);

          segments.forEach(segment => {
            setTimeout(() => {
              if (/"".*""/.test(segment)) {
                  ks.sendText(segment.replace(/""/g, ''));
              } else {
                ks.sendCombination(segment.split(' '));
              }
            }, 100);
          });
        } else {
          if (/"".*""/.test(message)) {
            setTimeout(() => {
              ks.sendText(message.replace(/""/g, ''));
            });
          } else {
            ks.sendCombination(message.split(' '));
          }
        }
      }
    });
  });
}

function toggleListening(event) {
  listening = event.checked;
  localStorage.setItem('listening', listening);
}
