import { createContext, useContext } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { User } from '@supabase/supabase-js'

import { useAuth } from '../hooks/useAuth'
import { AvaliarScreen } from '../screens/AvaliarScreen'
import { HomeScreen } from '../screens/HomeScreen'
import { LoginScreen } from '../screens/LoginScreen'
import { PerfilScreen } from '../screens/PerfilScreen'
import { ReputacaoScreen } from '../screens/ReputacaoScreen'

type AuthContextValue = {
  user: User | null
  signIn: (credentials: { email: string; password: string }) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuthContext() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuthContext deve ser usado dentro de RootNavigation')
  }

  return context
}

const Stack = createNativeStackNavigator()
const Tabs = createBottomTabNavigator()

function MainTabs() {
  return (
    <Tabs.Navigator screenOptions={{ headerTitleAlign: 'center' }}>
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Reputação" component={ReputacaoScreen} />
      <Tabs.Screen name="Avaliar" component={AvaliarScreen} />
      <Tabs.Screen name="Perfil" component={PerfilScreen} />
    </Tabs.Navigator>
  )
}

export function RootNavigation() {
  const { isAuthenticated, loading, signIn, signOut, user } = useAuth()

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1f6feb" />
      </View>
    )
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signOut }}>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {isAuthenticated ? (
            <Stack.Screen name="App" component={MainTabs} />
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
})
