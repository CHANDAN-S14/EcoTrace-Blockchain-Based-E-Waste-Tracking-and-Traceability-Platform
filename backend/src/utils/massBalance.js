/**
 * Mass-Balance Conservation Calculator
 * Implements CPCB Schedule III mass conservation standards:
 * Accounted Output = Recovered Materials + Residual Waste + Documented Loss
 * Mass Balance Difference = Input Weight - Accounted Output
 * Recovery Yield = Recovered Material / Input Weight * 100
 */

export function calculateMassBalance({
  inputWeight,
  materials = {},
  residualWaste = 0,
  explainedLoss = 0,
  tolerancePercent = 20,
}) {
  const numInput = Number(inputWeight) || 0

  // Calculate sum of recovered valuable materials
  const recoveredMaterialWeight = Object.values(materials).reduce(
    (sum, val) => sum + (Number(val) || 0),
    0
  )

  const numResidual = Number(residualWaste) || 0
  const numLoss = Number(explainedLoss) || 0

  const accountedOutput = recoveredMaterialWeight + numResidual + numLoss
  const difference = numInput - accountedOutput
  const recoveryYield = numInput > 0 ? (recoveredMaterialWeight / numInput) * 100 : 0
  const discrepancyPercent = numInput > 0 ? (Math.abs(difference) / numInput) * 100 : 0

  let validationStatus = 'Reconciled'
  let flagReason = null

  if (numInput <= 0) {
    validationStatus = 'Needs Review'
    flagReason = 'Input weight must be greater than zero.'
  } else if (discrepancyPercent > 2.0) {
    validationStatus = 'Discrepancy Detected'
    flagReason = `Unexplained mass gap of ${difference > 0 ? '+' : ''}${difference.toFixed(2)} kg (${discrepancyPercent.toFixed(1)}%) exceeds 2.0% threshold.`
  } else if (discrepancyPercent > tolerancePercent) {
    validationStatus = 'Needs Review'
    flagReason = `Unexplained mass variance of ${difference.toFixed(2)} kg (${discrepancyPercent.toFixed(1)}%) exceeds certified tolerance of ${tolerancePercent}%.`
  } else {
    validationStatus = 'Reconciled'
  }

  return {
    inputWeight: Number(numInput.toFixed(2)),
    recoveredMaterialWeight: Number(recoveredMaterialWeight.toFixed(2)),
    residualWaste: Number(numResidual.toFixed(2)),
    explainedLoss: Number(numLoss.toFixed(2)),
    accountedOutput: Number(accountedOutput.toFixed(2)),
    difference: Number(difference.toFixed(2)),
    recoveryYield: Number(recoveryYield.toFixed(2)),
    discrepancyPercent: Number(discrepancyPercent.toFixed(2)),
    validationStatus,
    flagReason,
  }
}
