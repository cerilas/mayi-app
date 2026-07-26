const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src/app/(tabs)/settings.tsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/import \{ View, Text/g, "import Toast from 'react-native-toast-message';\nimport { View, Text");

content = content.replace(/Alert\.alert\("Başarılı", (.*?)\);/g, "Toast.show({ type: 'success', text1: 'Başarılı', text2: $1 });");
content = content.replace(/Alert\.alert\("Hata", (.*?)\);/g, "Toast.show({ type: 'error', text1: 'Hata', text2: $1 });");

fs.writeFileSync(file, content, 'utf8');
