const { spawn } = require('child_process');
const path = require('path');

// Colors for terminal log prefixes
const reset = "\x1b[0m";
const green = "\x1b[32m";
const blue = "\x1b[34m";
const red = "\x1b[31m";

console.log(`${green}[SafeCall Launcher] Booting SafeCall Ecosystem...${reset}`);

// Spawn Backend
const backend = spawn('npm', ['run', 'dev'], { 
  cwd: path.join(__dirname, 'backend'),
  shell: true 
});

// Spawn Frontend
const frontend = spawn('npx', ['expo', 'start', '--web'], { 
  cwd: path.join(__dirname, 'mobile'),
  shell: true 
});

function prefixOutput(data, name, color) {
  const text = data.toString().trim();
  if (!text) return;
  text.split('\n').forEach(line => {
    console.log(`${color}[${name}]${reset} ${line}`);
  });
}

backend.stdout.on('data', (data) => prefixOutput(data, 'Backend', blue));
backend.stderr.on('data', (data) => prefixOutput(data, 'Backend Error', red));

frontend.stdout.on('data', (data) => prefixOutput(data, 'Frontend', green));
frontend.stderr.on('data', (data) => prefixOutput(data, 'Frontend Error', red));

backend.on('close', (code) => {
  console.log(`${red}[SafeCall Launcher] Backend stopped with code ${code}. Terminating frontend...${reset}`);
  frontend.kill();
  process.exit(code);
});

frontend.on('close', (code) => {
  console.log(`${red}[SafeCall Launcher] Frontend stopped with code ${code}. Terminating backend...${reset}`);
  backend.kill();
  process.exit(code);
});

// Capture Ctrl+C
process.on('SIGINT', () => {
  console.log(`\n${red}[SafeCall Launcher] Stopping all processes...${reset}`);
  backend.kill();
  frontend.kill();
  process.exit(0);
});
