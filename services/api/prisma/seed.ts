import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create permissions
  const resources = [
    'reservation', 'room', 'guest', 'payment', 'income', 'expense',
    'inventory', 'housekeeping', 'user', 'role', 'report', 'dashboard',
    'rate_plan', 'tenant',
  ];
  const actions = ['create', 'read', 'update', 'delete'];

  const permissions: { id: string; resource: string; action: string }[] = [];
  for (const resource of resources) {
    for (const action of actions) {
      const perm = await prisma.permission.upsert({
        where: { resource_action: { resource, action } },
        update: {},
        create: { resource, action, description: `${action} ${resource}` },
      });
      permissions.push(perm);
    }
  }
  console.log(`Created ${permissions.length} permissions`);

  // 2. Create demo tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Sunset Lodge',
      slug: 'demo',
      email: 'info@sunsetlodge.com',
      phone: '+1-555-0100',
      address: '123 Safari Road',
      city: 'Cape Town',
      country: 'South Africa',
      currency: 'USD',
      timezone: 'Africa/Johannesburg',
      settings: {
        features: { requireOtp: false },
        paymentProvider: 'mock',
      },
    },
  });
  console.log(`Tenant: ${tenant.name} (${tenant.slug})`);

  // 3. Create system roles
  const roleConfigs = [
    { name: 'super_admin', description: 'Platform super administrator', tenantId: null, isSystem: true },
    { name: 'owner', description: 'Lodge owner', tenantId: tenant.id, isSystem: true },
    { name: 'manager', description: 'Lodge manager', tenantId: tenant.id, isSystem: true },
    { name: 'receptionist', description: 'Front desk receptionist', tenantId: tenant.id, isSystem: true },
    { name: 'accountant', description: 'Financial management', tenantId: tenant.id, isSystem: true },
    { name: 'housekeeping', description: 'Housekeeping staff', tenantId: tenant.id, isSystem: true },
    { name: 'inventory_manager', description: 'Inventory management', tenantId: tenant.id, isSystem: true },
  ];

  const roles: Record<string, any> = {};
  for (const rc of roleConfigs) {
    const role = await prisma.role.upsert({
      where: { tenantId_name: { tenantId: rc.tenantId || '', name: rc.name } },
      update: {},
      create: rc,
    });
    roles[rc.name] = role;
  }
  console.log(`Created ${Object.keys(roles).length} roles`);

  // 4. Assign permissions to roles
  const rolePermissionMap: Record<string, string[]> = {
    owner: permissions.map((p) => p.id), // All permissions
    manager: permissions.filter((p) => p.resource !== 'tenant').map((p) => p.id),
    receptionist: permissions
      .filter((p) => ['reservation', 'room', 'guest', 'payment', 'dashboard', 'housekeeping'].includes(p.resource))
      .map((p) => p.id),
    accountant: permissions
      .filter((p) => ['payment', 'income', 'expense', 'report', 'dashboard'].includes(p.resource))
      .map((p) => p.id),
    housekeeping: permissions
      .filter((p) => ['housekeeping', 'room'].includes(p.resource) && ['read', 'update'].includes(p.action))
      .map((p) => p.id),
    inventory_manager: permissions
      .filter((p) => ['inventory', 'dashboard'].includes(p.resource))
      .map((p) => p.id),
  };

  for (const [roleName, permIds] of Object.entries(rolePermissionMap)) {
    const role = roles[roleName];
    if (!role) continue;
    for (const permId of permIds) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permId } },
        update: {},
        create: { roleId: role.id, permissionId: permId },
      });
    }
  }
  console.log('Assigned permissions to roles');

  // 5. Create admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@sunsetlodge.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@sunsetlodge.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      phone: '+1-555-0101',
    },
  });

  // Assign owner role
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: roles.owner.id } },
    update: {},
    create: { userId: adminUser.id, roleId: roles.owner.id },
  });
  console.log(`Admin user: ${adminUser.email} (password: admin123)`);

  // 6. Create room types
  const roomTypes = [
    {
      tenantId: tenant.id,
      name: 'Standard Room',
      description: 'Comfortable room with essential amenities. Perfect for solo travelers or couples.',
      maxOccupancy: 2,
      basePrice: 85.00,
      amenities: JSON.stringify(['WiFi', 'TV', 'Air Conditioning', 'En-suite Bathroom']),
      images: JSON.stringify([]),
      sortOrder: 1,
    },
    {
      tenantId: tenant.id,
      name: 'Deluxe Room',
      description: 'Spacious room with premium furnishings and a beautiful garden view.',
      maxOccupancy: 3,
      basePrice: 150.00,
      amenities: JSON.stringify(['WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'Garden View', 'En-suite Bathroom', 'Coffee Machine']),
      images: JSON.stringify([]),
      sortOrder: 2,
    },
    {
      tenantId: tenant.id,
      name: 'Family Suite',
      description: 'Large suite with separate living area, ideal for families.',
      maxOccupancy: 5,
      basePrice: 250.00,
      amenities: JSON.stringify(['WiFi', 'TV', 'Air Conditioning', 'Mini Bar', 'Living Area', 'Kitchenette', '2 Bathrooms']),
      images: JSON.stringify([]),
      sortOrder: 3,
    },
    {
      tenantId: tenant.id,
      name: 'Luxury Villa',
      description: 'Private villa with pool, perfect for a premium experience.',
      maxOccupancy: 6,
      basePrice: 450.00,
      amenities: JSON.stringify(['WiFi', 'TV', 'Air Conditioning', 'Private Pool', 'Full Kitchen', 'BBQ Area', 'Butler Service']),
      images: JSON.stringify([]),
      sortOrder: 4,
    },
  ];

  const createdRoomTypes: any[] = [];
  for (const rt of roomTypes) {
    const roomType = await prisma.roomType.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: rt.name } },
      update: {},
      create: rt,
    });
    createdRoomTypes.push(roomType);
  }
  console.log(`Created ${createdRoomTypes.length} room types`);

  // 7. Create rooms
  const roomConfigs = [
    { type: 0, numbers: ['101', '102', '103', '104', '105'], floor: '1' },
    { type: 1, numbers: ['201', '202', '203'], floor: '2' },
    { type: 2, numbers: ['301', '302'], floor: '3' },
    { type: 3, numbers: ['V1', 'V2'], floor: 'Ground' },
  ];

  let roomCount = 0;
  for (const rc of roomConfigs) {
    for (const num of rc.numbers) {
      await prisma.room.upsert({
        where: { tenantId_number: { tenantId: tenant.id, number: num } },
        update: {},
        create: {
          tenantId: tenant.id,
          roomTypeId: createdRoomTypes[rc.type].id,
          number: num,
          floor: rc.floor,
          status: 'available',
        },
      });
      roomCount++;
    }
  }
  console.log(`Created ${roomCount} rooms`);

  // 8. Create expense categories
  const expenseCategories = [
    'Utilities', 'Supplies', 'Maintenance', 'Salaries', 'Marketing',
    'Food & Beverage', 'Cleaning', 'Transport', 'Insurance', 'Other',
  ];

  for (const name of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name } },
      update: {},
      create: { tenantId: tenant.id, name },
    });
  }
  console.log(`Created ${expenseCategories.length} expense categories`);

  // 9. Create inventory categories
  const inventoryCategories = [
    'Linens', 'Toiletries', 'Cleaning Supplies', 'Kitchen', 'Office Supplies', 'Maintenance',
  ];

  const createdInvCategories: any[] = [];
  for (const name of inventoryCategories) {
    const cat = await prisma.inventoryCategory.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name } },
      update: {},
      create: { tenantId: tenant.id, name },
    });
    createdInvCategories.push(cat);
  }
  console.log(`Created ${inventoryCategories.length} inventory categories`);

  // 10. Create sample inventory items
  const inventoryItems = [
    { name: 'Bath Towels', categoryIdx: 0, unit: 'pcs', currentStock: 50, reorderLevel: 20, costPrice: 8.50 },
    { name: 'Bed Sheets (Queen)', categoryIdx: 0, unit: 'pcs', currentStock: 30, reorderLevel: 10, costPrice: 15.00 },
    { name: 'Shampoo Bottles', categoryIdx: 1, unit: 'pcs', currentStock: 100, reorderLevel: 30, costPrice: 1.50 },
    { name: 'Soap Bars', categoryIdx: 1, unit: 'pcs', currentStock: 200, reorderLevel: 50, costPrice: 0.75 },
    { name: 'All-Purpose Cleaner', categoryIdx: 2, unit: 'litre', currentStock: 15, reorderLevel: 5, costPrice: 4.00 },
    { name: 'Toilet Paper', categoryIdx: 1, unit: 'pcs', currentStock: 150, reorderLevel: 50, costPrice: 0.50 },
  ];

  for (const item of inventoryItems) {
    await prisma.inventoryItem.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: item.name } },
      update: {},
      create: {
        tenantId: tenant.id,
        categoryId: createdInvCategories[item.categoryIdx].id,
        name: item.name,
        unit: item.unit,
        currentStock: item.currentStock,
        reorderLevel: item.reorderLevel,
        costPrice: item.costPrice,
      },
    });
  }
  console.log(`Created ${inventoryItems.length} inventory items`);

  console.log('\nSeed complete!');
  console.log('---');
  console.log('Demo lodge: Sunset Lodge (slug: demo)');
  console.log('Admin login: admin@sunsetlodge.com / admin123');
  console.log('---');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
