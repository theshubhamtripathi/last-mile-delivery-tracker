import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Mark a route as public so the global JWT guard skips it (e.g. /track/:num). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
