import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'

import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { RatingStars } from '../components/RatingStars'
import { api } from '../services/api'

export function ReputacaoScreen() {
  const [profileId, setProfileId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  async function loadReputation() {
    if (!profileId) {
      Alert.alert('Atenção', 'Informe o ID do perfil.')
      return
    }

    try {
      setLoading(true)
      const data = await api.getReputationById(profileId.trim())
      setResult(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erro ao consultar reputação.'
      Alert.alert('Falha na consulta', message)
    } finally {
      setLoading(false)
    }
  }

  const averageRating = typeof result?.average_rating === 'number' ? result.average_rating : null

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <Text style={styles.title}>Consultar reputação</Text>
        <TextInput
          onChangeText={setProfileId}
          placeholder="ID do perfil"
          style={styles.input}
          value={profileId}
        />
        <Button title="Consultar" onPress={loadReputation} loading={loading} />
      </Card>

      {result ? (
        <Card>
          <Text style={styles.title}>Resultado</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Acesso liberado:</Text>
            <Text style={styles.value}>{String(result.allowed)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Bloqueado:</Text>
            <Text style={styles.value}>{String(result.locked ?? false)}</Text>
          </View>
          {averageRating !== null ? (
            <View style={styles.row}>
              <Text style={styles.label}>Média:</Text>
              <RatingStars rating={averageRating} />
            </View>
          ) : null}
          <Text style={styles.rawData}>{JSON.stringify(result, null, 2)}</Text>
        </Card>
      ) : null}
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
  input: {
    borderColor: '#d0d5dd',
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: '#475467',
    fontSize: 14,
  },
  value: {
    color: '#101828',
    fontSize: 15,
    fontWeight: '600',
  },
  rawData: {
    color: '#344054',
    fontFamily: 'monospace',
    fontSize: 12,
    marginTop: 8,
  },
})
