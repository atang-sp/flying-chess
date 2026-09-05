const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '../src/App.vue');
let content = fs.readFileSync(appPath, 'utf8');

// 1. Add import
content = content.replace(
  "import IntroPage from './components/IntroPage.vue'",
  "import IntroPage from './components/IntroPage.vue'\n  import SettingsView from './views/SettingsView.vue'"
);

// 2. Remove settingsTab, nextStep, prevStep, stepCompleted, allConfigValid, punishmentStep, watch
const startStateStr = "const settingsTab = ref<'board' | 'punishment' | 'trap'>('board')";
const endStateRegex = /watch\(\[settingsTab, punishmentStep\], \(\) => \{\s*nextTick\(\(\) => \{\s*document\.querySelector\('\.settings-tab-content'\)\?\.scrollTo\(0, 0\)\s*\}\)\s*\}\)\n/;

const stateStartIdx = content.indexOf(startStateStr);
const endStateMatch = content.match(endStateRegex);

if (stateStartIdx !== -1 && endStateMatch) {
  const stateEndIdx = endStateMatch.index + endStateMatch[0].length;
  content = content.slice(0, stateStartIdx) + content.slice(stateEndIdx);
} else {
  console.log("Could not find state block to remove.");
}

// 3. Update generatePunishmentCombinations
content = content.replace(
  "punishmentStep.value = 'confirm'",
  "// punishmentStep.value is managed in SettingsView now"
);

// 4. Also remove other punishmentStep.value reset
content = content.replace(/punishmentStep\.value = 'config'/g, "// punishmentStep reset managed by SettingsView");
content = content.replace(/punishmentStep: typeof punishmentStep/g, "// punishmentStep removed");
content = content.replace(/debugWindow\.punishmentStep = punishmentStep/g, "// debugWindow.punishmentStep removed");


// 5. Replace template
const templateStartStr = "    <!-- 统一设置页面（Stepper 引导布局） -->";
const templateEndStr = "        <!-- 确认页面（独立于 Tab 内容） -->"; // This is just inside, let's find the closing div of settings-page

// We know the template section starts at line 3732 and ends at line 3871.
// Let's use string split and join.
const lines = content.split('\n');
let newLines = [];
let inSettingsPage = false;
let divDepth = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes("<!-- 统一设置页面（Stepper 引导布局） -->")) {
    inSettingsPage = true;
    newLines.push("    <!-- 统一设置页面 -->");
    newLines.push(`    <SettingsView
      v-else-if="gameState.gameStatus === 'board_settings' || gameState.gameStatus === 'settings'"
      :board-config="gameState.boardConfig"
      :punishment-config="gameState.punishmentConfig"
      :trap-config="trapConfig"
      :punishment-combinations="punishmentCombinations"
      :is-party-game="isPartyGame"
      @update:board-config="updateBoardConfig"
      @update:punishment-config="updatePunishmentConfig"
      @update:trap-config="updateTrapConfig"
      @validation-failed="handleValidationFailed"
      @generate-punishment-combinations="generatePunishmentCombinations"
      @confirm-punishment-combinations="confirmPunishmentCombinations"
      @show-intro="showIntro"
    />`);
    
    // We need to skip lines until the matching closing div of `settings-page`
    // Looking at the code, it's `<div v-else-if="..." class="settings-page">`
    // Then `<div class="page-container">` ...
    // The closing `</div>` for `.settings-page` is right before `<!-- 游戏页面 -->`
  }
  
  if (inSettingsPage) {
    if (line.includes("<!-- 游戏页面 -->")) {
      inSettingsPage = false;
      newLines.push(line);
    }
  } else {
    newLines.push(line);
  }
}

content = newLines.join('\n');

fs.writeFileSync(appPath, content, 'utf8');
console.log("Refactoring App.vue completed.");
