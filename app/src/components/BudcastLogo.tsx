import React from 'react';
import { Image, View, StyleSheet } from 'react-native';

interface Props {
  size?: number;
}

export const BudcastLogo: React.FC<Props> = ({ size = 36 }) => {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image
        source={require('../../assets/icon.png')}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
};

export const AuviLogo = BudcastLogo;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
});
