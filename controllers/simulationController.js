import { Scenario } from "../models/scenarioModel.js";
import { SimulationResult } from "../models/simulationResultModel.js";
import { Tax } from "../models/taxModel.js";
import { logScenarioActivity } from "../controllers/loggingController.js";

const safeNumber = (value, defaultValue = 0) => {
  const num = parseFloat(value);
  return isNaN(num) ? defaultValue : num;
};

const safeCalculate = (base, change, years, inflation = 0) => {
  const baseNum = safeNumber(base);
  const changeNum = safeNumber(change);
  const yearsNum = safeNumber(years);
  const inflationNum = safeNumber(inflation);
  return (
    baseNum *
    Math.pow(1 + changeNum / 100, yearsNum) *
    Math.pow(1 + inflationNum / 100, yearsNum)
  );
};

const gaussianRandom = () => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

const simulateInvestmentGrowth = (currentValue, expectedReturn, volatility) => {
  const drift = expectedReturn - 0.5 * Math.pow(volatility, 2);
  const randomShock = volatility * gaussianRandom();
  return currentValue * Math.exp(drift + randomShock);
};

const calculateRMD = (year, scenario) => {
  if (!scenario.RMDSettings?.enabled) return 0;
  const age = year - scenario.birthYear;
  if (age < 72) return 0;
  const divisor = Math.max(1, 27.4 - (age - 72) * 0.5);
  const accountBalance = safeNumber(scenario.RMDSettings.accountBalance);
  const rmdAmount = accountBalance / divisor;
  scenario.RMDSettings.accountBalance -= rmdAmount;
  return rmdAmount;
};

const runRothConversionOptimizer = (year, scenario) => {
  if (!scenario.rothConversionSettings?.enabled) return 0;
  if (
    year < scenario.rothConversionSettings.startYear ||
    year > scenario.rothConversionSettings.endYear
  )
    return 0;
  const amount = Math.min(
    safeNumber(scenario.rothConversionSettings.amount),
    safeNumber(scenario.rothConversionSettings.accountBalance)
  );
  scenario.rothConversionSettings.accountBalance -= amount;
  return amount;
};

const extractThreshold = (bracketStr) => {
  if (bracketStr.includes("Over")) {
    const num = bracketStr.match(/\$?([\d,]+)/)?.[1];
    return parseFloat(num.replace(/,/g, ""));
  }
  const num = bracketStr.match(/^\$?([\d,]+)/)?.[1];
  return parseFloat(num.replace(/,/g, ""));
};

const calculateTax = (income, taxBrackets = [], standardDeduction = 0) => {
  let taxableIncome = Math.max(0, income - standardDeduction);
  let tax = 0;
  for (let i = 0; i < taxBrackets.length; i++) {
    const { rate, threshold } = taxBrackets[i];
    const nextThreshold = taxBrackets[i + 1]?.threshold ?? Infinity;
    if (taxableIncome > threshold) {
      const taxedAmount = Math.min(taxableIncome, nextThreshold) - threshold;
      tax += taxedAmount * rate;
    }
  }
  return tax;
};

const sanitize = (val) => (isNaN(val) ? 0 : val);

{/*
export const runMonteCarloSimulation = async (req, res) => {
  try {
    const { scenarioId, iterations = 1000 } = req.body;
    const scenario = await Scenario.findOne({
      _id: scenarioId,
      user: req.userId,
    })
      .populate("investmentTypes.investment")
      .populate("events");

    if (!scenario) {
      return res.status(404).json({ message: "Scenario not found" });
    }

    const taxData = await Tax.findOne().sort({ createdAt: -1 });
    const filingStatus = scenario.taxFilingStatus || "single";
    const currentYear = new Date().getFullYear();
    const endYear = currentYear + scenario.lifeExpectancy;

    // Get spouse death year (if any)
    const spouseDeathEvent = scenario.events.find(e => e.type === "spouseDeath");
    const spouseDeathYear = spouseDeathEvent ? spouseDeathEvent.startYear : Infinity;

    const incomeEvents = scenario.events.filter((e) => e.type === "income");
    const nondiscretionary = scenario.events.filter(
      (e) => e.type === "expense" && !e.discretionary
    );
    const discretionary = scenario.events.filter(
      (e) => e.type === "expense" && e.discretionary
    );
    const investEvents = scenario.events.filter((e) => e.type === "investment");
    const rebalanceEvents = scenario.events.filter(
      (e) => e.type === "rebalance"
    );

    const yearlyAggregates = {};
    for (let y = currentYear; y <= endYear; y++) {
      yearlyAggregates[y] = {
        incomeSum: 0,
        expensesSum: 0,
        totalInvestmentSum: 0,
      };
    }

    const simulationResults = [];
    let successfulRuns = 0;

    for (let i = 0; i < iterations; i++) {
      let investmentPortfolio = scenario.investmentTypes.map((t) => ({
        ...t._doc,
        currentValue: t.value || 0,
      }));

      let annualRecords = {};

      for (let year = currentYear; year <= endYear; year++) {
        const yearOffset = (e) => year - e.startYear;

        // Calculate income with spouse death adjustment
        let income = incomeEvents
          .filter((e) => year >= e.startYear && year <= e.startYear + e.duration)
          .reduce((sum, e) => {
            let amount = safeCalculate(e.amount, e.expectedChange ?? 0, yearOffset(e));
            
            if (e.isJointIncome && year >= spouseDeathYear) {
              amount *= e.primaryOwnerShare || 0.7;
            }
            
            return sum + amount;
          }, 0);

        // Calculate expenses with spouse death adjustment
        let nondiscSpend = nondiscretionary
          .filter((e) => year >= e.startYear && year <= e.startYear + e.duration)
          .reduce((sum, e) => {
            let amount = safeCalculate(e.amount, e.expectedChange ?? 0, yearOffset(e));
            
            if (e.isJointExpense && year >= spouseDeathYear) {
              amount *= e.primaryOwnerShare || 0.7;
            }
            
            return sum + amount;
          }, 0);

        let discSpend = discretionary
          .filter((e) => year >= e.startYear && year <= e.startYear + e.duration)
          .reduce(
            (sum, e) =>
              sum +
              safeCalculate(e.amount, e.expectedChange ?? 0, yearOffset(e)),
            0
          );

        let newInvestments = investEvents
          .filter(
            (e) => year >= e.startYear && year <= e.startYear + e.duration
          )
          .reduce(
            (sum, e) =>
              sum +
              safeCalculate(e.amount, e.expectedChange ?? 0, yearOffset(e)),
            0
          );

        let rebalanceAction = rebalanceEvents.find((e) => year === e.startYear);
        let rmd = calculateRMD(year, scenario);
        let roth = runRothConversionOptimizer(year, scenario);

        income += rmd;

        // Adjust tax filing status based on spouse death
        let currentFilingStatus = filingStatus;
        if (year >= spouseDeathYear) {
          const yearsSinceDeath = year - spouseDeathYear;
          if (yearsSinceDeath <= 2 && filingStatus === 'married') {
            currentFilingStatus = 'qualifyingWidow';
          } else {
            currentFilingStatus = 'single';
          }
        }

        const taxBrackets = (
          taxData?.federalTaxBrackets?.[currentFilingStatus] || []
        ).map((b) => ({
          threshold: extractThreshold(b.bracket),
          rate: b.rate / 100,
        }));

        const standardDeduction =
          taxData?.standardDeduction?.[currentFilingStatus] || 0;

        const tax = calculateTax(income, taxBrackets, standardDeduction);

        const netIncome = income - tax;
        const netSpending = nondiscSpend + discSpend;

        investmentPortfolio = investmentPortfolio.map((inv) => {
          const expectedReturn =
            safeNumber(inv.investment?.expectedReturn) / 100;
          const volatility = safeNumber(inv.investment?.volatility) / 100;
          let newValue = simulateInvestmentGrowth(
            inv.currentValue,
            expectedReturn,
            volatility
          );

          if (rebalanceAction?.assetAllocation?.length) {
            const rebalanceAlloc = rebalanceAction.assetAllocation.find(
              (a) => String(a.investment) === String(inv.investment._id)
            );
            if (rebalanceAlloc)
              newValue = newValue * (rebalanceAlloc.percentage / 100);
          }

          return { ...inv, currentValue: newValue };
        });

        if (newInvestments > 0) {
          const totalAlloc = investmentPortfolio.reduce(
            (sum, inv) => sum + safeNumber(inv.allocation),
            0
          );
          investmentPortfolio = investmentPortfolio.map((inv) => {
            const allocRatio = safeNumber(inv.allocation) / (totalAlloc || 1);
            return {
              ...inv,
              currentValue: inv.currentValue + newInvestments * allocRatio,
            };
          });
        }

        if (netIncome < netSpending) {
          let deficit = netSpending - netIncome;
          for (let inv of investmentPortfolio) {
            if (inv.currentValue >= deficit) {
              inv.currentValue -= deficit;
              break;
            } else {
              deficit -= inv.currentValue;
              inv.currentValue = 0;
            }
          }
        }

        const totalInvestmentSum = investmentPortfolio.reduce(
          (sum, inv) => sum + inv.currentValue,
          0
        );

        yearlyAggregates[year].incomeSum += sanitize(netIncome);
        yearlyAggregates[year].expensesSum += sanitize(netSpending);
        yearlyAggregates[year].totalInvestmentSum +=
          sanitize(totalInvestmentSum);

        annualRecords[year] = {
          income: sanitize(income),
          rmd: sanitize(rmd),
          roth: sanitize(roth),
          tax: sanitize(tax),
          netIncome: sanitize(netIncome),
          nondiscretionarySpending: sanitize(nondiscSpend),
          discretionarySpending: sanitize(discSpend),
          newInvestments: sanitize(newInvestments),
          totalInvestmentSum: sanitize(totalInvestmentSum),
          filingStatus: currentFilingStatus,
          spouseAlive: year < spouseDeathYear,
        };
      }

      const finalYear = annualRecords[endYear];
      if (finalYear && finalYear.totalInvestmentSum >= scenario.financialGoal) successfulRuns++;

      simulationResults.push(annualRecords);
    }

    const averageAnnualResults = {};
    for (let year = currentYear; year <= endYear; year++) {
      averageAnnualResults[year] = {
        income: sanitize(yearlyAggregates[year].incomeSum / iterations),
        expenses: sanitize(yearlyAggregates[year].expensesSum / iterations),
        investment: sanitize(
          yearlyAggregates[year].totalInvestmentSum / iterations
        ),
      };
    }

    const chartData = Object.keys(averageAnnualResults).map((year) => ({
      year: parseInt(year),
      averageIncome: averageAnnualResults[year].income,
      averageExpenses: averageAnnualResults[year].expenses,
      averageInvestment: averageAnnualResults[year].investment,
    }));

    const successProbability = (successfulRuns / iterations) * 100;
    simulationResults.push(successProbability);

    res.json({
      successProbability,
      reports: {
        chartData,
      },
    });
  } catch (error) {
    console.error("Simulation error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};
*/}

const getScenarioData = async (scenarioId, userId) => {
  return await Scenario.findOne({ _id: scenarioId, user: userId })
    .populate("investmentTypes.investment")
    .populate("events");
};

const classifyEvents = (events) => {
  return {
    incomeEvents: events.filter((e) => e.type === "income"),
    nondiscretionary: events.filter((e) => e.type === "expense" && !e.discretionary),
    discretionary: events.filter((e) => e.type === "expense" && e.discretionary),
    investEvents: events.filter((e) => e.type === "investment"),
    rebalanceEvents: events.filter((e) => e.type === "rebalance"),
    spouseDeathYear: events.find((e) => e.type === "spouseDeath")?.startYear ?? Infinity,
  };
};

const calculateIncome = (year, events, spouseDeathYear) => {
  return events.reduce((sum, e) => {
    const offset = year - e.startYear;
    if (year < e.startYear || year > e.startYear + e.duration) return sum;

    let amount = safeCalculate(e.amount, e.expectedChange ?? 0, offset);
    if (e.isJointIncome && year >= spouseDeathYear) {
      amount *= e.primaryOwnerShare || 0.7;
    }
    return sum + amount;
  }, 0);
};

const calculateExpenses = (year, events, spouseDeathYear) => {
  return events.reduce((sum, e) => {
    const offset = year - e.startYear;
    if (year < e.startYear || year > e.startYear + e.duration) return sum;

    let amount = safeCalculate(e.amount, e.expectedChange ?? 0, offset);
    if (e.isJointExpense && year >= spouseDeathYear) {
      amount *= e.primaryOwnerShare || 0.7;
    }
    return sum + amount;
  }, 0);
};

const getTaxInfo = (taxData, income, filingStatus) => {
  const brackets = (taxData?.federalTaxBrackets?.[filingStatus] || []).map((b) => ({
    threshold: extractThreshold(b.bracket),
    rate: b.rate / 100,
  }));
  const deduction = taxData?.standardDeduction?.[filingStatus] || 0;
  return calculateTax(income, brackets, deduction);
};

const rebalancePortfolio = (portfolio, rebalanceAction) => {
  return portfolio.map((inv) => {
    const expectedReturn = safeNumber(inv.investment?.expectedReturn) / 100;
    const volatility = safeNumber(inv.investment?.volatility) / 100;
    let newValue = simulateInvestmentGrowth(inv.currentValue, expectedReturn, volatility);

    const alloc = rebalanceAction?.assetAllocation?.find(
      (a) => String(a.investment) === String(inv.investment._id)
    );
    if (alloc) newValue *= alloc.percentage / 100;

    return { ...inv, currentValue: newValue };
  });
};

const allocateNewInvestments = (portfolio, amount) => {
  const totalAlloc = portfolio.reduce((sum, inv) => sum + safeNumber(inv.allocation), 0);
  return portfolio.map((inv) => {
    const ratio = safeNumber(inv.allocation) / (totalAlloc || 1);
    return { ...inv, currentValue: inv.currentValue + amount * ratio };
  });
};

const handleDeficit = (portfolio, deficit) => {
  for (let inv of portfolio) {
    if (inv.currentValue >= deficit) {
      inv.currentValue -= deficit;
      break;
    } else {
      deficit -= inv.currentValue;
      inv.currentValue = 0;
    }
  }
  return portfolio;
};

export const runMonteCarloSimulation = async (req, res) => {
  try {
    const { scenarioId, iterations = 1000 } = req.body;
    const scenario = await getScenarioData(scenarioId, req.userId);

    if (!scenario) return res.status(404).json({ message: "Scenario not found" });

    const taxData = await Tax.findOne().sort({ createdAt: -1 });
    const filingStatus = scenario.taxFilingStatus || "single";
    const currentYear = new Date().getFullYear();
    const endYear = currentYear + scenario.lifeExpectancy;

    const {
      incomeEvents,
      nondiscretionary,
      discretionary,
      investEvents,
      rebalanceEvents,
      spouseDeathYear,
    } = classifyEvents(scenario.events);

    const yearlyAggregates = {};
    for (let y = currentYear; y <= endYear; y++) {
      yearlyAggregates[y] = { incomeSum: 0, expensesSum: 0, totalInvestmentSum: 0 };
    }

    const simulationResults = [];
    let successfulRuns = 0;

    for (let i = 0; i < iterations; i++) {
      let investmentPortfolio = scenario.investmentTypes.map((t) => ({
        ...t._doc,
        currentValue: t.value || 0,
      }));

      let annualRecords = {};

      for (let year = currentYear; year <= endYear; year++) {
        const income = calculateIncome(year, incomeEvents, spouseDeathYear);
        const nondiscSpend = calculateExpenses(year, nondiscretionary, spouseDeathYear);
        const discSpend = calculateExpenses(year, discretionary, spouseDeathYear);
        const newInvestments = calculateExpenses(year, investEvents, Infinity);
        const rebalanceAction = rebalanceEvents.find((e) => year === e.startYear);

        const rmd = calculateRMD(year, scenario);
        const roth = runRothConversionOptimizer(year, scenario);

        let totalIncome = income + rmd;

        let currentFilingStatus = filingStatus;
        if (year >= spouseDeathYear) {
          const yearsSince = year - spouseDeathYear;
          currentFilingStatus =
            filingStatus === "married" && yearsSince <= 2 ? "qualifyingWidow" : "single";
        }

        const tax = getTaxInfo(taxData, totalIncome, currentFilingStatus);
        const netIncome = totalIncome - tax;
        const netSpending = nondiscSpend + discSpend;

        investmentPortfolio = rebalancePortfolio(investmentPortfolio, rebalanceAction);

        if (newInvestments > 0) {
          investmentPortfolio = allocateNewInvestments(investmentPortfolio, newInvestments);
        }

        if (netIncome < netSpending) {
          investmentPortfolio = handleDeficit(investmentPortfolio, netSpending - netIncome);
        }

        const totalInvestmentSum = investmentPortfolio.reduce((sum, inv) => sum + inv.currentValue, 0);

        yearlyAggregates[year].incomeSum += sanitize(netIncome);
        yearlyAggregates[year].expensesSum += sanitize(netSpending);
        yearlyAggregates[year].totalInvestmentSum += sanitize(totalInvestmentSum);

        annualRecords[year] = {
          income: sanitize(totalIncome),
          rmd: sanitize(rmd),
          roth: sanitize(roth),
          tax: sanitize(tax),
          netIncome: sanitize(netIncome),
          nondiscretionarySpending: sanitize(nondiscSpend),
          discretionarySpending: sanitize(discSpend),
          newInvestments: sanitize(newInvestments),
          totalInvestmentSum: sanitize(totalInvestmentSum),
          filingStatus: currentFilingStatus,
          spouseAlive: year < spouseDeathYear,
        };
      }

      const finalYear = annualRecords[endYear];
      if (finalYear?.totalInvestmentSum >= scenario.financialGoal) successfulRuns++;

      simulationResults.push(annualRecords);
    }

    const averageAnnualResults = {};
    for (let year = currentYear; year <= endYear; year++) {
      averageAnnualResults[year] = {
        income: sanitize(yearlyAggregates[year].incomeSum / iterations),
        expenses: sanitize(yearlyAggregates[year].expensesSum / iterations),
        investment: sanitize(yearlyAggregates[year].totalInvestmentSum / iterations),
      };
    }

    const chartData = Object.entries(averageAnnualResults).map(([year, data]) => ({
      year: parseInt(year),
      averageIncome: data.income,
      averageExpenses: data.expenses,
      averageInvestment: data.investment,
    }));

    const successProbability = (successfulRuns / iterations) * 100;
    simulationResults.push(successProbability);
    
    res.json({
      successProbability,
      reports: { chartData },
    });
  } catch (error) {
    console.error("Simulation error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};


export const getSimulationResults = async (req, res) => {
  try {
    const { id } = req.params;
    const simulationResult = await SimulationResult.findOne({ _id: id });

    if (!simulationResult)
      return res.status(404).json({ message: "Simulation results not found" });

    res.status(200).json(simulationResult);
  } catch (error) {
    logScenarioActivity(
      req.params.id,
      `Error fetching simulation results: ${error.message}`
    );
    res.status(500).json({
      message: "Error fetching simulation results",
      error: error.message,
    });
  }
};
