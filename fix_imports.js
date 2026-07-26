const fs = require('fs');

function addImport(file) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace("import React,", "import Toast from 'react-native-toast-message';\nimport React,");
  fs.writeFileSync(file, content, 'utf8');
}

addImport('src/app/(tabs)/patients.tsx');
addImport('src/app/(tabs)/stats.tsx');
addImport('src/app/(tabs)/index.tsx');
