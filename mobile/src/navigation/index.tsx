import { createContext, useContext, useEffect, useState } from 'react'
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { User } from '@supabase/supabase-js'

import { useAuth } from '../hooks/useAuth'
import { Button } from '../components/Button'
import { supabase } from '../services/supabase'
import { AvaliarScreen } from '../screens/AvaliarScreen'
import { HomeScreen } from '../screens/HomeScreen'
import { LoginScreen } from '../screens/LoginScreen'
import { PerfilScreen } from '../screens/PerfilScreen'
import { ReputacaoScreen } from '../screens/ReputacaoScreen'

type AuthContextValue = {
  user: User | null
  signIn: (credentials: { email: string; password: string }) => Promise<void>
  signInWithGoogle: () => Promise<{ cancelled: boolean }>
  signInWithApple: () => Promise<{ cancelled: boolean }>
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
  const { isAuthenticated, loading, signIn, signInWithApple, signInWithGoogle, signOut, user } = useAuth()
  const [profileGateLoading, setProfileGateLoading] = useState(false)
  const [mustCompleteSelfie, setMustCompleteSelfie] = useState(false)

  useEffect(() => {
    let active = true

    const syncProfileGate = async () => {
      if (!isAuthenticated || !user?.id) {
        if (active) {
          setMustCompleteSelfie(false)
          setProfileGateLoading(false)
        }
        return
      }

      if (active) setProfileGateLoading(true)

      const { data, error } = await supabase
        .from('profiles')
        .select('selfie_verified,onboarding_completed')
        .eq('id', user.id)
        .maybeSingle()

      console.log('[SelfieGate][RootNavigation] profile_check_result', {
        userId: user.id,
        hasError: Boolean(error),
        selfie_verified: data?.selfie_verified ?? null,
        onboarding_completed: data?.onboarding_completed ?? null,
      })

      if (!active) return

      if (error) {
        console.error('Falha ao validar gate de selfie no app:', error)
        setMustCompleteSelfie(true)
        setProfileGateLoading(false)
        return
      }

      const mustGate = !data || data.selfie_verified !== true || data.onboarding_completed !== true
      setMustCompleteSelfie(mustGate)
      setProfileGateLoading(false)
    }

    void syncProfileGate()

    return () => {
      active = false
    }
  }, [isAuthenticated, user?.id])

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1f6feb" />
      </View>
    )
  }

  if (profileGateLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1f6feb" />
      </View>
    )
  }

  if (isAuthenticated && mustCompleteSelfie) {
    return (
      <View style={styles.gateContainer}>
        <Text style={styles.gateTitle}>Finalize seu cadastro</Text>
        <Text style={styles.gateText}>
          Para acessar o aplicativo, é obrigatório concluir a verificação de selfie.
        </Text>
        <Button
          title="Fazer selfie agora"
          onPress={() => Linking.openURL('https://app.confiamais.com.br/onboarding/selfie')}
        />
        <Button title="Sair" variant="secondary" onPress={() => void signOut()} />
      </View>
    )
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signInWithApple, signInWithGoogle, signOut }}>
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
  gateContainer: {
    alignItems: 'center',
    flex: 1,
    gap: 12,
    justifyContent: 'center',
    padding: 24,
  },
  gateTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  gateText: {
    color: '#475467',
    marginBottom: 8,
    textAlign: 'center',
  },
})
