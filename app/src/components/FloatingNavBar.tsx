import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Film, Radio, Crown, SlidersHorizontal, Headphones, Sparkles } from 'lucide-react-native';

interface NavItem {
  name: string;
  route: string;
  label: string;
  icon: (color: string) => React.ReactNode;
  badge?: string;
  badgeColor?: string;
}

export const FloatingNavBar: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      name: 'cinema',
      route: '/',
      label: 'Cinema & Sync',
      icon: (color) => <Film size={18} color={color} />,
    },
    {
      name: 'disco',
      route: '/disco',
      label: 'Silent Party',
      icon: (color) => <Headphones size={18} color={color} />,
      badge: 'LIVE',
      badgeColor: '#EF4444',
    },
    {
      name: 'pro',
      route: '/pro',
      label: 'Organizer',
      icon: (color) => <Crown size={18} color={color} />,
      badge: 'PRO',
      badgeColor: '#F59E0B',
    },
    {
      name: 'settings',
      route: '/settings',
      label: 'Earbuds FX',
      icon: (color) => <SlidersHorizontal size={18} color={color} />,
    },
  ];

  return (
    <View style={styles.container} pointerEvents="box-none">
      <View style={styles.navBar}>
        {navItems.map((item) => {
          const isActive = pathname === item.route;
          const activeColor = item.name === 'disco' ? '#EF4444' : '#38BDF8';
          const inactiveColor = '#94A3B8';

          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => {
                if (pathname !== item.route) {
                  router.push(item.route as any);
                }
              }}
              activeOpacity={0.7}
            >
              <View style={styles.iconContainer}>
                {item.icon(isActive ? activeColor : inactiveColor)}
                {item.badge && (
                  <View style={[styles.badge, { backgroundColor: item.badgeColor || '#F59E0B' }]}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.navLabel, isActive && { color: activeColor, fontWeight: '800' }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    maxWidth: 380,
    width: '90%',
    justifyContent: 'space-around',
    ...(Platform.OS === 'web' ? { backdropFilter: 'blur(16px)' } : {}),
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  navItemActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -12,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 6,
  },
  badgeText: {
    color: '#090A0F',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  navLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
  },
});
