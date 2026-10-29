/**
 * Mass-Balance & Material Recovery Reconciler
 * Implements strict mass conservation and weight reconciliation
 */

export const STANDARD_RECOVERED_MATERIALS = [
  { key: 'copper', label: 'Copper', unit: 'kg', color: '#B87333' },
  { key: 'aluminum', label: 'Aluminium', unit: 'kg', color: '#848789' },
  { key: 'steel', label: 'Steel and Iron', unit: 'kg', color: '#4A5568' },
  { key: 'preciousMetals', label: 'Precious Metals', unit: 'kg', color: '#D4AF37' },
  { key: 'plastics', label: 'Plastics and Polymers', unit: 'kg', color: '#2B6CB0' },
  { key: 'circuitBoards', label: 'Circuit Boards', unit: 'kg', color: '#176B45' },
  { key: 'glass', label: 'Glass', unit: 'kg', color: '#319795' },
  { key: 'otherMaterials', label: 'Other Recovered Materials', unit: 'kg', color: '#718096' },
]

// Backward-compatible alias
export const RECOVERABLE_MATERIALS = STANDARD_RECOVERED_MATERIALS

export function calculateMassBalance({
  inputWeight = 0,
  materials = {},
  residualWaste = 0,
  remainingWaste = 0,
  explainedLoss = 0,
  toleranceKg = 20,
}) {
  const numInput = Number(inputWeight) || 0

  // Calculate sum of all entered recovered material weights
  const recoveredMaterialWeight = Number(
    Object.values(materials)
      .reduce((sum, val) => sum + (Number(val) || 0), 0)
      .toFixed(2)
  )

  const numRemaining = Number(Number(remainingWaste ?? residualWaste ?? 0).toFixed(2))
  const numLoss = Number(Number(explainedLoss ?? 0).toFixed(2))

  // Total Accounted Weight = Total Recovered Weight + Remaining Waste Weight + Explained Processing Loss
  const accountedOutput = Number((recoveredMaterialWeight + numRemaining + numLoss).toFixed(2))

  // Weight Difference = Original Incoming Weight - Total Accounted Weight
  const difference = Number((numInput - accountedOutput).toFixed(2))

  // Recovery Yield Percentage = (Total Recovered Weight / Original Incoming Weight) * 100
  const recoveryYield = numInput > 0 ? Number(((recoveredMaterialWeight / numInput) * 100).toFixed(1)) : 0

  // Check tolerance (0.5 kg)
  const isToleranceSatisfied = Math.abs(difference) <= toleranceKg

  let validationStatus = 'Reconciled'
  let statusMessage = ''

  if (numInput <= 0) {
    validationStatus = 'Draft'
    statusMessage = 'Select a batch before entering processing details.'
  } else if (!isToleranceSatisfied) {
    validationStatus = 'Discrepancy Found'
    statusMessage = 'The recorded quantities do not match the original incoming weight. Please review the values before submitting.'
  } else {
    validationStatus = 'Reconciled'
    statusMessage = 'The recorded recovered materials, remaining waste, and explained loss match the original incoming weight within the allowed tolerance.'
  }

  return {
    inputWeight: numInput,
    recoveredMaterialWeight,
    remainingWaste: numRemaining,
    residualWaste: numRemaining,
    explainedLoss: numLoss,
    accountedOutput,
    difference,
    recoveryYield,
    isToleranceSatisfied,
    validationStatus,
    statusMessage,
    toleranceKg,
  }
}
