import { useEffect, useState } from 'react'
import './Dashboard.css'
import { LayoutDashboard, Users, Package, ShieldCheck, ChartNoAxesCombined, ClipboardList, Settings, Boxes, ShoppingBag, CreditCard, Truck, Star, RotateCcw, Store, LogOut, Menu, X, ArrowRight } from 'lucide-react'


const NAV_ICONS = { overview: LayoutDashboard, accounts: Users, products: Package, permissions: ShieldCheck, reports: ChartNoAxesCombined, audit: ClipboardList, settings: Settings, inventory: Boxes, orders: ShoppingBag, payments: CreditCard, delivery: Truck, reviews: Star, returns: RotateCcw }

const NAV = {
  OWNER: [
    ['overview', 'Overview'], ['accounts', 'Team & Accounts'],
    ['products', 'Products'],
    ['permissions', 'Role Permissions'], ['reports', 'Business Reports'],
    ['audit', 'Audit Log'], ['settings', 'System Settings'],
  ],
  ADMIN: [
    ['overview', 'Overview'], ['products', 'Products'],
    ['inventory', 'Inventory'], ['orders', 'Orders'],
    ['payments', 'Payments & Refunds'], ['delivery', 'Delivery'],
    ['reviews', 'Reviews'], ['returns', 'Returns'],
  ],
  STAFF: [
    ['overview', 'Overview'], ['inventory', 'Inventory'],
    ['orders', 'Orders'], ['delivery', 'Delivery'],
    ['reviews', 'Reviews'],
  ],
}

const DESCRIPTIONS = {
  overview: 'Your workspace at a glance. Live figures will appear when connected to the API.',
  accounts: 'Create team accounts and manage account access.',
  permissions: 'Review and manage role-based access through secured Owner-only APIs.',
  reports: 'Business and financial reporting will appear here when connected to reporting endpoints.',
  audit: 'Review recorded account and permission changes.',
  settings: 'Owner-only system configuration.',
  products: 'Manage the product catalogue through authorized API actions.',
  inventory: 'Monitor stock and update inventory according to your assigned permissions.',
  orders: 'Review and process orders according to your assigned permissions.',
  payments: 'Payment verification and refund processing for authorized roles.',
  delivery: 'Review delivery tasks and update delivery status.',
  reviews: 'Review customer feedback according to your permissions.',
  returns: 'Review return requests and permitted return operations.',
}

const resolveImageUrl = (url) => {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return "http://localhost:8000" + (url.startsWith('/') ? url : '/' + url)
}

function Dashboard({ user, token, onReturnToStore, onLogout }) {
  const role = String(user?.role || 'CUSTOMER').toUpperCase()
  const sections = NAV[role] || []
  const [active, setActive] = useState('overview')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [permissionRoles, setPermissionRoles] = useState([])
  const [selectedPermissionRole, setSelectedPermissionRole] = useState('ADMIN')
  const [draftPermissions, setDraftPermissions] = useState([])
  const [permissionsLoading, setPermissionsLoading] = useState(false)
  const [permissionsSaving, setPermissionsSaving] = useState(false)
  const [permissionsError, setPermissionsError] = useState('')
  const [accounts, setAccounts] = useState([])
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [accountsError, setAccountsError] = useState('')
  const [accountSearch, setAccountSearch] = useState('')
  const [accountRoleFilter, setAccountRoleFilter] = useState('ALL')
  const [accountStatusFilter, setAccountStatusFilter] = useState('ALL')
  const [accountActionId, setAccountActionId] = useState(null)
  const [auditLogs, setAuditLogs] = useState([])
  const [auditLoading, setAuditLoading] = useState(false)
  const [auditError, setAuditError] = useState('')
  const [accountCreateForm, setAccountCreateForm] = useState({ role: 'STAFF', name: '', email: '', password: '' })
  const [accountCreateLoading, setAccountCreateLoading] = useState(false)
  const [accountCreateError, setAccountCreateError] = useState('')
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productsError, setProductsError] = useState('')
  const [productCreateError, setProductCreateError] = useState('')
  const [productCreateLoading, setProductCreateLoading] = useState(false)
  const [productForm, setProductForm] = useState({ name: '', description: '', category_id: '', brand_id: '', part_number: '', sku: '', price: '', stock_quantity: '0' })
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' })
  const [brandForm, setBrandForm] = useState({ name: '', description: '' })
  const [categoryCreateError, setCategoryCreateError] = useState('')
  const [brandCreateError, setBrandCreateError] = useState('')
  const [categoryCreateLoading, setCategoryCreateLoading] = useState(false)
  const [brandCreateLoading, setBrandCreateLoading] = useState(false)
  const [imageFiles, setImageFiles] = useState({})
  const [imagePrimary, setImagePrimary] = useState({})
  const [imageUploadLoading, setImageUploadLoading] = useState({})
  const [imageUploadStatus, setImageUploadStatus] = useState({})
  const [productImages, setProductImages] = useState({})
  const [imageGalleryLoading, setImageGalleryLoading] = useState({})
  const [imageGalleryError, setImageGalleryError] = useState({})
  const [imageDeleteLoading, setImageDeleteLoading] = useState({})
  const [imageDeleteStatus, setImageDeleteStatus] = useState({})
  const title = sections.find(([id]) => id === active)?.[1] || 'Dashboard'
  const firstName = user?.name?.trim().split(/\s+/)[0] || 'there'
  const initials = (user?.name || 'M').trim().split(/\s+/).slice(0, 2).map(x => x[0]?.toUpperCase()).join('')

  const navigate = (id) => {
    setActive(id)
    setMobileOpen(false)
    setNotice('')
  }

  useEffect(() => {
    if (active !== 'permissions' || role !== 'OWNER') return
    if (!token) {
      setPermissionsError('Your session token is missing. Please sign in again.')
      return
    }

    let cancelled = false
    const loadPermissions = async () => {
      setPermissionsLoading(true)
      setPermissionsError('')
      try {
        const response = await fetch('http://localhost:8000/api/v1/users/roles/permissions', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.detail || `Unable to load permissions (HTTP ${response.status}).`)
        if (!Array.isArray(data)) throw new Error('The server returned an unexpected permissions response.')
        if (!cancelled) {
          setPermissionRoles(data)
          const current = data.find(item => item.role === selectedPermissionRole) || data.find(item => item.role === 'ADMIN') || data[0]
          if (current) {
            setSelectedPermissionRole(current.role)
            setDraftPermissions(current.permissions || [])
          }
        }
      } catch (error) {
        if (!cancelled) setPermissionsError(error.message || 'Unable to load role permissions.')
      } finally {
        if (!cancelled) setPermissionsLoading(false)
      }
    }

    loadPermissions()
    return () => { cancelled = true }
  }, [active, role, token])

  useEffect(() => {
    const selected = permissionRoles.find(item => item.role === selectedPermissionRole)
    if (selected) setDraftPermissions(selected.permissions || [])
  }, [selectedPermissionRole, permissionRoles])

  useEffect(() => {
    if (role !== 'OWNER' || !['accounts', 'audit'].includes(active)) return
    let cancelled = false

    const loadOwnerData = async () => {
      const isAccounts = active === 'accounts'
      if (isAccounts) {
        setAccountsLoading(true)
        setAccountsError('')
      } else {
        setAuditLoading(true)
        setAuditError('')
      }

      if (!token) {
        const message = 'Your session token is missing. Please sign in again.'
        if (isAccounts) setAccountsError(message)
        else setAuditError(message)
        if (isAccounts) setAccountsLoading(false)
        else setAuditLoading(false)
        return
      }

      try {
        const endpoint = isAccounts
          ? 'http://localhost:8000/api/v1/users'
          : 'http://localhost:8000/api/v1/users/audit?limit=100'
        const response = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data.detail || `Unable to load data (HTTP ${response.status}).`)
        if (!Array.isArray(data)) throw new Error('The server returned an unexpected response.')
        if (!cancelled) {
          if (isAccounts) setAccounts(data)
          else setAuditLogs(data)
        }
      } catch (error) {
        if (!cancelled) {
          if (isAccounts) setAccountsError(error.message || 'Unable to load accounts.')
          else setAuditError(error.message || 'Unable to load activity.')
        }
      } finally {
        if (!cancelled) {
          if (isAccounts) setAccountsLoading(false)
          else setAuditLoading(false)
        }
      }
    }

    loadOwnerData()
    return () => { cancelled = true }
  }, [active, role, token])
  useEffect(() => {
    if (role !== 'OWNER' || active !== 'products') return
    let cancelled = false
    const loadProductsPage = async () => {
      setProductsLoading(true)
      setProductsError('')
      try {
        const endpoints = [
          'http://localhost:8000/api/v1/products',
          'http://localhost:8000/api/v1/categories',
          'http://localhost:8000/api/v1/brands',
        ]
        const results = await Promise.all(endpoints.map(async endpoint => {
          const response = await fetch(endpoint)
          const data = await response.json().catch(() => ({}))
          if (!response.ok) {
            const detail = Array.isArray(data.detail) ? data.detail.map(item => item.msg).join(', ') : data.detail
            throw new Error(detail || `Unable to load catalogue data (HTTP ${response.status}).`)
          }
          if (!Array.isArray(data)) throw new Error('The server returned an unexpected catalogue response.')
          return data
        }))
        if (!cancelled) {
          setProducts(results[0])
          await Promise.all(results[0].map(product => loadProductImages(product.id)))
          setCategories(results[1])
          setBrands(results[2])
        }
      } catch (error) {
        if (!cancelled) setProductsError(error.message || 'Unable to load the product catalogue.')
      } finally {
        if (!cancelled) setProductsLoading(false)
      }
    }
    loadProductsPage()
    return () => { cancelled = true }
  }, [active, role])

  const staffAllowedPermissions = [
    'PRODUCT_READ', 'INVENTORY_VIEW', 'INVENTORY_UPDATE',
    'ORDER_VIEW', 'ORDER_UPDATE', 'DELIVERY_VIEW', 'DELIVERY_UPDATE',
    'REVIEW_VIEW', 'RETURN_VIEW', 'BRAND_CREATE', 'BRAND_UPDATE',
    'CATEGORY_CREATE', 'CATEGORY_UPDATE',
  ]
  const ownerProtectedPermissions = new Set([
    'USER_VIEW', 'USER_MANAGE', 'AUDIT_VIEW', 'SYSTEM_SETTINGS',
  ])
  const selectedRoleData = permissionRoles.find(item => item.role === selectedPermissionRole)
  const visiblePermissions = (selectedRoleData?.available_permissions || []).filter(permission =>
    selectedPermissionRole === 'STAFF'
      ? staffAllowedPermissions.includes(permission)
      : !ownerProtectedPermissions.has(permission)
  )

  const saveRolePermissions = async () => {
    if (!token || permissionsSaving) return
    setPermissionsSaving(true)
    setPermissionsError('')
    setNotice('')
    try {
      const response = await fetch(`http://localhost:8000/api/v1/users/roles/${selectedPermissionRole}/permissions`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions: selectedPermissionRole === 'STAFF' ? draftPermissions.filter(permission => staffAllowedPermissions.includes(permission)) : draftPermissions }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.detail || `Unable to save permissions (HTTP ${response.status}).`)
      setPermissionRoles(previous => previous.map(item => item.role === data.role ? data : item))
      setDraftPermissions(data.permissions || [])
      setNotice(`Permissions for ${data.role} saved successfully.`)
    } catch (error) {
      setPermissionsError(error.message || 'Unable to save role permissions.')
    } finally {
      setPermissionsSaving(false)
    }
  }
  const createAccount = async (event) => {
    event.preventDefault()
    if (!token || accountCreateLoading) return
    setAccountCreateLoading(true)
    setAccountCreateError('')
    setAccountsError('')
    setNotice('')
    try {
      const endpoint = accountCreateForm.role === 'ADMIN' ? 'admin' : 'staff'
      const response = await fetch(`http://localhost:8000/api/v1/users/${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: accountCreateForm.name.trim(),
          email: accountCreateForm.email.trim(),
          password: accountCreateForm.password,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const detail = Array.isArray(data.detail)
          ? data.detail.map(item => item.msg).join(', ')
          : data.detail
        throw new Error(detail || `Unable to create account (HTTP ${response.status}).`)
      }
      setAccounts(previous => [data, ...previous.filter(item => item.id !== data.id)])
      setAccountCreateForm({ role: 'STAFF', name: '', email: '', password: '' })
      setNotice(`${data.name || 'Account'} was created successfully.`)
    } catch (error) {
      setAccountCreateError(error.message || 'Unable to create account.')
    } finally {
      setAccountCreateLoading(false)
    }
  }
  const createCategory = async (event) => {
    event.preventDefault()
    if (!token || categoryCreateLoading) {
      if (!token) setCategoryCreateError('Your session token is missing. Please sign in again.')
      return
    }
    setCategoryCreateLoading(true)
    setCategoryCreateError('')
    setNotice('')
    try {
      const response = await fetch('http://localhost:8000/api/v1/categories', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryForm.name.trim(),
          description: categoryForm.description.trim() || null,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const detail = Array.isArray(data.detail) ? data.detail.map(item => item.msg).join(', ') : data.detail
        throw new Error(detail || `Unable to create category (HTTP ${response.status}).`)
      }
      setCategories(previous => [...previous.filter(item => item.id !== data.id), data].sort((a, b) => a.name.localeCompare(b.name)))
      setCategoryForm({ name: '', description: '' })
      setNotice(`Category "${data.name}" was created successfully.`)
    } catch (error) {
      setCategoryCreateError(error.message || 'Unable to create category.')
    } finally {
      setCategoryCreateLoading(false)
    }
  }

  const createBrand = async (event) => {
    event.preventDefault()
    if (!token || brandCreateLoading) {
      if (!token) setBrandCreateError('Your session token is missing. Please sign in again.')
      return
    }
    setBrandCreateLoading(true)
    setBrandCreateError('')
    setNotice('')
    try {
      const response = await fetch('http://localhost:8000/api/v1/brands', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: brandForm.name.trim(),
          description: brandForm.description.trim() || null,
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const detail = Array.isArray(data.detail) ? data.detail.map(item => item.msg).join(', ') : data.detail
        throw new Error(detail || `Unable to create brand (HTTP ${response.status}).`)
      }
      setBrands(previous => [...previous.filter(item => item.id !== data.id), data].sort((a, b) => a.name.localeCompare(b.name)))
      setBrandForm({ name: '', description: '' })
      setNotice(`Brand "${data.name}" was created successfully.`)
    } catch (error) {
      setBrandCreateError(error.message || 'Unable to create brand.')
    } finally {
      setBrandCreateLoading(false)
    }
  }
  const loadProductImages = async (productId) => {
    setImageGalleryLoading(previous => ({ ...previous, [productId]: true }))
    setImageGalleryError(previous => ({ ...previous, [productId]: '' }))
    try {
      const response = await fetch(`http://localhost:8000/api/v1/products/${productId}/images`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const detail = Array.isArray(data.detail) ? data.detail.map(item => item.msg).join(', ') : data.detail
        throw new Error(detail || `Unable to load images (HTTP ${response.status}).`)
      }
      if (!Array.isArray(data)) throw new Error('The server returned an unexpected image gallery response.')
      setProductImages(previous => ({ ...previous, [productId]: data }))
      return data
    } catch (error) {
      setImageGalleryError(previous => ({ ...previous, [productId]: error.message || 'Unable to load product images.' }))
    } finally {
      setImageGalleryLoading(previous => ({ ...previous, [productId]: false }))
    }
  }

  const deleteProductImage = async (productId, image) => {
    if (!token) {
      setImageDeleteStatus(previous => ({ ...previous, [image.id]: { type: 'error', message: 'Your session has expired. Please sign in again.' } }))
      return
    }
    if (!window.confirm('Delete this product image? This action cannot be undone.')) return
    if (imageDeleteLoading[image.id]) return

    setImageDeleteLoading(previous => ({ ...previous, [image.id]: true }))
    setImageDeleteStatus(previous => ({ ...previous, [image.id]: null }))
    try {
      const response = await fetch(`http://localhost:8000/api/v1/products/${productId}/images/${image.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        const detail = Array.isArray(data.detail) ? data.detail.map(item => item.msg).join(', ') : data.detail
        throw new Error(detail || `Unable to delete image (HTTP ${response.status}).`)
      }

      await loadProductImages(productId)
      const remainingImages = productImages[productId] || []
      const wasPrimary = image.is_primary
      if (wasPrimary) {
        setProducts(previous => previous.map(product => product.id === productId
          ? { ...product, image_url: remainingImages.find(item => item.is_primary)?.public_url || null }
          : product))
      }
      setImageDeleteStatus(previous => ({ ...previous, [image.id]: { type: 'success', message: 'Image deleted successfully.' } }))
    } catch (error) {
      setImageDeleteStatus(previous => ({ ...previous, [image.id]: { type: 'error', message: error.message || 'Unable to delete image.' } }))
    } finally {
      setImageDeleteLoading(previous => ({ ...previous, [image.id]: false }))
    }
  }

  const uploadProductImage = async (productId) => {
    const files = Array.from(imageFiles[productId] || [])
    if (!token) {
      setImageUploadStatus(previous => ({ ...previous, [productId]: { type: 'error', message: 'Your session has expired. Please sign in again.' } }))
      return
    }
    if (files.length === 0) {
      setImageUploadStatus(previous => ({ ...previous, [productId]: { type: 'error', message: 'Choose one or more image files first.' } }))
      return
    }
    if (imageUploadLoading[productId]) return

    setImageUploadLoading(previous => ({ ...previous, [productId]: true }))
    setImageUploadStatus(previous => ({ ...previous, [productId]: null }))
    try {
      let uploaded = 0
      let primaryUrl = ''
      const productName = products.find(item => item.id === productId)?.name || 'Automotive part'

      for (let index = 0; index < files.length; index++) {
        const file = files[index]
        const makePrimary = imagePrimary[productId] !== false && index === 0
        const formData = new FormData()
        formData.append('file', file)
        formData.append('alt_text', productName)
        formData.append('is_primary', String(makePrimary))
        formData.append('sort_order', String(index))

        const response = await fetch(`http://localhost:8000/api/v1/products/${productId}/images`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) {
          const detail = Array.isArray(data.detail) ? data.detail.map(item => item.msg).join(', ') : data.detail
          throw new Error(`Uploaded ${uploaded} of ${files.length} images. ${detail || `Upload failed for ${file.name} (HTTP ${response.status}).`}`)
        }
        uploaded++
        if (makePrimary && data.public_url) primaryUrl = data.public_url
      }

      if (primaryUrl) {
        setProducts(previous => previous.map(item => item.id === productId ? { ...item, image_url: primaryUrl } : item))
      }
      setImageFiles(previous => ({ ...previous, [productId]: [] }))
      await loadProductImages(productId)
      setImageUploadStatus(previous => ({ ...previous, [productId]: { type: 'success', message: `${uploaded} image${uploaded === 1 ? '' : 's'} uploaded successfully.` } }))
    } catch (error) {
      setImageUploadStatus(previous => ({ ...previous, [productId]: { type: 'error', message: error.message || 'Unable to upload images.' } }))
    } finally {
      setImageUploadLoading(previous => ({ ...previous, [productId]: false }))
    }
  }

  const createProduct = async (event) => {
    event.preventDefault()
    if (productCreateLoading) return
    if (!token) {
      setProductCreateError('Your session token is missing. Please sign in again.')
      return
    }
    setProductCreateLoading(true)
    setProductCreateError('')
    setProductsError('')
    setNotice('')
    try {
      const response = await fetch('http://localhost:8000/api/v1/products', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: productForm.name.trim(),
          description: productForm.description.trim() || null,
          category_id: productForm.category_id ? Number(productForm.category_id) : null,
          brand_id: productForm.brand_id ? Number(productForm.brand_id) : null,
          part_number: productForm.part_number.trim() || null,
          sku: productForm.sku.trim() || null,
          price: productForm.price,
          stock_quantity: Number(productForm.stock_quantity || 0),
        }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        const detail = Array.isArray(data.detail) ? data.detail.map(item => item.msg).join(', ') : data.detail
        throw new Error(detail || `Unable to create product (HTTP ${response.status}).`)
      }
      setProducts(previous => [data, ...previous.filter(item => item.id !== data.id)])
      setProductForm({ name: '', description: '', category_id: '', brand_id: '', part_number: '', sku: '', price: '', stock_quantity: '0' })
      setNotice(`${data.name || 'Product'} was added to the catalogue successfully.`)
    } catch (error) {
      setProductCreateError(error.message || 'Unable to create product.')
    } finally {
      setProductCreateLoading(false)
    }
  }

  const updateAccountStatus = async (account) => {
    if (!token || accountActionId !== null || (account.id === user?.id && account.is_active)) return
    const nextStatus = !account.is_active
    const actionLabel = nextStatus ? 'activate' : 'suspend'
    if (!window.confirm(`Are you sure you want to ${actionLabel} ${account.name}'s account?`)) return

    setAccountActionId(account.id)
    setAccountsError('')
    setNotice('')
    try {
      const response = await fetch(`http://localhost:8000/api/v1/users/${account.id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: nextStatus }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.detail || `Unable to update account (HTTP ${response.status}).`)
      setAccounts(previous => previous.map(item => item.id === data.id ? data : item))
      setNotice(`${data.name}'s account was ${nextStatus ? 'activated' : 'suspended'} successfully.`)
    } catch (error) {
      setAccountsError(error.message || 'Unable to update account status.')
    } finally {
      setAccountActionId(null)
    }
  }
  return (
    <div className="mv-dashboard">
      <aside className={`mv-sidebar ${mobileOpen ? 'mv-sidebar-open' : ''}`}>
        <button className="mv-brand" onClick={onReturnToStore}>
          <span className="mv-logo-mark">M<span>.</span></span>
          <span className="mv-logo-copy">MOTI<span>.VEX</span><small>CONTROL CENTER</small></span>
        </button>
        <div className="mv-nav-label">WORKSPACE</div>
        <nav className="mv-nav">
          {sections.map(([id, label], i) => (
            <button key={id} className={`mv-nav-item ${active === id ? 'active' : ''}`} onClick={() => navigate(id)}>
              <span className="mv-nav-icon">{(() => { const Icon = NAV_ICONS[id] || LayoutDashboard; return <Icon size={19} strokeWidth={1.8} aria-hidden="true" /> })()}</span>
              {label}
              {active === id && <span className="mv-nav-bar" />}
            </button>
          ))}
        </nav>
        <div className="mv-sidebar-bottom">
          <div className="mv-status"><span /> Workspace ready</div>
          <button onClick={onReturnToStore}><Store size={16} aria-hidden="true" /> &nbsp; Back to storefront</button>
          <button className="mv-signout" onClick={onLogout}><LogOut size={16} aria-hidden="true" /> &nbsp; Sign out</button>
        </div>
      </aside>

      {mobileOpen && <button className="mv-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}

      <main className="mv-main">
        <header className="mv-topbar">
          <button className="mv-menu-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation">{mobileOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}</button>
          <div className="mv-breadcrumb">MOTI.VEX <span>/</span> {title}</div>
          <div className="mv-user">
            <div className="mv-avatar">{initials || 'M'}</div>
            <div><strong>{user?.name || 'Moti.Vex User'}</strong><small>{role}</small></div>
          </div>
        </header>

        <section className="mv-content">
          <div className="mv-heading">
            <div>
              <div className="mv-eyebrow"><span /> {role} WORKSPACE</div>
              <h1>{active === 'overview' ? 'Dashboard overview' : title}<em>.</em></h1>
              <p>{DESCRIPTIONS[active]}</p>
            </div>
            <button className="mv-outline" onClick={onReturnToStore}><Store size={16} aria-hidden="true" /> &nbsp; View storefront</button>
          </div>

          {notice && <div className="mv-notice" role="status">{notice}</div>}

          {active === 'overview' ? (
            <>
              <section className="mv-welcome">
                <div className="mv-welcome-copy">
                  <div className="mv-kicker">YOUR MOTI.VEX WORKSPACE</div>
                  <h2>Good to have you here, {firstName}.</h2>
                  <p>Your {role.toLowerCase()} workspace is ready. Choose a section to access tools available to your role.</p>
                  <button className="mv-primary" onClick={() => navigate(sections.find(([id]) => id !== 'overview')?.[0] || 'overview')}>Explore workspace <ArrowRight size={16} aria-hidden="true" /></button>
                </div>
                <div className="mv-art" aria-hidden="true"><div className="mv-ring" /><div className="mv-monogram">M<span>.</span></div></div>
              </section>
              <div className="mv-section-heading"><div><h2>Workspace shortcuts</h2><p>Tools available for your role</p></div><span>{sections.length} SECTIONS</span></div>
              <div className="mv-shortcuts">
                {sections.filter(([id]) => id !== 'overview').slice(0, 4).map(([id, label], i) => (
                  <button className="mv-shortcut" key={id} onClick={() => navigate(id)}>
                    <span className={`mv-shortcut-icon tone-${i}`}>
                      {(() => {
                        const Icon = NAV_ICONS[id] || LayoutDashboard
                        return <Icon size={22} strokeWidth={1.8} aria-hidden="true" />
                      })()}
                  </span>
                    <strong>{label}</strong><small>Open section <b>→</b></small>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <section className="mv-module">
              <div className="mv-module-icon">{active === 'accounts' ? 'A' : active === 'audit' ? 'L' : '?'}</div>
              <div className="mv-kicker">{role} MODULE</div>
              <h2>{title}</h2>
              <p>{DESCRIPTIONS[active]}</p>
              {role === 'OWNER' && active === 'products' && (
                <div className="mv-products">
                  <div className="mv-catalogue-management">
                    <section className="mv-management-card">
                      <h3>Create a category</h3>
                      <p>Add a category for organizing products.</p>
                      <form onSubmit={createCategory}>
                        <label>Category name
                          <input required minLength={2} maxLength={150} value={categoryForm.name} onChange={event => setCategoryForm(previous => ({ ...previous, name: event.target.value }))} placeholder="e.g. Lighting" />
                        </label>
                        <label>Description (optional)
                          <textarea maxLength={5000} rows={2} value={categoryForm.description} onChange={event => setCategoryForm(previous => ({ ...previous, description: event.target.value }))} placeholder="Describe this category" />
                        </label>
                        {categoryCreateError && <div className="mv-permission-error" role="alert">{categoryCreateError}</div>}
                        <button className="mv-primary" type="submit" disabled={categoryCreateLoading}>{categoryCreateLoading ? 'Creating...' : 'Create category'}</button>
                      </form>
                    </section>
                    <section className="mv-management-card">
                      <h3>Create a brand</h3>
                      <p>Add a manufacturer or product brand.</p>
                      <form onSubmit={createBrand}>
                        <label>Brand name
                          <input required minLength={2} maxLength={150} value={brandForm.name} onChange={event => setBrandForm(previous => ({ ...previous, name: event.target.value }))} placeholder="e.g. Bosch" />
                        </label>
                        <label>Description (optional)
                          <textarea maxLength={5000} rows={2} value={brandForm.description} onChange={event => setBrandForm(previous => ({ ...previous, description: event.target.value }))} placeholder="Describe this brand" />
                        </label>
                        {brandCreateError && <div className="mv-permission-error" role="alert">{brandCreateError}</div>}
                        <button className="mv-primary" type="submit" disabled={brandCreateLoading}>{brandCreateLoading ? 'Creating...' : 'Create brand'}</button>
                      </form>
                    </section>
                  </div>
                  <form className="mv-product-create" onSubmit={createProduct}>
                    <h3>Add a product</h3>
                    <p>Enter the product details below. Name and price are required; stock defaults to zero.</p>
                    <div className="mv-product-create-grid">
                      <label>Product name
                        <input required minLength={2} maxLength={255} value={productForm.name} onChange={event => setProductForm(previous => ({ ...previous, name: event.target.value }))} placeholder="e.g. Front brake pads" />
                      </label>
                      <label>Price
                        <input required type="number" min="0.01" step="0.01" max="9999999999.99" value={productForm.price} onChange={event => setProductForm(previous => ({ ...previous, price: event.target.value }))} placeholder="0.00" />
                      </label>
                      <label>Category
                        <select value={productForm.category_id} onChange={event => setProductForm(previous => ({ ...previous, category_id: event.target.value }))}>
                          <option value="">No category</option>
                          {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
                        </select>
                      </label>
                      <label>Brand
                        <select value={productForm.brand_id} onChange={event => setProductForm(previous => ({ ...previous, brand_id: event.target.value }))}>
                          <option value="">No brand</option>
                          {brands.map(brand => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
                        </select>
                      </label>
                      <label>Part number
                        <input maxLength={100} value={productForm.part_number} onChange={event => setProductForm(previous => ({ ...previous, part_number: event.target.value }))} placeholder="Manufacturer part number" />
                      </label>
                      <label>SKU
                        <input maxLength={100} value={productForm.sku} onChange={event => setProductForm(previous => ({ ...previous, sku: event.target.value }))} placeholder="Internal stock code" />
                      </label>
                      <label>Stock quantity
                        <input required type="number" min="0" step="1" value={productForm.stock_quantity} onChange={event => setProductForm(previous => ({ ...previous, stock_quantity: event.target.value }))} />
                      </label>
                      <label className="mv-product-description">Description
                        <textarea maxLength={5000} rows={3} value={productForm.description} onChange={event => setProductForm(previous => ({ ...previous, description: event.target.value }))} placeholder="Product details and compatibility" />
                      </label>
                    </div>
                    {productCreateError && <div className="mv-permission-error" role="alert">{productCreateError}</div>}
                    <button className="mv-primary" type="submit" disabled={productCreateLoading}>
                      {productCreateLoading ? 'Adding product...' : 'Add product to catalogue'}
                    </button>
                  </form>

                  <div className="mv-product-catalogue">
                    <div className="mv-product-catalogue-heading">
                      <div><h3>Product catalogue</h3><p>{products.length} product{products.length === 1 ? '' : 's'} loaded</p></div>
                      <button className="mv-outline" type="button" onClick={() => { setProductsError(''); setActive('overview'); setTimeout(() => setActive('products'), 0) }} disabled={productsLoading}>Refresh catalogue</button>
                    </div>
                    {productsLoading && <p className="mv-permission-status">Loading products, categories and brands...</p>}
                    {productsError && <div className="mv-permission-error" role="alert">{productsError}</div>}
                    {!productsLoading && !productsError && (products.length ? (
                      <div className="mv-table-wrap">
                        <table className="mv-data-table mv-product-table">
                          <thead><tr><th>Product</th><th>Category / Brand</th><th>Part number / SKU</th><th>Price</th><th>Stock</th><th>Product image</th></tr></thead>
                          <tbody>
                            {products.map(product => (
                              <tr key={product.id}>
                                <td><strong>{product.name}</strong><small>{product.description || 'No description'}</small></td>
                                <td>{categories.find(item => item.id === product.category_id)?.name || '-'}<small>{brands.find(item => item.id === product.brand_id)?.name || '-'}</small></td>
                                <td>{product.part_number || '-'}<small>{product.sku || 'No SKU'}</small></td>
                                <td>{Number(product.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                <td><span className={Number(product.stock_quantity) > 0 ? 'mv-stock-in' : 'mv-stock-out'}>{product.stock_quantity}</span></td>
                                <td>
                                  <div className="mv-image-upload">
                                    <input type="file" accept="image/*" multiple aria-label={'Choose images for ' + product.name} onChange={event => setImageFiles(previous => ({ ...previous, [product.id]: Array.from(event.target.files || []) }))} />
                                    <label className="mv-image-primary">
                                      <input type="checkbox" checked={imagePrimary[product.id] !== false} onChange={event => setImagePrimary(previous => ({ ...previous, [product.id]: event.target.checked }))} />
                                      Set as primary image
                                    </label>
                                    <button className="mv-outline" type="button" disabled={!!imageUploadLoading[product.id]} onClick={() => uploadProductImage(product.id)}>{imageUploadLoading[product.id] ? 'Uploading...' : 'Upload image'}</button>
                                    {imageUploadStatus[product.id]?.message && <small className={imageUploadStatus[product.id].type === 'error' ? 'mv-image-error' : 'mv-image-success'} role="status">{imageUploadStatus[product.id].message}</small>}
                                    {imageGalleryLoading[product.id] && <small className="mv-gallery-muted">Loading images...</small>}
                                    {imageGalleryError[product.id] && <small className="mv-image-error" role="alert">{imageGalleryError[product.id]}</small>}
                                    <div className="mv-product-gallery">
                                      {(productImages[product.id] || []).map(image => (
                                        <div className="mv-product-image-card" key={image.id}>
                                          <img src={resolveImageUrl(image.public_url)} alt={image.alt_text || product.name} loading="lazy" />
                                          {image.is_primary && <span className="mv-primary-image-badge">Primary</span>}
                                          <small>Image {image.sort_order + 1}</small>
                                          <button className="mv-image-delete" type="button" disabled={!!imageDeleteLoading[image.id]} onClick={() => deleteProductImage(product.id, image)}>{imageDeleteLoading[image.id] ? "Deleting..." : "Delete image"}</button>
                                          {imageDeleteStatus[image.id]?.type === "error" && <small className="mv-image-error" role="alert">{imageDeleteStatus[image.id].message}</small>}
                                        </div>
                                      ))}
                                      {(productImages[product.id] || []).length === 0 && !imageGalleryLoading[product.id] && !imageGalleryError[product.id] && <small className="mv-gallery-muted">No images uploaded yet.</small>}
                                    </div>
                                    <button className="mv-gallery-refresh" type="button" disabled={!!imageGalleryLoading[product.id]} onClick={() => loadProductImages(product.id)}>{imageGalleryLoading[product.id] ? "Refreshing..." : "Refresh gallery"}</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <div className="mv-empty-state">No products found. Use the form above to add your first product.</div>)}
                  </div>
                </div>
              )}
              {role === 'OWNER' && active === 'accounts' && (
                <>
                <form className="mv-account-create" onSubmit={createAccount}>
                  <h3>Create a team account</h3>
                  <p>Create an Admin or Staff account for your MOTI.VEX team.</p>
                  <div className="mv-account-create-grid">
                    <label>Account role
                      <select value={accountCreateForm.role} onChange={event => setAccountCreateForm(previous => ({ ...previous, role: event.target.value }))}>
                        <option value="STAFF">Staff</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </label>
                    <label>Full name
                      <input required minLength={2} maxLength={150} autoComplete="name" value={accountCreateForm.name} onChange={event => setAccountCreateForm(previous => ({ ...previous, name: event.target.value }))} placeholder="Enter full name" />
                    </label>
                    <label>Email address
                      <input required type="email" autoComplete="email" value={accountCreateForm.email} onChange={event => setAccountCreateForm(previous => ({ ...previous, email: event.target.value }))} placeholder="name@example.com" />
                    </label>
                    <label>Temporary password
                      <input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={accountCreateForm.password} onChange={event => setAccountCreateForm(previous => ({ ...previous, password: event.target.value }))} placeholder="At least 8 characters" />
                    </label>
                  </div>
                  {accountCreateError && <div className="mv-permission-error" role="alert">{accountCreateError}</div>}
                  <button className="mv-primary" type="submit" disabled={accountCreateLoading}>{accountCreateLoading ? 'Creating account...' : 'Create account'}</button>
                </form>

                                  <div className="mv-account-directory">
                  <div className="mv-account-toolbar">
                    <input aria-label="Search accounts" type="search" placeholder="Search name or email..." value={accountSearch} onChange={event => setAccountSearch(event.target.value)} />
                    <select aria-label="Filter by role" value={accountRoleFilter} onChange={event => setAccountRoleFilter(event.target.value)}>
                      <option value="ALL">All roles</option>
                      <option value="OWNER">Owner</option>
                      <option value="ADMIN">Admin</option>
                      <option value="STAFF">Staff</option>
                      <option value="CUSTOMER">Customer</option>
                    </select>
                    <select aria-label="Filter by account status" value={accountStatusFilter} onChange={event => setAccountStatusFilter(event.target.value)}>
                      <option value="ALL">All statuses</option>
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                    <button className="mv-outline" onClick={() => { setAccountsError(''); setActive('accounts') }}>Refresh</button>
                  </div>
                  {accountsLoading && <p className="mv-permission-status">Loading accounts...</p>}
                  {accountsError && <div className="mv-permission-error" role="alert">{accountsError}</div>}
                  {!accountsLoading && !accountsError && (
                    <>
                      <div className="mv-account-summary"><strong>{accounts.length}</strong> total accounts</div>
                      {(() => {
                        const filteredAccounts = accounts.filter(account => {
                          const search = accountSearch.trim().toLowerCase()
                          const matchesSearch = !search || account.name?.toLowerCase().includes(search) || account.email?.toLowerCase().includes(search)
                          const matchesRole = accountRoleFilter === 'ALL' || account.role === accountRoleFilter
                          const matchesStatus = accountStatusFilter === 'ALL' || (accountStatusFilter === 'ACTIVE' ? account.is_active : !account.is_active)
                          return matchesSearch && matchesRole && matchesStatus
                        })
                        return filteredAccounts.length ? (
                          <div className="mv-table-wrap">
                            <table className="mv-data-table">
                              <thead><tr><th>Account</th><th>Role</th><th>Status</th><th>Verified</th><th>Joined</th><th>Action</th></tr></thead>
                              <tbody>
                                {filteredAccounts.map(account => (
                                  <tr key={account.id}>
                                    <td><strong>{account.name}</strong><small>{account.email}</small></td>
                                    <td><span className="mv-role-tag">{account.role}</span></td>
                                    <td><span className={`mv-status-tag ${account.is_active ? 'is-active' : 'is-suspended'}`}>{account.is_active ? 'Active' : 'Suspended'}</span></td>
                                    <td>{account.is_verified ? 'Yes' : 'No'}</td>
                                    <td>{account.created_at ? new Date(account.created_at).toLocaleDateString() : '-'}</td>
                                    <td><button className="mv-account-action" disabled={accountActionId !== null || (account.id === user?.id && account.is_active)} onClick={() => updateAccountStatus(account)}>{accountActionId === account.id ? 'Saving...' : account.is_active ? 'Suspend' : 'Activate'}</button></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : <div className="mv-empty-state">No accounts match your search and filters.</div>
                      })()}
                    </>
                  )}
                </div>
                </>
              )}
              {role === 'OWNER' && active === 'audit' && (
                <div className="mv-audit-feed">
                  <div className="mv-audit-toolbar"><span>Recent recorded activity</span><button className="mv-outline" onClick={() => { setAuditError(''); setActive('audit') }}>Refresh</button></div>
                  {auditLoading && <p className="mv-permission-status">Loading activity...</p>}
                  {auditError && <div className="mv-permission-error" role="alert">{auditError}</div>}
                  {!auditLoading && !auditError && (auditLogs.length ? (
                    <div className="mv-table-wrap">
                      <table className="mv-data-table">
                        <thead><tr><th>Activity</th><th>Actor</th><th>Entity</th><th>Recorded</th></tr></thead>
                        <tbody>
                          {auditLogs.map(log => (
                            <tr key={log.id}>
                              <td><strong>{(log.action || 'Activity').replaceAll('_', ' ')}</strong><small>{log.description || 'No description recorded.'}</small></td>
                              <td>{log.actor_name || 'Deleted or unknown user'}<small>{log.actor_email || '-'}</small></td>
                              <td>{log.entity_type}{log.entity_id ? ` #${log.entity_id}` : ''}</td>
                              <td>{log.created_at ? new Date(log.created_at).toLocaleString() : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <div className="mv-empty-state">No recorded activity yet. Only actions currently logged by the backend appear here.</div>)}
                </div>
              )}
              {!(role === 'OWNER' && ['accounts', 'audit', 'permissions', 'products'].includes(active)) && (
                <div className="mv-pending"><span>!</span><div><strong>API integration pending</strong><p>This section will be connected to its secured backend endpoints in a later step.</p></div></div>
              )}              {role === 'OWNER' && active === 'permissions' && (
                <div className="mv-permission-editor">
                  <div className="mv-permission-toolbar">
                    <label htmlFor="mv-permission-role">Edit permissions for</label>
                    <select id="mv-permission-role" value={selectedPermissionRole} onChange={event => setSelectedPermissionRole(event.target.value)} disabled={permissionsLoading || permissionsSaving}>
                      <option value="ADMIN">Admin</option>
                      <option value="STAFF">Staff</option>
                    </select>
                  </div>
                  {permissionsLoading && <p className="mv-permission-status">Loading permissions...</p>}
                  {permissionsError && <div className="mv-permission-error" role="alert">{permissionsError}</div>}
                  {!permissionsLoading && !permissionsError && selectedRoleData && (
                    <>
                      <p className="mv-permission-hint">Choose the capabilities this role can access. Owner-only account management, audit logs and system settings cannot be granted here.</p>
                      <div className="mv-permission-list">
                        {visiblePermissions.map(permission => (
                          <label className="mv-permission-item" key={permission}>
                            <input type="checkbox" checked={draftPermissions.includes(permission)} onChange={event => setDraftPermissions(previous => event.target.checked ? [...new Set([...previous, permission])] : previous.filter(item => item !== permission))} disabled={permissionsSaving} />
                            <span>{permission.replaceAll('_', ' ')}</span>
                          </label>
                        ))}
                      </div>
                      <button className="mv-primary" onClick={saveRolePermissions} disabled={permissionsSaving || permissionsLoading}>
                        {permissionsSaving ? 'Saving...' : 'Save permissions'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </section>
          )}
          <footer className="mv-footer"><span>(c) {new Date().getFullYear()} MOTI.VEX</span><span>BUILT FOR THE ROAD AHEAD <ArrowRight size={14} aria-hidden="true" /></span></footer>
        </section>
      </main>
    </div>
  )
}

export default Dashboard
