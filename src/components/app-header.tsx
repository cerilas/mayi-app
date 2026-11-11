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
        justifyContent: 'space-between',
        backgroundColor: '#07090f',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.12)',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
        zIndex: 5,
        paddingHorizontal: 12,
      }}
    >
      {/* Absolute-centered logo so left/right buttons never shift the MY logo */}
      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {center ? center : <BrandLogo size={38} />}
      </View>

      {/* Left slot */}
      <View style={{ flexDirection: 'row', alignItems: 'center', zIndex: 2 }}>
        {left}
      </View>

      {/* Right slot */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', zIndex: 2 }}>
        {right}
      </View>
    </View>
  );
}
