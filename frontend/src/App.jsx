import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_URL = 'http://localhost:8000'
const LOGO_URL = '/images/moti-vex-logo.png'

const HERO_CARS = [
  '/images/moti-vex-car-01.png',
  '/images/moti-vex-car-02.png',
  '/images/moti-vex-car-03.png',
  '/images/moti-vex-car-04.png',
  '/images/moti-vex-car-05.png',
  '/images/moti-vex-car-06.png',
  '/images/moti-vex-car-07.png',
]

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
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [productsError, setProductsError] = useState('')

  const [selectedProduct, setSelectedProduct] = useState(null)
  const [showCart, setShowCart] = useState(false)

  const [heroCarIndex, setHeroCarIndex] = useState(0)
  const [heroDirection, setHeroDirection] = useState('next')

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

  const [authPage, setAuthPage] = useState(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')

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

  /*
   * ---------------------------------------------------------
   * CART
   * ---------------------------------------------------------
   */

  useEffect(() => {
    localStorage.setItem('carPartsCart', JSON.stringify(cart))
  }, [cart])

  const addToCart = (product) => {
    if (!product) return

    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.id === product.id
      )

      if (existingItem) {
        return currentCart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        )
      }

      return [
        ...currentCart,
        {
          ...product,
          quantity: 1,
        },
      ]
    })
  }

  const updateCartQuantity = (productId, change) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === productId
            ? {
                ...item,
                quantity: item.quantity + change,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const removeFromCart = (productId) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== productId)
    )
  }

  const clearCart = () => {
    setCart([])
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
          Number(item.price || item.unit_price || 0) *
            Number(item.quantity || 0),
        0
      ),
    [cart]
  )

  /*
   * ---------------------------------------------------------
   * HERO CAROUSEL
   * ---------------------------------------------------------
   */

  const nextHeroCar = () => {
    setHeroDirection('next')

    setHeroCarIndex((current) =>
      (current + 1) % HERO_CARS.length
    )
  }

  const previousHeroCar = () => {
    setHeroDirection('previous')

    setHeroCarIndex(
      (current) =>
        (current - 1 + HERO_CARS.length) % HERO_CARS.length
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
        (current + 1) % HERO_CARS.length
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

      setAuthSuccess(
        'Account created successfully. Welcome to Moti.Vex.'
      )

      setRegisterForm({
        name: '',
        email: '',
        password: '',
      })

      setTimeout(() => {
        setAuthPage(null)
        setAuthSuccess('')
      }, 1300)
    } catch (error) {
      setAuthError(
        error.message || 'Unable to create your account.'
      )
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
    localStorage.removeItem('carPartsToken')
    localStorage.removeItem('carPartsUser')

    setToken('')
    setUser(null)
    setAuthPage(null)
  }

  const handleForgotPassword = () => {
    setAuthError(
      'Password reset will be connected when the backend reset-password endpoint is added.'
    )
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
          Back to store
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
                PERFORMANCE • PRECISION • TRUST
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
                  src="/images/moti-vex-car-03.png"
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
                  <span>✓</span>
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
                        ●
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
                        {showLoginPassword ? '◉' : '◌'}
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
                      <span>?</span>
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
              ) : (
                <form
                  className="auth-form"
                  onSubmit={handleRegister}
                >
                  <label className="form-field">
                    <span>Full name</span>

                    <div className="input-shell">
                      <span className="input-icon">
                        ◉
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
                        ●
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
                        {showRegisterPassword
                          ? '◉'
                          : '◌'}
                      </button>
                    </div>
                  </label>

                  <div className="password-hint">
                    <span>✓</span>
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
              )}

              <div className="auth-security">
                <span>◆</span>
                Your account information is securely
                transmitted.
              </div>
            </div>
          </div>
        </div>
      </div>
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
              <span className="cart-icon">🛒</span>
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
                    ‹
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
                    ›
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
                ⚙️
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
                🛞
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
                🔋
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
                🛑
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
                {products.length} PARTS AVAILABLE
              </span>
            </div>
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
                <span className="empty-icon">
                  ◇
                </span>
                <p>
                  No products are currently available.
                </p>
              </div>
            )}

          {!loadingProducts &&
            !productsError &&
            products.length > 0 && (
              <div className="product-grid">
                {products.map((product) => {
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
                            <span>🔧</span>
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
            © {new Date().getFullYear()} Moti.Vex. All
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
              ×
            </button>

            <div className="modal-product-image">
              {getProductImage(selectedProduct) ? (
                <img
                  src={getProductImage(selectedProduct)}
                  alt={
                    selectedProduct.name ||
                    'Automotive part'
                  }
                  onError={(event) => {
                    event.currentTarget.style.display =
                      'none'

                    const fallback =
                      event.currentTarget.parentElement?.querySelector(
                        '.modal-image-fallback'
                      )

                    if (fallback) {
                      fallback.style.display = 'flex'
                    }
                  }}
                />
              ) : null}

              <div
                className="modal-image-fallback"
                style={{
                  display: getProductImage(
                    selectedProduct
                  )
                    ? 'none'
                    : 'flex',
                }}
              >
                <span>🔧</span>
              </div>
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
                ×
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="cart-empty">
                <div className="cart-empty-icon">
                  🛒
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
                            <span>🔧</span>
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
                              −
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
                              +
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
                  <div className="cart-summary">
                    <span>Subtotal</span>
                    <strong>
                      {formatPrice(cartTotal)}
                    </strong>
                  </div>

                  <p className="cart-note">
                    Delivery fees and final checkout
                    details will be calculated at checkout.
                  </p>

                  <button
                    type="button"
                    className="checkout-button"
                    onClick={handleCheckout}
                  >
                    Proceed to checkout
                    <span>→</span>
                  </button>

                  <button
                    type="button"
                    className="clear-cart-button"
                    onClick={clearCart}
                  >
                    Clear cart
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