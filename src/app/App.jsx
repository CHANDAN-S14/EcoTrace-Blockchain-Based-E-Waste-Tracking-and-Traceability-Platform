import React from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { BatchProvider } from '../hooks/useBatchStore'

export function App() {
  return (
    <BatchProvider>
      <RouterProvider router={router} />
    </BatchProvider>
  )
}

export default App
