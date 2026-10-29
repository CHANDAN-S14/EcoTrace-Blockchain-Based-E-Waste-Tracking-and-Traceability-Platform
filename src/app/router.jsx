import React from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { DashboardPage } from '../pages/DashboardPage'
import { BatchRegistrationPage } from '../pages/BatchRegistrationPage'
import { ChainOfCustodyPage } from '../pages/ChainOfCustodyPage'
import { ProcessingRecoveryPage } from '../pages/ProcessingRecoveryPage'
import { RecyclerAssignmentPage } from '../pages/RecyclerAssignmentPage'
import { QuantumLabPage } from '../pages/QuantumLabPage'
import { AuditCompliancePage } from '../pages/AuditCompliancePage'
import { FacilitiesPage } from '../pages/FacilitiesPage'
import { ReportsPage } from '../pages/ReportsPage'
import { UsersPage } from '../pages/UsersPage'
import { AboutPage } from '../pages/AboutPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { RouteErrorScreen } from '../components/common/RouteErrorScreen'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <RouteErrorScreen />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'batches',
        element: <BatchRegistrationPage />,
      },
      {
        path: 'custody',
        element: <ChainOfCustodyPage />,
      },
      {
        path: 'recovery',
        element: <ProcessingRecoveryPage />,
      },
      {
        path: 'optimization',
        element: <RecyclerAssignmentPage />,
      },
      {
        path: 'dispatch',
        element: <RecyclerAssignmentPage />,
      },
      {
        path: 'quantum-lab',
        element: <QuantumLabPage />,
      },
      {
        path: 'audit',
        element: <AuditCompliancePage />,
      },
      {
        path: 'facilities',
        element: <FacilitiesPage />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
      {
        path: 'users',
        element: <UsersPage />,
      },
      {
        path: 'about',
        element: <AboutPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
