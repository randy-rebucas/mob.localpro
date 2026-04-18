import { Image } from 'expo-image';
import { Platform, View } from 'react-native';

const LOGO = require('@/assets/images/localpro-logo.png');

/** Centered logo (PNG with transparent background). */
export function AuthBrandHeader() {
  return (
    <View className="mb-2 items-center pt-1">
      <View
        className="items-center justify-center rounded-[28px] p-1"
        style={
          Platform.OS === 'ios'
            ? {
                backgroundColor: 'transparent',
                shadowColor: '#004b8d',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.18,
                shadowRadius: 20,
              }
            : { backgroundColor: 'transparent', elevation: 6 }
        }>
        <Image
          source={LOGO}
          style={{ width: 120, height: 120 }}
          contentFit="contain"
          accessibilityLabel="LocalPro"
        />
      </View>
    </View>
  );
}
