import { useCallback, useState } from 'react'
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'

import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { useAuthContext } from '../navigation'
import { api } from '../services/api'

export function PerfilScreen() {
  const { user, signOut } = useAuthContext()
  const [credits, setCredits] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const loadCredits = useCallback(async () => {
    try {
      setRefreshing(true)
      const response = await api.getMyCredits()
      setCredits(response.balance)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao carregar créditos.'
      Alert.alert('Atenção', message)
    } finally {
      setRefreshing(false)
    }
  }, [])

  async function handleLogout() {
    try {
      await signOut()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao sair da conta.'
      Alert.alert('Atenção', message)
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadCredits} />}
    >
      <Card>
        <Text style={styles.title}>Perfil</Text>
        <View style={styles.itemRow}>
          <Text style={styles.label}>E-mail:</Text>
          <Text style={styles.value}>{user?.email ?? 'Não informado'}</Text>
        </View>
        <View style={styles.itemRow}>
          <Text style={styles.label}>ID:</Text>
          <Text style={styles.value}>{user?.id ?? 'Não disponível'}</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.title}>Créditos</Text>
        <Text style={styles.value}>Saldo atual: {credits ?? '---'}</Text>
        <Button title="Atualizar créditos" onPress={loadCredits} loading={refreshing} />
      </Card>

      <Button title="Sair" onPress={handleLogout} variant="secondary" />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    flexGrow: 1,
    gap: 12,
    padding: 16,
  },
  title: {
    color: '#101828',
    fontSize: 18,
    fontWeight: '700',
  },
  itemRow: {
    gap: 4,
  },
  label: {
    color: '#475467',
    fontSize: 13,
  },
  value: {
    color: '#101828',
    fontSize: 15,
    fontWeight: '500',
  },
})
