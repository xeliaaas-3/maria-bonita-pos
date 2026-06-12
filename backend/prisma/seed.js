// ============================================
// SEED - Datos Iniciales
// ============================================

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // Sucursal principal
  let branch = await prisma.branch.findFirst({ where: { isMain: true } });
  if (!branch) {
    branch = await prisma.branch.create({
      data: {
        name: 'Sucursal Principal',
        address: 'Asunción, Paraguay',
        phone: '+595 21 000000',
        email: 'info@miboutique.com',
        isMain: true
      }
    });
    console.log('✅ Sucursal creada:', branch.name);
  } else {
    console.log('✅ Sucursal ya existe:', branch.name);
  }

  // Admin
  const adminExists = await prisma.user.findUnique({ where: { email: 'admin@boutique.com' } });
  if (!adminExists) {
    const adminPassword = await bcrypt.hash('admin123', 12);
    await prisma.user.create({
      data: {
        name: 'Administrador',
        email: 'admin@boutique.com',
        password: adminPassword,
        role: 'ADMIN',
        branchId: branch.id
      }
    });
    console.log('✅ Admin creado: admin@boutique.com / admin123');
  } else {
    console.log('✅ Admin ya existe');
  }

  // Cajero
  const cajeroExists = await prisma.user.findUnique({ where: { email: 'cajero@boutique.com' } });
  if (!cajeroExists) {
    const cajeroPassword = await bcrypt.hash('cajero123', 12);
    await prisma.user.create({
      data: {
        name: 'Cajero Principal',
        email: 'cajero@boutique.com',
        password: cajeroPassword,
        role: 'CAJERO',
        branchId: branch.id
      }
    });
    console.log('✅ Cajero creado: cajero@boutique.com / cajero123');
  } else {
    console.log('✅ Cajero ya existe');
  }

  // Categorías
  const categorias = [
    'Ropa de Mujer', 'Ropa de Hombre', 'Accesorios', 'Calzado', 'Niños'
  ];
  for (const nombre of categorias) {
    const existe = await prisma.category.findFirst({ where: { name: nombre } });
    if (!existe) {
      await prisma.category.create({ data: { name: nombre } });
    }
  }
  console.log('✅ Categorías listas');

  // Marcas
  const marcas = ['Zara', 'H&M', 'Mango', 'Reserved', 'Local Brand'];
  for (const nombre of marcas) {
    const existe = await prisma.brand.findFirst({ where: { name: nombre } });
    if (!existe) {
      await prisma.brand.create({ data: { name: nombre } });
    }
  }
  console.log('✅ Marcas listas');

  // Configuraciones
  const configs = [
    { key: 'company.name', value: 'Maria Bonita', group: 'company' },
    { key: 'company.currency', value: 'PYG', group: 'company' },
    { key: 'company.currencySymbol', value: '₲', group: 'company' },
    { key: 'company.timezone', value: 'America/Asuncion', group: 'company' },
    { key: 'company.address', value: 'Las Residentas, Fernando de la Mora 110309', group: 'company' },
    { key: 'company.phone', value: '+595 985 200792', group: 'company' },
    { key: 'pos.taxRate', value: 10, group: 'pos' },
    { key: 'pos.receiptFooter', value: '¡Gracias por su compra!', group: 'pos' },
    { key: 'pos.pointsRate', value: 10000, group: 'pos' },
    { key: 'inventory.lowStockAlert', value: 5, group: 'inventory' }
  ];

  for (const cfg of configs) {
    await prisma.setting.upsert({
      where: { key: cfg.key },
      update: {},
      create: { key: cfg.key, value: cfg.value, group: cfg.group }
    });
  }
  console.log('✅ Configuraciones listas');

  console.log('\n🎉 Seed completado!');
  console.log('📧 Admin:   admin@boutique.com  / admin123');
  console.log('📧 Cajero:  cajero@boutique.com / cajero123');
}

main()
  .catch(e => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
