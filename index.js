const fastify = require('fastify')
const path = require('path');
const fastifyStatic = require('@fastify/static');
const fastifyRateLimit = require('@fastify/rate-limit');
const fastifyCors = require('@fastify/cors');
const fastifyUnderPressure = require('@fastify/under-pressure');
const fs = require('fs');
const Datastore = require('@seald-io/nedb');

// Read the public/index.html file once and store it as a variable
let htmlContent;
try {
  htmlContent = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
} catch (err) {
  console.error('Error reading index.html:', err);
  htmlContent = '<h1>Error loading page</h1>';
}

// Initialize the NeDB database saved to disk
const db = new Datastore({ filename: 'arac.db', autoload: true });

// Check if the database is empty before loading data
db.count({}, (err, count) => {
  if (err) {
    console.error('Error checking database:', err);
    return;
  }
  
  if (count === 0) {
    // Load arac.json data into the database
    const aracData = fs.readFileSync('./arac.json', 'utf8').split('\n').filter(line => line.trim()).map(line => {
      const record = JSON.parse(line);
      if (record.plaka) {
        record.plaka = record.plaka.replace(/\s+/g, ''); // Remove spaces from plaka
      }
      return record;
    });

    // Insert data into the database
    db.insert(aracData, (err) => {
      if (err) {
        console.error('Error inserting data:', err);
      } else {
        console.log('Data successfully inserted');
      }
    });
  } else {
    console.log('Database already contains data, skipping insertion.');
  }
});

const server = fastify({ logger: true })

server.register(fastifyStatic, {
  root: path.join(__dirname, 'public'),
  prefix: '/', // optional: default '/'
  setHeaders: (res, path, stat) => {
    console.log(`Serving file: ${path}`); // Log the file being served
    res.setHeader('Cache-Control', 'no-store'); // Disable caching
    res.removeHeader('ETag'); // Remove ETag header
  }
});

server.register(fastifyRateLimit, {
  max: 100, // maximum number of requests
  timeWindow: '1 minute' // time window for the rate limit
});

server.register(fastifyCors, {
  origin: '*', // Allow all origins
});

server.get('/', (request, reply) => {
  reply.type('text/html').send(htmlContent);
});

server.post('/query', async (request, reply) => {
  try {
    const query = request.body;
    const result = await db.findOne(query);
    reply.send(result);
  } catch (error) {
    reply.status(500).send({ error: 'An error occurred' });
  }
  return;
});

const start = async () => {
  try {
    await server.listen({ host: '0.0.0.0', port: 3000 });
    console.log('Server listening on http://localhost:3000');
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
