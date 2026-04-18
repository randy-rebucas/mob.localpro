import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated from 'react-native-reanimated';

export function HelloWave() {
  return (
    <Animated.View
      style={{
        marginTop: -6,
        animationName: {
          '50%': { transform: [{ rotate: '25deg' }] },
        },
        animationIterationCount: 4,
        animationDuration: '300ms',
      }}>
      <MaterialCommunityIcons name="hand-wave" size={28} color="#0D9488" />
    </Animated.View>
  );
}
