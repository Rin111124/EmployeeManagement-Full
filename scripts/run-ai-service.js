const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const aiDir = path.join(rootDir, 'attendance-system', 'ai-service');

const venvPythonWin = path.join(aiDir, '.venv', 'Scripts', 'python.exe');
const venvPythonUnix = path.join(aiDir, '.venv', 'bin', 'python');

let pythonBin = 'python';
if (fs.existsSync(venvPythonWin)) {
    pythonBin = venvPythonWin;
} else if (fs.existsSync(venvPythonUnix)) {
    pythonBin = venvPythonUnix;
}

console.log(`[AI Service Runner] Starting AI Service on port 8000 using: ${pythonBin}`);
const child = spawn(pythonBin, ['main.py'], {
    cwd: aiDir,
    stdio: 'inherit',
    env: { ...process.env, PYTHONUNBUFFERED: '1' },
});

child.on('error', (err) => {
    console.error('[AI Service Runner] Failed to start Python process:', err.message);
    process.exit(1);
});

child.on('exit', (code) => {
    process.exit(code ?? 0);
});
