/**
 * Permissions Decorator
 * STORY-007A: Rollen-Management Backend
 *
 * Re-export of RequirePermission decorator from PermissionsGuard for cleaner imports.
 * Use this decorator along with JwtAuthGuard and PermissionsGuard.
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @RequirePermission('users.create')
 * @Post()
 * async createUser() { ... }
 */

export { RequirePermission, PERMISSIONS_KEY } from '../guards/permissions.guard';
