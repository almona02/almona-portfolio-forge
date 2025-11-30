/**
 * Main app navigation structure
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon } from 'react-native-paper';
import { HomeScreen } from '../screens/HomeScreen';
import { RemnantScanner } from '../screens/RemnantScanner';
import { JobProgress } from '../screens/JobProgress';

export type RootStackParamList = {
  MainTabs: undefined;
  JobProgress: { jobId: string };
};

export type TabParamList = {
  Home: undefined;
  Remnants: undefined;
  Jobs: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563eb',
        tabBarInactiveTintColor: '#64748b',
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreenWrapper}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon source="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Remnants"
        component={RemnantScanner}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon source="barcode-scan" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Jobs"
        component={JobsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Icon source="clipboard-list" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Wrapper components for navigation
const HomeScreenWrapper = ({ navigation }: any) => {
  return (
    <HomeScreen
      onNavigateToRemnants={() => navigation.navigate('Remnants')}
      onNavigateToJobs={() => navigation.navigate('Jobs')}
    />
  );
};

const JobsScreen = ({ navigation }: any) => {
  return (
    <View style={styles.jobsContainer}>
      <Text style={styles.jobsText}>Jobs List - Coming Soon</Text>
      <Text style={styles.jobsSubtext}>
        Job list screen will show all active cutting jobs
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  jobsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  jobsText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#0f172a',
  },
  jobsSubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
});

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="JobProgress"
          component={JobProgress}
          options={{ title: 'Job Progress' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

