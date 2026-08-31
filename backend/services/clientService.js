const { dbAsync } = require('../database/db');

/**
 * Obtiene todos los clientes
 */
async function getAllClients() {
  try {
    const clients = await dbAsync.all('SELECT * FROM clients ORDER BY created_at DESC');
    return clients;
  } catch (error) {
    console.error('Error fetching clients:', error);
    throw error;
  }
}

/**
 * Crea un nuevo cliente
 */
async function createClient(clientData) {
  try {
    const { name, nit, nrc, sector, status = 'active' } = clientData;
    const result = await dbAsync.run(
      'INSERT INTO clients (name, nit, nrc, sector, status) VALUES (?, ?, ?, ?, ?)',
      [name, nit, nrc, sector, status]
    );
    return { id: result.lastID, ...clientData };
  } catch (error) {
    console.error('Error creating client:', error);
    throw error;
  }
}

/**
 * Crea algunos datos de prueba para la interfaz visual si la base de datos está vacía
 */
async function seedMockClients() {
  try {
    const clients = await getAllClients();
    if (clients.length === 0) {
      console.log('Base de datos vacía, insertando clientes de prueba...');
      await createClient({
        name: 'Empresa XYZ S.A. de C.V.',
        nit: '0614-010190-101-1',
        nrc: '123456-7',
        sector: 'Tecnología',
        status: 'active'
      });
      await createClient({
        name: 'Distribuidora El Salvador',
        nit: '0614-150685-101-2',
        nrc: '765432-1',
        sector: 'Comercio',
        status: 'active'
      });
      console.log('Clientes de prueba insertados con éxito.');
    }
  } catch (error) {
    console.error('Error seeding data:', error);
  }
}

// Los datos demo no deben aparecer en una instalación limpia salvo petición explícita.
if (process.env.SEED_DEMO_DATA === 'true') {
  seedMockClients();
}

module.exports = {
  getAllClients,
  createClient
};
