import { useState, useEffect, useRef } from 'react'
import './App.css'
import Chatbot from './components/Chatbot'

const categories = ['All', 'Breakfast', 'Lunch', 'Snacks', 'Drinks']

function App() {
  // Food menu state
  const [foodItems, setFoodItems] = useState([])
  const [adminStats, setAdminStats] = useState({
  totalFoodItems: 0,
  totalOrders: 0,
  totalSales: 0,
  lowStockItems: 0,
})
const [adminOrders, setAdminOrders] = useState([])
const [adminOrdersMessage, setAdminOrdersMessage] = useState('')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  // Page navigation state
  const [currentPage, setCurrentPage] = useState('home')

  // Registration form state
  const [registerName, setRegisterName] = useState('')
  const [registerEmail, setRegisterEmail] = useState('')
  const [registerPassword, setRegisterPassword] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [authMessageType, setAuthMessageType] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [adminFoods, setAdminFoods] = useState([])
const [adminFoodsMessage, setAdminFoodsMessage] = useState('')
const [showFoodForm, setShowFoodForm] = useState(false)
const [foodToDelete, setFoodToDelete] = useState(null)
const [isDeletingFood, setIsDeletingFood] = useState(false)

const [editingFoodId, setEditingFoodId] = useState(null)

const [foodForm, setFoodForm] = useState({
  food_name: '',
  description: '',
  price: '',
  category_id: '',
  image_url: '',
  is_available: true,
  stock_quantity: '',
})

// Stores the selected image file
const [selectedFoodImage, setSelectedFoodImage] = useState(null);

// Stores the temporary image preview URL
const [foodImagePreview, setFoodImagePreview] = useState('');

const [toast, setToast] = useState({
  visible: false,
  message: '',
  type: 'success',
});

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loggedInUser, setLoggedInUser] = useState(null)

// Restore cart items safely when the application loads.
const [cartItems, setCartItems] = useState(() => {
  try {
    const savedCart = localStorage.getItem('cartItems')

    if (!savedCart) {
      return []
    }

    const parsedCart = JSON.parse(savedCart)

    return Array.isArray(parsedCart) ? parsedCart : []
  } catch (error) {
    console.error('Unable to restore cart items:', error)
    return []
  }
})

const [isCartOpen, setIsCartOpen] = useState(false)


  // Order placement and order history state
  const [isPlacingOrder, setIsPlacingOrder] = useState(false)
  const [orderMessage, setOrderMessage] = useState('')
  const [orderMessageType, setOrderMessageType] = useState('')
  const [placedOrder, setPlacedOrder] = useState(null)
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [ordersError, setOrdersError] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [orderDetailsLoading, setOrderDetailsLoading] = useState(false)

const [notifications, setNotifications] = useState([])
const [notificationsLoading, setNotificationsLoading] = useState(false)
const [notificationsError, setNotificationsError] = useState('')


const [nutritionItems, setNutritionItems] = useState([])
const [nutritionLoading, setNutritionLoading] = useState(false)
const [nutritionError, setNutritionError] = useState('')

const [successMessage, setSuccessMessage] = useState('');
const [errorMessage, setErrorMessage] = useState('');

useEffect(() => {
  if (!successMessage && !errorMessage) return;

  const timer = setTimeout(() => {
    setSuccessMessage('');
    setErrorMessage('');
  }, 1500);

  return () => clearTimeout(timer);
}, [successMessage, errorMessage]);

// Store the food name entered in the nutrition search box
const [nutritionSearch, setNutritionSearch] = useState('')
// Store matching food suggestions while the student types
const [nutritionSuggestions, setNutritionSuggestions] = useState([])

  // Payment method selection
const [paymentMethod, setPaymentMethod] = useState('CASH')
const [pendingPayment, setPendingPayment] = useState(null)
const [paymentProcessing, setPaymentProcessing] = useState(false)
const [paymentMessage, setPaymentMessage] = useState('')
const [paymentMessageType, setPaymentMessageType] = useState('')

// Fetch nutrition information based on the student's food search
async function handleViewNutrition() {
    setCurrentPage('nutrition')
    setIsCartOpen(false)
    setNutritionLoading(true)
    setNutritionError('')

    try {
        const searchParams = new URLSearchParams()

        if (nutritionSearch.trim()) {
            searchParams.set('search', nutritionSearch.trim())
        }

        const response = await fetch(
            `http://localhost:3000/api/nutrition?${searchParams.toString()}`
        )

        const data = await response.json()

        if (!response.ok) {
            throw new Error(
                data.message || 'Unable to load nutrition information.'
            )
        }

       setNutritionItems(data.nutrition || []);
        setNutritionSuggestions([]);


    } catch (error) {
        setNutritionError(
            error.message || 'Unable to load nutrition information.'
        )
    } finally {
        setNutritionLoading(false)
    }
}

// Fetch matching food names while the student types in the nutrition search
async function handleNutritionSearchChange(value) {
    setNutritionSearch(value)

    // Clear suggestions when the search box is empty
    if (!value.trim()) {
        setNutritionSuggestions([])
        return
    }

    try {
        const response = await fetch(
            `http://localhost:3000/api/nutrition?search=${encodeURIComponent(value.trim())}`
        )

        const data = await response.json()

        if (response.ok) {
            setNutritionSuggestions(data.nutrition || [])
        } else {
            setNutritionSuggestions([])
        }
    } catch (error) {
        console.error('Failed to load nutrition suggestions:', error)
        setNutritionSuggestions([])
    }
}
// Save cart items whenever they change
useEffect(() => {
  localStorage.setItem('cartItems', JSON.stringify(cartItems))
}, [cartItems])

  // Loading and error state
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Fetch food items from the backend
  useEffect(() => {
    async function fetchFoods() {
      try {
        const response = await fetch(
          'http://localhost:3000/api/foods'
        )

        if (!response.ok) {
          throw new Error('Failed to fetch food items')
        }

        const data = await response.json()

        setFoodItems(
          data.foods.map((food) => ({
            id: food.food_id,
            name: food.food_name,
            category: food.category_name,
            price: Number(food.price),
            description: food.description,
            available: Boolean(food.is_available),
            stockQuantity: food.stock_quantity,
            imageUrl: food.image_url,
          }))
        )
      } catch (error) {
        setError('Unable to load food items. Please try again.')
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    fetchFoods()
  }, [])

// Restore login status when the application loads
useEffect(() => {
async function checkLoginStatus() {
const token = localStorage.getItem('token')


  if (!token) {
    return
  }

  try {
    const response = await fetch(
      'http://localhost:3000/api/auth/profile',
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    if (response.status === 401) {
      localStorage.removeItem('token')
      setLoggedInUser(null)
      return
    }

    if (!response.ok) {
      console.error('Unable to verify login status.')
      return
    }

    const data = await response.json()

    setLoggedInUser(data.user)
  } catch (error) {
    console.error('Unable to restore login status:', error)
  }
}

checkLoginStatus()


}, [])

  // Filter food by search text and category
  const filteredFoods = foodItems.filter((food) => {
    const matchesSearch = food.name
      .toLowerCase()
      .includes(search.toLowerCase())

    const matchesCategory =
      selectedCategory === 'All' ||
      food.category === selectedCategory

    return matchesSearch && matchesCategory
  })

  // Add food to cart
  function addToCart(food) {
    setCartItems((currentItems) => {
      const existingItem = currentItems.find(
        (item) => item.id === food.id
      )

      if (existingItem) {
        return currentItems.map((item) =>
          item.id === food.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }

      return [...currentItems, { ...food, quantity: 1 }]
    })
  }

  // Register a new student
  async function handleRegister(event) {
    event.preventDefault()

    setAuthMessage('')
    setAuthMessageType('')

    if (registerPassword.length < 8) {
      setAuthMessage(
        'Password must contain at least 8 characters.'
      )
      setAuthMessageType('error')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(
        'http://localhost:3000/api/auth/register',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: registerName,
            email: registerEmail,
            password: registerPassword,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.message || 'Registration failed.'
        )
      }

      setAuthMessage(
        'Registration successful! You can now log in.'
      )
      setAuthMessageType('success')

      setRegisterName('')
      setRegisterEmail('')
      setRegisterPassword('')
    } catch (error) {
      setAuthMessage(
        error.message || 'Unable to register. Please try again.'
      )
      setAuthMessageType('error')
    } finally {
      setIsSubmitting(false)
    }
  }

 const fetchAdminStats = async () => {
  const token = localStorage.getItem('token')

  try {
    const response = await fetch('http://localhost:3000/api/admin/stats', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await response.json()
    if (response.ok && data.success) {
      setAdminStats(data.stats)
    } else {
      console.error('Unable to fetch admin statistics:', data.message)
    }
  } catch (error) {
    console.error('Admin statistics error:', error)
  }
}

// Fetch customer orders for the admin dashboard
const fetchAdminOrders = async () => {
  const token = localStorage.getItem('token')

  try {
    const response = await fetch('http://localhost:3000/api/admin/orders', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await response.json()
    console.log('Admin orders API response:', data)

    if (response.ok && data.success && Array.isArray(data.orders)) {
      setAdminOrders(data.orders)
      setAdminOrdersMessage('')
    } else {
      setAdminOrders([])
      setAdminOrdersMessage(data.message || 'Unable to load customer orders.')
      console.error('Unable to fetch customer orders:', data.message || data)
    }
  } catch (error) {
    setAdminOrders([])
    setAdminOrdersMessage('Unable to connect to the server while loading orders.')
    console.error('Admin orders error:', error)
  }
}

// Update customer order status
const updateOrderStatus = async (orderId, newStatus) => {
  const token = localStorage.getItem('token')

  try {
    const response = await fetch(
      `http://localhost:3000/api/admin/orders/${orderId}/status`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          order_status: newStatus,
        }),
      }
    )

    const data = await response.json()
if (response.ok && data.success) {
  setSuccessMessage('Order status updated successfully!');
  setErrorMessage('');

  await fetchAdminOrders();
} else {
  setErrorMessage(
    data.message || 'Unable to update order status.'
  );
  setSuccessMessage('');
}
} catch (error) {
  console.error('Update order status error:', error);

  setErrorMessage('Unable to connect to the server.');
  setSuccessMessage('');
}
}
const fetchAdminFoods = async () => {
  const token = localStorage.getItem('token')

  try {
    const response = await fetch('http://localhost:3000/api/foods', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await response.json()

    if (response.ok && data.success) {
      setAdminFoods(data.foods)
      setAdminFoodsMessage('')
    } else {
      setAdminFoodsMessage(
        data.message || 'Unable to load food items.'
      )
    }
  } catch (error) {
    console.error('Admin food loading error:', error)
    setAdminFoodsMessage('Unable to connect to the server.')
  }
}


// Log in an existing student
async function handleLogin(event) {
  event.preventDefault()

  setAuthMessage('')
  setAuthMessageType('')
  setIsSubmitting(true)

  try {
    const response = await fetch(
      'http://localhost:3000/api/auth/login',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Login failed.')
    }

    // Save the JWT token in the browser
    localStorage.setItem('token', data.token)

    // Save the logged-in user's information
    setLoggedInUser(data.user)

    setAuthMessage('Login successful! Welcome.')
    setAuthMessageType('success')

    setLoginPassword('')
    setCurrentPage('home')
  } catch (error) {
    setAuthMessage(error.message || 'Unable to log in.')
    setAuthMessageType('error')
  } finally {
    setIsSubmitting(false)
  }
}
// Log out the current student
function handleLogout() {
// Remove the saved JWT token
localStorage.removeItem('token')

// Clear the logged-in user's information
setLoggedInUser(null)

// Return to the home page
setCurrentPage('home')

// Clear authentication messages
setAuthMessage('')
setAuthMessageType('')

// Close the shopping cart panel
setIsCartOpen(false)
}
const handleSaveFood = async (event) => {
event.preventDefault();

setAdminFoodsMessage('');

try {
const isEditing = editingFoodId !== null;


const url = isEditing
  ? `http://localhost:3000/api/admin/foods/${editingFoodId}`
  : 'http://localhost:3000/api/admin/foods';

// Prepare food details and the optional image file.
const formData = new FormData();

formData.append('food_name', foodForm.food_name.trim());
formData.append('description', foodForm.description.trim());
formData.append('price', String(Number(foodForm.price)));
formData.append('category_id', String(Number(foodForm.category_id)));
formData.append('image_url', foodForm.image_url.trim());
formData.append('is_available', String(foodForm.is_available));
formData.append('stock_quantity', String(Number(foodForm.stock_quantity)));

// Attach the selected image, if one was selected.
if (selectedFoodImage) {
  formData.append('food_image', selectedFoodImage);
}

const response = await fetch(url, {
  method: isEditing ? 'PUT' : 'POST',
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
  body: formData,
});

const data = await response.json();

if (!response.ok) {
  throw new Error(data.message || 'Failed to save food item.');
}

showToast(
  data.message ||
    (isEditing
      ? 'Food item updated successfully!'
      : 'Food item added successfully!'),
  'success'
);

setShowFoodForm(false);
setEditingFoodId(null);

// Clear the selected image and preview after saving.
if (foodImagePreview) {
  URL.revokeObjectURL(foodImagePreview);
}

setSelectedFoodImage(null);
setFoodImagePreview('');

await fetchAdminFoods();
await fetchAdminStats();


} catch (error) {
showToast(error.message || 'Unable to save food item.', 'error');
}
};


const handleEditFood = (food) => {
  const categoryIds = {
    Breakfast: '1',
    Lunch: '2',
    Snacks: '3',
    Drinks: '4',
  };

  setEditingFoodId(food.food_id);

  setFoodForm({
    food_name: food.food_name || '',
    description: food.description || '',
    price: String(food.price ?? ''),
    category_id: String(food.category_id ?? categoryIds[food.category_name] ?? ''),
    image_url: food.image_url || '',
    is_available: Boolean(food.is_available),
    stock_quantity: String(food.stock_quantity ?? ''),
  });

  setAdminFoodsMessage('');
  setSelectedFoodImage(null);
setFoodImagePreview('');
  setShowFoodForm(true);
};

const handleDeleteFood = async () => {
if (!foodToDelete || isDeletingFood) {
return;
}

setIsDeletingFood(true);

try {
const response = await fetch(
`http://localhost:3000/api/admin/foods/${foodToDelete.food_id}`,
{
method: 'DELETE',
headers: {
Authorization: `Bearer ${localStorage.getItem('token')}`,
},
}
);

const data = await response.json();

if (!response.ok) {
  throw new Error(data.message || 'Failed to delete food item.');
}

setFoodToDelete(null);

showToast(
  data.message || 'Food item deleted successfully!',
  'success'
);

await fetchAdminFoods();
await fetchAdminStats();


} catch (error) {
showToast(
error.message || 'Unable to delete food item.',
'error'
);
} finally {
setIsDeletingFood(false);
}
};



const showToast = (message, type = 'success') => {
  setToast({
    visible: true,
    message,
    type,
  });

  setTimeout(() => {
    setToast((previousToast) => ({
      ...previousToast,
      visible: false,
    }));
  }, 3000);
};

// Place an order and create its payment record
async function handlePlaceOrder() {
if (!loggedInUser) {
setIsCartOpen(false)
setAuthMessage('Please log in before placing an order.')
setAuthMessageType('error')
setCurrentPage('login')
return
}


if (cartItems.length === 0) {
  setOrderMessage('Your cart is empty.')
  setOrderMessageType('error')
  return
}

const token = localStorage.getItem('token')

if (!token) {
  setLoggedInUser(null)
  setCurrentPage('login')
  setAuthMessage('Your session has expired. Please log in again.')
  setAuthMessageType('error')
  return
}

setIsPlacingOrder(true)
setOrderMessage('')
setOrderMessageType('')
setPaymentMessage('')
setPaymentMessageType('')
setPendingPayment(null)

try {
  // 1. Create the order
  const response = await fetch('http://localhost:3000/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      items: cartItems.map((item) => ({
        food_id: item.id,
        quantity: item.quantity,
      })),
    }),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Unable to place your order.')
  }

  const order = data.order

  // 2. Create the payment record for this order
  const paymentResponse = await fetch(
    'http://localhost:3000/api/payments',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        order_id: order.order_id,
        payment_method: paymentMethod,
      }),
    }
  )

  const paymentData = await paymentResponse.json()

  if (!paymentResponse.ok) {
    // The order exists even if payment-record creation fails.
    setPlacedOrder(order)
    setCartItems([])
    setIsCartOpen(false)
    setCurrentPage('order-confirmation')

    throw new Error(
      `Order #${order.order_id} was created, but its payment record could not be created. ${paymentData.message || 'Please contact the canteen administrator.'}`
    )
  }

  // 3. Store the order and payment details
  setPlacedOrder(order)
  setCartItems([])
  setIsCartOpen(false)
  setOrderMessage('')
  setCurrentPage('order-confirmation')

  // 4. For UPI or Card, wait for the student to simulate payment
  if (paymentMethod === 'UPI' || paymentMethod === 'CARD') {
    setPendingPayment({
      paymentId: paymentData.payment.payment_id,
      orderId: order.order_id,
      method: paymentMethod,
    })

    setPaymentMessage(
      `Order #${order.order_id} created. Complete the simulated ${paymentMethod} payment below.`
    )
    setPaymentMessageType('info')
  } else {
    setPaymentMessage(
      `Order #${order.order_id} placed successfully. Payment method: Cash on Delivery.`
    )
    setPaymentMessageType('success')
  }

  // 5. Refresh menu stock after order creation
  const foodsResponse = await fetch('http://localhost:3000/api/foods')

  if (foodsResponse.ok) {
    const foodsData = await foodsResponse.json()

    setFoodItems(
      foodsData.foods.map((food) => ({
        id: food.food_id,
        name: food.food_name,
        category: food.category_name,
        price: Number(food.price),
        description: food.description,
        available: Boolean(food.is_available),
        stockQuantity: Number(food.stock_quantity),
        imageUrl: food.image_url,
      }))
    )
  }
} catch (error) {
  setOrderMessage(
    error.message || 'Unable to place your order. Please try again.'
  )
  setOrderMessageType('error')
} finally {
  setIsPlacingOrder(false)
}


}

// Simulate an online payment result
async function handleSimulatePayment(result) {
if (!pendingPayment || paymentProcessing) {
return
}

const token = localStorage.getItem('token')

if (!token) {
setPaymentMessage('Your session has expired. Please log in again.')
setPaymentMessageType('error')
return
}

setPaymentProcessing(true)
setPaymentMessage('')
setPaymentMessageType('')

try {
const response = await fetch(
`http://localhost:3000/api/payments/${pendingPayment.paymentId}/simulate`,
{
method: 'PUT',
headers: {
'Content-Type': 'application/json',
Authorization: `Bearer ${token}`,
},
body: JSON.stringify({ result }),
}
)


const data = await response.json()

if (!response.ok) {
  throw new Error(data.message || 'Unable to process the simulated payment.')
}

if (result === 'SUCCESS') {
  setPaymentMessage(
    `Payment successful! Order #${pendingPayment.orderId} is confirmed.`
  )
  setPaymentMessageType('success')
} else {
  setPaymentMessage(
    `Payment failed. Order #${pendingPayment.orderId} has been cancelled, and the food stock has been restored.`
  )
  setPaymentMessageType('error')

  // Update the displayed order status
  setPlacedOrder((previousOrder) =>
    previousOrder
      ? { ...previousOrder, order_status: 'CANCELLED' }
      : previousOrder
  )
}

// Hide the payment buttons after the result is processed
setPendingPayment(null)


} catch (error) {
setPaymentMessage(
error.message || 'Unable to process the simulated payment.'
)
setPaymentMessageType('error')
} finally {
setPaymentProcessing(false)
}
}

  // Load order history for the logged-in student
  async function handleViewOrders() {
    if (!loggedInUser) {
      setCurrentPage('login')
      setAuthMessage('Please log in to view your orders.')
      setAuthMessageType('error')
      return
    }

    setCurrentPage('orders')
    setIsCartOpen(false)
    setOrdersLoading(true)
    setOrdersError('')
    setSelectedOrder(null)

    try {
      const token = localStorage.getItem('token')
      const response = await fetch('http://localhost:3000/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to load your orders.')
      }

      setOrders(data.orders || [])
    } catch (error) {
      setOrdersError(error.message || 'Unable to load your orders.')
    } finally {
      setOrdersLoading(false)
    }
  }

  // Load notifications for the logged-in student
async function handleViewNotifications() {
  if (!loggedInUser) {
    setCurrentPage('login')
    setAuthMessage('Please log in to view your notifications.')
    setAuthMessageType('error')
    return
  }

  setCurrentPage('notifications')
  setIsCartOpen(false)
  setNotificationsLoading(true)
  setNotificationsError('')

  try {
    const token = localStorage.getItem('token')

    const response = await fetch('http://localhost:3000/api/notifications', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Unable to load notifications.')
    }

    setNotifications(data.notifications || [])
  } catch (error) {
    setNotificationsError(
      error.message || 'Unable to load notifications.'
    )
  } finally {
    setNotificationsLoading(false)
  }
}

// Mark a student notification as read
async function handleMarkNotificationRead(notificationId) {
  try {
    const token = localStorage.getItem('token')

    const response = await fetch(
      `http://localhost:3000/api/notifications/${notificationId}/read`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    )

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Unable to mark notification as read.')
    }

    // Update the notification immediately in the React interface
    setNotifications((previousNotifications) =>
      previousNotifications.map((notification) =>
        notification.notification_id === notificationId
          ? { ...notification, is_read: 1 }
          : notification
      )
    )
  } catch (error) {
    setNotificationsError(
      error.message || 'Unable to mark notification as read.'
    )
  }
}

// Clear the nutrition search and reload all food items
async function handleViewNutritionWithEmptySearch() {
    setNutritionSearch('')
    setNutritionLoading(true)
    setNutritionError('')

    try {
        const response = await fetch('http://localhost:3000/api/nutrition')
        const data = await response.json()

        if (!response.ok) {
            throw new Error(
                data.message || 'Unable to load nutrition information.'
            )
        }

        setNutritionItems(data.nutrition || [])
    } catch (error) {
        setNutritionError(
            error.message || 'Unable to load nutrition information.'
        )
    } finally {
        setNutritionLoading(false)
    }
}
 
// Load details for one order belonging to the logged-in student
async function handleViewOrderDetails(orderId) {
  console.log('View Details clicked. Order ID:', orderId)

  setOrderDetailsLoading(true)
  setOrdersError('')
  setSelectedOrder(null)

  try {
    const token = localStorage.getItem('token')
    console.log('Token available:', Boolean(token))

    const response = await fetch(`http://localhost:3000/api/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    const data = await response.json()

    console.log('API status:', response.status)
    console.log('API response:', data)

    if (!response.ok) {
      throw new Error(data.message || 'Unable to load order details.')
    }

    
setSelectedOrder(data.order)
setCurrentPage('orders')

    console.log('Selected order set:', data.order)
  } catch (error) {
    console.error('Error loading order details:', error)
    setOrdersError(error.message || 'Unable to load order details.')
  } finally {
    setOrderDetailsLoading(false)
  }
}


  // Update the quantity of a cart item
  function updateQuantity(foodId, change) {
    setCartItems((currentItems) =>
      currentItems
        .map((item) =>
          item.id === foodId
            ? { ...item, quantity: item.quantity + change }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  // Calculate cart item count
  const cartCount = cartItems.reduce(
    (total, item) => total + item.quantity,
    0
  )

  // Calculate cart total
  const cartTotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  )

  // Display loading message
  if (loading) {
    return <p>Loading food menu...</p>
  }

  // Display error message
  if (error) {
    return <p>{error}</p>
  }

  return (
    <div className="app">

      {toast.visible && (
  <div
    className={`toast-notification toast-${toast.type}`}
    role="status"
    aria-live="polite"
  >
    <span className="toast-icon">✓</span>

    <span>{toast.message}</span>

    <button
      type="button"
      className="toast-close"
      onClick={() =>
        setToast((previousToast) => ({
          ...previousToast,
          visible: false,
        }))
      }
      aria-label="Close notification"
    >
      &times;
    </button>
  </div>
)}
{foodToDelete && (

  <div
    className="delete-modal-overlay"
    onClick={() => {
      if (!isDeletingFood) {
        setFoodToDelete(null);
      }
    }}
  >
    <div
      className="delete-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="delete-modal-icon" aria-hidden="true">
        !
      </div>


  <h2 id="delete-modal-title">Delete Food Item?</h2>

  <p>
    Are you sure you want to delete{' '}
    <strong>{foodToDelete.food_name}</strong>?
  </p>

  <p className="delete-modal-warning">
    This action cannot be undone.
  </p>

  <div className="delete-modal-actions">
    <button
      type="button"
      className="delete-cancel-button"
      disabled={isDeletingFood}
      onClick={() => setFoodToDelete(null)}
    >
      Cancel
    </button>

    <button
      type="button"
      className="delete-confirm-button"
      disabled={isDeletingFood}
      onClick={handleDeleteFood}
    >
      {isDeletingFood ? 'Deleting...' : 'Yes, Delete'}
    </button>
  </div>
</div>


  </div>
)}


      {/* Header */}
      <header className="header">
        <a
          className="brand"
          href="#home"
          onClick={() => setCurrentPage('home')}
        >
          <span className="brand-icon">🍽️</span>
          <span>Smart Canteen</span>
        </a>

        <nav className="navigation">
          <a
            href="#home"
            onClick={() => setCurrentPage('home')}
          >
            Home
          </a>

          <a
            href="#menu"
            onClick={() => setCurrentPage('home')}
          >
            Food Menu
          </a>

          <a
            href="#about"
            onClick={() => setCurrentPage('home')}
          >
            About
          </a>

  {loggedInUser ? (
  <>
    <span className="welcome-user">
      Welcome, {loggedInUser.name}
    </span>

    {loggedInUser.role === 'admin' ? (
      <button
        type="button"
        className="auth-nav-button"
        onClick={() => {
          setCurrentPage('admin')
          fetchAdminStats()
          fetchAdminFoods()
          fetchAdminOrders()
        }}
      >
        Admin Dashboard
      </button>
    ) : (
      <>
        <button
          type="button"
          className="auth-nav-button"
          onClick={handleViewOrders}
        >
          My Orders
        </button>

       <button
  type="button"
  className="auth-nav-button"
  onClick={handleViewNotifications}
>
  Notifications 🔔
</button>
{/* Open the food nutrition information page */}
<button
    className="auth-nav-button"
    onClick={handleViewNutrition}
>
    Nutrition 🥗
</button>
      </>
    )}
  
    <button
      type="button"
      className="logout-button"
      onClick={handleLogout}
    >
      Logout
    </button>
  </>
) : (
  <>
    <button
      type="button"
      className="auth-nav-button"
      onClick={() => {
        setCurrentPage('register')
        setAuthMessage('')
      }}
    >
      Register
    </button>

    <button
      type="button"
      className="auth-nav-button"
      onClick={() => {
        setCurrentPage('login')
        setAuthMessage('')
      }}
    >
      Login
    </button>
  </>
)}
        </nav>

       <button
className="cart-button"
type="button"
aria-expanded={currentPage === 'home' && isCartOpen}
aria-label={`Shopping cart with ${cartCount} items`}
onClick={() => {
console.log('Cart button clicked')


if (currentPage !== 'home') {
  setCurrentPage('home')
  setIsCartOpen(true)
} else {
  setIsCartOpen((previousState) => !previousState)
}


}}

>

🛒 Cart ({cartCount}) </button>

      </header>

      <main>
        {/* Student login page */}
{currentPage === 'login' && (
  <section className="auth-section">
    <div className="auth-card">
      <h2>Welcome Back!</h2>

      <p className="auth-description">
        Log in to your Smart Canteen account.
      </p>

      <form
        className="auth-form"
        onSubmit={handleLogin}
      >
        <label>
          Email Address
          <input
            type="email"
            value={loginEmail}
            onChange={(event) =>
              setLoginEmail(event.target.value)
            }
            placeholder="Enter your email"
            autoComplete="email"
            required
          />
        </label>

        <label>
          Password
          <input
            type="password"
            value={loginPassword}
            onChange={(event) =>
              setLoginPassword(event.target.value)
            }
            placeholder="Enter your password"
            autoComplete="current-password"
            required
          />
        </label>

        <button
          type="submit"
          className="auth-submit-button"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Logging in...' : 'Login'}
        </button>
      </form>

      {authMessage && (
        <p
          className={`auth-message ${authMessageType}`}
          role="status"
        >
          {authMessage}
        </p>
      )}

      <p className="auth-switch">
        Don't have an account?{' '}
        <button
          type="button"
          onClick={() => {
            setCurrentPage('register')
            setAuthMessage('')
          }}
        >
          Register here
        </button>
      </p>
    </div>
  </section>
)}

        {/* Student registration page */}
        {currentPage === 'register' && (
          <section className="auth-section">
            <div className="auth-card">
              <h2>Create an Account</h2>

              <p className="auth-description">
                Register to start ordering your favourite canteen food.
              </p>

              <form
                className="auth-form"
                onSubmit={handleRegister}
              >
                <label>
                  Full Name
                  <input
                    type="text"
                    value={registerName}
                    onChange={(event) =>
                      setRegisterName(event.target.value)
                    }
                    placeholder="Enter your full name"
                    maxLength={100}
                    autoComplete="name"
                    required
                  />
                </label>

                <label>
                  Email Address
                  <input
                    type="email"
                    value={registerEmail}
                    onChange={(event) =>
                      setRegisterEmail(event.target.value)
                    }
                    placeholder="Enter your email"
                    maxLength={150}
                    autoComplete="email"
                    required
                  />
                </label>

                <label>
                  Password
                  <input
                    type="password"
                    value={registerPassword}
                    onChange={(event) =>
                      setRegisterPassword(event.target.value)
                    }
                    placeholder="At least 8 characters"
                    minLength={8}
                    autoComplete="new-password"
                    required
                  />
                </label>

                <button
                  type="submit"
                  className="auth-submit-button"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? 'Registering...'
                    : 'Create Account'}
                </button>
              </form>

              {authMessage && (
                <p
                  className={`auth-message ${authMessageType}`}
                  role="status"
                >
                  {authMessage}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Order confirmation page */}
        {currentPage === 'order-confirmation' && placedOrder && (
          <section className="auth-section">
            <div className="auth-card">
              <h2>Order placed successfully! 🎉</h2>
              <p className="auth-description">
                Thank you. Your order has been sent to the canteen.
              </p>
              <div style={{ textAlign: 'left', margin: '20px 0' }}>
                <p><strong>Order ID:</strong> #{placedOrder.order_id}</p>
                <p><strong>Status:</strong> {placedOrder.order_status}</p>
                <p><strong>Total:</strong> ₹{Number(placedOrder.total_amount).toFixed(2)}</p>

                <h3>Items</h3>
                {placedOrder.items.map((item) => (
                  <p key={item.food_id}>
                    {item.food_name} × {item.quantity} — ₹{Number(item.item_total).toFixed(2)}
                  </p>
                ))}
              </div>

              {/* Payment status and simulated online payment controls */}
{paymentMessage && (

  <div
    role="status"
    style={{
      margin: '16px 0',
      padding: '12px',
      borderRadius: '8px',
      backgroundColor:
        paymentMessageType === 'error'
          ? '#fee2e2'
          : paymentMessageType === 'success'
            ? '#dcfce7'
            : '#dbeafe',
      color:
        paymentMessageType === 'error'
          ? '#991b1b'
          : paymentMessageType === 'success'
            ? '#166534'
            : '#1e40af',
      textAlign: 'left',
    }}
  >
    {paymentMessage}
  </div>
)}

{pendingPayment && (

  <div style={{ margin: '16px 0', textAlign: 'left' }}>
    <h3>Simulated Online Payment</h3>


<p>
  <strong>Payment method:</strong> {pendingPayment.method}
</p>

<p>
  <strong>Payment status:</strong> Pending
</p>

<p>
  This is a test payment. No real money will be transferred.
</p>

<button
  type="button"
  className="auth-submit-button"
  onClick={() => handleSimulatePayment('SUCCESS')}
  disabled={paymentProcessing}
  style={{ marginTop: '8px' }}
>
  {paymentProcessing ? 'Processing...' : 'Simulate Payment Success'}
</button>

<button
  type="button"
  className="auth-nav-button"
  onClick={() => handleSimulatePayment('FAILED')}
  disabled={paymentProcessing}
  style={{ marginTop: '10px' }}
>
  Simulate Payment Failure
</button>


  </div>
)}


              <button
                type="button"
                className="auth-submit-button"
                onClick={() => setCurrentPage('home')}
              >
                Continue Shopping
              </button>
              <button
                type="button"
                className="auth-nav-button"
                onClick={handleViewOrders}
                style={{ marginTop: '10px' }}
              >
                View My Orders
              </button>
            </div>
          </section>
        )}

        {/* Student order history and order details */}
        {currentPage === 'orders' && (
          <section className="cart-section" style={{ maxWidth: '1000px', margin: '32px auto' }}>
            <h2>My Orders</h2>
            {ordersLoading && <p>Loading your orders...</p>}
            {orderDetailsLoading && <p>Loading order details...</p>}
            {ordersError && <p className="auth-message error" role="alert">{ordersError}</p>}

            {!ordersLoading && !ordersError && orders.length === 0 && (
              <p>You haven't placed any orders yet.</p>
            )}

            {!ordersLoading && orders.length > 0 && (
              <div style={{ display: 'grid', gap: '12px', marginTop: '20px' }}>
                {orders.map((order) => (
                  <div key={order.order_id} className="cart-item">
                    <div>
                      <h3>Order #{order.order_id}</h3>
                      <p>Total: ₹{Number(order.total_amount).toFixed(2)}</p>
                      <p>Status: <strong>{order.order_status}</strong></p>
                      <p>Placed: {new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    
<button
  type="button"
  className="add-button"
  disabled={orderDetailsLoading}
  onClick={() => handleViewOrderDetails(order.order_id)}
>
  {orderDetailsLoading ? 'Loading Details...' : 'View Details'}
</button>


                  </div>
                ))}
              </div>
            )}


           {/* Order Details Modal */}
{selectedOrder && (

  <div
    className="order-details-overlay"
    onClick={() => setSelectedOrder(null)}
  >
    <section
      className="order-details-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-details-title"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="order-details-close"
        onClick={() => setSelectedOrder(null)}
        aria-label="Close order details"
      >
        &times;
      </button>


  <h3 id="order-details-title">
    Order #{selectedOrder.order_id} Details
  </h3>

  <div className="order-details-info">
    <p>
      <strong>Status:</strong>{" "}
      <span className="order-status-value">
        {selectedOrder.order_status}
      </span>
    </p>

    <p>
      <strong>Total:</strong>{" "}
      <span className="order-total-value">
        ₹{Number(selectedOrder.total_amount).toFixed(2)}
      </span>
    </p>
  </div>

  <h4 className="order-items-heading">Ordered Items</h4>

  {Array.isArray(selectedOrder.items) &&
  selectedOrder.items.length > 0 ? (
    <div className="order-details-items">
      {selectedOrder.items.map((item, index) => (
        <div
          className="order-details-item"
          key={`${item.food_id}-${index}`}
        >
          <div>
            <span className="order-food-name">
              {item.food_name}
            </span>
            <span className="order-food-quantity">
              Quantity: {item.quantity}
            </span>
          </div>

          <span className="order-item-price">
            ₹{Number(item.item_total).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  ) : (
    <p>No item details are available for this order.</p>
  )}

  <button
    type="button"
    className="order-details-done"
    onClick={() => setSelectedOrder(null)}
  >
    Close Details
  </button>
</section>

  </div>
)}

            <button
              type="button"
              className="auth-submit-button"
              onClick={() => setCurrentPage('home')}
              style={{ marginTop: '20px' }}
            >
              Back to Menu
            </button>
          </section>
        )}
  {/* Student Notifications Page */}
{currentPage === 'notifications' &&
  loggedInUser?.role === 'student' && (
    <section className="notifications-section">
      <h2>My Notifications 🔔</h2>

      {notificationsLoading && (
        <p>Loading notifications...</p>
      )}

      {notificationsError && (
        <p className="error-message">
          {notificationsError}
        </p>
      )}

      {!notificationsLoading &&
        !notificationsError &&
        notifications.length === 0 && (
          <p>You don't have any notifications yet.</p>
        )}

      {!notificationsLoading &&
        notifications.length > 0 && (
          <div className="notifications-list">
            {notifications.map((notification) => (
              <div
                key={notification.notification_id}
                className={`notification-card ${
                  notification.is_read ? 'read' : 'unread'
                }`}
              >
                <h3>
                  Order #{notification.order_id ?? 'N/A'}
                </h3>

                <p>{notification.message}</p>

                <p className="notification-date">
                  {new Date(
                    notification.created_at
                  ).toLocaleString()}
                </p>

                <p>
                  Status:{' '}
                  <strong>
                    {notification.is_read
                      ? 'Read'
                      : 'Unread'}
                  </strong>
                </p>

                {!notification.is_read && (
                  <button
                    type="button"
                    className="auth-nav-button"
                    onClick={() =>
                      handleMarkNotificationRead(
                        notification.notification_id
                      )
                    }
                  >
                    Mark as Read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

      <button
        type="button"
        className="auth-nav-button"
        onClick={() => setCurrentPage('home')}
      >
        Back to Menu
      </button>
    </section>
  )}

  {/* Display nutrition information for canteen food items */}
{currentPage === 'nutrition' && (
    <section className="nutrition-section">
        <h2>Food Nutrition 🥗</h2>
        <p>Explore the nutritional information of our canteen food.</p>

        {/* Search for nutrition information by food name */}
<form
    className="nutrition-search"
    onSubmit={(event) => {
        event.preventDefault()
        handleViewNutrition()
    }}
>
    <div className="nutrition-search-container">
        <input
            type="text"
            placeholder="Search food, e.g. Idli or Biryani..."
            value={nutritionSearch}
            onChange={(event) =>
                handleNutritionSearchChange(event.target.value)
            }
            autoComplete="off"
        />

       
{nutritionSuggestions.length > 0 && (
    <div className="nutrition-suggestions">
        {nutritionSuggestions.map((item) => (
            <button
                type="button"
                key={item.food_id}
                className="nutrition-suggestion-item"
                onMouseDown={(event) => {
                    event.preventDefault()
                    setNutritionSearch(item.food_name)
                    setNutritionItems([item])
                    setNutritionSuggestions([])
                }}
            >
                {item.food_name}
            </button>
        ))}
    </div>
)}


    </div>

    <button type="submit" disabled={nutritionLoading}>
        {nutritionLoading ? 'Searching...' : 'Search'}
    </button>

    <button
        type="button"
        onClick={handleViewNutritionWithEmptySearch}
        disabled={nutritionLoading}
    >
        Clear
    </button>
</form>

        {/* Show a message while nutrition data is loading */}
        {nutritionLoading && <p>Loading nutrition information...</p>}

        {/* Display an error if the API request fails */}
        {nutritionError && (
            <p className="error-message">{nutritionError}</p>
        )}

        {/* Display nutrition cards after data is loaded */}
        {!nutritionLoading && !nutritionError && (
            <div className="nutrition-grid">
                {nutritionItems.map((item) => (
                    <article
                        className="nutrition-card"
                        key={item.food_id}
                    >
                        <h3>{item.food_name}</h3>

                        <p>
                            <strong>Price:</strong> ₹{item.price}
                        </p>

                        <p>
                            <strong>Serving size:</strong>{' '}
                            {item.serving_size_grams != null
                                ? `${item.serving_size_grams} g`
                                : 'Not available'}
                        </p>

                        <p>
                            <strong>Calories:</strong>{' '}
                            {item.calories_kcal != null
                                ? `${item.calories_kcal} kcal`
                                : 'Not available'}
                        </p>

                        <p>
                            <strong>Protein:</strong>{' '}
                            {item.protein_g != null
                                ? `${item.protein_g} g`
                                : 'Not available'}
                        </p>

                        <p>
                            <strong>Carbohydrates:</strong>{' '}
                            {item.carbohydrates_g != null
                                ? `${item.carbohydrates_g} g`
                                : 'Not available'}
                        </p>

                        <p>
                            <strong>Fat:</strong>{' '}
                            {item.fat_g != null
                                ? `${item.fat_g} g`
                                : 'Not available'}
                        </p>

                        <p>
                            <strong>Fiber:</strong>{' '}
                            {item.fiber_g != null
                                ? `${item.fiber_g} g`
                                : 'Not available'}
                        </p>

                        <p className="nutrition-status">
                            {item.verification_status === 'VERIFIED'
                                ? 'Verified nutrition data'
                                : 'Estimated nutrition — values may vary'}
                        </p>
                    </article>
                ))}
            </div>
        )}

        {/* Return to the food menu */}
        <button
            type="button"
            className="auth-nav-button"
            onClick={() => setCurrentPage('home')}
        >
            Back to Menu
        </button>
    </section>
)}
        {/* Homepage */}
        {currentPage === 'home' && (
          <>
         
            {/* Shopping Cart Modal */}
{isCartOpen && (

  <div
    className="cart-modal-overlay"
    onClick={() => setIsCartOpen(false)}
  >
    <section
      className="cart-section cart-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-modal-title"
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="cart-modal-close"
        onClick={() => setIsCartOpen(false)}
        aria-label="Close shopping cart"
      >
        &times;
      </button>


  <h2 id="cart-modal-title">Your Shopping Cart</h2>

  {cartItems.length === 0 ? (
    <p>
      Your cart is empty. Add some delicious food!
    </p>
  ) : (
    <>
      {cartItems.map((item) => (
        <div
          className="cart-item"
          key={item.id}
        >
          <div>
            <h3>{item.name}</h3>
            <p>₹{item.price} each</p>
            <p>
              Subtotal: ₹{item.price * item.quantity}
            </p>
          </div>

          <div className="quantity-controls">
            <button
              type="button"
              onClick={() => updateQuantity(item.id, -1)}
              aria-label={`Decrease ${item.name} quantity`}
            >
              −
            </button>

            <span>{item.quantity}</span>

            <button
              type="button"
              onClick={() => updateQuantity(item.id, 1)}
              aria-label={`Increase ${item.name} quantity`}
            >
              +
            </button>
          </div>
        </div>
      ))}

      <h3 className="cart-total">
        Total: ₹{cartTotal}
      </h3>

      <div className="payment-method-section">
        <label htmlFor="paymentMethod">
          <strong>Select Payment Method</strong>
        </label>

        <select
          id="paymentMethod"
          value={paymentMethod}
          onChange={(event) =>
            setPaymentMethod(event.target.value)
          }
          disabled={isPlacingOrder}
        >
          <option value="CASH">Cash on Delivery</option>
          <option value="UPI">
            Online Payment - UPI (Simulated)
          </option>
          <option value="CARD">
            Online Payment - Card (Simulated)
          </option>
        </select>
      </div>

      <button
        className="add-button"
        type="button"
        onClick={() => setIsCartOpen(false)}
      >
        Continue Shopping
      </button>

      <button
        className="auth-submit-button"
        type="button"
        onClick={handlePlaceOrder}
        disabled={isPlacingOrder}
        style={{
          marginTop: '12px',
          width: '220px',
          maxWidth: '100%',
          display: 'block',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        {isPlacingOrder ? 'Placing order...' : 'Place Order'}
      </button>

      {orderMessage && (
        <p
          className={`auth-message ${orderMessageType}`}
          role="status"
        >
          {orderMessage}
        </p>
      )}
    </>
  )}
</section>


  </div>
)}


            {/* Hero section */}
            <section className="hero-section" id="home">
              <p className="eyebrow">
                FRESH FOOD · EASY ORDERING
              </p>

              <h1>
                Good food,
                <br />
                <span>just a few clicks away.</span>
              </h1>

              <p className="hero-description">
                Explore your canteen menu, find your favourites,
                and get ready to order.
              </p>

              <a className="hero-button" href="#menu">
                Explore Menu →
              </a>
            </section>

            {/* Food menu */}
            <section className="menu-section" id="menu">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">WHAT'S COOKING?</p>
                  <h2>Today's Menu</h2>
                  <p className="section-description">
                    Find something delicious for your next break.
                  </p>
                </div>

                <span className="food-count">
                  {filteredFoods.length} items
                </span>
              </div>

             <div className="search-container">
    <span aria-hidden="true">🔍</span>

    <input
        type="text"
        placeholder="Search food items..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
    />
</div>

              <div className="category-list">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={
                      selectedCategory === category
                        ? 'category-button active'
                        : 'category-button'
                    }
                    onClick={() =>
                      setSelectedCategory(category)
                    }
                  >
                    {category}
                  </button>
                ))}
              </div>

              {filteredFoods.length > 0 ? (
                <div className="food-grid">
                  {filteredFoods.map((food) => (
                    <article
                      className="food-card"
                      key={food.id}
                    >
                      <div className="food-image">
  {food.imageUrl ? (
    <img
      src={
        food.imageUrl.startsWith('/uploads/')
          ? `http://localhost:3000${food.imageUrl}`
          : food.imageUrl
      }
      alt={food.name}
      className="food-card-image"
      onError={(event) => {
        event.currentTarget.style.display = 'none';
      }}
    />
  ) : (
    <span>
      {{
        Idli: '🍚',
        Dosa: '🥞',
        'Veg Biryani': '🍛',
        Meals: '🍱',
        Samosa: '🥟',
        Sandwich: '🥪',
        Tea: '☕',
        'Fresh Lime Juice': '🍋',
      }[food.name] || '🍽️'}
    </span>
  )}
</div>

                      <div className="food-details">
                        <span className="food-category">
                          {food.category}
                        </span>

                        <h3>{food.name}</h3>
                        <p>{food.description}</p>

                        <div className="food-card-footer">
                          <span className="food-price">
                            ₹{food.price}
                          </span>

                          {food.available ? (
                            <button
                              className="add-button"
                              type="button"
                              onClick={() => addToCart(food)}
                            >
                              + Add
                            </button>
                          ) : (
                            <span className="unavailable">
                              Unavailable
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-message">
                  <span>🔎</span>
                  <h3>No food items found</h3>
                  <p>
                    Try another search or choose a different category.
                  </p>
                </div>
              )}
            </section>

            {/* About section */}
            <section className="about-section" id="about">
              <h2>Your break, made better.</h2>
              <p>
                Smart Canteen makes exploring your favourite food
                simple and convenient.
              </p>
            </section>

            {/* Footer */}
            <footer className="footer">
              <p>© 2026 Smart Canteen Ordering Application</p>
            </footer>
          </>
        )}
    {currentPage === 'admin' && loggedInUser?.role === 'admin' && (
      <section
        style={{
          maxWidth: '1200px',
          margin: '40px auto',
          padding: '24px',
        }}
      >
        <h1>Admin Dashboard</h1>

        <p>
          Welcome, {loggedInUser.name}! Manage your Smart Canteen
          from here.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '20px',
            marginTop: '30px',
          }}
        >
          <div className="cart-section">
  <h3>Total Food Items</h3>
  <p>{adminStats.totalFoodItems}</p>
</div>

<div className="cart-section">
  <h3>Total Orders</h3>
  <p>{adminStats.totalOrders}</p>
</div>

<div className="cart-section">
  <h3>Total Sales</h3>
  <p>₹{Number(adminStats.totalSales).toFixed(2)}</p>
</div>

<div
  className={`cart-section ${
    adminStats.lowStockItems > 0 ? 'low-stock-warning' : 'low-stock-normal'
  }`}
>
  <h3>⚠️ Low Stock Items</h3>

  <p className="low-stock-count">
    {adminStats.lowStockItems}
  </p>

  <small>
    {adminStats.lowStockItems > 0
      ? 'Items need attention'
      : 'All items are sufficiently stocked'}
  </small>
</div>

        </div>
{/* Food Management Section */}
<div style={{ marginTop: '40px' }}>
  <h2>Food Management</h2>
  <div style={{ margin: '16px 0' }}>
  <button
    type="button"
    className="auth-nav-button"
   onClick={() => {
  setEditingFoodId(null);

  setFoodForm({
    food_name: '',
    description: '',
    price: '',
    category_id: '',
    image_url: '',
    is_available: true,
    stock_quantity: '',
  });

  setSelectedFoodImage(null);
  setFoodImagePreview('');

  setShowFoodForm(true);
}}
  >
    + Add Food
  </button>
</div>

  {adminFoodsMessage && (
    <p role="alert">{adminFoodsMessage}</p>
  )}

  {adminFoods.length === 0 && !adminFoodsMessage ? (
    <p>Loading food items...</p>
  ) : adminFoods.length > 0 ? (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: '20px',
          textAlign: 'left',
        }}
      >
       <thead>
  <tr>
    <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
      ID
    </th>
    <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
      Food Name
    </th>
    <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
      Category
    </th>
    <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
      Price
    </th>
    <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
      Stock
    </th>
    <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
      Availability
    </th>
    <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
      Actions
    </th>
  </tr>
</thead>


        <tbody>
          {adminFoods.map((food) => (
            <tr key={food.food_id}>
              <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                {food.food_id}
              </td>

              <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                {food.food_name}
              </td>

              <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                {food.category_name}
              </td>

              <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                ₹{Number(food.price).toFixed(2)}
              </td>

              <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <strong>{food.stock_quantity} items</strong>


<span
  className={
    Number(food.stock_quantity) === 0
      ? 'stock-status stock-out'
      : Number(food.stock_quantity) <= 5
      ? 'stock-status stock-critical'
      : Number(food.stock_quantity) <= 10
      ? 'stock-status stock-low'
      : 'stock-status stock-available'
  }
>
  {Number(food.stock_quantity) === 0
    ? 'Out of Stock'
    : Number(food.stock_quantity) <= 5
    ? 'Critical Stock'
    : Number(food.stock_quantity) <= 10
    ? 'Low Stock'
    : 'In Stock'}
</span>


  </div>
</td>


              <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                {food.is_available ? 'Available' : 'Unavailable'}
              </td>
              <td>
  <button
    type="button"
    className="food-edit-button"
    onClick={() => handleEditFood(food)}
  >
    Edit
  </button>
<button
type="button"
className="food-delete-button"
onClick={() => setFoodToDelete(food)}

>

Delete </button>


</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : null}
</div>
{/* Add/Edit Food Form */}
{showFoodForm && (

  <div className="food-modal-overlay">
    <div className="food-modal">
  <div className="food-modal-header">
    <h2>{editingFoodId ? 'Edit Food Item' : 'Add New Food'}</h2>

<button
  type="button"
  className="food-modal-close"
  onClick={() => setShowFoodForm(false)}
  aria-label="Close food form"
  title="Close"
>
  &times;
</button>


  </div>



  <form onSubmit={handleSaveFood}>


    <label htmlFor="food_name">Food Name</label>
    <input
      id="food_name"
      type="text"
      value={foodForm.food_name}
      onChange={(event) =>
        setFoodForm({ ...foodForm, food_name: event.target.value })
      }
      placeholder="Enter food name"
      required
    />

    <label htmlFor="description">Description</label>
    <textarea
      id="description"
      value={foodForm.description}
      onChange={(event) =>
        setFoodForm({ ...foodForm, description: event.target.value })
      }
      placeholder="Enter food description"
    />

    <label htmlFor="price">Price (₹)</label>
    <input
      id="price"
      type="number"
      min="0.01"
      step="0.01"
      value={foodForm.price}
      onChange={(event) =>
        setFoodForm({ ...foodForm, price: event.target.value })
      }
      placeholder="Enter price"
      required
    />

    <label htmlFor="category_id">Category</label>
    <select
      id="category_id"
      value={foodForm.category_id}
      onChange={(event) =>
        setFoodForm({ ...foodForm, category_id: event.target.value })
      }
      required
    >
      <option value="">Select a category</option>
      <option value="1">Breakfast</option>
      <option value="2">Lunch</option>
      <option value="3">Snacks</option>
      <option value="4">Drinks</option>
    </select>

    <label htmlFor="image_url">Image URL (optional)</label>
    <input
      id="image_url"
      type="text"
      value={foodForm.image_url}
      onChange={(event) =>
        setFoodForm({ ...foodForm, image_url: event.target.value })
      }
      placeholder="Enter image URL"
    />

    <label htmlFor="food_image">
  Upload Food Image (JPG, PNG, or WebP — maximum 5 MB)
</label>

<input
id="food_image"
type="file"
accept="image/jpeg,image/png,image/webp"
onChange={(event) => {
  const file = event.target.files?.[0] || null;

  // Allow only JPG, PNG, and WebP images.
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
  ];

  if (file && !allowedTypes.includes(file.type)) {
    showToast(
      'Please select a JPG, PNG, or WebP image.',
      'error'
    );

    event.target.value = '';
    setSelectedFoodImage(null);
    setFoodImagePreview('');
    return;
  }

  // Limit the image size to 5 MB.
  if (file && file.size > 5 * 1024 * 1024) {
    showToast(
      'Image size must not exceed 5 MB.',
      'error'
    );

    event.target.value = '';
    setSelectedFoodImage(null);
    setFoodImagePreview('');
    return;
  }

  setSelectedFoodImage(file);

  setFoodImagePreview(
    file ? URL.createObjectURL(file) : ''
  );
}}
/>

{foodImagePreview && (

  <div className="food-image-preview-container">
    <p>Image Preview</p>


<img
  src={foodImagePreview}
  alt="Selected food preview"
  className="food-image-preview"
/>


  </div>
)}


    <label htmlFor="stock_quantity">Stock Quantity</label>
    <input
      id="stock_quantity"
      type="number"
      min="0"
      step="1"
      value={foodForm.stock_quantity}
      onChange={(event) =>
        setFoodForm({ ...foodForm, stock_quantity: event.target.value })
      }
      placeholder="Enter stock quantity"
      required
    />

    <label className="food-availability-label">
      <input
        type="checkbox"
        checked={foodForm.is_available}
        onChange={(event) =>
          setFoodForm({
            ...foodForm,
            is_available: event.target.checked,
          })
        }
      />
      Food is available
    </label>

    <div className="food-modal-actions">
     <button type="submit" className="food-save-button">
  {editingFoodId !== null ? 'Update Food' : 'Save Food'}
</button>


      <button
        type="button"
        className="food-cancel-button"
        onClick={() => setShowFoodForm(false)}
      >
        Cancel
      </button>
    </div>
  </form>
</div>

  </div>
)}

{/* Customer Orders Section */}
<div style={{ marginTop: '40px' }}>
  <h2>Customer Orders</h2>

  {successMessage && (
  <div className="app-notification success" role="status">
    {successMessage}
  </div>
)}

{errorMessage && (
  <div className="app-notification error" role="alert">
    {errorMessage}
  </div>
)}

  {adminOrdersMessage && (
    <p role="alert">{adminOrdersMessage}</p>
  )}

  {!adminOrdersMessage && adminOrders.length === 0 ? (
    <p>No customer orders found.</p>
  ) : adminOrders.length > 0 ? (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginTop: '20px',
          textAlign: 'left',
        }}
      >
        <thead>
          <tr>
            <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
              Order ID
            </th>

            <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
              Customer
            </th>

            <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
              Email
            </th>

            <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
              Total Amount
            </th>

            <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
              Current Status
            </th>

            <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
              Update Status
            </th>

            <th style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
              Order Date
            </th>
          </tr>
        </thead>

        <tbody>
          {adminOrders.map((order) => (
            <tr key={order.order_id}>
              <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                #{order.order_id}
              </td>

              <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                {order.customer_name}
              </td>

              <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                {order.customer_email}
              </td>

              <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                ₹{Number(order.total_amount).toFixed(2)}
              </td>

              <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    backgroundColor:
                      order.order_status === 'COMPLETED'
                        ? '#dcfce7'
                        : order.order_status === 'CANCELLED'
                          ? '#fee2e2'
                          : order.order_status === 'READY'
                            ? '#dbeafe'
                            : '#fef3c7',
                    color:
                      order.order_status === 'COMPLETED'
                        ? '#166534'
                        : order.order_status === 'CANCELLED'
                          ? '#991b1b'
                          : order.order_status === 'READY'
                            ? '#1d4ed8'
                            : '#92400e',
                    fontWeight: 'bold',
                  }}
                >
                  {order.order_status}
                </span>
              </td>

              <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                <select
                  value={order.order_status}
                  onChange={(event) =>
                    updateOrderStatus(order.order_id, event.target.value)
                  }
                  disabled={
                    order.order_status === 'COMPLETED' ||
                    order.order_status === 'CANCELLED'
                  }
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid #ccc',
                    marginBottom: '5px',
                  }}
                >
                  <option value="PLACED">PLACED</option>
                  <option value="PREPARING">PREPARING</option>
                  <option value="READY">READY</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </td>

              <td style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
                {order.created_at
                  ? new Date(order.created_at).toLocaleString()
                  : 'N/A'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : null}
</div>
        <button
          type="button"
          className="auth-nav-button"
          style={{ marginTop: '24px' }}
          onClick={() => setCurrentPage('home')}
        >
          Back to Home
        </button>
      </section>
    )}

    <Chatbot /> 
      </main>
    </div>
  )
}

export default App