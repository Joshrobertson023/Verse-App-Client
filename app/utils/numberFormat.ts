/**
 * Formats a number with 4 significant figures using appropriate suffix (K, M, etc.)
 * Examples:
 * - 10000 -> "10.00K"
 * - 100000 -> "100.0K"
 * - 1000000 -> "1.000M"
 * - 10000000 -> "10.00M"
 */
export function formatPoints(points: number): string {
  if (points < 10000) {
    return points.toString();
  }

  if (points < 1000000) {
    // Format as K (thousands)
    const value = points / 1000;
    // For 4 significant figures in K format:
    // - 10000-99999: show as XX.XXK (e.g., 10.00K, 99.99K)
    // - 100000-999999: show as XXX.XK (e.g., 100.0K, 999.9K)
    if (value < 100) {
      // Need 2 decimal places to get 4 sig figs (e.g., 10.00)
      return `${value.toFixed(2)}K`;
    } else {
      // Need 1 decimal place to get 4 sig figs (e.g., 100.0)
      return `${value.toFixed(1)}K`;
    }
  }

  if (points < 1000000000) {
    // Format as M (millions)
    const value = points / 1000000;
    // For 4 significant figures in M format:
    // - 1000000-9999999: show as X.XXXM (e.g., 1.000M, 9.999M)
    // - 10000000-99999999: show as XX.XXM (e.g., 10.00M, 99.99M)
    // - 100000000-999999999: show as XXX.XM (e.g., 100.0M, 999.9M)
    if (value < 10) {
      // Need 3 decimal places to get 4 sig figs (e.g., 1.000)
      return `${value.toFixed(3)}M`;
    } else if (value < 100) {
      // Need 2 decimal places to get 4 sig figs (e.g., 10.00)
      return `${value.toFixed(2)}M`;
    } else {
      // Need 1 decimal place to get 4 sig figs (e.g., 100.0)
      return `${value.toFixed(1)}M`;
    }
  }

  // Format as B (billions) - unlikely but handle it
  const value = points / 1000000000;
  if (value < 10) {
    return `${value.toFixed(3)}B`;
  } else if (value < 100) {
    return `${value.toFixed(2)}B`;
  } else {
    return `${value.toFixed(1)}B`;
  }
}



