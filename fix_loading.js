const fs = require('fs');
const file = 'src/app/(tabs)/index.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(
  "import { BrandLogo } from '../../components/brand-logo';",
  "import { BrandLogo } from '../../components/brand-logo';\nimport { TypingIndicator } from '../../components/typing-indicator';"
);

const oldBlock = `{item.content === '' && !isUser ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <ActivityIndicator size="small" color={C.brand} />
                  <Text style={{ color: C.textTertiary, fontSize: 13 }}>
                    {item.id.startsWith('image-placeholder-') ? 'Görsel oluşturuluyor...' : 'Yanıt oluşturuluyor...'}
                  </Text>
                </View>
              ) : (`;

const newBlock = `{item.content === '' && !isUser ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, paddingHorizontal: 2 }}>
                  <TypingIndicator color={C.brand} dotSize={6} />
                  <Text style={{ color: C.textTertiary, fontSize: 13, fontStyle: 'italic', opacity: 0.7, letterSpacing: 0.3 }}>
                    {item.id.startsWith('image-placeholder-') ? 'Görsel oluşturuluyor' : 'Yanıt oluşturuluyor'}
                  </Text>
                </View>
              ) : (`;

c = c.replace(oldBlock, newBlock);

fs.writeFileSync(file, c, 'utf8');
