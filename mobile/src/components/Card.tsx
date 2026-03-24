import { PropsWithChildren } from 'react'
import { StyleSheet, View } from 'react-native'

export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderColor: '#e4e7ec',
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    padding: 16,
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
})
