import { useEffect, useMemo, useState } from 'react'
import { ShoppingCart, ImageOff, ChevronLeft, ChevronRight, Search, CheckCircle2, Eye, ShieldCheck, EyeOff, Wrench, Circle, BatteryCharging, Disc3, X, Minus, Plus, CircleHelp, ArrowRight } from 'lucide-react'
import './App.css'
import Dashboard from './components/Dashboard'

const API_URL = 'http://localhost:8000'

const IMAGE_BASE = `${import.meta.env.BASE_URL}images/`

const LOGO_URL = `${IMAGE_BASE}moti-vex-logo.png`

const HERO_IMAGES = [
  `${IMAGE_BASE}moti-vex-car-01.png`,
  `${IMAGE_BASE}moti-vex-car-02.png`,
  `${IMAGE_BASE}moti-vex-car-03.png`,
  `${IMAGE_BASE}moti-vex-car-04.png`,
  `${IMAGE_BASE}moti-vex-car-05.png`,
  `${IMAGE_BASE}moti-vex-car-06.png`,
  `${IMAGE_BASE}moti-vex-car-07.png`,
]

const HERO_CARS = HERO_IMAGES

const getProductImage = (product) => {
  const image =
    product?.image ||
    product?.image_url ||
    product?.imageUrl ||
    product?.photo ||
    product?.thumbnail ||
    ''

  if (!image) return ''

  if (image.startsWith('http://') || image.startsWith('https://')) {
    return image
  }

  if (image.startsWith('/media/')) {
    return `${API_URL}${image}`
  }

  if (image.startsWith('media/')) {
    return `${API_URL}/${image}`
  }

  if (image.startsWith('/')) {
    return `${API_URL}${image}`
  }

  return `${API_URL}/${image}`
}

const formatPrice = (price) => {
  const numericPrice = Number(price || 0)

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(numericPrice)
}

function App() {
  const [products, setProducts] = useState([])
  const [productImages, setProductImages] = useState({})
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [productSearch, setProductSearch] = useState('')
  const [productSort, setProductSort] = useState('featured')
  const [stockFilter, setStockFilter] = useState('all')
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [productsError, setProductsError] = useState('')

  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showCart, setShowCart] = useState(false)

  const [heroCarIndex, setHeroCarIndex] = useState(0)
  const [heroDirection, setHeroDirection] = useState('next')

  const [cartSummary, setCartSummary] = useState(null)
  const [cartLoading, setCartLoading] = useState(false)
  const [cartError, setCartError] = useState('')

  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('carPartsUser')
      return savedUser ? JSON.parse(savedUser) : null
    } catch {
      return null
    }
  })

  const [token, setToken] = useState(
    () => localStorage.getItem('carPartsToken') || ''
  )

  const [showDashboard, setShowDashboard] = useState(true)

  const [authPage, setAuthPage] = useState(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')

  const [verificationEmail, setVerificationEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')

  const [resetEmail, setResetEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')

  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showRegisterPassword, setShowRegisterPassword] = useState(false)

  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  })

  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
  })

  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem('carPartsCart')
      return savedCart ? JSON.parse(savedCart) : []
    } catch {
      return []
    }
  })

  /*
   * ---------------------------------------------------------
   * PRODUCTS
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoadingProducts(true)
        setProductsError('')

        const response = await fetch(`${API_URL}/api/v1/products`)

        if (!response.ok) {
          throw new Error(`Failed to load products (${response.status})`)
        }

        const data = await response.json()

        const productList = Array.isArray(data)
          ? data
          : Array.isArray(data?.products)
            ? data.products
            : Array.isArray(data?.items)
              ? data.items
              : []

        const galleryEntries = await Promise.all(
          productList.map(async (product) => {
            const fallbackImage = getProductImage(product)

            try {
              const imageResponse = await fetch(
                `${API_URL}/api/v1/products/${product.id}/images`
              )

              if (!imageResponse.ok) {
                throw new Error(`Image request failed (${imageResponse.status})`)
              }

              const imageData = await imageResponse.json()

              const images = Array.isArray(imageData)
                ? imageData
                : Array.isArray(imageData?.images)
                  ? imageData.images
                  : Array.isArray(imageData?.items)
                    ? imageData.items
                    : Array.isArray(imageData?.Items)
                      ? imageData.Items
                      : []

              const urls = images
                .slice()
                .sort((a, b) => {
                  if (Boolean(a.is_primary) !== Boolean(b.is_primary)) {
                    return a.is_primary ? -1 : 1
                  }

                  return Number(a.sort_order || 0) - Number(b.sort_order || 0)
                })
                .map((image) =>
                  getProductImage({
                    image_url:
                      image.public_url ||
                      image.image_url ||
                      image.url ||
                      '',
                  })
                )
                .filter(Boolean)

              return [
                product.id,
                urls.length > 0
                  ? [...new Set(urls)]
                  : fallbackImage
                    ? [fallbackImage]
                    : [],
              ]
            } catch (imageError) {
              console.warn(
                `Unable to load gallery for product ${product.id}:`,
                imageError
              )

              return [
                product.id,
                fallbackImage ? [fallbackImage] : [],
              ]
            }
          })
        )

        setProductImages(Object.fromEntries(galleryEntries))
        setProducts(productList)
      } catch (error) {
        console.error('Product loading error:', error)
        setProductsError(
          'Unable to load products. Make sure the backend server is running.'
        )
      } finally {
        setLoadingProducts(false)
      }
    }

    loadProducts()
  }, [])

  const filteredProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase()

    let result = products.filter((product) => {
      const searchableText = [
        product?.name,
        product?.description,
        product?.part_number,
        product?.partNumber,
        product?.sku,
        product?.brand,
        product?.brand_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const stock = Number(
        product?.stock_quantity ??
          product?.stock ??
          0
      )

      const matchesSearch =
        !search || searchableText.includes(search)

      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'in-stock' && stock > 0) ||
        (stockFilter === 'out-of-stock' && stock <= 0)

      return matchesSearch && matchesStock
    })

    if (productSort === 'price-low') {
      result.sort(
        (a, b) =>
          Number(a?.price ?? a?.unit_price ?? 0) -
          Number(b?.price ?? b?.unit_price ?? 0)
      )
    }

    if (productSort === 'price-high') {
      result.sort(
        (a, b) =>
          Number(b?.price ?? b?.unit_price ?? 0) -
          Number(a?.price ?? a?.unit_price ?? 0)
      )
    }

    if (productSort === 'newest') {
      result.sort(
        (a, b) =>
          new Date(b?.created_at ?? 0).getTime() -
          new Date(a?.created_at ?? 0).getTime()
      )
    }

    return result
  }, [
    products,
    productSearch,
    productSort,
    stockFilter,
  ])


  /*
   * ---------------------------------------------------------
   * CART
   * ---------------------------------------------------------
   */

  const saveGuestCart = (items) => {
    localStorage.setItem('carPartsCart', JSON.stringify(items))
    setCart(items)
  }

  const normalizeBackendCart = (data) => {
    const items = Array.isArray(data?.items) ? data.items : []

    return {
      items: items.map((item) => {
        const product = products.find(
          (candidate) =>
            Number(candidate.id) === Number(item.product_id)
        )

        return {
          ...product,
          id: Number(item.product_id),
          product_id: Number(item.product_id),
          cartItemId: Number(item.id),
          name: item.product_name || product?.name || 'Automotive Part',
          price: Number(item.unit_price || 0),
          unit_price: Number(item.unit_price || 0),
          quantity: Number(item.quantity || 0),
          line_total: Number(item.line_total || 0),
          image_url:
            product?.image_url ||
            product?.imageUrl ||
            product?.image ||
            '',
        }
      }),
      summary: {
        subtotal: Number(data?.subtotal || 0),
        delivery_fee: Number(data?.delivery_fee || 0),
        total: Number(data?.total || 0),
      },
    }
  }

  const cartRequest = async (path, options = {}, accessToken = token) => {
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    })

    const data =
      response.status === 204
        ? null
        : await response.json().catch(() => null)

    if (!response.ok) {
      throw new Error(
        data?.detail ||
          data?.message ||
          `Cart request failed (${response.status}).`
      )
    }

    return data
  }

  const applyBackendCart = (data) => {
    const normalized = normalizeBackendCart(data)
    setCart(normalized.items)
    setCartSummary(normalized.summary)
    setCartError('')
  }

  useEffect(() => {
    if (!token) {
      setCartSummary(null)
      setCartError('')
      return
    }

    let cancelled = false

    const loadBackendCart = async () => {
      try {
        setCartLoading(true)

        const data = await cartRequest('/api/v1/cart', {}, token)

        if (!cancelled) {
          applyBackendCart(data)
        }
      } catch (error) {
        if (!cancelled) {
          setCartError(error.message || 'Unable to load your cart.')
        }
      } finally {
        if (!cancelled) {
          setCartLoading(false)
        }
      }
    }

    loadBackendCart()

    return () => {
      cancelled = true
    }
  }, [token, products])

  useEffect(() => {
    if (!token) {
      localStorage.setItem('carPartsCart', JSON.stringify(cart))
    }
  }, [cart, token])

  const addToCart = async (product) => {
    if (!product) return

    setCartError('')

    if (token) {
      try {
        setCartLoading(true)

        const existingItem = cart.find(
          (item) => Number(item.id) === Number(product.id)
        )

        let data

        if (existingItem?.cartItemId) {
          data = await cartRequest(
            `/api/v1/cart/items/${existingItem.cartItemId}`,
            {
              method: 'PATCH',
              body: JSON.stringify({
                quantity: Number(existingItem.quantity) + 1,
              }),
            }
          )
        } else {
          data = await cartRequest('/api/v1/cart/items', {
            method: 'POST',
            body: JSON.stringify({
              product_id: Number(product.id),
              quantity: 1,
            }),
          })
        }

        applyBackendCart(data)
      } catch (error) {
        setCartError(error.message || 'Unable to add this item.')
      } finally {
        setCartLoading(false)
      }

      return
    }

    const existingItem = cart.find(
      (item) => Number(item.id) === Number(product.id)
    )

    if (existingItem) {
      saveGuestCart(
        cart.map((item) =>
          Number(item.id) === Number(product.id)
            ? { ...item, quantity: Number(item.quantity) + 1 }
            : item
        )
      )
    } else {
      saveGuestCart([...cart, { ...product, quantity: 1 }])
    }
  }

  const updateCartQuantity = async (productId, change) => {
    const item = cart.find(
      (entry) => Number(entry.id) === Number(productId)
    )

    if (!item) return

    const nextQuantity = Number(item.quantity) + change
    setCartError('')

    if (token) {
      if (!item.cartItemId) {
        setCartError('Cart item information is missing. Please reload your cart.')
        return
      }

      try {
        setCartLoading(true)

        const data =
          nextQuantity <= 0
            ? await cartRequest(
                `/api/v1/cart/items/${item.cartItemId}`,
                { method: 'DELETE' }
              )
            : await cartRequest(
                `/api/v1/cart/items/${item.cartItemId}`,
                {
                  method: 'PATCH',
                  body: JSON.stringify({ quantity: nextQuantity }),
                }
              )

        applyBackendCart(data)
      } catch (error) {
        setCartError(error.message || 'Unable to update the quantity.')
      } finally {
        setCartLoading(false)
      }

      return
    }

    if (nextQuantity <= 0) {
      saveGuestCart(
        cart.filter((entry) => Number(entry.id) !== Number(productId))
      )
      return
    }

    saveGuestCart(
      cart.map((entry) =>
        Number(entry.id) === Number(productId)
          ? { ...entry, quantity: nextQuantity }
          : entry
      )
    )
  }

  const removeFromCart = async (productId) => {
    const item = cart.find(
      (entry) => Number(entry.id) === Number(productId)
    )

    if (!item) return

    setCartError('')

    if (token) {
      if (!item.cartItemId) {
        setCartError('Cart item information is missing. Please reload your cart.')
        return
      }

      try {
        setCartLoading(true)

        const data = await cartRequest(
          `/api/v1/cart/items/${item.cartItemId}`,
          { method: 'DELETE' }
        )

        applyBackendCart(data)
      } catch (error) {
        setCartError(error.message || 'Unable to remove this item.')
      } finally {
        setCartLoading(false)
      }

      return
    }

    saveGuestCart(
      cart.filter((entry) => Number(entry.id) !== Number(productId))
    )
  }

  const clearCart = async () => {
    setCartError('')

    if (!token) {
      saveGuestCart([])
      return
    }

    try {
      setCartLoading(true)

      let data = null

      for (const item of cart) {
        if (!item.cartItemId) continue

        data = await cartRequest(
          `/api/v1/cart/items/${item.cartItemId}`,
          { method: 'DELETE' }
        )
      }

      if (data) {
        applyBackendCart(data)
      } else {
        setCart([])
        setCartSummary({
          subtotal: 0,
          delivery_fee: 0,
          total: 0,
        })
      }
    } catch (error) {
      setCartError(error.message || 'Unable to clear your cart.')
    } finally {
      setCartLoading(false)
    }
  }

  const cartItemCount = useMemo(
    () =>
      cart.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
      ),
    [cart]
  )

  const cartTotal = useMemo(
    () =>
      cart.reduce(
        (total, item) =>
          total +
          Number(item.price ?? item.unit_price ?? 0) *
            Number(item.quantity || 0),
        0
      ),
    [cart]
  )

  const displayedSubtotal = token && cartSummary
    ? cartSummary.subtotal
    : cartTotal

  const syncGuestCartToBackend = async (accessToken) => {
  let guestItems = []

  try {
    const saved = localStorage.getItem('carPartsCart')
    guestItems = saved ? JSON.parse(saved) : []
  } catch {
    guestItems = []
  }

  if (!Array.isArray(guestItems) || guestItems.length === 0) {
    const data = await cartRequest(
      '/api/v1/cart',
      {},
      accessToken
    )
    applyBackendCart(data)
    return
  }

  let remainingItems = [...guestItems]

  for (const item of guestItems) {
    const productId = Number(item.product_id ?? item.id)
    const quantity = Math.max(1, Number(item.quantity) || 1)

    if (!Number.isInteger(productId) || productId <= 0) {
      continue
    }

    await cartRequest(
      '/api/v1/cart/items',
      {
        method: 'POST',
        body: JSON.stringify({
          product_id: productId,
          quantity,
        }),
      },
      accessToken
    )

    remainingItems = remainingItems.filter(
      (remaining) => remaining !== item
    )

    localStorage.setItem(
      'carPartsCart',
      JSON.stringify(remainingItems)
    )
  }

  const data = await cartRequest(
    '/api/v1/cart',
    {},
    accessToken
  )

  applyBackendCart(data)

  if (remainingItems.length === 0) {
    localStorage.removeItem('carPartsCart')
  }
}

  /*
   * ---------------------------------------------------------
   * HERO CAROUSEL
   * ---------------------------------------------------------
   */

  const nextHeroCar = () => {
    setHeroDirection('next')

    setHeroCarIndex((current) =>
      (current + 1) % HERO_IMAGES.length
    )
  }

  const previousHeroCar = () => {
    setHeroDirection('previous')

    setHeroCarIndex(
      (current) =>
        (current - 1 + HERO_IMAGES.length) % HERO_IMAGES.length
    )
  }

  const selectHeroCar = (index) => {
    setHeroDirection(index > heroCarIndex ? 'next' : 'previous')
    setHeroCarIndex(index)
  }

  useEffect(() => {
    const heroInterval = setInterval(() => {
      setHeroDirection('next')

      setHeroCarIndex((current) =>
        (current + 1) % HERO_IMAGES.length
      )
    }, 5500)

    return () => clearInterval(heroInterval)
  }, [])

  useEffect(() => {
    HERO_CARS.forEach((image) => {
      const img = new Image()
      img.src = image
    })
  }, [])

  /*
   * ---------------------------------------------------------
   * AUTH
   * ---------------------------------------------------------
   */

  const resetAuthMessages = () => {
    setAuthError('')
    setAuthSuccess('')
  }

  const openLogin = () => {
    resetAuthMessages()
    setAuthPage('login')
  }

  const openRegister = () => {
    resetAuthMessages()
    setAuthPage('register')
  }

  const backToStore = () => {
    resetAuthMessages()
    setAuthPage(null)
  }

  const switchAuthPage = (page) => {
    resetAuthMessages()
    setAuthPage(page)
  }

  const handleLoginChange = (event) => {
    const { name, value } = event.target

    setLoginForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleRegisterChange = (event) => {
    const { name, value } = event.target

    setRegisterForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleRegister = async (event) => {
    event.preventDefault()

    setAuthError('')
    setAuthSuccess('')
    setAuthLoading(true)

    try {
      if (
        !registerForm.name.trim() ||
        !registerForm.email.trim() ||
        !registerForm.password
      ) {
        throw new Error('Please complete all fields.')
      }

      const response = await fetch(
        `${API_URL}/api/v1/auth/register`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: registerForm.name.trim(),
            email: registerForm.email.trim(),
            password: registerForm.password,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            'Registration failed.'
        )
      }

      const email = registerForm.email.trim().toLowerCase()

      setVerificationEmail(email)
      setVerificationCode('')
      setAuthPage('verifyEmail')

      setAuthSuccess(
        data?.message ||
          'Account created. Please check your email for your verification code and enter it below.'
      )

      setRegisterForm({
        name: '',
        email: '',
        password: '',
      })

    } catch (error) {
      setAuthError(
        error.message || 'Unable to create your account.'
      )
    } finally {
      setAuthLoading(false)
    }
  }


  const handleVerifyEmail = async (event) => {
    event.preventDefault()

    setAuthError('')
    setAuthSuccess('')
    setAuthLoading(true)

    try {
      if (!verificationEmail || !/^\d{6}$/.test(verificationCode)) {
        throw new Error('Enter the six-digit verification code.')
      }

      const response = await fetch(
        `${API_URL}/api/v1/auth/verify-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: verificationEmail,
            code: verificationCode,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.detail || data?.message || 'Email verification failed.'
        )
      }

      setAuthSuccess(
        data?.message || 'Email verified successfully. You can now sign in.'
      )
      setLoginForm((current) => ({
        ...current,
        email: verificationEmail,
      }))
      setVerificationCode('')
      setAuthPage('login')
    } catch (error) {
      setAuthError(error.message || 'Unable to verify your email.')
    } finally {
      setAuthLoading(false)
    }
  }


  const handleResendVerification = async () => {
    setAuthError('')
    setAuthSuccess('')
    setAuthLoading(true)

    try {
      if (!verificationEmail) {
        throw new Error('Enter your email address first.')
      }

      const response = await fetch(
        `${API_URL}/api/v1/auth/resend-verification`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: verificationEmail,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.detail || data?.message || 'Could not resend the code.'
        )
      }

      setAuthSuccess(
        data?.message || 'A new verification code has been requested.'
      )
    } catch (error) {
      setAuthError(error.message || 'Unable to resend the code.')
    } finally {
      setAuthLoading(false)
    }
  }


  const handleRequestPasswordReset = async (event) => {
    event.preventDefault()

    setAuthError('')
    setAuthSuccess('')
    setAuthLoading(true)

    try {
      if (!resetEmail.trim()) {
        throw new Error('Please enter your email address.')
      }

      const response = await fetch(
        `${API_URL}/api/v1/auth/forgot-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: resetEmail.trim().toLowerCase(),
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.detail || data?.message || 'Unable to request a reset code.'
        )
      }

      setAuthSuccess(
        data?.message ||
          'If the account exists, a password-reset code has been sent.'
      )
      setAuthPage('resetCode')
    } catch (error) {
      setAuthError(
        error.message || 'Unable to request a password-reset code.'
      )
    } finally {
      setAuthLoading(false)
    }
  }


  const handleVerifyResetCode = async (event) => {
    event.preventDefault()

    setAuthError('')
    setAuthSuccess('')
    setAuthLoading(true)

    try {
      if (!resetEmail.trim() || !/^\d{6}$/.test(resetCode)) {
        throw new Error('Enter the six-digit password-reset code.')
      }

      const response = await fetch(
        `${API_URL}/api/v1/auth/verify-reset-code`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: resetEmail.trim().toLowerCase(),
            code: resetCode,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.detail || data?.message || 'Reset-code verification failed.'
        )
      }

      if (!data?.reset_token) {
        throw new Error('The server did not return a reset token. Please try again.')
      }

      setResetToken(data.reset_token)
      setResetCode('')
      setAuthSuccess('Code verified. You can now choose a new password.')
      setAuthPage('resetPassword')
    } catch (error) {
      setAuthError(error.message || 'Unable to verify the reset code.')
    } finally {
      setAuthLoading(false)
    }
  }


  const handleResetPassword = async (event) => {
    event.preventDefault()

    setAuthError('')
    setAuthSuccess('')
    setAuthLoading(true)

    try {
      if (!resetToken) {
        throw new Error('Your reset session has expired. Request a new code.')
      }

      if (newPassword.length < 8) {
        throw new Error('Your new password must contain at least 8 characters.')
      }

      if (newPassword !== confirmNewPassword) {
        throw new Error('The passwords do not match.')
      }

      const response = await fetch(
        `${API_URL}/api/v1/auth/reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reset_token: resetToken,
            new_password: newPassword,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.detail || data?.message || 'Password reset failed.'
        )
      }

      setResetToken('')
      setResetCode('')
      setNewPassword('')
      setConfirmNewPassword('')
      setLoginForm((current) => ({
        ...current,
        email: resetEmail,
        password: '',
      }))
      setAuthPage('login')
      setAuthSuccess(
        data?.message || 'Password updated. Please sign in with your new password.'
      )
    } catch (error) {
      setAuthError(error.message || 'Unable to reset your password.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogin = async (event) => {
    event.preventDefault()

    setAuthError('')
    setAuthSuccess('')
    setAuthLoading(true)

    try {
      if (!loginForm.email.trim() || !loginForm.password) {
        throw new Error('Please enter your email and password.')
      }

      const body = new URLSearchParams()

      body.append('username', loginForm.email.trim())
      body.append('password', loginForm.password)

      const response = await fetch(
        `${API_URL}/api/v1/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            'Invalid email or password.'
        )
      }

      if (data?.access_token) {
        localStorage.setItem(
          'carPartsToken',
          data.access_token
        )

        setToken(data.access_token)
      }

      if (data?.user) {
        localStorage.setItem(
          'carPartsUser',
          JSON.stringify(data.user)
        )

        setUser(data.user)
      }

      setAuthSuccess('Login successful. Welcome back.')

      setLoginForm({
        email: '',
        password: '',
      })

      setTimeout(() => {
        setAuthPage(null)
        setAuthSuccess('')
      }, 1000)
    } catch (error) {
      setAuthError(
        error.message || 'Unable to sign you in.'
      )
    } finally {
      setAuthLoading(false)
    }
  }

  const logout = () => {
  let guestItems = []

  try {
    const saved = localStorage.getItem('carPartsCart')
    guestItems = saved ? JSON.parse(saved) : []
  } catch {
    guestItems = []
  }

  localStorage.removeItem('carPartsToken')
  localStorage.removeItem('carPartsUser')

  setToken('')
  setUser(null)
  setCart(Array.isArray(guestItems) ? guestItems : [])
  setCartSummary(null)
  setCartError('')
  setAuthPage(null)
}


  const handleForgotPassword = async () => {
    setAuthError('')
    setAuthSuccess('')
    setAuthLoading(false)
    setResetEmail(loginForm.email.trim().toLowerCase())
    setResetCode('')
    setResetToken('')
    setNewPassword('')
    setConfirmNewPassword('')
    setAuthPage('forgotPassword')
  }

  /*
   * ---------------------------------------------------------
   * NAVIGATION
   * ---------------------------------------------------------
   */

  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId)

    if (section) {
      section.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }

  const handleShopNow = () => {
    scrollToSection('products')
  }

  const handleCategories = () => {
    scrollToSection('categories')
  }

  const handleCheckout = () => {
    if (!cart.length) return

    if (!token) {
      setShowCart(false)
      openLogin()
      return
    }

    alert(
      'Checkout is ready for backend integration. Your cart is preserved.'
    )
  }

  /*
   * ---------------------------------------------------------
   * AUTH SCREEN
   * ---------------------------------------------------------
   */

  if (authPage) {
    return (
      <div className="auth-screen">
        <div className="auth-background-grid"></div>
        <div className="auth-red-glow"></div>

        <button
          type="button"
          className="auth-back-button"
          onClick={backToStore}
        >
          <span>←</span>

        </button>

        <div className="auth-layout">
          <div className="auth-showcase">
            <div className="auth-showcase-content">
              <img
                src={LOGO_URL}
                alt="Moti.Vex"
                className="auth-logo"
              />

              <span className="auth-eyebrow">
                PERFORMANCE  |  PRECISION  |  TRUST
              </span>

              <h1>
                Built for the road.
                <br />
                <span>Designed for you.</span>
              </h1>

              <p>
                Discover quality automotive parts with a
                shopping experience engineered around your
                vehicle.
              </p>

              <div className="auth-car-art">
                <span className="auth-car-glow"></span>
                <img
                  src={HERO_IMAGES[2]}
                  alt="Moti.Vex automotive"
                />
              </div>

              <div className="auth-feature-row">
                <div>
                  <strong>01</strong>
                  <span>Quality Parts</span>
                </div>

                <div>
                  <strong>02</strong>
                  <span>Secure Account</span>
                </div>

                <div>
                  <strong>03</strong>
                  <span>Easy Shopping</span>
                </div>
              </div>
            </div>
          </div>

          <div className="auth-panel">
            <div className="auth-panel-inner">
              <img
                src={LOGO_URL}
                alt="Moti.Vex"
                className="auth-panel-logo"
              />

              <div className="auth-heading">
                <span>WELCOME TO MOTI.VEX</span>

                <h2>
                  {authPage === 'login'
                    ? 'Welcome back.'
                    : 'Create your account.'}
                </h2>

                <p>
                  {authPage === 'login'
                    ? 'Sign in to continue your automotive journey.'
                    : 'Join Moti.Vex and start shopping quality parts.'}
                </p>
              </div>

              <div className="auth-tabs">
                <button
                  type="button"
                  className={
                    authPage === 'login'
                      ? 'auth-tab active'
                      : 'auth-tab'
                  }
                  onClick={() => switchAuthPage('login')}
                >
                  Login
                </button>

                <button
                  type="button"
                  className={
                    authPage === 'register'
                      ? 'auth-tab active'
                      : 'auth-tab'
                  }
                  onClick={() =>
                    switchAuthPage('register')
                  }
                >
                  Register
                </button>
              </div>

              {authError && (
                <div className="auth-message auth-error">
                  <span>!</span>
                  {authError}
                </div>
              )}

              {authSuccess && (
                <div className="auth-message auth-success">
                  <CheckCircle2 size={18} strokeWidth={2} aria-hidden="true" />
                  {authSuccess}
                </div>
              )}

              {authPage === 'login' ? (
                <form
                  className="auth-form"
                  onSubmit={handleLogin}
                >
                  <label className="form-field">
                    <span>Email address</span>

                    <div className="input-shell">
                      <span className="input-icon">
                        @
                      </span>

                      <input
                        type="email"
                        name="email"
                        placeholder="you@example.com"
                        value={loginForm.email}
                        onChange={handleLoginChange}
                        autoComplete="email"
                      />
                    </div>
                  </label>

                  <label className="form-field">
                    <span>Password</span>

                    <div className="input-shell">
                      <span className="input-icon">
                        Â
                      </span>

                      <input
                        type={
                          showLoginPassword
                            ? 'text'
                            : 'password'
                        }
                        name="password"
                        placeholder="Enter your password"
                        value={loginForm.password}
                        onChange={handleLoginChange}
                        autoComplete="current-password"
                      />

                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                          setShowLoginPassword(
                            (current) => !current
                          )
                        }
                        aria-label={
                          showLoginPassword
                            ? 'Hide password'
                            : 'Show password'
                        }
                      >
                        {showLoginPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                      </button>
                    </div>
                  </label>

                  <div className="auth-form-options">
                    <label className="remember-option">
                      <input type="checkbox" />
                      <span>Remember me</span>
                    </label>

                    <button
                      type="button"
                      className="auth-forgot"
                      onClick={handleForgotPassword}
                    >
                      <span aria-hidden="true"><CircleHelp size={15} strokeWidth={2} /></span>
                      Forgot password?
                    </button>
                  </div>

                  <button
                    type="submit"
                    className="auth-submit"
                    disabled={authLoading}
                  >
                    {authLoading
                      ? 'Signing in...'
                      : 'Sign in'}
                    <span>→</span>
                  </button>

                  <p className="auth-switch-text">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() =>
                        switchAuthPage('register')
                      }
                    >
                      Create one
                    </button>
                  </p>
                </form>
              ) : authPage === 'verifyEmail' ? (
                <form
                  className="auth-form"
                  onSubmit={handleVerifyEmail}
                >
                  <label className="form-field">
                    <span>Email Address</span>
                    <div className="input-shell">
                      <span className="input-icon">@</span>
                      <input type="email"
                      value={verificationEmail}
                      readOnly
                      autoComplete="email"
                      />
                    </div>
                  </label>

                  <label className="form-field">
                    <span>Six-digit verification code</span>
                    <div className="input-shell">
                      <span className="input-icon">#</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        placeholder="Enter your code"
                        value={verificationCode}
                        onChange={(event) =>
                          setVerificationCode(
                            event.target.value.replace(/\D/g, '')
                          )
                        }
                        autoComplete="one-time-code"
                        required
                      />
                    </div>
                  </label>

                  <button
                    type="submit"
                    className="auth-submit"
                    disabled={authLoading}
                  >
                    {authLoading
                      ? 'Verifying...'
                      : 'Verify email'}
                    <span>→</span>
                  </button>

                  <p className="auth-switch-text">
                    Didn't receive a code?{' '}
                    <button
                      type="button"
                      onClick={handleResendVerification}
                      disabled={authLoading}
                    >
                      Resend code
                    </button>
                  </p>

                  <p className="auth-switch-text">
                    Already verified?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthError('')
                        setAuthSuccess('')
                        setLoginForm((current) => ({
                          ...current,
                          email: verificationEmail,
                        }))
                        setAuthPage('login')
                      }}
                      >
                        sign in
                        </button>
                        </p>
                </form>
              ) : authPage === 'register' ? (
                <form
                  className="auth-form"
                  onSubmit={handleRegister}
                >

                  <label className="form-field">
                    <span>Full name</span>

                    <div className="input-shell">
                      <span className="input-icon">
                        â€°
                      </span>

                      <input
                        type="text"
                        name="name"
                        placeholder="Your full name"
                        value={registerForm.name}
                        onChange={handleRegisterChange}
                        autoComplete="name"
                      />
                    </div>
                  </label>

                  <label className="form-field">
                    <span>Email address</span>

                    <div className="input-shell">
                      <span className="input-icon">
                        @
                      </span>

                      <input
                        type="email"
                        name="email"
                        placeholder="you@example.com"
                        value={registerForm.email}
                        onChange={handleRegisterChange}
                        autoComplete="email"
                      />
                    </div>
                  </label>

                  <label className="form-field">
                    <span>Password</span>

                    <div className="input-shell">
                      <span className="input-icon">
                        Â
                      </span>

                      <input
                        type={
                          showRegisterPassword
                            ? 'text'
                            : 'password'
                        }
                        name="password"
                        placeholder="Create a strong password"
                        value={registerForm.password}
                        onChange={handleRegisterChange}
                        autoComplete="new-password"
                      />

                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() =>
                          setShowRegisterPassword(
                            (current) => !current
                          )
                        }
                        aria-label={
                          showRegisterPassword
                            ? 'Hide password'
                            : 'Show password'
                        }
                      >
                        {showRegisterPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                      </button>
                    </div>
                  </label>

                  <div className="password-hint">
                    <CheckCircle2 size={18} strokeWidth={2} aria-hidden="true" />
                    Use a strong password with letters,
                    numbers and symbols.
                  </div>

                  <button
                    type="submit"
                    className="auth-submit"
                    disabled={authLoading}
                  >
                    {authLoading
                      ? 'Creating account...'
                      : 'Create account'}
                    <span>→</span>
                  </button>

                  <p className="auth-switch-text">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() =>
                        switchAuthPage('login')
                      }
                    >
                      Sign in
                    </button>
                  </p>
                </form>
            ) : authPage === 'forgotPassword' ? (
              <form
                className="auth-form"
                onSubmit={handleRequestPasswordReset}
                >
                  <p>
                    Enter your email address to request a password-reset code.
                  </p>

                  <label className="form-field">
                    <span>Email address</span>
                    <div className="input-shell">
                      <span className="input-icon">@</span>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(event) => setResetEmail(event.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                        />
                    </div>
                  </label>

                  <button
                    type="submit"
                    className="auth-submit"
                    disabled={authLoading}
                  >
                    {authLoading ? 'Requesting code...' : 'Send reset code'}
                  </button>

                  <p className="auth-switch-text">
                    Remember your password?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthError('')
                        setAuthSuccess('')
                        setAuthPage('login')
                      }}
                    >
                      Back to login
                    </button>
                  </p>
                </form>
              ) : authPage === 'resetCode' ? (
                <form
                   className="auth-form"
                  onSubmit={handleVerifyResetCode}
                >
                  <p>Enter the six-digit code sent to {resetEmail}.</p>

                  <label className="form-field">
                    <span>Reset code</span>
                    <div className="input-shell">
                      <span className="input-icon">#</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        value={resetCode}
                        onChange={(event) =>
                          setResetCode(event.target.value.replace(/\D/g, ''))
                        }
                        placeholder="Enter your code"
                        autoComplete="one-time-code"
                        required
                      />
                    </div>
                  </label>

                  <button
                    type="submit"
                    className="auth-submit"
                    disabled={authLoading}
                  >
                    {authLoading ? 'Verifying...' : 'Verify code'}
                  </button>

                  <p className="auth-switch-text">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthError('')
                        setAuthSuccess('')
                        setAuthPage('forgotPassword')
                      }}
                    >
                      Request another code
                    </button>
                  </p>
                </form>
              ) : authPage === 'resetPassword' ? (
                <form
                  className="auth-form"
                  onSubmit={handleResetPassword}
                >
                   <label className="form-field">
                    <span>New password</span>
                    <div className="input-shell">
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        placeholder="at least 8 characters"
                        autoComplete="new-password"
                        minLength={8}
                        required
                      />
                    </div>
                  </label>

                  <label className="form-field">
                    <span>Confirm new password</span>
                    <div className="input-shell">
                      <input
                        type="password"
                        value={confirmNewPassword}
                        onChange={(event) =>
                          setConfirmNewPassword(event.target.value)
                        }
                        placeholder="Enter the password again"
                        autoComplete="new-password"
                        minLength={8}
                        required
                      />
                    </div>
                  </label>

                  <button
                    type="submit"
                    className="auth-submit"
                    disabled={authLoading}
                  >
                    {authLoading ? 'Updating password...' : 'Update password'}
                  </button>
                </form>
              ) : null}

              <div className="auth-security">
                <span aria-hidden="true"><ShieldCheck size={18} /></span>
                Your account information is securely
                transmitted.
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const dashboardRoles = ['OWNER', 'ADMIN', 'STAFF']
  if (user && showDashboard && dashboardRoles.includes(String(user.role || '').toUpperCase())) {
    return (
      <Dashboard
        user={user}
        token={token}
        onReturnToStore={() => setShowDashboard(false)}
        onLogout={logout}
      />
    )
  }

  /*
   * ---------------------------------------------------------
   * STORE
   * ---------------------------------------------------------
   */

  return (
    <div className="app">
      <div className="page-noise"></div>

      {/* NAVBAR */}
      <header className="navbar">
        <div className="navbar-inner">
          <button
            type="button"
            className="navbar-logo"
            onClick={() => scrollToSection('home')}
            aria-label="Moti.Vex home"
          >
            <img
              src={LOGO_URL}
              alt="Moti.Vex"
            />
          </button>

          <nav className="navbar-links">
            <button
              type="button"
              onClick={() => scrollToSection('home')}
            >
              Home
            </button>

            <button
              type="button"
              onClick={() =>
                scrollToSection('categories')
              }
            >
              Categories
            </button>

            <button
              type="button"
              onClick={() =>
                scrollToSection('products')
              }
            >
              Products
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('about')}
            >
              About
            </button>
          </nav>

          <div className="navbar-actions">
            <button
              type="button"
              className="cart-button"
              onClick={() => setShowCart(true)}
            >
              <span className="cart-icon" aria-hidden="true"><ShoppingCart size={20} strokeWidth={1.8} /></span>
              <span>Cart</span>

              {cartItemCount > 0 && (
                <span className="cart-count">
                  {cartItemCount}
                </span>
              )}
            </button>

            {user ? (
              <div className="user-actions">
                <span className="user-greeting">
                  Hi, {user.name}
                </span>

                {['OWNER', 'ADMIN', 'STAFF'].includes(String(user.role || '').toUpperCase()) && (
                  <button
                    type="button"
                    className="navbar-auth-button"
                    onClick={() => setShowDashboard(true)}
                  >
                    {String(user.role).toUpperCase() === 'OWNER' ? 'Owner Dashboard' : String(user.role).toUpperCase() === 'ADMIN' ? 'Admin Dashboard' : 'Staff Dashboard'}
                  </button>
                )}

                <button
                  type="button"
                  className="navbar-auth-button"
                  onClick={logout}
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="auth-nav-actions">
                <button
                  type="button"
                  className="login-button"
                  onClick={openLogin}
                >
                  Login
                </button>

                <button
                  type="button"
                  className="register-button"
                  onClick={openRegister}
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* HERO */}
      <main>
        <section
          className="hero"
          id="home"
        >
          <div className="hero-background-lines"></div>
          <div className="hero-red-orb"></div>

          <div className="hero-content">
            <div className="hero-copy">
              <div className="hero-brand">
                <img
                  src={LOGO_URL}
                  alt="Moti.Vex"
                />
              </div>

              <span className="hero-eyebrow">
                <i></i>
                QUALITY AUTO PARTS
              </span>

              <h1>
                Find the right
                <span>parts.</span>
                <strong>Drive with confidence.</strong>
              </h1>

              <p>
                Premium automotive parts for drivers who
                demand reliability, performance and
                precision.
              </p>

              <div className="hero-buttons">
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleShopNow}
                >
                  Shop now
                  <span>→</span>
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={handleCategories}
                >
                  Browse categories
                </button>
              </div>

              <div className="hero-stats">
                <div>
                  <strong>01</strong>
                  <span>Quality first</span>
                </div>

                <div>
                  <strong>02</strong>
                  <span>Built to last</span>
                </div>

                <div>
                  <strong>03</strong>
                  <span>Made for drivers</span>
                </div>
              </div>
            </div>

            <div className="hero-visual">
              <div className="hero-visual-top">
                <span>01 / 07</span>
                <span>PERFORMANCE SERIES</span>
              </div>

              <div className="hero-image">
                <div className="hero-visual-glow"></div>

                <div
                  className={`hero-image-frame hero-direction-${heroDirection}`}
                >
                  <img
                    key={HERO_CARS[heroCarIndex]}
                    src={HERO_CARS[heroCarIndex]}
                    alt={`Moti.Vex automotive showcase ${
                      heroCarIndex + 1
                    }`}
                    className="hero-car-image"
                    onError={(event) => {
                      event.currentTarget.style.opacity =
                        '0'
                    }}
                  />

                  <div className="hero-image-shade"></div>
                  <div className="hero-image-vignette"></div>
                </div>

                <div className="hero-carousel-controls">
                  <button
                    type="button"
                    className="hero-arrow"
                    onClick={previousHeroCar}
                    aria-label="Previous car"
                  >
                    <ChevronLeft size={22} aria-hidden="true" />
                  </button>

                  <div className="hero-dots">
                    {HERO_CARS.map((_, index) => (
                      <button
                        key={index}
                        type="button"
                        className={
                          index === heroCarIndex
                            ? 'hero-dot active'
                            : 'hero-dot'
                        }
                        onClick={() =>
                          selectHeroCar(index)
                        }
                        aria-label={`Show automotive image ${
                          index + 1
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    className="hero-arrow"
                    onClick={nextHeroCar}
                    aria-label="Next car"
                  >
                    <ChevronRight size={22} aria-hidden="true" />
                  </button>
                </div>

                <div className="hero-carousel-counter">
                  <span>
                    {String(
                      heroCarIndex + 1
                    ).padStart(2, '0')}
                  </span>

                  <i></i>

                  <span>07</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CATEGORIES */}
        <section
          className="categories-section section"
          id="categories"
        >
          <div className="section-heading">
            <div>
              <span className="section-eyebrow">
                EXPLORE THE RANGE
              </span>

              <h2>
                Find parts by
                <span>category.</span>
              </h2>
            </div>

            <p>
              Everything your vehicle needs, organized
              around the systems that keep it moving.
            </p>
          </div>

          <div className="category-grid">
            <button
              type="button"
              className="category-card"
              onClick={() =>
                scrollToSection('products')
              }
            >
              <span className="category-number">
                01
              </span>

              <span className="category-icon">
                <Wrench size={28} strokeWidth={1.6} aria-hidden="true" />
              </span>

              <span className="category-name">
                Engine Parts
              </span>

              <span className="category-description">
                Filters, components and performance
                essentials.
              </span>

              <span className="category-arrow">
                →
              </span>
            </button>

            <button
              type="button"
              className="category-card"
              onClick={() =>
                scrollToSection('products')
              }
            >
              <span className="category-number">
                02
              </span>

              <span className="category-icon">
                <Circle size={28} strokeWidth={1.6} aria-hidden="true" />
              </span>

              <span className="category-name">
                Wheels & Tires
              </span>

              <span className="category-description">
                Road-ready components for grip and
                control.
              </span>

              <span className="category-arrow">
                →
              </span>
            </button>

            <button
              type="button"
              className="category-card"
              onClick={() =>
                scrollToSection('products')
              }
            >
              <span className="category-number">
                03
              </span>

              <span className="category-icon">
                <BatteryCharging size={28} strokeWidth={1.6} aria-hidden="true" />
              </span>

              <span className="category-name">
                Electrical
              </span>

              <span className="category-description">
                Reliable electrical parts for modern
                vehicles.
              </span>

              <span className="category-arrow">
                →
              </span>
            </button>

            <button
              type="button"
              className="category-card"
              onClick={() =>
                scrollToSection('products')
              }
            >
              <span className="category-number">
                04
              </span>

              <span className="category-icon">
                <Disc3 size={28} strokeWidth={1.6} aria-hidden="true" />
              </span>

              <span className="category-name">
                Brake System
              </span>

              <span className="category-description">
                Precision braking components for safety.
              </span>

              <span className="category-arrow">
                →
              </span>
            </button>
          </div>
        </section>

        {/* PRODUCTS */}
        <section
          className="products-section section"
          id="products"
        >
          <div className="section-heading products-heading">
            <div>
              <span className="section-eyebrow">
                FEATURED PRODUCTS
              </span>

              <h2>
                Popular
                <span>car parts.</span>
              </h2>
            </div>

            <div className="products-heading-right">
              <p>
                Quality components selected for
                performance, reliability and everyday
                driving.
              </p>

              <span className="product-count">
                {filteredProducts.length} OF {products.length} PARTS AVAILABLE
              </span>
            </div>
          </div>

          <div className="product-discovery">
            <div className="product-search">
              <Search size={20} strokeWidth={1.8} aria-hidden="true" />

              <input
                type="search"
                value={productSearch}
                onChange={(event) =>
                  setProductSearch(event.target.value)
                }
                placeholder="Search parts, SKU or part number..."
                aria-label="Search automotive parts"
              />
            </div>

            <select
              value={productSort}
              onChange={(event) =>
                setProductSort(event.target.value)
              }
              aria-label="Sort products"
            >
              <option value="featured">Featured</option>
              <option value="newest">Newest first</option>
              <option value="price-low">Price: Low to high</option>
              <option value="price-high">Price: High to low</option>
            </select>

            <select
              value={stockFilter}
              onChange={(event) =>
                setStockFilter(event.target.value)
              }
              aria-label="Filter products by stock"
            >
              <option value="all">All stock</option>
              <option value="in-stock">In stock</option>
              <option value="out-of-stock">Out of stock</option>
            </select>

            {(productSearch ||
              productSort !== 'featured' ||
              stockFilter !== 'all') && (
              <button
                type="button"
                className="product-filter-reset"
                onClick={() => {
                  setProductSearch('')
                  setProductSort('featured')
                  setStockFilter('all')
                }}
              >
                Reset
              </button>
            )}
          </div>

          {loadingProducts && (
            <div className="products-state">
              <div className="loading-spinner"></div>
              <p>Loading Moti.Vex products...</p>
            </div>
          )}

          {!loadingProducts && productsError && (
            <div className="products-state error-state">
              <span>!</span>
              <p>{productsError}</p>
              <button
                type="button"
                onClick={() =>
                  window.location.reload()
                }
              >
                Retry
              </button>
            </div>
          )}

          {!loadingProducts &&
            !productsError &&
            products.length === 0 && (
              <div className="products-state">
                <ImageOff size={30} strokeWidth={1.6} aria-hidden="true" />
                <p>
                  No products are currently available.
                </p>
              </div>
            )}

          {!loadingProducts &&
            !productsError &&
            products.length > 0 &&
            filteredProducts.length === 0 && (
              <div className="products-state">
                <Search size={30} strokeWidth={1.6} aria-hidden="true" />
                <h3>No parts found.</h3>
                <p>
                  No products match your current search
                  or filter settings.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setProductSearch('')
                    setProductSort('featured')
                    setStockFilter('all')
                  }}
                >
                  Reset filters
                </button>
              </div>
            )}

          {!loadingProducts &&
            !productsError &&
            filteredProducts.length > 0 && (
              <div className="product-grid">
                {filteredProducts.map((product) => {
                  const image = getProductImage(product)

                  const price =
                    product?.price ??
                    product?.unit_price ??
                    0

                  const stock = Number(
                    product?.stock ??
                      product?.stock_quantity ??
                      0
                  )

                  return (
                    <article
                      className="product-card"
                      key={product.id}
                    >
                      <button
                        type="button"
                        className="product-card-main"
                        onClick={() =>
                          setSelectedProduct(product)
                        }
                      >
                        <div className="product-image">
                          <span className="product-badge">
                            M.V
                          </span>

                          {image ? (
                            <img
                              src={image}
                              alt={
                                product.name ||
                                'Automotive part'
                              }
                              onError={(event) => {
                                event.currentTarget.style.display =
                                  'none'

                                const fallback =
                                  event.currentTarget
                                    .parentElement
                                    ?.querySelector(
                                      '.product-image-fallback'
                                    )

                                if (fallback) {
                                  fallback.style.display =
                                    'flex'
                                }
                              }}
                            />
                          ) : null}

                          <div
                            className="product-image-fallback"
                            style={{
                              display: image
                                ? 'none'
                                : 'flex',
                            }}
                          >
                            <span className="image-fallback-icon" aria-label="Image unavailable"><ImageOff size={42} strokeWidth={1.5} /></span>
                          </div>

                          <div className="product-image-overlay">
                            VIEW DETAILS
                          </div>
                        </div>

                        <div className="product-info">
                          <span className="product-category">
                            CAR PART
                          </span>

                          <h3>
                            {product.name ||
                              'Automotive Part'}
                          </h3>

                          <p>
                            {product.description ||
                              'Premium automotive component designed for dependable performance.'}
                          </p>

                          <div className="product-meta">
                            <span>
                              {stock > 0
                                ? `${stock} in stock`
                                : 'Stock unavailable'}
                            </span>

                            <span>
                              {product.part_number ||
                                product.partNumber ||
                                'GEN-PART'}
                            </span>
                          </div>
                        </div>
                      </button>

                      <div className="product-bottom">
                        <strong>
                          {formatPrice(price)}
                        </strong>

                        <button
                          type="button"
                          className="add-cart-button"
                          onClick={() =>
                            addToCart(product)
                          }
                        >
                          <span>+</span>
                          Add to cart
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
            )}
        </section>

        {/* ABOUT */}
        <section
          className="about-section section"
          id="about"
        >
          <div className="about-card">
            <div className="about-content">
              <span className="section-eyebrow">
                ABOUT MOTI.VEX
              </span>

              <h2>
                Your vehicle
                <span>deserves better.</span>
              </h2>

              <p>
                Moti.Vex is built around a simple idea:
                finding quality automotive parts should
                feel as reliable as the parts themselves.
              </p>

              <p>
                From everyday maintenance to performance
                upgrades, we bring essential vehicle
                components into one focused shopping
                experience.
              </p>

              <button
                type="button"
                className="about-button"
                onClick={handleShopNow}
              >
                Explore parts
                <span>→</span>
              </button>
            </div>

            <div className="about-visual">
              <div className="about-logo-ring">
                <img
                  src={LOGO_URL}
                  alt="Moti.Vex"
                />
              </div>

              <div className="about-orbit orbit-one"></div>
              <div className="about-orbit orbit-two"></div>

              <span className="about-orbit-dot dot-one"></span>
              <span className="about-orbit-dot dot-two"></span>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <img
              src={LOGO_URL}
              alt="Moti.Vex"
            />

            <p>
              Premium automotive parts.
              <br />
              Built for the road ahead.
            </p>
          </div>

          <div className="footer-column">
            <span>EXPLORE</span>

            <button
              type="button"
              onClick={() =>
                scrollToSection('home')
              }
            >
              Home
            </button>

            <button
              type="button"
              onClick={() =>
                scrollToSection('categories')
              }
            >
              Categories
            </button>

            <button
              type="button"
              onClick={() =>
                scrollToSection('products')
              }
            >
              Products
            </button>
          </div>

          <div className="footer-column">
            <span>COMPANY</span>

            <button
              type="button"
              onClick={() => scrollToSection('about')}
            >
              About Moti.Vex
            </button>

            <button
              type="button"
              onClick={openLogin}
            >
              My account
            </button>

            <button
              type="button"
              onClick={() => setShowCart(true)}
            >
              Shopping cart
            </button>
          </div>

          <div className="footer-column footer-contact">
            <span>CONTACT</span>

            <p>Kenya</p>
            <p>support@motvex.com</p>

            <div className="footer-socials">
              <button type="button">GH</button>
              <button type="button">LI</button>
              <button type="button">IG</button>
            </div>
          </div>
        </div>

        <div className="footer-bottom">
          <span>
            Â© {new Date().getFullYear()} Moti.Vex. All
            rights reserved.
          </span>

          <span>
            PERFORMANCE / PRECISION / MOTION
          </span>
        </div>
      </footer>

      {/* PRODUCT DETAILS MODAL */}
      {selectedProduct && (
        <div
          className="modal-backdrop"
          onClick={() => setSelectedProduct(null)}
        >
          <div
            className="product-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className="modal-close"
              onClick={() =>
                setSelectedProduct(null)
              }
              aria-label="Close product details"
            >
              Close
            </button>

            <div className="modal-product-image">
              {(() => {
                const images =
                  productImages[selectedProduct.id]?.length
                    ? productImages[selectedProduct.id]
                    : [getProductImage(selectedProduct)].filter(Boolean)

                const activeIndex =
                  images.length > 0
                    ? selectedImageIndex % images.length
                    : 0

                const activeImage = images[activeIndex] || ''

                return (
                  <>
                    {activeImage ? (
                      <img
                        key={activeImage}
                        src={activeImage}
                        alt={`${selectedProduct.name || 'Automotive part'} â€” photo ${activeIndex + 1}`}
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="modal-image-fallback">
                        <span className="image-fallback-icon" aria-label="Image unavailable"><ImageOff size={42} strokeWidth={1.5} /></span>
                      </div>
                    )}

                    {images.length > 1 && (
                      <>
                        <span className="gallery-photo-count">
                          {activeIndex + 1} / {images.length}
                        </span>

                        <button
                          type="button"
                          className="gallery-arrow gallery-arrow-prev"
                          aria-label="Previous product photo"
                          onClick={() =>
                            setSelectedImageIndex(
                              (activeIndex - 1 + images.length) % images.length
                            )
                          }
                        >
                          <ChevronLeft size={24} aria-hidden="true" />
                        </button>

                        <button
                          type="button"
                          className="gallery-arrow gallery-arrow-next"
                          aria-label="Next product photo"
                          onClick={() =>
                            setSelectedImageIndex(
                              (activeIndex + 1) % images.length
                            )
                          }
                        >
                          <ChevronRight size={24} aria-hidden="true" />
                        </button>

                        <div className="gallery-thumbnails">
                          {images.map((image, index) => (
                            <button
                              type="button"
                              key={image}
                              className={`gallery-thumbnail${index === activeIndex ? ' active' : ''}`}
                              aria-label={`View product photo ${index + 1}`}
                              aria-pressed={index === activeIndex}
                              onClick={() => setSelectedImageIndex(index)}
                            >
                              <img
                                src={image}
                                alt=""
                                onError={(event) => {
                                  event.currentTarget.style.visibility = 'hidden'
                                }}
                              />
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )
              })()}
            </div>

            <div className="modal-product-content">
              <span className="modal-eyebrow">
                MOTI.VEX PRODUCT
              </span>

              <h2>
                {selectedProduct.name ||
                  'Automotive Part'}
              </h2>

              <p className="modal-description">
                {selectedProduct.description ||
                  'Premium automotive component designed for dependable performance and long-lasting use.'}
              </p>

              <div className="modal-details-grid">
                <div>
                  <span>PART NUMBER</span>
                  <strong>
                    {selectedProduct.part_number ||
                      selectedProduct.partNumber ||
                      'N/A'}
                  </strong>
                </div>

                <div>
                  <span>SKU</span>
                  <strong>
                    {selectedProduct.sku || 'N/A'}
                  </strong>
                </div>

                <div>
                  <span>STOCK</span>
                  <strong>
                    {selectedProduct.stock ??
                      selectedProduct.stock_quantity ??
                      0}
                  </strong>
                </div>

                <div>
                  <span>CONDITION</span>
                  <strong>QUALITY</strong>
                </div>
              </div>

              <div className="modal-purchase">
                <strong>
                  {formatPrice(
                    selectedProduct.price ??
                      selectedProduct.unit_price ??
                      0
                  )}
                </strong>

                <button
                  type="button"
                  className="modal-add-button"
                  onClick={() => {
                    addToCart(selectedProduct)
                    setSelectedProduct(null)
                    setShowCart(true)
                  }}
                >
                  Add to cart
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CART */}
      {showCart && (
        <div
          className="cart-backdrop"
          onClick={() => setShowCart(false)}
        >
          <aside
            className="cart-panel"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="cart-header">
              <div>
                <span>CART</span>
                <h2>Your selection.</h2>
              </div>

              <button
                type="button"
                className="cart-close"
                onClick={() => setShowCart(false)}
                aria-label="Close cart"
              >
                <X size={22} aria-hidden="true" />
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="cart-empty">
                <div className="cart-empty-icon">
                  <ShoppingCart size={42} strokeWidth={1.5} aria-hidden="true" />
                </div>

                <h3>Your cart is empty.</h3>

                <p>
                  Add quality parts to your selection and
                  they will appear here.
                </p>

                <button
                  type="button"
                  className="cart-shop-button"
                  onClick={() => {
                    setShowCart(false)
                    scrollToSection('products')
                  }}
                >
                  Browse products
                  <span>→</span>
                </button>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map((item) => {
                    const image = getProductImage(item)

                    return (
                      <div
                        className="cart-item"
                        key={item.id}
                      >
                        <div className="cart-item-image">
                          {image ? (
                            <img
                              src={image}
                              alt={item.name}
                              onError={(event) => {
                                event.currentTarget.style.display =
                                  'none'
                              }}
                            />
                          ) : (
                            <span className="image-fallback-icon" aria-label="Image unavailable"><ImageOff size={42} strokeWidth={1.5} /></span>
                          )}
                        </div>

                        <div className="cart-item-info">
                          <h3>
                            {item.name ||
                              'Automotive Part'}
                          </h3>

                          <span>
                            {formatPrice(
                              item.price ??
                                item.unit_price ??
                                0
                            )}{' '}
                            each
                          </span>

                          <div className="quantity-controls">
                            <button
                              type="button"
                              onClick={() =>
                                updateCartQuantity(
                                  item.id,
                                  -1
                                )
                              }
                            >
                              <Minus size={16} aria-hidden="true" />
                            </button>

                            <strong>
                              {item.quantity}
                            </strong>

                            <button
                              type="button"
                              onClick={() =>
                                updateCartQuantity(
                                  item.id,
                                  1
                                )
                              }
                            >
                              <Plus size={16} aria-hidden="true" />
                            </button>
                          </div>
                        </div>

                        <div className="cart-item-right">
                          <strong>
                            {formatPrice(
                              Number(
                                item.price ??
                                  item.unit_price ??
                                  0
                              ) *
                                Number(
                                  item.quantity || 0
                                )
                            )}
                          </strong>

                          <button
                            type="button"
                            onClick={() =>
                              removeFromCart(item.id)
                            }
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>

                 <div className="cart-footer">
                    {cartError && (
                      <div className="cart-error" role="alert">
                        {cartError}
                        </div>
                    )}

                    {cartLoading && (
                      <p className="cart-note" role="status">
                        syncing your cart...
                      </p>
                    )}

                    <div className="cart-summary">
                      <span>subtotal</span>
                      <strong>
                        {formatPrice(displayedSubtotal)}
                      </strong>
                    </div>

                    {token && cartSummary ? (
                      <>
                        <div className="cart-summary">
                          <span>
                            Delivery fee
                          </span>
                          <strong>
                            {formatPrice(cartSummary.delivery_fee)}
                          </strong>
                        </div>

                        <div className="cart-summary cart-grand-total">
                          <span>
                            Total
                          </span>
                          <strong>
                            {formatPrice(cartSummary.total)}
                          </strong>
                        </div>
                      </>

                    ) : (
                      <p className="cart-note">
                        sign in to sync your cart and view backend-calculated delivery fees.
                      </p>
                    )}

                    <button
                      type="button"
                      className="checkout-button"
                      onClick={handleCheckout}
                      disabled={cartLoading || cart.length === 0}
                    >
                      proceed to checkout
                      <span>→</span>
                    </button>

                    <button
                      type="button"
                      className="cart-clear-button"
                      onClick={clearCart}
                    >

                    </button>
                   </div>
              </>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}

export default App
