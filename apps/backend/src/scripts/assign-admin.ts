import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../providers/database/prisma.service';
import { BitField, RunaFlags } from '@runa/permissions';

async function bootstrap() {
  const username = process.argv[2];

  if (!username) {
    console.error('Error: Please specify a username. Usage: pnpm run db:assign-admin <username>');
    process.exit(1);
  }

  console.log(`--- Starting Admin Assignment Script for user: "${username}" ---`);
  
  // Create NestJS standalone context
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);

  try {
    const lowerUsername = username.trim().toLowerCase();
    
    console.log(`Searching for user with username: "${lowerUsername}"...`);
    const user = await prisma.client.user.findFirst({
      where: {
        username: {
          equals: lowerUsername,
          mode: 'insensitive',
        },
      },
    });

    if (!user) {
      console.error(`Error: User with username "${username}" not found.`);
      process.exit(1);
    }

    console.log(`User found: ${user.username} (${user.id}).`);
    console.log(`Current permissions raw bitfield:`, user.permissions);

    const permissions = new BitField(user.permissions);
    
    if (permissions.has(RunaFlags.ADMINISTRATOR)) {
      console.log(`User "${user.username}" is already an Administrator.`);
    } else {
      console.log(`Adding RunaFlags.ADMINISTRATOR flag...`);
      permissions.add(RunaFlags.ADMINISTRATOR);
      
      const newPermissions = permissions.serialize();
      
      await prisma.client.user.update({
        where: { id: user.id },
        data: {
          permissions: newPermissions,
        },
      });
      
      console.log(`Successfully assigned ADMINISTRATOR to user "${user.username}"!`);
      console.log(`New permissions raw bitfield:`, newPermissions);
    }

    console.log('--- Admin Assignment Script Completed Successfully ---');
  } catch (error: any) {
    console.error('Fatal error during admin assignment:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
