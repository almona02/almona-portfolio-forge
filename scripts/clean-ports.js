/**
 * Clean Open Ports Script
 * Finds and kills processes using common development ports
 */

import { execSync } from 'child_process';

console.log('🧹 Cleaning Open Ports...\n');

// Common development ports
const DEV_PORTS = [5173, 4173, 3000, 8080, 5000, 5174, 5175, 8081, 8082];

function findProcessOnPort(port) {
  try {
    const result = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf8' });
    const lines = result.trim().split('\n').filter(line => line.trim());
    
    const pids = new Set();
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && !isNaN(pid)) {
        pids.add(pid);
      }
    });
    
    return Array.from(pids);
  } catch (error) {
    // Port not in use
    return [];
  }
}

function killProcess(pid) {
  try {
    execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    return true;
  } catch (error) {
    return false;
  }
}

console.log('📊 Checking ports...\n');

let totalKilled = 0;

DEV_PORTS.forEach(port => {
  const pids = findProcessOnPort(port);
  
  if (pids.length > 0) {
    console.log(`🔴 Port ${port} is in use (PIDs: ${pids.join(', ')})`);
    
    pids.forEach(pid => {
      if (killProcess(pid)) {
        console.log(`   ✅ Killed process ${pid}`);
        totalKilled++;
      } else {
        console.log(`   ⚠️  Failed to kill process ${pid} (may require admin)`);
      }
    });
  } else {
    console.log(`✅ Port ${port} is free`);
  }
});

console.log(`\n🎯 Summary: Killed ${totalKilled} process(es)`);
console.log('\n💡 If ports are still in use, you may need to run as administrator');
console.log('   Or manually kill processes using Task Manager');

