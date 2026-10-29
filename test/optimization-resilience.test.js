import test, { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToString } from 'react-dom/server'
import { normalizeOptimizationResult } from '../src/services/optimizationService.js'
import { OptimizationResults } from '../src/components/optimization/OptimizationResults.jsx'

describe('Optimization Resilience & Normalization Tests', () => {
  it('Scenario 1: Normalizes and renders successful full backend response', () => {
    const mockBackendResponse = {
      success: true,
      message: 'Optimization run completed via QpiAI Opt Classical Engine',
      data: {
        runId: 'OPT-RUN-998877',
        selectedBatchIds: ['EW-2026-00001'],
        assignments: [
          {
            batchId: 'EW-2026-00001',
            batchCategory: 'Consumer Electronics',
            batchWeight: 500,
            facilityId: 'FAC-01',
            facilityName: 'GreenEarth Recyclers Ltd',
            licenceNumber: 'CPCB/KSPCB/E-WASTE/2024/092',
            estimatedCost: 7000,
            unitRateKg: 14,
            status: 'Feasible & Optimized',
          },
        ],
        unassignedBatches: [],
        summary: {
          totalBatches: 1,
          assignedCount: 1,
          unassignedCount: 0,
          totalWeightKg: 500,
          totalOptimizedCost: 7000,
          baselineUnoptimizedCost: 17000,
          costSavings: 10000,
          savingsPercent: 58.8,
        },
        facilityUtilization: [
          {
            id: 'FAC-01',
            name: 'GreenEarth Recyclers Ltd',
            availableCapacityKg: 6800,
            newAllocatedKg: 500,
            utilizationAfterAssignment: 72.5,
          },
        ],
        solverEngine: 'QpiAI Opt Classical Solver',
        isQpiAiCloud: false,
      },
    }

    // Test normalization
    const normalized = normalizeOptimizationResult(mockBackendResponse)
    assert.ok(normalized)
    assert.equal(normalized.summary.baselineUnoptimizedCost, 17000)
    assert.equal(normalized.summary.totalOptimizedCost, 7000)
    assert.equal(normalized.summary.savingsPercent, 58.8)
    assert.equal(normalized.assignments.length, 1)

    // Test JSX render without any error
    const html = renderToString(React.createElement(OptimizationResults, { results: normalized }))
    assert.ok(html.includes('17,000'), 'Should render baseline cost')
    assert.ok(html.includes('7,000'), 'Should render optimized cost')
    assert.ok(html.includes('58.8') && html.includes('Savings'), 'Should render savings')
    assert.ok(html.includes('GreenEarth Recyclers Ltd'), 'Should render assigned facility')
  })

  it('Scenario 2: Handles missing baselineUnoptimizedCost field gracefully', () => {
    // Missing baselineUnoptimizedCost in summary
    const payloadWithMissingField = {
      assignments: [
        {
          batchId: 'EW-2026-00002',
          batchCategory: 'Mixed E-Waste',
          batchWeight: 300,
          facilityName: 'CleanTech E-Solutions Hub',
          estimatedCost: 4500,
        },
      ],
      summary: {
        totalOptimizedCost: 4500,
        // baselineUnoptimizedCost is intentionally undefined/omitted
        savingsPercent: null,
      },
    }

    const normalized = normalizeOptimizationResult(payloadWithMissingField)
    assert.equal(normalized.summary.baselineUnoptimizedCost, null)
    assert.equal(normalized.summary.totalOptimizedCost, 4500)

    // MUST NOT throw "Cannot read properties of undefined (reading 'baselineUnoptimizedCost')"
    let html = ''
    assert.doesNotThrow(() => {
      html = renderToString(React.createElement(OptimizationResults, { results: normalized }))
    })

    assert.ok(html.includes('Not available'), 'Should display "Not available" when baseline cost is missing')
    assert.ok(html.includes('4,500'), 'Should still display optimized total cost')
  })

  it('Scenario 3: Handles completely empty response ({}) without crashing', () => {
    const emptyObject = {}
    const normalized = normalizeOptimizationResult(emptyObject)

    assert.ok(normalized)
    assert.equal(normalized.assignments.length, 0)
    assert.equal(normalized.summary.baselineUnoptimizedCost, null)

    let html = ''
    assert.doesNotThrow(() => {
      html = renderToString(React.createElement(OptimizationResults, { results: emptyObject }))
    })

    assert.ok(html.includes('Not available'))
    assert.ok(html.includes('No batch assignments recommended'))
  })

  it('Scenario 4: Handles null and undefined input gracefully', () => {
    assert.equal(normalizeOptimizationResult(null), null)
    assert.equal(normalizeOptimizationResult(undefined), null)

    const htmlNull = renderToString(React.createElement(OptimizationResults, { results: null }))
    assert.ok(htmlNull.includes('No optimization results available'))
  })

  it('Scenario 5: Handles doubly-nested { data: response, source: "backend" } correctly', () => {
    // This exact structure was what caused the runtime error previously
    const doublyNested = {
      source: 'backend',
      data: {
        success: true,
        data: {
          runId: 'OPT-RUN-123456',
          assignments: [],
          summary: {
            baselineUnoptimizedCost: 28000,
            totalOptimizedCost: 12000,
            savingsPercent: 57.1,
          },
        },
      },
    }

    const normalized = normalizeOptimizationResult(doublyNested)
    assert.equal(normalized.summary.baselineUnoptimizedCost, 28000)
    assert.equal(normalized.summary.totalOptimizedCost, 12000)

    let html = ''
    assert.doesNotThrow(() => {
      html = renderToString(React.createElement(OptimizationResults, { results: doublyNested }))
    })
    assert.ok(html.includes('28,000'))
    assert.ok(html.includes('12,000'))
  })

  it('Scenario 6: Handles failed API response structure and displays readable status', () => {
    // When API returns an error structure or is unparseable
    const apiFailureResponse = {
      success: false,
      message: 'Optimization solver timeout: capacity constraint violated across all certified facilities.',
    }

    const normalized = normalizeOptimizationResult(apiFailureResponse)
    assert.ok(normalized)
    assert.equal(normalized.assignments.length, 0)
    assert.equal(normalized.summary.baselineUnoptimizedCost, null)
    assert.equal(normalized.summary.totalOptimizedCost, null)

    let html = ''
    assert.doesNotThrow(() => {
      html = renderToString(React.createElement(OptimizationResults, { results: apiFailureResponse }))
    })
    assert.ok(html.includes('Not available'), 'Shows Not available for cost metrics')
    assert.ok(html.includes('No batch assignments recommended'), 'Shows friendly message for 0 assignments')
  })
})
