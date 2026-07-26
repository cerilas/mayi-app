import type { ReactNode } from 'react';
import { View } from 'react-native';
import { BrandLogo } from './brand-logo';

type AppHeaderProps = {
  left?: ReactNode;
  right?: ReactNode;
  center?: ReactNode;
};

export function AppHeader({ left, right, center }: AppHeaderProps) {
  return (
    <View
      style={{
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#07090f',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.12)',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
        zIndex: 5,
        paddingHorizontal: 8,
      }}
    >
      {/* Left slot — fixed width so center can be truly centred */}
      <View style={{ width: 48, alignItems: 'flex-start', justifyContent: 'center' }}>
        {left}
      </View>

      {/* Center slot — fills all remaining space */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        {center ? center : <BrandLogo size={38} />}
      </View>

      {/* Right slot — fixed width */}
      <View style={{ width: 48, alignItems: 'flex-end', justifyContent: 'center' }}>
        {right}
      </View>
    </View>
  );
}
