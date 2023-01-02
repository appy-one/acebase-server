// Executed by npm "version" hook
const { readFileSync, writeFileSync } = require('fs');
const { execSync } = require('child_process');
const packageInfo = require('./package.json');

const files = ['./dist/cjs/routes/meta-info.js', './dist/esm/routes/meta-info.js'];
files.forEach(file => {
    const originalContent = readFileSync(file, 'utf8');
    content = originalContent.replace(/%SERVER_VERSION%/g, packageInfo.version);
    if (content !== originalContent) {
        writeFileSync(file, content, 'utf8');
        console.log(`Replaced variable %SERVER_VERSION% with ${packageInfo.version} in ${file}`);
    }
});

execSync(`git add dist`);
