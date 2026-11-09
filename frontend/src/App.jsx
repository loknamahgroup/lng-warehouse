import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth'
import AppShell from './layout/AppShell'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Branches from './pages/Branches'
import Products from './pages/Products'
import Warehouse from './pages/Warehouse'
import Requests from './pages/Requests'
import ApproveRequest from './pages/ApproveRequest'
import CreateRequest from './pages/CreateRequest'
import Holdings from './pages/Holdings'
import Users from './pages/Users'
import Sales from './pages/Sales'
import Movements from './pages/Movements'

function Guard({ children, adminOnly, branchOnly }) {
  const { user, isAdmin } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />
  if (branchOnly && user.role !== 'BRANCH_USER') return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Guard>
            <AppShell />
          </Guard>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="branches" element={<Guard adminOnly><Branches /></Guard>} />
        <Route path="products" element={<Guard adminOnly><Products /></Guard>} />
        <Route path="warehouse" element={<Warehouse />} />
        <Route path="requests" element={<Requests />} />
        <Route path="requests/approve/:id" element={<ApproveRequest />} />
        <Route path="create-request" element={<Guard branchOnly><CreateRequest /></Guard>} />
        <Route path="holdings" element={<Holdings />} />
        <Route path="users" element={<Guard adminOnly><Users /></Guard>} />
        <Route path="movements" element={<Guard adminOnly><Movements /></Guard>} />
        <Route path="sales" element={<Sales />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
