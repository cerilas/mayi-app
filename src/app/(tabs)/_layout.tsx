import { Tabs } from 'expo-router';
import { Home, Settings, Users, BarChart2, BookOpen } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { useTheme } from '../../context/ThemeContext';

export default function TabLayout() {
  const { user, token } = useAuthStore();
  const { colors } = useTheme();
  const isGuest = !token;
  const role = user?.role;
  const isAdmin = !isGuest && role === 'admin';
  const isStaff = !isGuest && (role === 'admin' || role === 'physiotherapist');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: isGuest
          ? { display: 'none' }
          : {
              backgroundColor: '#ffffff',
              borderTopColor: '#f3f4f6',
              elevation: 0,
              shadowOpacity: 0,
            },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Sohbet',
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="patients"
        options={{
          title: 'Danışanlarım',
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
          href: isStaff ? '/patients' : null,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'İstatistik',
          tabBarIcon: ({ color, size }) => <BarChart2 color={color} size={size} />,
          href: isAdmin ? '/stats' : null,
        }}
      />
      <Tabs.Screen
        name="docs"
        options={{
          title: 'Kılavuz',
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />,
          href: isStaff ? '/docs' : null,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ayarlar',
          tabBarIcon: ({ color, size }) => <Settings color={color} size={size} />,
          href: isGuest ? null : '/settings',
        }}
      />
    </Tabs>
  );
}
