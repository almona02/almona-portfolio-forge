import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'
import { adminNavigationItems, adminSectionHref } from './adminNavigation'

/** Only expose implemented sections, using the dashboard's canonical URLs. */
export const AdminNavDropdown = () => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="outline" className="flex items-center gap-2">
        <Shield aria-hidden="true" className="h-4 w-4" />
        Admin Panel
        <ChevronDown aria-hidden="true" className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent className="w-64 max-h-[80vh] overflow-y-auto" align="end">
      <DropdownMenuLabel>Administration</DropdownMenuLabel>
      <DropdownMenuSeparator />
      {adminNavigationItems.map(({ id, label, icon: Icon }) => (
        <DropdownMenuItem key={id} asChild>
          <Link to={adminSectionHref(id)}>
            <Icon aria-hidden="true" className="mr-2 h-4 w-4" />
            {label}
          </Link>
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
)

export default AdminNavDropdown
