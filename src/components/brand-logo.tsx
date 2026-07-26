import { Image, type ImageStyle, type StyleProp } from 'react-native';

const BRAND_LOGO = require('../../assets/images/my-logo.png');

type BrandLogoProps = {
  size?: number;
  style?: StyleProp<ImageStyle>;
};

export function BrandLogo({ size = 36, style }: BrandLogoProps) {
  return (
    <Image
      accessibilityLabel="MY FizyoAI"
      resizeMode="contain"
      source={BRAND_LOGO}
      // Logoda görsel ağırlık solda olduğu için veya transparan padding kaynaklı 
      // tam ortalanmamış hissiyatını düzeltmek için sağa doğru hafif (~%4-5) kaydırıyoruz.
      style={[{ width: size, height: size, marginLeft: size * 0.04 }, style]}
    />
  );
}
