const fs = require('fs');
const path = require('path');

function replaceFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/import \{ View, Text/g, "import Toast from 'react-native-toast-message';\nimport { View, Text");
  
  content = content.replace(/Alert\.alert\('Hata', (.*?)\);/g, "Toast.show({ type: 'error', text1: 'Hata', text2: $1 });");
  content = content.replace(/Alert\.alert\('Başarılı', (.*?)\);/g, "Toast.show({ type: 'success', text1: 'Başarılı', text2: $1 });");
  content = content.replace(/Alert\.alert\('Fotoğraf İzni', (.*?)\);/g, "Toast.show({ type: 'error', text1: 'İzin Gerekli', text2: $1 });");
  
  fs.writeFileSync(filePath, content, 'utf8');
}

replaceFile(path.join(__dirname, 'src/app/(tabs)/stats.tsx'));
replaceFile(path.join(__dirname, 'src/app/(tabs)/index.tsx'));
