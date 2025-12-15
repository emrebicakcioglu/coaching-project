/**
 * Feature Toggle Guard
 * STORY-014A: Feature Toggles Backend
 *
 * Guards endpoints based on feature toggle status.
 * Returns 503 Service Unavailable if feature is disabled.
 *
 * Usage:
 * @UseGuards(FeatureGuard)
 * @Feature('user-registration')
 * @Post()
 * async register() { ... }
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ServiceUnavailableException,
  Inject,
  forwardRef,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureTogglesService } from '../../settings/feature-toggles.service';
import { WinstonLoggerService } from '../services/logger.service';

/**
 * Metadata key for required feature
 */
export const FEATURE_KEY = 'feature';

/**
 * Decorator to specify required feature for a route
 *
 * @param featureKey - Feature key that must be enabled
 */
export const Feature = (featureKey: string) => SetMetadata(FEATURE_KEY, featureKey);

/**
 * Feature Toggle Guard
 * Blocks access to routes when associated feature is disabled
 */
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(forwardRef(() => FeatureTogglesService))
    private readonly featureTogglesService: FeatureTogglesService,
    @Inject(forwardRef(() => WinstonLoggerService))
    private readonly logger: WinstonLoggerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required feature from decorator
    const requiredFeature = this.reflector.getAllAndOverride<string>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no feature required, allow access
    if (!requiredFeature) {
      return true;
    }

    // Check if feature is enabled
    const isEnabled = await this.featureTogglesService.isEnabled(requiredFeature);

    if (!isEnabled) {
      this.logger.log(
        `Access blocked: Feature '${requiredFeature}' is disabled`,
        'FeatureGuard',
      );

      throw new ServiceUnavailableException({
        statusCode: 503,
        error: 'Service Unavailable',
        message: `The feature '${requiredFeature}' is currently disabled`,
        code: 'FEATURE_DISABLED',
        feature: requiredFeature,
      });
    }

    return true;
  }
}

/**
 * Helper function to check feature status (for use in controllers/services)
 * This is a functional alternative when the decorator pattern isn't suitable
 *
 * @param featureService - FeatureTogglesService instance
 * @param featureKey - Feature key to check
 * @throws ServiceUnavailableException if feature is disabled
 */
export async function assertFeatureEnabled(
  featureService: FeatureTogglesService,
  featureKey: string,
): Promise<void> {
  const isEnabled = await featureService.isEnabled(featureKey);

  if (!isEnabled) {
    throw new ServiceUnavailableException({
      statusCode: 503,
      error: 'Service Unavailable',
      message: `The feature '${featureKey}' is currently disabled`,
      code: 'FEATURE_DISABLED',
      feature: featureKey,
    });
  }
}
