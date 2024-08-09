import {
  CirclePlus,
  CircleUser,
  Home,
  LucideIcon,
  MessageCircle,
  Search,
  Users,
  LogOut,
} from 'lucide-react'
import { Link } from 'react-router-dom'

interface SidebarProps {
  links: {
    to: string
    icon: LucideIcon
  }[]
}

const defaultProps: SidebarProps = {
  links: [
    {
      to: '/home',
      icon: Home,
    },
    {
      to: '/profile',
      icon: CircleUser,
    },
    {
      to: '/friends',
      icon: Users,
    },
    {
      to: '/create',
      icon: CirclePlus,
    },
    {
      to: '/chat',
      icon: MessageCircle,
    },
    {
      to: '/discover',
      icon: Search,
    },
    {
      to: '/logout',
      icon: LogOut,
    },
  ],
}

function Sidebar({ links }: SidebarProps) {
  return (
    <nav className="flex flex-col justify-start gap-4 h-screen">
      {links.map((link, index) => (
        <Link key={index} to={link.to}>
          <link.icon />
        </Link>
      ))}
    </nav>
  )
}
Sidebar.defaultProps = defaultProps

export default Sidebar
