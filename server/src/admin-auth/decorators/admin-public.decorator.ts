import { SetMetadata } from '@nestjs/common';

export const ADMIN_AUTH_PUBLIC = 'adminAuthPublic';

export const AdminPublic = () => SetMetadata(ADMIN_AUTH_PUBLIC, true);
