// Sample trader performance data for the survey
export interface TraderPerformance {
  id: string;
  name: string;
  monthlyReturns: number[]; // 12 months of returns as percentages
  capital: number; // Capital amount in crores
  mean: number; // Mean return
  stdDev: number; // Standard deviation
  maxDrawdown?: number; // Maximum drawdown percentage
  description?: string;
}

export const sampleTraderData: TraderPerformance[] = [
  {
    id: "trader-1",
    name: "Trader Alpha",
    monthlyReturns: [2.5, -1.2, 3.8, 1.5, -0.8, 4.2, 2.1, -2.3, 3.5, 1.8, 2.9, 3.1],
    capital: 5,
    mean: 1.73,
    stdDev: 2.15,
    maxDrawdown: 2.3,
    description: "Consistent performer with moderate volatility"
  },
  {
    id: "trader-2", 
    name: "Trader Beta",
    monthlyReturns: [5.2, 3.1, -2.8, 4.5, 6.2, -1.5, 7.8, 2.3, -3.2, 5.1, 4.7, 3.9],
    capital: 5,
    mean: 2.98,
    stdDev: 3.45,
    maxDrawdown: 3.2,
    description: "High returns with higher volatility"
  },
  {
    id: "trader-3",
    name: "Trader Gamma", 
    monthlyReturns: [0.8, 1.2, 0.5, 1.8, 0.3, 1.5, 0.9, 1.1, 0.7, 1.3, 0.6, 1.4],
    capital: 5,
    mean: 1.02,
    stdDev: 0.42,
    maxDrawdown: 0.5,
    description: "Low volatility, steady returns"
  },
  {
    id: "trader-4",
    name: "Trader Delta",
    monthlyReturns: [-3.2, 8.5, -1.8, 12.3, -5.2, 9.1, -2.1, 7.8, -4.5, 11.2, -1.9, 6.7],
    capital: 5,
    mean: 2.58,
    stdDev: 6.78,
    maxDrawdown: 5.2,
    description: "Extreme volatility with mixed results"
  },
  {
    id: "trader-5",
    name: "Trader Epsilon",
    monthlyReturns: [2.1, 2.3, 1.9, 2.5, 2.0, 2.2, 1.8, 2.4, 2.1, 2.3, 1.9, 2.2],
    capital: 5,
    mean: 2.11,
    stdDev: 0.22,
    maxDrawdown: 0.7,
    description: "Very consistent, low volatility"
  },
  {
    id: "trader-6",
    name: "Trader Zeta",
    monthlyReturns: [15.2, -8.3, 22.1, -12.5, 18.7, -6.2, 25.3, -9.8, 19.4, -7.1, 21.6, -5.9],
    capital: 5,
    mean: 4.12,
    stdDev: 13.45,
    maxDrawdown: 12.5,
    description: "Extreme high volatility trader"
  },
  {
    id: "trader-7",
    name: "Trader Eta",
    monthlyReturns: [1.5, 1.8, 1.2, 2.1, 1.6, 1.9, 1.4, 2.0, 1.7, 1.8, 1.5, 1.9],
    capital: 5,
    mean: 1.68,
    stdDev: 0.28,
    maxDrawdown: 0.6,
    description: "Stable, predictable returns"
  },
  {
    id: "trader-8",
    name: "Trader Theta",
    monthlyReturns: [6.8, -2.1, 8.5, 3.2, 7.1, -1.8, 9.2, 2.5, 6.9, -0.9, 8.3, 4.1],
    capital: 5,
    mean: 4.15,
    stdDev: 3.89,
    maxDrawdown: 2.1,
    description: "Strong performer with moderate risk"
  },
  {
    id: "trader-9",
    name: "Trader Iota",
    monthlyReturns: [0.2, 0.5, -0.1, 0.8, 0.3, 0.6, 0.1, 0.7, 0.4, 0.5, 0.2, 0.6],
    capital: 5,
    mean: 0.38,
    stdDev: 0.25,
    maxDrawdown: 0.1,
    description: "Very conservative, minimal returns"
  },
  {
    id: "trader-10",
    name: "Trader Kappa",
    monthlyReturns: [4.2, 3.8, 5.1, 3.5, 4.8, 4.0, 5.3, 3.7, 4.9, 4.1, 5.0, 4.3],
    capital: 5,
    mean: 4.35,
    stdDev: 0.58,
    maxDrawdown: 0.3,
    description: "Consistent high performer"
  }
];

// Helper function to calculate actual money returns
export const calculateMoneyReturns = (percentageReturns: number[], capital: number): number[] => {
  return percentageReturns.map(returnPercent => {
    return (returnPercent / 100) * capital * 10000000; // Convert crores to actual amount
  });
};

// Helper function to format money
export const formatMoney = (amount: number): string => {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} L`;
  } else {
    return `₹${amount.toLocaleString()}`;
  }
};
