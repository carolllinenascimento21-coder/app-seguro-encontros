import { StyleSheet, Text, View } from 'react-native'

import { Card } from '../components/Card'

export function HomeScreen() {
  return (
    <View style={styles.container}>
      <Card>
        <Text style={styles.title}>Bem-vinda ao Confia+</Text>
        <Text style={styles.text}>
          Use as abas abaixo para consultar reputação, avaliar perfis e gerenciar sua conta.
        </Text>
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
})
