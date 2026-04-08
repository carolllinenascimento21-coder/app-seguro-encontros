import { useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native'

import { Button } from '../components/Button'
import { useAuthContext } from '../navigation'

type SocialProvider = 'google' | 'apple'

export function LoginScreen() {
  const { signIn, signInWithApple, signInWithGoogle } = useAuthContext()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null)

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Atenção', 'Informe e-mail e senha.')
      return
    }

    try {
      setLoading(true)
      await signIn({ email: email.trim(), password })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível autenticar.'
      Alert.alert('Falha no login', message)
    } finally {
      setLoading(false)
    }
  }

  async function handleSocialLogin(provider: SocialProvider) {
    try {
      setSocialLoading(provider)
      const result = provider === 'google' ? await signInWithGoogle() : await signInWithApple()

      if (result.cancelled) {
        return
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível autenticar.'
      Alert.alert('Falha no login social', message)
    } finally {
      setSocialLoading(null)
    }
  }

  const isGoogleLoading = socialLoading === 'google'
  const isAppleLoading = socialLoading === 'apple'
  const disableInputs = loading || socialLoading !== null

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Confia+</Text>
        <Text style={styles.subtitle}>Entre para acessar sua conta.</Text>

        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="E-mail"
          style={styles.input}
          value={email}
          editable={!disableInputs}
        />

        <TextInput
          onChangeText={setPassword}
          placeholder="Senha"
          secureTextEntry
          style={styles.input}
          value={password}
          editable={!disableInputs}
        />

        <Button title="Entrar" onPress={handleLogin} loading={loading} disabled={socialLoading !== null} />

        <View style={styles.socialButtons}>
          <Button
            title="Entrar com Google"
            onPress={() => handleSocialLogin('google')}
            loading={isGoogleLoading}
            variant="secondary"
            disabled={disableInputs}
          />
          {Platform.OS === 'ios' ? (
            <Button
              title="Entrar com Apple"
              onPress={() => handleSocialLogin('apple')}
              loading={isAppleLoading}
              variant="secondary"
              disabled={disableInputs}
            />
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: '#f2f4f7',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    gap: 12,
    maxWidth: 460,
    padding: 20,
    width: '100%',
  },
  title: {
    color: '#101828',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#475467',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderColor: '#d0d5dd',
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  socialButtons: {
    gap: 8,
    marginTop: 6,
  },
})
