/**
 * Roles Decorator
 * STORY-003A: User CRUD Backend API
 *
 * Re-export of Roles decorator from RolesGuard for cleaner imports.
 * Use this decorator along with JwtAuthGuard and RolesGuard.
 *
 * Usage:
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @Roles('Admin')
 * @Get()
 * async adminOnlyEndpoint() { ... }
 */

export { Roles, ROLES_KEY } from '../guards/roles.guard';
