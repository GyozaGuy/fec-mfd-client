const {app, Menu, Tray} = require('electron');
const ks = require('node-key-sender');
const os = require('os');
const LocalStorage = require('node-localstorage').LocalStorage;
const WebSocket = require('ws');

const keybindConfigBasic = require('./keybindConfigBasic');
const keybindConfigAdvanced = require('./keybindConfigAdvanced');

const keybindMapping = {
  engines: 'ENGINES',
  flightReady: 'FLIGHT_READY',
  headlights: 'HEADLIGHTS',
  landingGear: 'LANDING_GEAR',
  power: 'POWER'
};

const localStorage = new LocalStorage('./settings');
let listening = localStorage.getItem('listening') === 'true';
let advancedConfig = localStorage.getItem('advanced') === 'true';
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
    {checked: advancedConfig, click: toggleAdvancedConfig, label: 'Use Advanced Config', type: 'checkbox'},
    {click: app.quit, label: 'Quit'}
  ]);

  tray = new Tray(__dirname + '/fec.png');
  tray.setToolTip('FEC Commlink');
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
      if (listening) {
        const currentConfig = advancedConfig ? keybindConfigAdvanced : keybindConfigBasic;
        const keyCommand = currentConfig[keybindMapping[message]];

        if (/\s/.test(keyCommand)) {
          ks.sendCombination(keyCommand.split(' '));
        } else {
          setTimeout(() => {
            ks.sendKey(keyCommand);
          }, 1000);
        }
      }
    });
  });
}

function toggleAdvancedConfig(event) {
  advancedConfig = event.checked;
  localStorage.setItem('advanced', advancedConfig);
}

function toggleListening(event) {
  listening = event.checked;
  localStorage.setItem('listening', listening);
}
