import { randomNormal } from "d3-random";

export const simulateInvestmentGrowth = (
  initialValue,
  meanReturn,
  volatility
) => {
  const annualReturn = randomNormal(meanReturn / 100, volatility / 100)();
  return initialValue * (1 + annualReturn);
};

export const calculateRMD = (year, scenario) => {
  if (!scenario.RMDSettings?.enabled) return 0;

  const accountBalance = scenario.financialGoal;
  const age = year - scenario.birthYear;

  const lifeExpectancyTable = {
    72: 27.4,
    73: 26.5,
    74: 25.5,
    75: 24.6,
    76: 23.7,
    77: 22.9,
    78: 22.0,
    79: 21.1,
    80: 18.7,
    85: 14.8,
    90: 11.4,
    95: 9.6,
  };

  const divisor = lifeExpectancyTable[age] || 10;
  return accountBalance / divisor;
};

export const runRothConversionOptimizer = (year, scenario) => {
  if (!scenario.rothConversionSettings?.enabled) return 0;

  const currentTaxableIncome = scenario.financialGoal * 0.04;
  const taxBracketLimit = 40000;

  let conversionAmount = taxBracketLimit - currentTaxableIncome;
  return conversionAmount > 0 ? conversionAmount : 0;
};
