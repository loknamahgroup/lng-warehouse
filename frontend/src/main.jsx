import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AppThemeProvider } from './theme'
import { AuthProvider } from './auth'
import { FeedbackProvider } from './components/Feedback'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppThemeProvider>
        <FeedbackProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </FeedbackProvider>
      </AppThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
)
