export interface AssetDepreciationResult {
  initialCost: number;
  salvageValue: number;
  usefulLifeMonths: number;
  usefulLifeYears: number;
  monthlyDepreciation: number;
  annualDepreciation: number;
  monthsUsed: number;
  remainingMonths: number;
  accumulatedDepreciation: number;
  currentBookValue: number;
  depreciationPercentage: number;
  isFullyDepreciated: boolean;
}

export function calculateStraightLineDepreciation(
  price: number | null | undefined,
  salvageValue: number | null | undefined = 0,
  usefulLifeMonths: number | null | undefined = 60,
  purchaseDate: Date | string | null | undefined,
  targetDate: Date | string = new Date()
): AssetDepreciationResult {
  const cost = Number(price) || 0;
  const salvage = Math.max(0, Number(salvageValue) || 0);
  const lifeMonths = Math.max(1, Number(usefulLifeMonths) || 60);
  const lifeYears = Math.round((lifeMonths / 12) * 10) / 10;

  if (cost <= 0) {
    return {
      initialCost: 0,
      salvageValue: salvage,
      usefulLifeMonths: lifeMonths,
      usefulLifeYears: lifeYears,
      monthlyDepreciation: 0,
      annualDepreciation: 0,
      monthsUsed: 0,
      remainingMonths: lifeMonths,
      accumulatedDepreciation: 0,
      currentBookValue: 0,
      depreciationPercentage: 0,
      isFullyDepreciated: false
    };
  }

  const pDate = purchaseDate ? new Date(purchaseDate) : new Date();
  const tDate = new Date(targetDate);

  let monthsUsed = 0;
  if (tDate > pDate) {
    monthsUsed = (tDate.getFullYear() - pDate.getFullYear()) * 12 + (tDate.getMonth() - pDate.getMonth());
    if (tDate.getDate() >= pDate.getDate()) {
      monthsUsed += 1;
    }
    monthsUsed = Math.max(0, monthsUsed);
  }

  const cappedMonthsUsed = Math.min(lifeMonths, monthsUsed);
  const depreciableAmount = Math.max(0, cost - salvage);
  const monthlyDep = depreciableAmount / lifeMonths;
  const annualDep = monthlyDep * 12;

  const accumulatedDep = Math.min(depreciableAmount, Math.round(monthlyDep * cappedMonthsUsed));
  const currentBookVal = Math.max(salvage, Math.round(cost - accumulatedDep));
  const remainingMonths = Math.max(0, lifeMonths - cappedMonthsUsed);
  const depPct = depreciableAmount > 0 ? Math.min(100, Math.round((accumulatedDep / depreciableAmount) * 100)) : 100;
  const isFullyDepreciated = cappedMonthsUsed >= lifeMonths;

  return {
    initialCost: cost,
    salvageValue: salvage,
    usefulLifeMonths: lifeMonths,
    usefulLifeYears: lifeYears,
    monthlyDepreciation: Math.round(monthlyDep),
    annualDepreciation: Math.round(annualDep),
    monthsUsed: cappedMonthsUsed,
    remainingMonths,
    accumulatedDepreciation: accumulatedDep,
    currentBookValue: currentBookVal,
    depreciationPercentage: depPct,
    isFullyDepreciated
  };
}

export function formatRupiah(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(amount);
}
