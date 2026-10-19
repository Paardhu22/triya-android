import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

// Use a dedicated localhost server so the LAN QR code cannot leak into USB launches.
// Force IPv4 DNS ordering: on Linux, localhost may otherwise bind only to ::1.
const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT ?? path.join(homedir(), 'Android', 'Sdk');
const sdkAdb = path.join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
const adb = existsSync(sdkAdb) ? sdkAdb : 'adb';
const deviceArgs = process.env.ANDROID_SERIAL ? ['-s', process.env.ANDROID_SERIAL] : ['-d'];
const port = Number(process.env.TRIYA_METRO_PORT ?? 8082);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('TRIYA_METRO_PORT must be a valid port.');
const metroUrl = `http://127.0.0.1:${port}`;
const expoUrl = `exp://127.0.0.1:${port}`;

function runAdb(args) {
  const result = spawnSync(adb, [...deviceArgs, ...args], { encoding: 'utf8', timeout: 10000 });
  if (result.error || result.status !== 0) {
    throw new Error(`USB connection unavailable. Enable USB debugging and accept the phone's authorization prompt.\n${result.error?.message ?? result.stderr}`);
  }
}
function forward() {
  runAdb(['reverse', `tcp:${port}`, `tcp:${port}`]);
  runAdb(['reverse', 'tcp:3000', 'tcp:3000']);
}
function open() {
  runAdb(['shell', 'am', 'start', '-W', '-a', 'android.intent.action.VIEW', '-d', expoUrl, 'host.exp.exponent']);
  console.log(`Sent Expo Go the USB URL: ${expoUrl}`);
}
forward();
let existing = false;
try {
  const status = await fetch(`${metroUrl}/status`, { signal: AbortSignal.timeout(1500) });
  existing = (await status.text()).includes('packager-status:running');
} catch { /* Start a localhost Metro server below. */ }

let child;
if (existing) {
  const response = await fetch(`${metroUrl}/`, {
    headers: { 'expo-platform': 'android', accept: 'application/expo+json' }, signal: AbortSignal.timeout(10000),
  });
  const manifest = await response.json();
  if (manifest.extra?.expoClient?._internal?.projectRoot !== process.cwd()) {
    throw new Error(`Port ${port} belongs to another project. Set TRIYA_METRO_PORT to a free port.`);
  }
  const discovery = await (await fetch(`${metroUrl}/_expo/open?platform=android&runtime=expo`, { signal: AbortSignal.timeout(10000) })).json();
  if (!['127.0.0.1', 'localhost'].includes(new URL(discovery.url).hostname)) {
    throw new Error(`The existing Metro server advertises a LAN address. Stop that server and rerun npm run android:usb.`);
  }
  open();
} else {
  const cli = path.join(process.cwd(), 'node_modules', 'expo', 'bin', 'cli');
  child = spawn(process.execPath, ['--dns-result-order=ipv4first', cli, 'start', '--localhost', '--go', '--android', '--port', String(port)], {
    stdio: 'inherit', env: { ...process.env, EXPO_PACKAGER_PROXY_URL: metroUrl },
  });
}

// USB reconnects remove adb reverse mappings. Restore them while this launcher runs.
let connected = true;
const monitor = setInterval(() => {
  const state = spawnSync(adb, [...deviceArgs, 'get-state'], { encoding: 'utf8', timeout: 3000 });
  const online = state.status === 0 && state.stdout.trim() === 'device';
  if (!online && connected) console.log('Phone disconnected. Reconnect USB and authorize debugging; Metro is still running.');
  if (online && !connected) {
    try { forward(); open(); console.log('USB forwarding restored.'); }
    catch (error) { console.error(error.message); return; }
  }
  connected = online;
}, 3000);
child?.on('error', error => { clearInterval(monitor); console.error(error.message); process.exitCode = 1; });
child?.on('exit', code => { clearInterval(monitor); process.exitCode = code ?? 1; });
function stop() { clearInterval(monitor); child?.kill('SIGINT'); if (!child) process.exit(); }
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
