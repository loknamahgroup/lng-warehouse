// Features an admin can grant to a sub-admin (keys match the backend Permission enum).
export const PERMISSIONS = [
  { key: 'REQUESTS_APPROVE', label: 'Approve / reject requests', hint: 'Review, adjust, approve, reject or cancel any branch order' },
  { key: 'STOCK_MANAGE', label: 'Manage warehouse stock', hint: 'Restock, set on-hand, bulk updates and stock history' },
  { key: 'PRODUCTS_MANAGE', label: 'Manage products', hint: 'Add, edit, activate or deactivate products' },
  { key: 'BRANCHES_MANAGE', label: 'Manage branches', hint: 'Add, edit, activate or deactivate branches' },
  { key: 'USERS_MANAGE', label: 'Manage users', hint: 'Create and edit branch users and sub-admins (never admins, never more access than you have)' },
  { key: 'MOVEMENTS_VIEW', label: 'View stock movements', hint: 'Audit trail of all warehouse stock changes' }
]
