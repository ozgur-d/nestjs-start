import { Module } from '@nestjs/common';

// Utils module artık sadece barrel export için kullanılıyor
// Statik helper sınıfları DI gerektirmez
@Module({})
export class UtilsModule {}
