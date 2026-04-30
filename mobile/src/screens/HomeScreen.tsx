import { useCallback, useState } from 'react'
import { Linking, StyleSheet, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'

import { Card } from '../components/Card'
import { Button } from '../components/Button'
import { useAuthContext } from '../navigation'
import { supabase } from '../services/supabase'

export function HomeScreen() {
  const { user } = useAuthContext()
  const [checkingSelfie, setCheckingSelfie] = useState(false)
  const [selfiePending, setSelfiePending] = useState(false)

  useFocusEffect(
    useCallback(() => {
      let active = true

      const validateSelfie = async () => {
        if (!user?.id) return

        setCheckingSelfie(true)

        const { data, error } = await supabase
          .from('profiles')
          .select('selfie_verified,onboarding_completed')
          .eq('id', user.id)
          .maybeSingle()

        console.log('[SelfieGate][HomeScreen] profile_check_result', {
          userId: user.id,
          hasError: Boolean(error),
          selfie_verified: data?.selfie_verified ?? null,
          onboarding_completed: data?.onboarding_completed ?? null,
        })

        if (!active) return

        const mustRedirect =
          Boolean(error) || !data || data.selfie_verified !== true || data.onboarding_completed !== true

        setSelfiePending(mustRedirect)
        setCheckingSelfie(false)

        if (mustRedirect) {
          Linking.openURL('https://app.confiamais.com.br/onboarding/selfie').catch((openError) => {
            console.error('Não foi possível abrir onboarding de selfie:', openError)
          })
        }
      }

      void validateSelfie()

      return () => {
        active = false
      }
    }, [user?.id])
  )

  return (
    <View style={styles.container}>
      <Card>
        <Text style={styles.title}>Bem-vinda ao Confia+</Text>
        <Text style={styles.text}>
          Use as abas abaixo para consultar reputação, avaliar perfis e gerenciar sua conta.
        </Text>
        {checkingSelfie ? <Text style={styles.pending}>Validando verificação de selfie...</Text> : null}
        {selfiePending ? (
          <View style={styles.pendingBox}>
            <Text style={styles.pending}>Precisamos da sua selfie para liberar o acesso.</Text>
            <Button
              title="Abrir verificação de selfie"
              onPress={() => Linking.openURL('https://app.confiamais.com.br/onboarding/selfie')}
            />
          </View>
        ) : null}
      </Card>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    flex: 1,
    gap: 16,
    padding: 16,
  },
  title: {
    color: '#101828',
    fontSize: 20,
    fontWeight: '700',
  },
  text: {
    color: '#344054',
    fontSize: 15,
    lineHeight: 22,
  },
  pending: {
    color: '#b42318',
    marginTop: 12,
  },
  pendingBox: {
    marginTop: 12,
  },
})
