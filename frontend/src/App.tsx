import './App.css'
import { RouterProvider, createBrowserRouter } from 'react-router-dom'
import Signup from './pages/Signup'
import Login from './pages/Login'
import Profile from './pages/Profile'
import Friends from './pages/Friends'
import Home from './pages/Home'
import Create from './pages/Create'
import ChatPage from './chat/ChatPage'
import Logout from './pages/Logout'
import Discover from './pages/Discover'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Login />,
  },
  {
    path: '/signup',
    element: <Signup />,
  },
  {
    path: '/profile',
    element: <Profile />,
  },
  {
    path: '/friends',
    element: <Friends />,
  },
  {
    path: '/home',
    element: <Home />,
  },
  {
    path: '/create',
    element: <Create />,
  },
  {
    path: '/chat',
    element: <ChatPage />,
  },
  {
    path: '/logout',
    element: <Logout />,
  },
  {
    path: '/discover',
    element: <Discover />,
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
