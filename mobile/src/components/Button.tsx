import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native'

type ButtonProps = {
  title: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  variant?: 'primary' | 'secondary'
}

export function Button({ title, onPress, loading, disabled, variant = 'primary' }: ButtonProps) {
  const isDisabled = Boolean(disabled || loading)

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.base, variant === 'secondary' ? styles.secondary : styles.primary, isDisabled && styles.disabled]}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.text}>{title}</Text>}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: 12,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
  },
  primary: {
    backgroundColor: '#1f6feb',
  },
  secondary: {
    backgroundColor: '#344054',
  },
  disabled: {
    opacity: 0.7,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
