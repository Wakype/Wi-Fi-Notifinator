#!/usr/bin/env node

const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const notifier = require('node-notifier');
const blessed = require('blessed');
const wifiName = require('wifi-name');
const os = require('os');
const { performance } = require('perf_hooks');
const si = require('systeminformation');

const PING_COMMAND = 'ping -c 1 google.com';
const NOTIFICATION_SETTINGS = {
  title: 'No Internet Connection',
  message: 'Your internet connection is not available.',
  timeout: 5,
};

const screen = blessed.screen();
const statusBox = blessed.box({
  top: 'center',
  left: 'center',
  width: '70%',
  height: '70%',
  align: 'center',
  valign: 'middle',
  border: {
    type: 'line',
  },
  style: {
    fg: '#fff',
    bg: '#000',
    border: {
      fg: '#f00',
    },
  },
});

screen.append(statusBox);
screen.key(['escape', 'q', 'C-c'], function (ch, key) {
  return process.exit(0);
});

const getSystemInfo = async () => {
  const memoryUsage = process.memoryUsage();
  const memoryUsedInMB =
    Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100;

  const cpuInfo = os.cpus()[0];
  const cpuModel = cpuInfo.model;

  let wifiNameData = 'Wi-Fi is turned off';
  try {
    wifiNameData = await wifiName();
  } catch (error) {}

  const baseboardData = await si.baseboard();

  return { memoryUsedInMB, cpuModel, baseboardData, wifiNameData };
};

const checkInternet = async () => {
  const start = performance.now();
  try {
    await exec(PING_COMMAND);
    const end = performance.now();
    const pingTime = end - start;

    const { memoryUsedInMB, cpuModel, baseboardData, wifiNameData } =
      await getSystemInfo();

    statusBox.style.fg = '#0f0';
    statusBox.content = `Wi-Fi Status: Online\nPing Time: ${pingTime.toFixed(
      3
    )} ms\n\nWi-Fi Name: ${wifiNameData}\nDevice Name: ${os.hostname()}\n\nMemory Used: ${memoryUsedInMB} MB\nCPU Model: ${cpuModel}`;
    screen.render();
  } catch (error) {
    const { memoryUsedInMB, cpuModel } = await getSystemInfo();

    statusBox.style.fg = '#f00';
    statusBox.content = `Wi-Fi Status: Offline\n\nMemory Used: ${memoryUsedInMB} MB\nDevice Name: ${os.hostname()}\nCPU Model: ${cpuModel}`;
    screen.render();

    notifyNoInternet();
  }
};

const notifyNoInternet = () => {
  notifier.notify({
    title: 'No Internet Connection',
    message: 'Your internet connection is not available.',
    timeout: 5,
    appID: 'wifi_notificator',
  });
};

const prompt = blessed.prompt({
  parent: screen,
  top: 'center',
  left: 'center',
  height: 'shrink',
  width: 'half',
  border: {
    type: 'line',
  },
  label: 'Enter Number (in seconds)',
  tags: true,
  keys: true,
  mouse: true,
  inputOnFocus: true,
  hidden: false,
  vi: true,
});

prompt.input('', '', function (err, intervalTime) {
  if (err) return;
  const INTERVAL_TIME = parseInt(intervalTime) * 1000;
  setImmediate(() => {
    setInterval(checkInternet, INTERVAL_TIME);
    screen.render();
  });
});

screen.render();
