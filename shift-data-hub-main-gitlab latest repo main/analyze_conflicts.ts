import * as fs from 'fs';
import * as path from 'path';

interface FileConflict {
  file: string;
  currentSize: number;
  gitlabSize: number;
  isCritical: boolean;
  recommendation: string;
}

const conflicts: FileConflict[] = [];
const criticalFiles = [
  'src/index.ts',
  'src/services/heliusWebhookHandler.ts',
  'frontend/lib/api.ts',
  'package.json',
  'tsconfig.json',
];

console.log('🔍 ANALYZING CONFLICTS...\n');

for (const file of criticalFiles) {
  const currentPath = file;
  const gitlabPath = `shift-data-hub-main-gitlab latest repo/${file}`;

  try {
    const currentStats = fs.statSync(currentPath);
    const gitlabStats = fs.statSync(gitlabPath);

    const currentContent = fs.readFileSync(currentPath, 'utf-8');
    const gitlabContent = fs.readFileSync(gitlabPath, 'utf-8');

    const isIdentical = currentContent === gitlabContent;
    const sizeDiff = Math.abs(currentStats.size - gitlabStats.size);

    let recommendation = 'KEEP CURRENT';
    let isCritical = false;

    // Analysis logic
    if (file.includes('package.json')) {
      recommendation = 'MERGE DEPENDENCIES';
      isCritical = true;
    } else if (file.includes('tsconfig')) {
      recommendation = 'USE GITLAB (more recent)';
    } else if (file.includes('index.ts')) {
      recommendation = 'MERGE ROUTES & CONFIG';
      isCritical = true;
    } else if (file.includes('heliusWebhook')) {
      recommendation = 'MERGE HANDLERS';
      isCritical = true;
    } else if (file.includes('api.ts')) {
      recommendation = 'MERGE API ENDPOINTS';
      isCritical = true;
    }

    if (!isIdentical) {
      conflicts.push({
        file,
        currentSize: currentStats.size,
        gitlabSize: gitlabStats.size,
        isCritical,
        recommendation
      });
      
      console.log(`⚠️  ${file}`);
      console.log(`   Current: ${currentStats.size} bytes | GitLab: ${gitlabStats.size} bytes`);
      console.log(`   Difference: ${sizeDiff} bytes`);
      console.log(`   Critical: ${isCritical ? 'YES' : 'NO'}`);
      console.log(`   → ${recommendation}\n`);
    } else {
      console.log(`✅ ${file} (identical)`);
    }
  } catch (err: any) {
    console.log(`❌ ${file} - Not found in one repo`);
  }
}

console.log('\n═════════════════════════════════════════════════════════\n');
console.log(`CRITICAL CONFLICTS: ${conflicts.filter(c => c.isCritical).length}`);
console.log(`TOTAL DIFFERENCES: ${conflicts.length}\n`);

if (conflicts.length === 0) {
  console.log('✅ NO MAJOR CONFLICTS - Safe to merge!');
}
