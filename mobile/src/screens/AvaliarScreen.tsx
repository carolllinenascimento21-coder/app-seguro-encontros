import { useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TextInput } from 'react-native'

import { Button } from '../components/Button'
import { Card } from '../components/Card'

export function AvaliarScreen() {
  const [profileId, setProfileId] = useState('')
  const [comment, setComment] = useState('')

  function handleSubmit() {
    Alert.alert(
      'Estrutura pronta',
      'A integração de envio pode ser conectada à rota existente de avaliações sem alterar o backend.'
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <Text style={styles.title}>Nova avaliação</Text>
        <Text style={styles.help}>Tela preparada para integração com fluxo de envio de avaliações.</Text>

        <TextInput
          onChangeText={setProfileId}
          placeholder="ID do perfil avaliado"
          style={styles.input}
          value={profileId}
        />

        <TextInput
          multiline
          numberOfLines={4}
          onChangeText={setComment}
          placeholder="Comentário"
          style={[styles.input, styles.multiline]}
          value={comment}
        />

        <Button title="Enviar avaliação" onPress={handleSubmit} disabled={!profileId || !comment} />
      </Card>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    flexGrow: 1,
    padding: 16,
  },
  title: {
    color: '#101828',
    fontSize: 20,
    fontWeight: '700',
  },
  help: {
    color: '#475467',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderColor: '#d0d5dd',
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  multiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
})
