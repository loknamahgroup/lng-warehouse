import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AppThemeProvider } from './theme'
import { AuthProvider } from './auth'
import { FeedbackProvider } from './components/Feedback'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppThemeProvider>
        <FeedbackProvider>
          <AuthProvider>
            <ErrorBoundary>
              <App />
            </ErrorBoundary>
          </AuthProvider>
        </FeedbackProvider>
      </AppThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
