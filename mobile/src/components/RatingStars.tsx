import { StyleSheet, Text, View } from 'react-native'

type RatingStarsProps = {
  rating: number
  max?: number
}

export function RatingStars({ rating, max = 5 }: RatingStarsProps) {
  const roundedRating = Math.max(0, Math.min(max, Math.round(rating)))

  return (
    <View style={styles.container}>
      {Array.from({ length: max }).map((_, index) => (
        <Text key={index} style={[styles.star, index < roundedRating ? styles.filled : styles.empty]}>
          ★
        </Text>
      ))}
      <Text style={styles.label}>{rating.toFixed(1)}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
  },
  star: {
    fontSize: 18,
  },
  filled: {
    color: '#f79009',
  },
  empty: {
    color: '#d0d5dd',
  },
  label: {
    color: '#475467',
    fontSize: 14,
    marginLeft: 6,
  },
})
