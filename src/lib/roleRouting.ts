/** Maps a user role to that role's home/dashboard route. */
export const roleHomePath = (role?: string | null): string => {
  switch (role) {
    case 'admin':
      return '/admin'
    case 'fabricator_admin':
      return '/fabricator-admin'
    case 'technician':
      return '/technician'
    case 'support':
      return '/support'
    case 'sales_rep':
      return '/services'
    default:
      return '/portal'
  }
}
