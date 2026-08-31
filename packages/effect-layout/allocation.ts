export function allocateWeightedCounts(
  total: number,
  weights: readonly number[],
): number[] {
  const budget = Math.max(
    0,
    Math.floor(Number.isFinite(total) ? total : 0),
  );

  const counts = weights.map(() => 0);

  if (budget === 0 || weights.length === 0) {
    return counts;
  }

  const positive = weights
    .map((weight, index) => ({
      index,
      weight: Number.isFinite(weight) && weight > 0 ? weight : 0,
    }))
    .filter((entry) => entry.weight > 0);

  if (positive.length === 0) {
    return counts;
  }

  if (budget <= positive.length) {
    [...positive]
      .sort((left, right) => {
        const weightDelta = right.weight - left.weight;
        return weightDelta !== 0 ? weightDelta : left.index - right.index;
      })
      .slice(0, budget)
      .forEach(({ index }) => {
        counts[index] = 1;
      });

    return counts;
  }

  positive.forEach(({ index }) => {
    counts[index] = 1;
  });

  let remaining = budget - positive.length;
  const totalWeight = positive.reduce((sum, entry) => sum + entry.weight, 0);

  const remainders = positive.map(({ index, weight }) => {
    const raw = remaining * (weight / totalWeight);
    const whole = Math.floor(raw);
    counts[index] = (counts[index] ?? 0) + whole;

    return {
      index,
      fraction: raw - whole,
    };
  });

  const allocated = counts.reduce((sum, count) => sum + count, 0);
  remaining = budget - allocated;

  remainders.sort((left, right) => {
    const fractionDelta = right.fraction - left.fraction;
    return fractionDelta !== 0 ? fractionDelta : left.index - right.index;
  });

  for (let index = 0; index < remaining; index++) {
    const target = remainders[index % remainders.length];
    if (target) {
      counts[target.index] = (counts[target.index] ?? 0) + 1;
    }
  }

  return counts;
}
